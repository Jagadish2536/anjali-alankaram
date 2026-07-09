import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MeiliSearch, Index } from 'meilisearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: MeiliSearch | null = null;
  private index: Index | null = null;
  private isEnabled = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    const host = this.config.get<string>('MEILISEARCH_HOST') || null;
    const apiKey = this.config.get<string>('MEILISEARCH_KEY') || null;

    if (host) {
      try {
        this.client = new MeiliSearch({ host, apiKey });
        // Create or get the 'products' index
        this.index = this.client.index('products');
        
        // Configure index settings
        await this.index.updateSettings({
          searchableAttributes: ['name', 'description', 'categoryName', 'tags', 'material'],
          filterableAttributes: ['status', 'categoryId', 'salePrice', 'basePrice', 'stock'],
          sortableAttributes: ['createdAt', 'salePrice', 'basePrice', 'name'],
          rankingRules: [
            'words',
            'typo',
            'proximity',
            'attribute',
            'exactness',
          ],
        });

        this.isEnabled = true;
        this.logger.log(`Meilisearch initialized at ${host} successfully.`);
        
        // Asynchronously check and sync index if empty
        setImmediate(() => this.syncIfEmpty());
      } catch (err: any) {
        this.logger.error(`Failed to initialize Meilisearch: ${err.message}. Falling back to DB search.`);
        this.isEnabled = false;
      }
    } else {
      this.logger.warn('MEILISEARCH_HOST is not configured. Falling back to DB search.');
    }
  }

  /**
   * Sync a single product in Meilisearch
   */
  async indexProduct(productId: string): Promise<void> {
    if (!this.isEnabled || !this.index) return;

    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: { select: { name: true } },
          variants: { where: { isActive: true } },
        },
      });

      if (!product || product.status === 'ARCHIVED') {
        await this.removeProduct(productId);
        return;
      }

      // Calculate total stock
      const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);

      await this.index.addDocuments([{
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryName: product.category?.name || '',
        categoryId: product.categoryId || '',
        tags: product.tags || [],
        material: product.material || '',
        basePrice: Number(product.basePrice),
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        stock: totalStock,
        status: product.status,
        images: product.images || [],
        createdAt: product.createdAt.getTime(),
      }]);

      this.logger.debug(`Indexed product ${productId} in Meilisearch`);
    } catch (err: any) {
      this.logger.error(`Failed to index product ${productId}: ${err.message}`);
    }
  }

  /**
   * Remove a product from Meilisearch
   */
  async removeProduct(productId: string): Promise<void> {
    if (!this.isEnabled || !this.index) return;

    try {
      await this.index.deleteDocument(productId);
      this.logger.debug(`Deleted product ${productId} from Meilisearch`);
    } catch (err: any) {
      this.logger.error(`Failed to delete product ${productId}: ${err.message}`);
    }
  }

  /**
   * Main Search Endpoint (with Graceful DB Fallback)
   */
  async searchProducts(
    query: string,
    filters: {
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const {
      categoryId,
      minPrice,
      maxPrice,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // ── FALLBACK MODE: Use Prisma Database query ──
    if (!this.isEnabled || !this.index) {
      this.logger.debug(`Meilisearch is inactive. Searching "${query}" via DB.`);
      
      const dbWhere: any = {
        status: 'ACTIVE',
      };

      if (categoryId) {
        dbWhere.categoryId = categoryId;
      }

      if (query && query.trim()) {
        dbWhere.OR = [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { description: { contains: query.trim(), mode: 'insensitive' } },
          { material: { contains: query.trim(), mode: 'insensitive' } },
          { tags: { has: query.trim() } },
        ];
      }

      if (minPrice || maxPrice) {
        const priceCond: any = {};
        if (minPrice) priceCond.gte = minPrice;
        if (maxPrice) priceCond.lte = maxPrice;
        dbWhere.OR = [
          { salePrice: { not: null, ...priceCond } },
          { salePrice: null, basePrice: priceCond },
        ];
      }

      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: dbWhere,
          skip: Number(offset),
          take: Number(limit),
          orderBy: { [sortBy]: sortOrder },
          include: { variants: { where: { isActive: true } } },
        }),
        this.prisma.product.count({ where: dbWhere }),
      ]);

      return {
        hits: products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          basePrice: Number(p.basePrice),
          salePrice: p.salePrice ? Number(p.salePrice) : null,
          images: p.images || [],
          stock: p.variants.reduce((sum, v) => sum + (v.stock || 0), 0),
        })),
        totalHits: total,
        processingTimeMs: 15,
        fallback: true,
      };
    }

    // ── MEILISEARCH MODE ──
    try {
      const searchFilters: string[] = ["status = 'ACTIVE'"];
      
      if (categoryId) {
        searchFilters.push(`categoryId = '${categoryId}'`);
      }

      if (minPrice !== undefined) {
        searchFilters.push(`basePrice >= ${minPrice} OR salePrice >= ${minPrice}`);
      }

      if (maxPrice !== undefined) {
        searchFilters.push(`basePrice <= ${maxPrice} OR salePrice <= ${maxPrice}`);
      }

      const searchParams: any = {
        filter: searchFilters.join(' AND '),
        limit: Number(limit),
        offset: Number(offset),
      };

      if (sortBy) {
        const order = sortOrder === 'desc' ? 'desc' : 'asc';
        // Map created at string
        const field = sortBy === 'createdAt' ? 'createdAt' : sortBy;
        searchParams.sort = [`${field}:${order}`];
      }

      const startTime = Date.now();
      const results = await this.index.search(query, searchParams);
      const duration = Date.now() - startTime;

      return {
        hits: results.hits,
        totalHits: results.estimatedTotalHits || results.hits.length,
        processingTimeMs: duration,
        fallback: false,
      };
    } catch (err: any) {
      this.logger.error(`Meilisearch query failed: ${err.message}. Falling back to DB.`);
      // Recursive fallback call with temporary disabling
      this.isEnabled = false;
      const res = await this.searchProducts(query, filters);
      this.isEnabled = true; // reset
      return res;
    }
  }

  /**
   * Sync all active products from DB to Meilisearch
   */
  async syncAllProducts(): Promise<number> {
    if (!this.isEnabled || !this.index) return 0;

    try {
      const products = await this.prisma.product.findMany({
        where: { status: { not: 'ARCHIVED' } },
        include: {
          category: { select: { name: true } },
          variants: { where: { isActive: true } },
        },
      });

      const docs = products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryName: p.category?.name || '',
        categoryId: p.categoryId || '',
        tags: p.tags || [],
        material: p.material || '',
        basePrice: Number(p.basePrice),
        salePrice: p.salePrice ? Number(p.salePrice) : null,
        stock: p.variants.reduce((sum, v) => sum + (v.stock || 0), 0),
        status: p.status,
        images: p.images || [],
        createdAt: p.createdAt.getTime(),
      }));

      if (docs.length > 0) {
        await this.index.addDocuments(docs);
      }

      this.logger.log(`Synced ${docs.length} products to Meilisearch index.`);
      return docs.length;
    } catch (err: any) {
      this.logger.error(`Sync all products failed: ${err.message}`);
      return 0;
    }
  }

  private async syncIfEmpty() {
    if (!this.index) return;
    try {
      const stats = await this.index.getStats();
      if (stats.numberOfDocuments === 0) {
        this.logger.log('Meilisearch index is empty. Starting initial sync...');
        await this.syncAllProducts();
      }
    } catch {}
  }
}
