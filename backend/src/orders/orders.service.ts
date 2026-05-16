import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { PaymentsService } from '../payments/payments.service';
import { ShippingService } from '../shipping/shipping.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private paymentsService: PaymentsService,
    private shippingService: ShippingService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Validate address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    // Get cart
    const cart = await this.cartService.getCart(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    // Validate stock
    for (const item of cart.items) {
      if (item.variant.stock < item.quantity) {
        throw new BadRequestException(`${item.product.name} is out of stock`);
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = cart.items.map((item) => {
      const unitPrice =
        Number(item.product.salePrice || item.product.basePrice) + Number(item.variant.extraPrice);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        variantInfo: { size: item.variant.size, color: item.variant.color },
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        imageUrl: item.product.images?.[0],
      };
    });

    // Apply coupon
    let discountAmount = 0;
    let coupon = null;
    if (dto.couponCode) {
      coupon = await this.validateAndApplyCoupon(dto.couponCode, subtotal, userId);
      discountAmount = coupon.discountAmount;
    }

    const shippingCharge = subtotal - discountAmount >= 499 ? 0 : 49;
    const totalAmount = subtotal - discountAmount + shippingCharge;

    // Create Razorpay order if payment is online
    let razorpayOrderId: string | undefined;
    if (dto.paymentMethod === 'RAZORPAY') {
      const rzpOrder = await this.paymentsService.createRazorpayOrder(totalAmount, userId);
      razorpayOrderId = rzpOrder.id;
    }

    // Generate order number
    const orderNumber = `AA${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId,
          subtotal,
          discountAmount,
          shippingCharge,
          totalAmount,
          couponId: coupon?.id,
          couponCode: dto.couponCode,
          paymentMethod: dto.paymentMethod as any,
          razorpayOrderId,
          notes: dto.notes,
          status: dto.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
          paymentStatus: dto.paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
          items: { create: orderItems },
        },
        include: { items: true, address: true },
      });

      // Deduct stock
      for (const item of cart.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { totalSold: { increment: item.quantity } },
        });
      }

      // Increment coupon usage
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    // Send notification
    await this.notificationsService.sendOrderNotification(userId, 'ORDER_PLACED', order.id, orderNumber);

    // If COD, create Shiprocket shipment
    if (dto.paymentMethod === 'COD') {
      this.shippingService.createShipment(order.id).catch(console.error);
    }

    return { order, razorpayOrderId };
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true } },
            variant: { select: { size: true, color: true } },
          },
        },
        address: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, slug: true } },
            variant: true,
          },
        },
        address: true,
        payment: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        items: true,
        address: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, notes?: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { user: true } });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: status as OrderStatus,
        ...(notes && { notes }),
        ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
      },
    });

    // Notify user
    const notifType = {
      SHIPPED: 'ORDER_SHIPPED',
      DELIVERED: 'ORDER_DELIVERED',
      CANCELLED: 'ORDER_CANCELLED',
    }[status];

    if (notifType) {
      await this.notificationsService.sendOrderNotification(
        order.userId,
        notifType as any,
        id,
        order.orderNumber,
      );
    }

    return updated;
  }

  async cancel(id: string, userId: string, reason: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException('Order not found');

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    // Restore stock
    const items = await this.prisma.orderItem.findMany({ where: { orderId: id } });
    for (const item of items) {
      await this.prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: reason },
    });
  }

  async requestReturn(id: string, userId: string, reason: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Can only return delivered orders');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: 'RETURN_REQUESTED', returnReason: reason },
    });
  }

  private async validateAndApplyCoupon(code: string, subtotal: number, userId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new BadRequestException('Coupon has expired');
    if (coupon.startsAt && coupon.startsAt > new Date())
      throw new BadRequestException('Coupon is not yet active');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
      throw new BadRequestException('Coupon usage limit reached');
    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue))
      throw new BadRequestException(`Minimum order value is ₹${coupon.minOrderValue}`);

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    } else if (coupon.type === 'FLAT') {
      discountAmount = Number(coupon.value);
    } else if (coupon.type === 'FREE_SHIPPING') {
      discountAmount = 0; // handled in shipping calc
    }

    return { ...coupon, discountAmount };
  }
}
