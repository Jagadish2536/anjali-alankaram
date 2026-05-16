import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(dto: any) {
    return this.prisma.coupon.create({ data: dto });
  }

  async update(id: string, dto: any) {
    return this.prisma.coupon.update({
      where: { id },
      data: dto
    });
  }

  async remove(id: string) {
    return this.prisma.coupon.delete({ where: { id } });
  }
}
