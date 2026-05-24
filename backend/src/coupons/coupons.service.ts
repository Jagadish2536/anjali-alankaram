import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Sanitize raw DTO to correct Prisma types (strings → numbers → dates) */
  private sanitize(dto: any) {
    const out: any = { ...dto };

    // Uppercase code
    if (out.code) out.code = String(out.code).toUpperCase().trim();

    // Decimal fields
    for (const f of ['value', 'minOrderValue', 'maxDiscount']) {
      if (out[f] !== undefined && out[f] !== null && out[f] !== '') {
        out[f] = parseFloat(String(out[f]));
      } else if (out[f] === '') {
        out[f] = null;
      }
    }

    // Integer fields
    for (const f of ['usageLimit', 'perUserLimit']) {
      if (out[f] !== undefined && out[f] !== null && out[f] !== '') {
        out[f] = parseInt(String(out[f]), 10);
      } else if (out[f] === '') {
        out[f] = null;
      }
    }

    // Date fields
    for (const f of ['startsAt', 'expiresAt']) {
      if (out[f] && out[f] !== '') {
        out[f] = new Date(out[f]);
      } else if (out[f] === '' || out[f] === null) {
        out[f] = null;
      }
    }

    // Boolean
    if (out.isActive !== undefined) out.isActive = Boolean(out.isActive);

    // Remove undefined / unknown keys that Prisma would reject
    for (const key of Object.keys(out)) {
      if (out[key] === undefined) delete out[key];
    }

    return out;
  }

  async create(dto: any) {
    return this.prisma.coupon.create({ data: this.sanitize(dto) });
  }

  async update(id: string, dto: any) {
    return this.prisma.coupon.update({ where: { id }, data: this.sanitize(dto) });
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
        where: { userId, couponId: coupon.id },
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
      // FIXED / FREE_SHIPPING
      discount = Math.min(Number(coupon.value), subtotal);
    }

    return { discount, coupon };
  }
}
