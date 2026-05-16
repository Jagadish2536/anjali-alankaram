import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: any) {
    return this.prisma.banner.create({ data: dto });
  }

  async update(id: string, dto: any) {
    return this.prisma.banner.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }
}
