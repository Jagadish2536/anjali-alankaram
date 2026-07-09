import { Injectable, Inject, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Enterprise Redis Cache Service
 *
 * Namespaced cache with per-namespace TTLs and bulk invalidation patterns.
 * All cache keys follow: namespace:identifier
 *
 * TTL Reference:
 *   product     5 min   — product detail pages
 *   products    60s     — listing pages (changes often)
 *   categories  10 min  — rarely change
 *   homepage    5 min   — featured/new-arrivals sections
 *   banners     10 min  — hero banners
 *   settings    30 min  — store config
 *   search      2 min   — search results (short for freshness)
 *   ai:session  24h     — AI generation sessions
 *   ratelimit   1 min   — per-IP rate limit counters
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // TTL constants (seconds)
  static readonly TTL = {
    PRODUCT: 300,          // 5 min
    PRODUCTS_LIST: 60,     // 1 min
    CATEGORIES: 600,       // 10 min
    HOMEPAGE: 300,         // 5 min
    HERO: 1800,            // 30 min
    BANNERS: 600,          // 10 min
    SETTINGS: 1800,        // 30 min
    SEARCH: 120,           // 2 min
    AI_SESSION: 86400,     // 24 hours
    FEATURE_FLAGS: 30,     // 30 seconds
    RATELIMIT: 60,         // 1 min
  } as const;

  // Key prefix constants
  static readonly KEYS = {
    product:      (slug: string)    => `product:${slug}`,
    productsList: (fp: string)      => `products:list:${fp}`,
    categories:   ()                => `categories:all`,
    homepageFeatured: ()            => `homepage:featured`,
    homepageNewArrivals: ()         => `homepage:new-arrivals`,
    homepageBestsellers: ()         => `homepage:bestsellers`,
    homepageHero: ()                => `homepage:hero`,
    banners:      ()                => `banners:active`,
    settings:     ()                => `settings:store`,
    search:       (hash: string)    => `search:${hash}`,
    aiSession:    (id: string)      => `ai:session:${id}`,
    featureFlag:  (key: string)     => `ff:${key}`,
    rateLimit:    (ip: string, ep: string) => `rl:${ip}:${ep}`,
  } as const;

  private readonly memoryCache = new Map<string, { value: any; expiresAt: number }>();

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Get a cached value. Returns null if not found or on error.
   * Automatically falls back to local memory cache if Redis is offline/disconnected.
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. Try Redis if it is connected
    if (this.redis && this.redis.status === 'ready') {
      try {
        const val = await this.redis.get(key);
        if (val === null) return null;
        return JSON.parse(val) as T;
      } catch (err) {
        this.logger.warn(`Redis GET error for key "${key}", falling back to memory: ${err}`);
      }
    }

    // 2. Local Memory Fallback
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  }

  /**
   * Set a cached value with TTL (seconds).
   * Always updates the local memory cache and attempts Redis write if connected.
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    
    // Always keep updated in local memory store
    this.memoryCache.set(key, { value, expiresAt });

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        this.logger.warn(`Redis SET error for key "${key}": ${err}`);
      }
    }
  }

  /**
   * Delete a specific key.
   */
  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(key);
      } catch (err) {
        this.logger.warn(`Redis DEL error for key "${key}": ${err}`);
      }
    }
  }

  /**
   * Delete all keys matching a glob pattern.
   * Example: delPattern('products:list:*')
   *
   * Automatically clears local memory patterns and SCAN/DEL in Redis if connected.
   */
  async delPattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    // Clear matching keys in local memory
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }

    if (this.redis && this.redis.status === 'ready') {
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await this.redis.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100,
          );
          cursor = nextCursor;
          if (keys.length > 0) {
            await this.redis.del(...keys);
            deletedCount += keys.length;
          }
        } while (cursor !== '0');
      } catch (err) {
        this.logger.warn(`Redis SCAN/DEL error for pattern "${pattern}": ${err}`);
      }
    }

    return deletedCount;
  }

  /**
   * Cache-aside pattern: get from cache, or fetch + store.
   * Returns the fetched value even if caching fails.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    // Don't cache null/undefined — let the next request also try the DB
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Invalidate all homepage-related caches (call on any product/settings update).
   */
  async invalidateHomepage(): Promise<void> {
    await Promise.all([
      this.del(CacheService.KEYS.homepageFeatured()),
      this.del(CacheService.KEYS.homepageNewArrivals()),
      this.del(CacheService.KEYS.homepageBestsellers()),
      this.del(CacheService.KEYS.homepageHero()),
      this.del(CacheService.KEYS.banners()),
    ]);
  }

  /**
   * Invalidate all product list caches (call on any product write).
   */
  async invalidateProductLists(): Promise<void> {
    const deleted = await this.delPattern('products:list:*');
    this.logger.debug(`Invalidated ${deleted} product list cache entries`);
  }

  /**
   * Invalidate a single product cache (call on product update/delete).
   */
  async invalidateProduct(slug: string): Promise<void> {
    await this.del(CacheService.KEYS.product(slug));
  }

  /**
   * Invalidate everything related to a product update.
   */
  async invalidateOnProductWrite(slug: string): Promise<void> {
    await Promise.all([
      this.invalidateProduct(slug),
      this.invalidateProductLists(),
      this.invalidateHomepage(),
    ]);
  }

  /**
   * Check if Redis is healthy. Used in health endpoints.
   */
  async ping(): Promise<boolean> {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const res = await this.redis.ping();
        return res === 'PONG';
      } catch {
        return false;
      }
    }
    return false;
  }
}
