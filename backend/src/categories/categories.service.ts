import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: { where: { isActive: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: any) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    return this.prisma.category.create({
      data: {
        ...dto,
        slug,
      },
    });
  }

  async update(id: string, dto: any) {
    if (dto.name) {
      dto.slug = slugify(dto.name, { lower: true, strict: true });
    }
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
