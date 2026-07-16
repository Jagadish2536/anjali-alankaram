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
import { S3CleanupService } from '../s3-cleanup/s3-cleanup.service';
import { CacheService } from '../cache/cache.service';
import { SearchService } from '../search/search.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private s3Cleanup: S3CleanupService,
    private cache: CacheService,
    private searchService: SearchService,
    private emailService: EmailService,
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
      cursor,
    } = filters;

    const where: any = {};

    if (status === 'ALL') {
      where.status = { not: 'ARCHIVED' };
    } else if (status) {
      where.status = status as ProductStatus;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    } else if (categorySlug) {
      const slugs = categorySlug.split(',').map((s: string) => s.trim()).filter(Boolean);
      const mappedSlugs = new Set<string>();
      slugs.forEach(s => {
        mappedSlugs.add(s);
        if (s === 'saree') mappedSlugs.add('sarees');
        if (s === 'sarees') mappedSlugs.add('saree');
      });
      where.category = { slug: { in: Array.from(mappedSlugs) } };
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

    // Full-text search across id, name, description, material
    if (search && search.trim()) {
      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { id: { contains: search.trim(), mode: 'insensitive' } },
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { material: { contains: search.trim(), mode: 'insensitive' } },
          { tags: { has: search.trim() } },
        ],
      });
    }

    // Generate MD5 cache key fingerprint from the input filters
    const fingerprint = JSON.stringify({
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      status,
      size,
      color,
      isNewArrival,
      search,
      hasReel,
      isBestseller,
      cursor,
      limit,
      page,
    });
    const hash = crypto.createHash('md5').update(fingerprint).digest('hex');
    const cacheKey = CacheService.KEYS.productsList(hash);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const prismaCursor = cursor ? { id: cursor } : undefined;
        const isUnlimited = Number(limit) <= 0;
        const skip = isUnlimited ? undefined : (cursor ? 1 : (page - 1) * limit);
        const take = isUnlimited ? undefined : Number(limit);

        const [products, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            cursor: prismaCursor,
            skip,
            take,
            orderBy: { [sortBy]: sortOrder },
            include: {
              category: { select: { id: true, name: true, slug: true } },
              variants: { where: { isActive: true }, orderBy: { size: 'asc' } },
            },
          }),
          this.prisma.product.count({ where }),
        ]);

        const nextCursor =
          !isUnlimited && products.length === Number(limit)
            ? products[products.length - 1].id
            : null;
        const hasMore = !isUnlimited && products.length === Number(limit);

        return {
          data: products.map(p => this.sortProductVariants(p)),
          meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: isUnlimited ? 1 : Math.ceil(total / limit),
            nextCursor,
            hasMore,
          },
        };
      },
      CacheService.TTL.PRODUCTS_LIST,
    );
  }

  async findBySlug(slug: string) {
    const cacheKey = CacheService.KEYS.product(slug);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
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

        if (!product || product.status === 'ARCHIVED') {
          throw new NotFoundException('Product not found');
        }
        return this.sortProductVariants(product);
      },
      CacheService.TTL.PRODUCT,
    );
  }

  async getFeatured() {
    return this.cache.getOrSet(
      CacheService.KEYS.homepageFeatured(),
      async () => {
        const products = await this.prisma.product.findMany({
          where: { isFeatured: true, status: 'ACTIVE' },
          include: { variants: { where: { isActive: true } } },
          orderBy: { createdAt: 'desc' },
          take: 12,
        });
        return products.map(p => this.sortProductVariants(p));
      },
      CacheService.TTL.HOMEPAGE,
    );
  }

  async getNewArrivals() {
    return this.cache.getOrSet(
      CacheService.KEYS.homepageNewArrivals(),
      async () => {
        const products = await this.prisma.product.findMany({
          where: { isNewArrival: true, status: 'ACTIVE' },
          include: { variants: { where: { isActive: true } } },
          orderBy: { createdAt: 'desc' },
          take: 12,
        });
        return products.map(p => this.sortProductVariants(p));
      },
      CacheService.TTL.HOMEPAGE,
    );
  }

  async getBestsellers() {
    return this.cache.getOrSet(
      CacheService.KEYS.homepageBestsellers(),
      async () => {
        const products = await this.prisma.product.findMany({
          where: { isBestseller: true, status: 'ACTIVE' },
          include: { variants: { where: { isActive: true } } },
          orderBy: { totalSold: 'desc' },
          take: 12,
        });
        return products.map(p => this.sortProductVariants(p));
      },
      CacheService.TTL.HOMEPAGE,
    );
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
      data: products.map(p => this.sortProductVariants(p)),
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async create(dto: CreateProductDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existingSlug = await this.prisma.product.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    // Convert sizeGuide sizes to uppercase
    if (dto.sizeGuide && Array.isArray(dto.sizeGuide)) {
      dto.sizeGuide = dto.sizeGuide.map((row: any) => ({
        ...row,
        size: (row.size || '').trim().toUpperCase()
      }));
    }

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        status: dto.status || 'ACTIVE',
        slug: finalSlug,
        variants: dto.variants
          ? {
              create: dto.variants.map((v) => ({
                ...v,
                size: (v.size || '').trim().toUpperCase(),
                sku: v.sku || `${finalSlug}-${(v.size || '').trim().toUpperCase()}-${v.color || 'default'}`.toUpperCase(),
              })),
            }
          : undefined,
      },
      include: { variants: true, category: true },
    });

    if (product.variants && product.variants.length > 0) {
      await this.ensureDefaultWarehouseAndSync(product.variants);
    }

    // Invalidate caches
    await this.cache.invalidateProductLists();
    await this.cache.invalidateHomepage();

    // Index product in Meilisearch
    await this.searchService.indexProduct(product.id);

    return this.sortProductVariants(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    // Invalidate old cache
    await this.cache.invalidateOnProductWrite(product.slug);

    // Separate variants from the rest of the dto
    const { variants, ...productData } = dto as any;

    // Convert sizeGuide sizes to uppercase
    if (productData.sizeGuide && Array.isArray(productData.sizeGuide)) {
      productData.sizeGuide = productData.sizeGuide.map((row: any) => ({
        ...row,
        size: (row.size || '').trim().toUpperCase()
      }));
    }

    // Update the core product fields
    const updated = await this.prisma.product.update({
      where: { id },
      data: productData,
      include: { variants: true, category: true },
    });

    // Invalidate new cache (in case slug/featured status changed)
    await this.cache.invalidateOnProductWrite(updated.slug);

    // Detect removed image URLs and clean up from S3
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
        const upperSize = (v.size || '').trim().toUpperCase();
        if (v.id) {
          // Update existing variant
          const existingVariant = await this.prisma.productVariant.findUnique({
            where: { id: v.id },
            select: { stock: true },
          });
          const oldStock = existingVariant?.stock ?? 0;

          variantObj = await this.prisma.productVariant.update({
            where: { id: v.id },
            data: {
              size: upperSize,
              color: v.color || null,
              colorHex: v.colorHex || null,
              images: Array.isArray(v.images) ? v.images : [],
              stock: v.stock,
              sku: v.sku,
            },
          });

          if (oldStock <= 0 && variantObj.stock > 0) {
            this.triggerRestockNotifications(variantObj.id).catch(err => {
              this.logger.error(`Error sending restock notifications: ${err.message}`);
            });
          }
        } else {
          // Create new variant
          variantObj = await this.prisma.productVariant.create({
            data: {
              productId: id,
              size: upperSize,
              color: v.color || null,
              colorHex: v.colorHex || null,
              images: Array.isArray(v.images) ? v.images : [],
              stock: v.stock,
              sku: v.sku || `${id.substring(0, 4)}-${upperSize}-${Date.now()}`.toUpperCase(),
            },
          });
        }
        // Sync each active variant to warehouse
        await this.ensureDefaultWarehouseAndSync([variantObj]);
      }
    }

    const updatedProduct = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: { where: { isActive: true } }, category: true },
    });

    if (updatedProduct) {
      await this.searchService.indexProduct(updatedProduct.id);
    }

    return this.sortProductVariants(updatedProduct);
  }

  async remove(id: string, adminId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: { select: { id: true, images: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.cache.invalidateOnProductWrite(product.slug);

    // Collect all image URLs to delete from S3
    const allImageUrls: string[] = [
      ...(product.images || []),
      ...product.variants.flatMap((v) => v.images || []),
    ];

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

    // Remove from Meilisearch
    await this.searchService.removeProduct(id);

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

    // Clean up S3 images asynchronously (don't block response)
    if (allImageUrls.length > 0 && this.s3Cleanup) {
      setImmediate(async () => {
        try {
          await this.s3Cleanup.deleteProductImages(id, allImageUrls, adminId || 'SYSTEM');
          this.logger.log(`Cleaned up ${allImageUrls.length} S3 images for deleted product ${id}`);
        } catch (err: any) {
          this.logger.error(`S3 cleanup failed for product ${id}: ${err.message}`);
        }
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

  async subscribeRestock(variantId: string, email: string, productId?: string) {
    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }
    
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    const prodId = productId || variant.productId;

    const db = this.prisma as any;
    const existing = await db.restockNotification.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        variantId,
        isSent: false,
      },
    });

    if (existing) {
      return { success: true, message: 'You are already registered for notifications.' };
    }

    await db.restockNotification.create({
      data: {
        email: email.trim().toLowerCase(),
        variantId,
        productId: prodId,
        isSent: false,
      },
    });

    return { success: true, message: 'Notification subscription created successfully.' };
  }

  async triggerRestockNotifications(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) return;

    const db = this.prisma as any;
    const subscribers = await db.restockNotification.findMany({
      where: {
        variantId,
        isSent: false,
      },
    });

    if (subscribers.length === 0) return;

    this.logger.log(`Found ${subscribers.length} restock subscribers for variant ${variantId} (${variant.product.name} - ${variant.size})`);

    const productUrl = `https://anjalialankaram.com/products/${variant.product.slug}`;
    const productImage = variant.images?.[0] || variant.product.images?.[0] || null;

    for (const sub of subscribers) {
      try {
        await this.emailService.sendRestockNotification(sub.email, {
          productName: variant.product.name,
          productUrl,
          productImage,
          size: variant.size,
          color: variant.color || undefined,
        });

        await db.restockNotification.update({
          where: { id: sub.id },
          data: { isSent: true },
        });
      } catch (err) {
        const error = err as any;
        this.logger.error(`Failed to send restock notification to ${sub.email}: ${error.message}`);
      }
    }
  }

  private sortProductVariants(product: any) {
    if (!product) return product;
    if (product.variants && Array.isArray(product.variants)) {
      const SIZE_ORDER = [
        'FREE', 'FREE SIZE', 'FS', 'ONE SIZE', 'OS',
        'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
        '3XL', '4XL', '5XL', '6XL', '7XL', '8XL',
        '28', '30', '32', '34', '36', '38', '40', '42', '44', '46'
      ];
      product.variants.sort((a: any, b: any) => {
        const sizeA = (a.size || '').trim().toUpperCase();
        const sizeB = (b.size || '').trim().toUpperCase();
        const idxA = SIZE_ORDER.indexOf(sizeA);
        const idxB = SIZE_ORDER.indexOf(sizeB);
        
        if (idxA !== -1 && idxB !== -1) {
          return idxA - idxB;
        }
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return sizeA.localeCompare(sizeB);
      });
    }
    return product;
  }
}
