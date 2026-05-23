import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async create(dto: any) {
    return this.prisma.coupon.create({ data: dto });
  }

  async update(id: string, dto: any) {
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.coupon.delete({ where: { id } });
  }

  async validate(code: string, subtotal: number, userId?: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.toUpperCase().trim(), isActive: true },
    });

    if (!coupon) throw new BadRequestException('Invalid or expired coupon code.');

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now)
      throw new BadRequestException('Coupon is not yet active.');
    if (coupon.expiresAt && coupon.expiresAt < now)
      throw new BadRequestException('Coupon has expired.');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
      throw new BadRequestException('Coupon usage limit reached.');
    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue))
      throw new BadRequestException(`Minimum order value of ₹${coupon.minOrderValue} required.`);

    // ── Per-user limit check ────────────────────────────────────────────────
    if (userId && coupon.perUserLimit > 0) {
      const usedByUser = await this.prisma.order.count({
        where: {
          userId,
          couponId: coupon.id,
        },
      });
      if (usedByUser >= coupon.perUserLimit) {
        throw new BadRequestException(
          coupon.perUserLimit === 1
            ? 'You have already used this coupon.'
            : `You can only use this coupon ${coupon.perUserLimit} time(s). Limit reached.`,
        );
      }
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = Math.round((subtotal * Number(coupon.value)) / 100);
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else {
      // FIXED
      discount = Math.min(Number(coupon.value), subtotal);
    }

    return { discount, coupon };
  }
}
