import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async findAll(filters: ProductFilterDto) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'ACTIVE',
      size,
      color,
      isNewArrival,
      search,
      hasReel,
      isBestseller,
    } = filters;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (status === 'ALL') {
      where.status = { not: 'ARCHIVED' };
    } else if (status) {
      where.status = status as ProductStatus;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (isNewArrival === 'true') {
      where.isNewArrival = true;
    }

    if (isBestseller === 'true') {
      where.isBestseller = true;
    }

    // Filter for products that have an Instagram reel URL or a local video URL (for featured videos)
    if (hasReel === 'true') {
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { instagramReelUrl: { not: null } },
          { videoUrl: { not: null } }
        ]
      });
    }

    if (minPrice || maxPrice) {
      const priceCondition: any = {};
      if (minPrice) priceCondition.gte = minPrice;
      if (maxPrice) priceCondition.lte = maxPrice;

      // Match products where the effective price (salePrice if set, else basePrice) is in range
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { salePrice: { not: null, ...priceCondition } },
          { salePrice: null, basePrice: priceCondition },
        ],
      });
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

    // Full-text search across name, description, material
    if (search && search.trim()) {
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { material: { contains: search.trim(), mode: 'insensitive' } },
          { tags: { has: search.trim() } },
        ],
      });
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

    if (!product || product.status === 'ARCHIVED') throw new NotFoundException('Product not found');

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

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        status: dto.status || 'ACTIVE',
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

    if (product.variants && product.variants.length > 0) {
      await this.ensureDefaultWarehouseAndSync(product.variants);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    // Invalidate cache
    await this.redis.del(`product:${product.slug}`);

    // Separate variants from the rest of the dto
    const { variants, ...productData } = dto as any;

    // Update the core product fields
    const updated = await this.prisma.product.update({
      where: { id },
      data: productData,
      include: { variants: true, category: true },
    });

    // Upsert variants if provided
    if (variants && Array.isArray(variants)) {
      const payloadIds = variants.map((v) => v.id).filter(Boolean);

      // Find variants of this product that are not in the payload (being deactivated)
      const toDeactivate = await this.prisma.productVariant.findMany({
        where: {
          productId: id,
          id: { notIn: payloadIds },
          isActive: true,
        },
        select: { id: true },
      });
      const deactivateIds = toDeactivate.map((v) => v.id);

      await this.prisma.productVariant.updateMany({
        where: {
          productId: id,
          id: { notIn: payloadIds },
        },
        data: {
          isActive: false,
        },
      });

      if (deactivateIds.length > 0) {
        // Delete warehouse inventory for these deactivated variants
        await this.prisma.warehouseInventory.deleteMany({
          where: {
            variantId: { in: deactivateIds },
          },
        });
      }

      for (const v of variants) {
        let variantObj: any;
        if (v.id) {
          // Update existing variant
          variantObj = await this.prisma.productVariant.update({
            where: { id: v.id },
            data: {
              size: v.size,
              color: v.color || null,
              colorHex: v.colorHex || null,
              images: Array.isArray(v.images) ? v.images : [],
              stock: v.stock,
              sku: v.sku,
            },
          });
        } else {
          // Create new variant
          variantObj = await this.prisma.productVariant.create({
            data: {
              productId: id,
              size: v.size,
              color: v.color || null,
              colorHex: v.colorHex || null,
              images: Array.isArray(v.images) ? v.images : [],
              stock: v.stock,
              sku: v.sku || `${id.substring(0, 4)}-${v.size}-${Date.now()}`.toUpperCase(),
            },
          });
        }
        // Sync each active variant to warehouse
        await this.ensureDefaultWarehouseAndSync([variantObj]);
      }
    }

    return this.prisma.product.findUnique({
      where: { id },
      include: { variants: { where: { isActive: true }, orderBy: { size: 'asc' } }, category: true },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    await this.redis.del(`product:${product.slug}`);

    // Get all variant ids of this product
    const productVariants = await this.prisma.productVariant.findMany({
      where: { productId: id },
      select: { id: true },
    });
    const variantIds = productVariants.map((v) => v.id);

    // Archive product
    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    // Deactivate variants
    await this.prisma.productVariant.updateMany({
      where: { productId: id },
      data: { isActive: false },
    });

    if (variantIds.length > 0) {
      // Delete warehouse inventory records for this product's variants
      await this.prisma.warehouseInventory.deleteMany({
        where: {
          variantId: { in: variantIds },
        },
      });
    }

    return { message: 'Product archived successfully' };
  }

  private async ensureDefaultWarehouseAndSync(variants: any[]) {
    // 1. Find default or first warehouse
    let warehouse = await this.prisma.warehouse.findFirst({
      where: { isDefault: true },
    });
    if (!warehouse) {
      warehouse = await this.prisma.warehouse.findFirst();
    }
    // 2. If no warehouse exists, create a default one
    if (!warehouse) {
      warehouse = await this.prisma.warehouse.create({
        data: {
          name: 'Main Warehouse',
          code: 'WH-MAIN-01',
          address: 'Main Street, Bangalore',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          isDefault: true,
          status: 'ACTIVE',
        },
      });
    }

    // 3. Sync variants to the warehouse inventory
    for (const v of variants) {
      await this.prisma.warehouseInventory.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: warehouse.id,
            variantId: v.id,
          },
        },
        update: {
          quantity: v.stock,
        },
        create: {
          warehouseId: warehouse.id,
          variantId: v.id,
          quantity: v.stock,
          reserved: 0,
        },
      });
    }
  }

  async trackViewer(productIdOrSlug: string, visitorId: string): Promise<{ count: number }> {
    const redisKey = `product:viewers:${productIdOrSlug}`;
    const now = Date.now();
    const expiryWindow = 60 * 1000; // 60 seconds of inactivity
    const cutoff = now - expiryWindow;

    try {
      // Add the visitor with the current timestamp as score
      await this.redis.zadd(redisKey, now, visitorId);
      
      // Remove visitors who have not pinged recently
      await this.redis.zremrangebyscore(redisKey, '-inf', cutoff);
      
      // Get count of active viewers
      const count = await this.redis.zcard(redisKey);
      
      // Set key TTL to 2 minutes so it gets cleaned up automatically if abandoned
      await this.redis.expire(redisKey, 120);

      // Return count, ensuring we always return at least 1 (the current viewer)
      return { count: Math.max(1, count) };
    } catch (e) {
      this.logger.error(`Failed to track product viewers for ${productIdOrSlug}: ${e.message}`);
      // Graceful fallback to default count if Redis is down
      const mockCount = Math.floor(Math.random() * 10) + 5;
      return { count: mockCount };
    }
  }
}
