import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { PaymentsService } from '../payments/payments.service';
import { ShippingService } from '../shipping/shipping.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatusHistoryService } from './order-status-history.service';
import { InventoryService } from './inventory.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private paymentsService: PaymentsService,
    private shippingService: ShippingService,
    private notificationsService: NotificationsService,
    private statusHistory: OrderStatusHistoryService,
    private inventory: InventoryService,
    private emailService: EmailService,
  ) {}

  // ─────────────────────────────────────────────
  // CREATE ORDER
  // ─────────────────────────────────────────────

  async create(userId: string, dto: CreateOrderDto) {
    // 1. Validate address
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId },
    });
    if (!address) throw new NotFoundException('Address not found');

    // 2. Get cart
    const cart = await this.cartService.getCart(userId);
    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    // 3. Validate available stock (available = stock - reservedStock)
    for (const item of cart.items) {
      const available = item.variant.stock - ((item.variant as any).reservedStock ?? 0);
      if (available < item.quantity) {
        throw new BadRequestException(
          `${item.product.name} (${item.variant.size}) is out of stock. Available: ${available}`,
        );
      }
    }

    // 4. Get settings
    const settings = await this.prisma.storeSettings.findFirst();
    const freeShipThreshold = Number((settings as any)?.freeShippingThreshold ?? 499);
    const shippingFee = Number((settings as any)?.shippingCharge ?? 49);
    const reservationMins = Number((settings as any)?.reservationTimeoutMins ?? 15);
    const platformFeeEnabled = (settings as any)?.platformFeeEnabled ?? false;
    const platformFeeAmt = platformFeeEnabled ? Number((settings as any)?.platformFeeAmount ?? 0) : 0;
    const codChargeAmt = dto.paymentMethod === 'COD' ? Number((settings as any)?.codCharges ?? 0) : 0;
    const gstEnabled = (settings as any)?.gstEnabled ?? false;
    const gstRate = Number((settings as any)?.gstRate ?? 0);

    // 5. Calculate totals
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
        sku: (item.variant as any).sku,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        imageUrl: item.product.images?.[0],
        // Snapshot return policy at purchase time
        returnEnabled: (item.product as any).returnEnabled ?? true,
        replaceEnabled: (item.product as any).replaceEnabled ?? true,
        returnDays: (item.product as any).returnDays ?? 14,
      };
    });

    // 6. Apply coupon
    let discountAmount = 0;
    let coupon: any = null;
    if (dto.couponCode) {
      coupon = await this.validateAndApplyCoupon(dto.couponCode, subtotal, userId);
      discountAmount = coupon.discountAmount;
    }

    // 7. All charges
    const isFreeShipping = coupon?.type === 'FREE_SHIPPING' || (subtotal - discountAmount) >= freeShipThreshold;
    const shippingCharge = isFreeShipping ? 0 : shippingFee;
    const giftCharge = dto.isGift && settings?.giftEnabled ? Number((settings as any)?.giftAmount ?? 35) : 0;
    const gstAmount = gstEnabled ? Math.round(subtotal * gstRate / 100) : 0;
    const platformFee = platformFeeAmt;
    const codCharges = codChargeAmt;
    const totalAmount = subtotal - discountAmount + shippingCharge + giftCharge + gstAmount + platformFee + codCharges;

    // 8. Create Razorpay order (COD skips this)
    let razorpayOrderId: string | undefined;
    if (dto.paymentMethod === 'RAZORPAY') {
      const rzpOrder = await this.paymentsService.createRazorpayOrder(totalAmount, userId);
      razorpayOrderId = rzpOrder.id;
    }

    // 8.5. Get default warehouse
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { isDefault: true, status: 'ACTIVE' },
    });

    const orderNumber = `AA${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 9. Create order (status = PENDING_PAYMENT for Razorpay, PAYMENT_VERIFIED for COD)
    const initialStatus: OrderStatus =
      dto.paymentMethod === 'COD' ? 'PAYMENT_VERIFIED' : 'PENDING_PAYMENT';

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId,
          warehouseId: defaultWarehouse?.id || null,
          subtotal,
          discountAmount,
          shippingCharge,
          giftCharge,
          platformFee,
          codCharges,
          gstAmount,
          totalAmount,
          couponId: coupon?.id,
          couponCode: dto.couponCode,
          paymentMethod: dto.paymentMethod as any,
          razorpayOrderId,
          notes: dto.notes,
          giftMessage: dto.giftMessage,
          isGift: dto.isGift ?? false,
          status: initialStatus,
          paymentStatus: dto.paymentMethod === 'COD' ? 'PAID' : 'PENDING',
          items: { create: orderItems },
        },
        include: { items: true, address: true },
      });

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

    // 10. Reserve inventory (outside main tx, has its own transaction)
    try {
      await this.inventory.reserve(
        order.id,
        cart.items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
        reservationMins,
      );
    } catch (e) {
      this.logger.error(`Inventory reservation failed for order ${order.id}: ${e.message}`);
      // Continue — stock validated above, reservation is best-effort
    }

    // 11. Log initial status history
    await this.statusHistory.append({
      orderId: order.id,
      toStatus: initialStatus,
      actorId: userId,
      actorRole: 'CUSTOMER',
      notes: 'Order placed',
    });

    // 12. For COD — immediately confirm inventory and advance pipeline
    if (dto.paymentMethod === 'COD') {
      await this.advanceCodOrder(order.id, userId, order.orderNumber);
    }

    // 13. Notifications
    await this.notificationsService
      .sendOrderNotification(userId, 'ORDER_PLACED', order.id, orderNumber)
      .catch(() => {});

    this.notificationsService
      .sendAdminAlert('ORDER_PLACED', {
        orderId: order.id, orderNumber, totalAmount: order.totalAmount,
        customerName: address.name || 'Customer',
      })
      .catch(() => {});

    // Email confirmation via AWS SES
    this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
      .then(user => {
        if (user?.email) {
          this.emailService.sendOrderConfirmation(user.email, {
            customerName: user.name || 'Customer',
            orderNumber,
            items: order.items.map((i: any) => ({
              name: i.productName,
              size: i.variantInfo?.size || '',
              qty: i.quantity,
              price: Number(i.unitPrice),
            })),
            subtotal: Number(order.subtotal),
            discount: Number(order.discountAmount),
            shipping: Number(order.shippingCharge),
            total: Number(order.totalAmount),
            paymentMethod: dto.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment',
            address: `${address.name}, ${address.line1}, ${address.city} - ${address.pincode}`,
          }).catch(() => {});
        }
      }).catch(() => {});

    if (dto.paymentMethod === 'COD') {
      this.shippingService.createShipment(order.id).catch(console.error);
    }

    const rzpConfig = (this.paymentsService as any).getRazorpayConfig ? (this.paymentsService as any).getRazorpayConfig() : null;
    const razorpayKeyId = rzpConfig ? rzpConfig.keyId : undefined;

    return { order, razorpayOrderId, razorpayKeyId };
  }

  // ─────────────────────────────────────────────
  // COD: Advance order pipeline after creation
  // ─────────────────────────────────────────────
  private async advanceCodOrder(orderId: string, userId: string, orderNumber: string) {
    // Confirm inventory (deduct stock)
    try {
      await this.inventory.confirm(orderId);
    } catch (e) {
      this.logger.error(`COD inventory confirm failed: ${e.message}`);
    }

    // Log CONFIRMED
    await this.statusHistory.append({
      orderId, toStatus: 'CONFIRMED', fromStatus: 'PAYMENT_VERIFIED',
      actorRole: 'SYSTEM', notes: 'COD order auto-confirmed',
    });

    // Log INVENTORY_RESERVED
    await this.statusHistory.append({
      orderId, toStatus: 'INVENTORY_RESERVED', fromStatus: 'CONFIRMED',
      actorRole: 'SYSTEM', notes: 'Inventory reserved for fulfillment',
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'INVENTORY_RESERVED' },
    });

    // Notify customer
    await this.notificationsService
      .sendOrderNotification(userId, 'ORDER_CONFIRMED', orderId, orderNumber)
      .catch(() => {});
  }

  // ─────────────────────────────────────────────
  // FIND ORDERS
  // ─────────────────────────────────────────────

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, slug: true } },
            variant: { select: { size: true, color: true, sku: true } },
          },
        },
        address: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const where = userId ? { id, userId } : { id };
    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, images: true, slug: true } },
            variant: { select: { size: true, color: true, sku: true } },
          },
        },
        address: true,
        payment: true,
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.awbCode && order.courierName) {
      const autoUrl = this.getTrackingUrlHelper(order.courierName, order.awbCode);
      if (autoUrl && (order.awbCode.toUpperCase() === 'CA807216051IN' || !order.trackingUrl || order.trackingUrl.trim() === '')) {
        order.trackingUrl = autoUrl;
      }
    }

    // Attach status history
    const history = await this.statusHistory.findByOrder(id);
    return { ...order, statusHistory: history };
  }

  async trackOrder(orderId: string, userId?: string, userRole?: string) {
    const where: any = userId && !['ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER', 'WAREHOUSE_STAFF'].includes(userRole || '') 
      ? { id: orderId, userId } 
      : { id: orderId };
      
    const order = await this.prisma.order.findFirst({ where });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.awbCode) return { events: [], trackingUrl: order.trackingUrl || '' };

    // Fetch tracking details from shipping service
    const events = await this.shippingService.trackShipment(order.awbCode);

    // If the latest event status is "Delivered" (or contains "deliver" case-insensitively),
    // and the order status is not already DELIVERED, update it!
    if (events && events.length > 0) {
      // Find latest event (sort by timestamp descending)
      const sortedEvents = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const latest = sortedEvents[0];
      
      const isDeliveredEvent = latest.status.toLowerCase().includes('deliver');
      if (isDeliveredEvent && order.status !== 'DELIVERED') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
        order.status = 'DELIVERED';
        
        await this.statusHistory.append({
          orderId: order.id,
          toStatus: 'DELIVERED',
          fromStatus: order.status,
          actorRole: 'SYSTEM',
          notes: 'Auto-updated to DELIVERED via courier delivery tracking',
        });
        
        // Trigger customer notification
        await this.notificationsService
          .sendOrderNotification(order.userId, 'ORDER_DELIVERED', order.id, order.orderNumber)
          .catch(() => {});
      }
    }

    let trackingUrl = order.trackingUrl || '';
    if (order.awbCode && order.courierName) {
      const autoUrl = this.getTrackingUrlHelper(order.courierName, order.awbCode);
      if (autoUrl && (order.awbCode.toUpperCase() === 'CA807216051IN' || !trackingUrl || trackingUrl.trim() === '')) {
        trackingUrl = autoUrl;
      }
    }

    return { events, trackingUrl, awbCode: order.awbCode, courierName: order.courierName, status: order.status };
  }

  async findAll(query?: {
    status?: string; search?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
        { user: { phone: { contains: query.search } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
              variant: { select: { size: true, color: true, sku: true } },
            },
          },
          address: true,
          payment: true,
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────────
  // ADMIN: UPDATE STATUS
  // ─────────────────────────────────────────────

  async updateStatus(
    id: string,
    toStatus: string,
    actorId: string,
    actorRole: string,
    extra?: {
      notes?: string; awbCode?: string; trackingUrl?: string;
      cancelReason?: string; courierName?: string; warehouseId?: string;
      refundId?: string; pickupSlot?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id }, include: { user: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const fromStatus = order.status;
    const newStatus = toStatus as OrderStatus;

    // Validate transition (admins can force any transition, others must follow rules)
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
      if (!this.statusHistory.isValidTransition(fromStatus, newStatus)) {
        throw new BadRequestException(
          `Invalid status transition: ${fromStatus} → ${toStatus}`,
        );
      }
    }

    let finalTrackingUrl = extra?.trackingUrl;
    const awbToCheck = extra?.awbCode || order.awbCode;
    const courierToCheck = extra?.courierName || order.courierName;

    if (awbToCheck && courierToCheck) {
      const autoUrl = this.getTrackingUrlHelper(courierToCheck, awbToCheck);
      if (autoUrl && (awbToCheck.toUpperCase() === 'CA807216051IN' || !finalTrackingUrl || finalTrackingUrl.trim() === '')) {
        finalTrackingUrl = autoUrl;
      }
    }

    // Build update data
    const updateData: any = {
      status: newStatus,
      ...(extra?.notes && { notes: extra.notes }),
      ...(extra?.awbCode && { awbCode: extra.awbCode }),
      ...(finalTrackingUrl && { trackingUrl: finalTrackingUrl }),
      ...(extra?.cancelReason && { cancelReason: extra.cancelReason }),
      ...(extra?.courierName && { courierName: extra.courierName }),
      ...(extra?.warehouseId && { warehouseId: extra.warehouseId }),
      ...(extra?.pickupSlot && { pickupSlot: extra.pickupSlot }),
    };

    // Set timestamps
    if (newStatus === 'SHIPPED') updateData.shippedAt = new Date();
    if (newStatus === 'DELIVERED') updateData.deliveredAt = new Date();
    if (newStatus === 'RETURN_REQUESTED') updateData.returnRequestedAt = new Date();
    if (newStatus === 'RETURN_APPROVED') updateData.returnApprovedAt = new Date();
    if (newStatus === 'PICKUP_SCHEDULED') updateData.pickupScheduledAt = new Date();
    if (newStatus === 'RETURNED') updateData.returnedAt = new Date();
    if (newStatus === 'REFUND_INITIATED') {
      updateData.refundInitiatedAt = new Date();
      updateData.paymentStatus = 'REFUND_INITIATED';
    }
    if (newStatus === 'REFUNDED') {
      updateData.refundedAt = new Date();
      updateData.paymentStatus = 'REFUNDED';
    }
    if (newStatus === 'PAYMENT_VERIFIED') {
      updateData.paymentStatus = 'PAID';
    }
    if (newStatus === 'CANCELLED') {
      updateData.paymentStatus = order.paymentMethod === 'COD' ? 'PENDING' : 'REFUNDED';
    }

    const updated = await this.prisma.order.update({ where: { id }, data: updateData });

    // Side effects
    if (newStatus === 'PAYMENT_VERIFIED') {
      await this.inventory.confirm(id).catch(e =>
        this.logger.error(`Inventory confirm failed for ${id}: ${e.message}`)
      );
    }

    if (newStatus === 'CANCELLED') {
      await this.inventory.rollback(id, actorId).catch(e =>
        this.logger.error(`Inventory rollback failed for ${id}: ${e.message}`)
      );
    }

    if (newStatus === 'RETURNED') {
      await this.inventory.restockOnReturn(id).catch(e =>
        this.logger.error(`Restock failed for ${id}: ${e.message}`)
      );
    }

    // Log status history
    await this.statusHistory.append({
      orderId: id,
      fromStatus,
      toStatus: newStatus,
      actorId,
      actorRole: actorRole as any,
      notes: extra?.notes,
      metadata: {
        awbCode: extra?.awbCode,
        refundId: extra?.refundId,
        pickupSlot: extra?.pickupSlot,
      },
    });

    // Send notification
    const notifMap: Record<string, string> = {
      CONFIRMED:          'ORDER_CONFIRMED',
      SHIPPED:            'ORDER_SHIPPED',
      IN_TRANSIT:         'ORDER_SHIPPED',
      OUT_FOR_DELIVERY:   'ORDER_OUT_FOR_DELIVERY',
      DELIVERED:          'ORDER_DELIVERED',
      CANCELLED:          'ORDER_CANCELLED',
      RETURN_APPROVED:    'RETURN_UPDATE',
      RETURN_REJECTED:    'RETURN_UPDATE',
      PICKUP_SCHEDULED:   'RETURN_UPDATE',
      REFUND_INITIATED:   'REFUND_UPDATE',
      REFUNDED:           'REFUND_UPDATE',
    };
    const notifType = notifMap[toStatus];
    if (notifType && order.userId) {
      await this.notificationsService
        .sendOrderNotification(order.userId, notifType as any, id, order.orderNumber)
        .catch(() => {});
    }

    // AWS SES transactional emails per status
    if (order.user?.email) {
      const email = order.user.email;
      const name = order.user.name || 'Customer';
      const orderNum = order.orderNumber;

      if (toStatus === 'SHIPPED') {
        this.emailService.sendOrderShipped(email, {
          customerName: name,
          orderNumber: orderNum,
          courier: extra?.courierName || 'Courier Partner',
          awbCode: extra?.awbCode || 'N/A',
          trackingUrl: extra?.trackingUrl,
        }).catch(() => {});
      } else if (toStatus === 'DELIVERED') {
        this.emailService.sendOrderDelivered(email, {
          customerName: name,
          orderNumber: orderNum,
        }).catch(() => {});
      } else if (toStatus === 'CANCELLED') {
        this.emailService.sendOrderCancelled(email, {
          customerName: name,
          orderNumber: orderNum,
          reason: extra?.cancelReason,
        }).catch(() => {});
      }
    }

    return updated;
  }

  // ─────────────────────────────────────────────
  // CUSTOMER: CANCEL
  // ─────────────────────────────────────────────

  async cancel(id: string, userId: string, reason: string) {
    const order = await this.prisma.order.findFirst({ where: { id, userId } });
    if (!order) throw new NotFoundException('Order not found');

    const cancellableStatuses: OrderStatus[] = [
      'PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'CONFIRMED', 'INVENTORY_RESERVED',
      'PROCESSING', 'PICKING',
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    const isPaid = order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'PAID';

    await this.prisma.order.update({
      where: { id },
      data: { 
        status: 'CANCELLED', 
        cancelReason: reason,
        ...(isPaid && { paymentStatus: 'REFUND_INITIATED' }),
      },
    });

    // Rollback inventory
    await this.inventory.rollback(id, userId).catch(e =>
      this.logger.error(`Inventory rollback on cancel failed for ${id}: ${e.message}`)
    );

    // Process refund automatically if paid
    if (isPaid) {
      try {
        await this.paymentsService.processRefund(id);
      } catch (err) {
        this.logger.error(`Auto refund failed on cancellation for order ${id}: ${err.message}`);
      }
    }

    // Log
    await this.statusHistory.append({
      orderId: id,
      fromStatus: order.status,
      toStatus: 'CANCELLED',
      actorId: userId,
      actorRole: 'CUSTOMER',
      notes: reason,
    });

    await this.notificationsService
      .sendOrderNotification(userId, 'ORDER_CANCELLED', id, order.orderNumber)
      .catch(() => {});

    return { success: true, message: 'Order cancelled successfully' };
  }

  // ─────────────────────────────────────────────
  // CUSTOMER: RETURN
  // ─────────────────────────────────────────────

  async requestReturn(id: string, userId: string, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Can only request return for delivered orders');
    }

    // Check return window
    const firstItem = order.items[0] as any;
    const returnDays = firstItem?.returnDays ?? 14;
    const returnEnabled = firstItem?.returnEnabled ?? true;

    if (!returnEnabled) {
      throw new ForbiddenException('This product is not eligible for return');
    }

    if (order.deliveredAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(order.deliveredAt).getTime()) / 86400000,
      );
      if (daysSince > returnDays) {
        throw new BadRequestException(
          `Return window of ${returnDays} days has expired (${daysSince} days since delivery)`,
        );
      }
    }

    await this.prisma.order.update({
      where: { id },
      data: {
        status: 'RETURN_REQUESTED',
        returnReason: reason,
        returnRequestedAt: new Date(),
      },
    });

    await this.statusHistory.append({
      orderId: id,
      fromStatus: 'DELIVERED',
      toStatus: 'RETURN_REQUESTED',
      actorId: userId,
      actorRole: 'CUSTOMER',
      notes: reason,
    });

    await this.notificationsService
      .sendOrderNotification(userId, 'RETURN_UPDATE', id, order.orderNumber)
      .catch(() => {});

    this.notificationsService
      .sendAdminAlert('ORDER_PLACED', {
        orderId: id, orderNumber: order.orderNumber, reason,
        event: 'RETURN_REQUESTED',
      })
      .catch(() => {});

    return { success: true, message: 'Return request submitted' };
  }

  // ─────────────────────────────────────────────
  // CUSTOMER: REPLACEMENT REQUEST
  // ─────────────────────────────────────────────

  async requestReplacement(
    id: string,
    userId: string,
    reason: string,
    replacementVariantId?: string, // new variant the customer wants
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Can only request replacement for delivered orders');
    }

    // Check replace window & eligibility
    const firstItem = order.items[0] as any;
    const returnDays = firstItem?.returnDays ?? 14;
    const replaceEnabled = firstItem?.replaceEnabled !== false;

    if (!replaceEnabled) {
      throw new ForbiddenException('This product is not eligible for replacement');
    }

    if (order.deliveredAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(order.deliveredAt).getTime()) / 86400000,
      );
      if (daysSince > returnDays) {
        throw new BadRequestException(
          `Replacement window of ${returnDays} days has expired (${daysSince} days since delivery)`,
        );
      }
    }

    // If a specific replacement variant is requested, validate stock
    if (replacementVariantId) {
      const newVariant = await this.prisma.productVariant.findUnique({
        where: { id: replacementVariantId },
        select: { id: true, stock: true, reservedStock: true, size: true, sku: true },
      });

      if (!newVariant) throw new NotFoundException('Replacement variant not found');

      const available = newVariant.stock - newVariant.reservedStock;
      if (available < 1) {
        throw new BadRequestException(
          `Size ${newVariant.size || newVariant.sku} is out of stock. Cannot process replacement.`,
        );
      }

      // Atomically swap stock:
      // 1. Return old variant stock (for each order item that matches)
      // 2. Deduct new variant stock (reserve it for replacement)
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const oldVariantId = item.variantId;

          // Restore stock for returned variant
          const oldVariant = await tx.productVariant.findUnique({
            where: { id: oldVariantId },
            select: { stock: true },
          });
          const restoredStock = (oldVariant?.stock ?? 0) + item.quantity;
          await tx.productVariant.update({
            where: { id: oldVariantId },
            data: { stock: restoredStock },
          });

          await tx.$executeRawUnsafe(
            `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","notes","createdAt")
             VALUES (gen_random_uuid(),$1,'RESTOCKED'::"InventoryMovementType",$2,$3,$4,$5,'Stock returned for replacement item',NOW())`,
            oldVariantId, item.quantity,
            oldVariant?.stock ?? 0, restoredStock, id,
          );
        }

        // Deduct replacement variant stock
        const replacementQty = order.items[0]?.quantity ?? 1;
        const variantBefore = await tx.productVariant.findUnique({
          where: { id: replacementVariantId },
          select: { stock: true, reservedStock: true },
        });
        const newStock = Math.max(0, (variantBefore?.stock ?? 0) - replacementQty);
        await tx.productVariant.update({
          where: { id: replacementVariantId },
          data: { stock: newStock },
        });

        await tx.$executeRawUnsafe(
          `INSERT INTO "inventory_logs" ("id","variantId","type","quantity","stockBefore","stockAfter","orderId","notes","createdAt")
           VALUES (gen_random_uuid(),$1,'DEDUCTED'::"InventoryMovementType",$2,$3,$4,$5,'Stock reserved for replacement dispatch',NOW())`,
          replacementVariantId, replacementQty,
          variantBefore?.stock ?? 0, newStock, id,
        );
      });
    }

    // Mark order as RETURN_REQUESTED (replacement handled by admin via status flow)
    await this.prisma.order.update({
      where: { id },
      data: {
        status: 'RETURN_REQUESTED',
        returnReason: `REPLACEMENT: ${reason}${replacementVariantId ? ` | New variant: ${replacementVariantId}` : ''}`,
        returnRequestedAt: new Date(),
      },
    });

    await this.statusHistory.append({
      orderId: id,
      fromStatus: 'DELIVERED',
      toStatus: 'RETURN_REQUESTED',
      actorId: userId,
      actorRole: 'CUSTOMER',
      notes: `Replacement requested: ${reason}${replacementVariantId ? ' (stock swapped)' : ''}`,
    });

    await this.notificationsService
      .sendOrderNotification(userId, 'RETURN_UPDATE', id, order.orderNumber)
      .catch(() => {});

    this.notificationsService
      .sendAdminAlert('ORDER_PLACED', {
        orderId: id, orderNumber: order.orderNumber, reason,
        event: 'REPLACEMENT_REQUESTED',
        replacementVariantId,
      })
      .catch(() => {});

    return {
      success: true,
      message: replacementVariantId
        ? 'Replacement request submitted. Stock has been swapped.'
        : 'Replacement request submitted.',
    };
  }

  // ─────────────────────────────────────────────
  // STATUS HISTORY
  // ─────────────────────────────────────────────

  async getStatusHistory(orderId: string, userId?: string) {
    if (userId) {
      const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
      if (!order) throw new NotFoundException('Order not found');
    }
    return this.statusHistory.findByOrder(orderId);
  }

  // ─────────────────────────────────────────────
  // PRIVATE: COUPON VALIDATION
  // ─────────────────────────────────────────────

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

    // Check per-user usage
    const userUsage = await this.prisma.order.count({
      where: { userId, couponId: coupon.id, status: { not: 'CANCELLED' } },
    });
    if (userUsage >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (subtotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount)
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    } else if (coupon.type === 'FLAT') {
      discountAmount = Math.min(Number(coupon.value), subtotal);
    } else if (coupon.type === 'FREE_SHIPPING') {
      discountAmount = 0;
    }

    return { ...coupon, discountAmount };
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async autoUpdateShippedOrders() {
    this.logger.log('Running background auto-update for shipped orders...');
    try {
      const activeOrders = await this.prisma.order.findMany({
        where: {
          status: {
            in: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
          },
          awbCode: {
            not: null,
          },
        },
        select: {
          id: true,
          orderNumber: true,
        },
      });

      this.logger.log(`Found ${activeOrders.length} active orders to track.`);
      for (const order of activeOrders) {
        try {
          await this.trackOrder(order.id);
        } catch (err) {
          this.logger.error(`Failed to track order ${order.orderNumber} in background: ${err.message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Error in autoUpdateShippedOrders cron: ${e.message}`);
    }
  }

  private getTrackingUrlHelper(courierName: string, awb: string): string {
    if (!awb || !courierName) return '';
    const cleanAwb = awb.trim();
    const cleanCourier = courierName.toLowerCase();

    if (cleanAwb.toUpperCase() === 'CA807216051IN') {
      return 'https://www.indiapost.gov.in/track-result/article-tracking/0r4f1i74jbzp0d1770hgym1lptx4azuw03eo24ut810bvxh';
    }

    if (/indi(a|an)\s*post/i.test(cleanCourier)) {
      return 'https://www.indiapost.gov.in/_layouts/15/dop.online.tracking/trackconsignment.aspx';
    }
    if (/dtdc/i.test(cleanCourier)) {
      return `https://www.dtdc.in/tracking/tracking-results.xhtml?shipmentNumber=${cleanAwb}`;
    }
    if (/blue\s*dart/i.test(cleanCourier)) {
      return `https://www.bluedart.com/web/guest/track-dart-details?waybill=${cleanAwb}`;
    }
    if (/delhivery/i.test(cleanCourier)) {
      return `https://www.delhivery.com/track/share?reftype=lrn&refNo=${cleanAwb}`;
    }
    if (/ekart/i.test(cleanCourier)) {
      return `https://ekartlogistics.com/shipmenttrack/${cleanAwb}`;
    }
    if (/xpressbees/i.test(cleanCourier)) {
      return `https://www.xpressbees.com/shipment/tracking?awb=${cleanAwb}`;
    }
    return '';
  }
}
