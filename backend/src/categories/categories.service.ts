import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
        _count: {
          select: { products: true }
        }
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: any) {
    const slug = slugify(dto.name, { lower: true, strict: true });

    // Force sizeGuide sizes to uppercase
    if (dto.sizeGuide && Array.isArray(dto.sizeGuide)) {
      dto.sizeGuide = dto.sizeGuide.map((row: any) => ({
        ...row,
        size: (row.size || '').trim().toUpperCase()
      }));
    }

    // Check if category with this slug already exists (including soft-deleted ones)
    const existing = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Category with this name already exists');
      } else {
        // Reactivate and update the existing soft-deleted category
        return this.prisma.category.update({
          where: { id: existing.id },
          data: {
            ...dto,
            isActive: true,
          },
        });
      }
    }

    return this.prisma.category.create({
      data: {
        ...dto,
        slug,
      },
    });
  }

  async update(id: string, dto: any) {
    if (dto.name) {
      const slug = slugify(dto.name, { lower: true, strict: true });
      const existing = await this.prisma.category.findUnique({
        where: { slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Category with this name already exists');
      }
      dto.slug = slug;
    }

    // Force sizeGuide sizes to uppercase
    if (dto.sizeGuide && Array.isArray(dto.sizeGuide)) {
      dto.sizeGuide = dto.sizeGuide.map((row: any) => ({
        ...row,
        size: (row.size || '').trim().toUpperCase()
      }));
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
