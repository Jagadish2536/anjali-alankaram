import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import slugify from 'slugify';
import { ProductFilterDto } from './dto/product-filter.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async findAll(filters: ProductFilterDto) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'ACTIVE',
      size,
      color,
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = { status: status as ProductStatus };

    if (categoryId) where.categoryId = categoryId;
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = minPrice;
      if (maxPrice) where.basePrice.lte = maxPrice;
    }
    if (size || color) {
      where.variants = {
        some: {
          ...(size && { size }),
          ...(color && { color }),
          isActive: true,
          stock: { gt: 0 },
        },
      };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: { where: { isActive: true }, orderBy: { size: 'asc' } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    const cacheKey = `product:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: { where: { isActive: true }, orderBy: { size: 'asc' } },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    await this.redis.setex(cacheKey, 300, JSON.stringify(product)); // 5min cache
    return product;
  }

  async getFeatured() {
    return this.prisma.product.findMany({
      where: { isFeatured: true, status: 'ACTIVE' },
      include: { variants: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
  }

  async getNewArrivals() {
    return this.prisma.product.findMany({
      where: { isNewArrival: true, status: 'ACTIVE' },
      include: { variants: { where: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
  }

  async getBestsellers() {
    return this.prisma.product.findMany({
      where: { isBestseller: true, status: 'ACTIVE' },
      include: { variants: { where: { isActive: true } } },
      orderBy: { totalSold: 'desc' },
      take: 12,
    });
  }

  async search(query: string, filters: ProductFilterDto) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } },
          ],
        },
        skip,
        take: Number(limit),
        include: { variants: { where: { isActive: true } } },
      }),
      this.prisma.product.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return {
      data: products,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateProductDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    return this.prisma.product.create({
      data: {
        ...dto,
        slug: finalSlug,
        variants: dto.variants
          ? {
              create: dto.variants.map((v) => ({
                ...v,
                sku: v.sku || `${finalSlug}-${v.size}-${v.color || 'default'}`.toUpperCase(),
              })),
            }
          : undefined,
      },
      include: { variants: true, category: true },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    // Invalidate cache
    await this.redis.del(`product:${product.slug}`);

    return this.prisma.product.update({
      where: { id },
      data: dto as any,
      include: { variants: true, category: true },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.redis.del(`product:${product.slug}`);
    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return { message: 'Product archived successfully' };
  }
}
