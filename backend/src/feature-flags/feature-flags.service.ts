import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  /**
   * Main flag check method (with Redis caching and percentage rollouts)
   */
  async isEnabled(key: string, userId?: string): Promise<boolean> {
    try {
      const cacheKey = CacheService.KEYS.featureFlag(key);
      
      // Try to fetch from Redis
      const cached = await this.cache.get<{ enabled: boolean; rolloutPct: number }>(cacheKey);
      
      let flag: { enabled: boolean; rolloutPct: number; description?: string };

      if (cached !== null) {
        flag = cached;
      } else {
        // Fetch from DB
        const dbFlag = await this.prisma.featureFlag.findUnique({
          where: { key },
        });

        if (!dbFlag) {
          // Default: flag does not exist -> disabled (fail-safe)
          return false;
        }

        flag = {
          enabled: dbFlag.enabled,
          rolloutPct: dbFlag.rolloutPct,
        };

        // Cache for 30 seconds
        await this.cache.set(cacheKey, flag, CacheService.TTL.FEATURE_FLAGS);
      }

      if (!flag.enabled) return false;

      // Handle percentage rollout if rolloutPct is less than 100
      if (flag.rolloutPct < 100) {
        if (!userId) {
          // If no user context, return false to be safe, or evaluate randomly
          return false;
        }
        
        // Consistent hashing: maps the user to a stable bucket [0, 99]
        const hash = crypto.createHash('md5').update(`${userId}:${key}`).digest('hex');
        const bucket = parseInt(hash.substring(0, 8), 16) % 100;
        
        return bucket < flag.rolloutPct;
      }

      return true;
    } catch (err: any) {
      this.logger.error(`Error checking feature flag "${key}": ${err.message}`);
      return false; // Fail-safe disabled
    }
  }

  /**
   * Set or update a feature flag (Admin-only)
   */
  async setFlag(
    key: string,
    enabled: boolean,
    rolloutPct = 100,
    description = '',
  ) {
    const updated = await this.prisma.featureFlag.upsert({
      where: { key },
      update: {
        enabled,
        rolloutPct,
        description,
      },
      create: {
        key,
        enabled,
        rolloutPct,
        description,
      },
    });

    // Invalidate Redis cache
    const cacheKey = CacheService.KEYS.featureFlag(key);
    await this.cache.del(cacheKey);

    this.logger.log(`Feature flag "${key}" set to: enabled=${enabled}, rolloutPct=${rolloutPct}`);
    return updated;
  }

  /**
   * Get all flags (for admin list)
   */
  async getAllFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(key: string) {
    try {
      await this.prisma.featureFlag.delete({
        where: { key },
      });
      const cacheKey = CacheService.KEYS.featureFlag(key);
      await this.cache.del(cacheKey);
      return true;
    } catch {
      return false;
    }
  }
}
