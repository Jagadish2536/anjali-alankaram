import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { OffersService } from '../offers/offers.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private offersService: OffersService,
  ) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                basePrice: true,
                salePrice: true,
                status: true,
                categoryId: true,
              },
            },
            variant: {
              select: {
                id: true,
                size: true,
                color: true,
                colorHex: true,
                stock: true,
                extraPrice: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true, variant: true } } },
      });
    }

    // Cleanup any items belonging to archived or draft products
    const inactiveItems = cart.items.filter(item => item.product.status !== 'ACTIVE');
    if (inactiveItems.length > 0) {
      await this.prisma.cartItem.deleteMany({
        where: { id: { in: inactiveItems.map(item => item.id) } }
      });
      return this.getCart(userId);
    }

    const subtotal = cart.items.reduce((sum, item) => {
      const price = Number(item.product.salePrice || item.product.basePrice) +
        Number(item.variant.extraPrice);
      return sum + price * item.quantity;
    }, 0);

    const appliedOffer = await this.offersService.calculateBestOffer(cart.items);

    return { ...cart, subtotal, itemCount: cart.items.length, appliedOffer };
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: true },
    });

    if (!variant || !variant.isActive) throw new NotFoundException('Product variant not found');
    if (variant.stock < dto.quantity) throw new BadRequestException('Insufficient stock');
    if (variant.product.status !== 'ACTIVE') throw new BadRequestException('Product is not available');

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } },
    });

    if (existing) {
      const newQty = existing.quantity + dto.quantity;
      if (newQty > variant.stock) throw new BadRequestException('Insufficient stock');
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: variant.productId,
          variantId: dto.variantId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: true },
    });

    if (!item) throw new NotFoundException('Cart item not found');
    if (item.variant.stock < quantity) throw new BadRequestException('Insufficient stock');

    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { message: 'Cart cleared' };
  }
}
