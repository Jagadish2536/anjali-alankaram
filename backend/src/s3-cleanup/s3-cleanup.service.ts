import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3CleanupService {
  private readonly logger = new Logger(S3CleanupService.name);
  private s3: AWS.S3;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.s3 = new AWS.S3({ region: this.config.get('AWS_REGION') });
  }

  // ── Safe single-object delete ───────────────────────────────────────────────
  // Verifies the key is not referenced anywhere before deleting
  async safeDeleteS3Object(
    key: string,
    adminId: string,
    skipReferenceCheck = false,
  ): Promise<boolean> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!key || !bucket) return false;

    // Skip deletion for empty or local URLs
    if (!key.startsWith('products/') && !key.startsWith('banners/') &&
        !key.startsWith('categories/') && !key.startsWith('temp-ai-images/') &&
        !key.startsWith('catalogues/') && !key.startsWith('hero/')) {
      this.logger.warn(`Skipping deletion of key with unrecognized prefix: ${key}`);
      return false;
    }

    if (!skipReferenceCheck) {
      const isReferenced = await this.isKeyReferencedAnywhere(key);
      if (isReferenced) {
        this.logger.log(`S3 key ${key} is still referenced — skipping deletion`);
        return false;
      }
    }

    try {
      await this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();
      this.logger.log(`Deleted S3 object: ${key}`);
      await this.writeAuditLog({ adminId, action: 'DELETE', s3Key: key });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to delete S3 object ${key}: ${err.message}`);
      await this.writeAuditLog({ adminId, action: 'DELETE', s3Key: key, success: false, errorMsg: err.message });
      return false;
    }
  }

  // ── Delete multiple S3 objects in batch ─────────────────────────────────────
  async batchDeleteS3Objects(keys: string[], adminId: string, skipReferenceCheck = false): Promise<number> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!keys.length || !bucket) return 0;

    const safeKeys: string[] = [];
    for (const key of keys) {
      if (!key) continue;
      if (skipReferenceCheck) {
        safeKeys.push(key);
      } else {
        const isRef = await this.isKeyReferencedAnywhere(key);
        if (!isRef) safeKeys.push(key);
      }
    }

    if (!safeKeys.length) return 0;

    // AWS batch delete — max 1000 per request
    const chunks = this.chunkArray(safeKeys, 1000);
    let deleted = 0;

    for (const chunk of chunks) {
      try {
        const result = await this.s3.deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((k) => ({ Key: k })),
            Quiet: false,
          },
        }).promise();

        deleted += result.Deleted?.length || 0;
        if (result.Errors?.length) {
          this.logger.warn(`Batch delete partial errors: ${JSON.stringify(result.Errors)}`);
        }
      } catch (err: any) {
        this.logger.error(`Batch delete failed: ${err.message}`);
      }
    }

    await this.writeAuditLog({
      adminId,
      action: 'DELETE',
      metadata: { batchSize: safeKeys.length, deleted },
    });

    return deleted;
  }

  // ── Delete all images for a product ─────────────────────────────────────────
  async deleteProductImages(
    productId: string,
    imageUrls: string[],
    adminId: string,
  ): Promise<void> {
    const keys = imageUrls
      .map((url) => this.extractS3KeyFromUrl(url))
      .filter(Boolean) as string[];

    if (keys.length > 0) {
      await this.batchDeleteS3Objects(keys, adminId);
    }

    // Also delete any AI-generated images in products/{productId}/
    await this.deleteS3Prefix(`products/${productId}/`, adminId);
  }

  // ── Delete all objects under an S3 prefix ───────────────────────────────────
  async deleteS3Prefix(prefix: string, adminId: string): Promise<number> {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) return 0;

    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const listResult = await this.s3.listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }).promise();

      const keys = (listResult.Contents || []).map((obj) => obj.Key!).filter(Boolean);
      if (keys.length > 0) {
        const count = await this.batchDeleteS3Objects(keys, adminId, true);
        deleted += count;
      }

      continuationToken = listResult.NextContinuationToken;
    } while (continuationToken);

    this.logger.log(`Deleted ${deleted} objects from prefix ${prefix}`);
    return deleted;
  }

  // ── Replace a product image (atomic swap) ────────────────────────────────────
  async replaceProductImage(
    productId: string,
    oldImageUrl: string | null,
    newImageUrl: string,
    adminId: string,
  ): Promise<void> {
    if (!oldImageUrl) return;

    const oldKey = this.extractS3KeyFromUrl(oldImageUrl);
    if (!oldKey) return;

    // Only delete old key if it's not the same as new key
    const newKey = this.extractS3KeyFromUrl(newImageUrl);
    if (oldKey === newKey) return;

    // Small delay to ensure new image is confirmed saved before deleting old
    setTimeout(async () => {
      await this.safeDeleteS3Object(oldKey, adminId);
    }, 2000);
  }

  // ── Replace a banner image ────────────────────────────────────────────────────
  async replaceBannerImage(
    oldImageUrl: string | null,
    adminId: string,
  ): Promise<void> {
    if (!oldImageUrl) return;
    const key = this.extractS3KeyFromUrl(oldImageUrl);
    if (!key) return;
    setTimeout(async () => {
      await this.safeDeleteS3Object(key, adminId);
    }, 2000);
  }

  // ── Daily orphan cleanup ──────────────────────────────────────────────────────
  @Cron('0 2 * * *') // 2:00 AM daily
  async runDailyOrphanCleanup() {
    this.logger.log('Starting daily S3 orphan cleanup...');
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) return;

    const startTime = Date.now();
    let totalScanned = 0;
    let totalOrphaned = 0;
    let totalDeleted = 0;
    const errors: string[] = [];

    // 1. Collect all S3 keys in managed prefixes
    const prefixes = ['products/', 'banners/', 'categories/', 'catalogues/', 'hero/'];
    const s3Keys = new Set<string>();

    for (const prefix of prefixes) {
      let continuationToken: string | undefined;
      do {
        try {
          const result = await this.s3.listObjectsV2({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }).promise();

          (result.Contents || []).forEach((obj) => {
            if (obj.Key) s3Keys.add(obj.Key);
          });
          totalScanned += result.Contents?.length || 0;
          continuationToken = result.NextContinuationToken;
        } catch (err: any) {
          errors.push(`List error for prefix ${prefix}: ${err.message}`);
          break;
        }
      } while (continuationToken);
    }

    // 2. Collect all referenced image URLs from DB
    const referencedUrls = await this.getAllReferencedImageUrls();
    const referencedKeys = new Set(
      referencedUrls.map((url) => this.extractS3KeyFromUrl(url)).filter(Boolean) as string[],
    );

    // 3. Find orphaned keys (in S3 but not referenced in DB)
    const orphanedKeys: string[] = [];
    for (const key of s3Keys) {
      if (!referencedKeys.has(key)) {
        orphanedKeys.push(key);
        totalOrphaned++;
      }
    }

    this.logger.log(
      `Orphan scan: ${totalScanned} S3 objects scanned, ${totalOrphaned} orphaned, ${referencedKeys.size} DB references`,
    );

    // 4. Delete orphaned keys in batches
    if (orphanedKeys.length > 0) {
      const chunks = this.chunkArray(orphanedKeys, 1000);
      for (const chunk of chunks) {
        try {
          const result = await this.s3.deleteObjects({
            Bucket: bucket,
            Delete: {
              Objects: chunk.map((k) => ({ Key: k })),
              Quiet: false,
            },
          }).promise();
          totalDeleted += result.Deleted?.length || 0;
        } catch (err: any) {
          errors.push(`Delete batch error: ${err.message}`);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const report = {
      runAt: new Date().toISOString(),
      durationMs,
      totalScanned,
      referencedKeys: referencedKeys.size,
      totalOrphaned,
      totalDeleted,
      errors,
    };

    // 5. Save cleanup report to S3
    const reportKey = `cleanup-logs/${new Date().toISOString().split('T')[0]}.json`;
    try {
      await this.s3.putObject({
        Bucket: bucket,
        Key: reportKey,
        Body: JSON.stringify(report, null, 2),
        ContentType: 'application/json',
      }).promise();
    } catch (err: any) {
      this.logger.error(`Could not save cleanup report: ${err.message}`);
    }

    // 6. Write to audit log
    await this.writeAuditLog({
      adminId: 'SYSTEM',
      action: 'CLEANUP',
      entityType: 'S3',
      metadata: report,
    });

    this.logger.log(
      `Daily cleanup complete: scanned=${totalScanned}, orphaned=${totalOrphaned}, deleted=${totalDeleted}, duration=${durationMs}ms`,
    );
  }

  // ── Check if an S3 key is referenced in the DB ──────────────────────────────
  async isKeyReferencedAnywhere(key: string): Promise<boolean> {
    // Build URL patterns (S3 URL and CloudFront URL)
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    const region = this.config.get<string>('AWS_REGION');
    const cfDomain = this.config.get<string>('CLOUDFRONT_DOMAIN');

    const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    const cfUrl = cfDomain ? `https://${cfDomain}/${key}` : null;

    const urlPatterns = [s3Url, cfUrl, key].filter(Boolean) as string[];

    // Check products.images (array column)
    for (const url of urlPatterns) {
      const count = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::int as count FROM "products" WHERE $1 = ANY(images)`,
        url,
      );
      if (Number(count[0]?.count) > 0) return true;

      // Check product_variants.images
      const variantCount = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*)::int as count FROM "product_variants" WHERE $1 = ANY(images)`,
        url,
      );
      if (Number(variantCount[0]?.count) > 0) return true;
    }

    // Check banners
    const bannerCount = await this.prisma.banner.count({
      where: {
        OR: urlPatterns.flatMap((url) => [
          { imageUrl: url },
          { mobileImageUrl: url },
        ]),
      },
    });
    if (bannerCount > 0) return true;

    // Check categories
    const catCount = await this.prisma.category.count({
      where: { image: { in: urlPatterns } },
    });
    if (catCount > 0) return true;

    // Check store settings hero images
    const settings = await this.prisma.storeSettings.findFirst({
      select: { heroImageUrl: true, heroLeftImageUrl: true, heroImage3Url: true },
    });
    if (settings) {
      const heroUrls = [settings.heroImageUrl, settings.heroLeftImageUrl, settings.heroImage3Url].filter(Boolean);
      if (urlPatterns.some((url) => heroUrls.includes(url))) return true;
    }

    return false;
  }

  // ── Collect all referenced image URLs from DB ─────────────────────────────────
  private async getAllReferencedImageUrls(): Promise<string[]> {
    const urls: string[] = [];

    // Products images
    const products = await this.prisma.product.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: { images: true },
    });
    products.forEach((p) => urls.push(...(p.images || [])));

    // Variant images
    const variants = await this.prisma.productVariant.findMany({
      where: { isActive: true },
      select: { images: true },
    });
    variants.forEach((v) => urls.push(...(v.images || [])));

    // Banners
    const banners = await this.prisma.banner.findMany({
      select: { imageUrl: true, mobileImageUrl: true },
    });
    banners.forEach((b) => {
      if (b.imageUrl) urls.push(b.imageUrl);
      if (b.mobileImageUrl) urls.push(b.mobileImageUrl);
    });

    // Categories
    const cats = await this.prisma.category.findMany({
      select: { image: true },
    });
    cats.forEach((c) => { if (c.image) urls.push(c.image); });

    // Store settings hero images
    const settings = await this.prisma.storeSettings.findFirst({
      select: { heroImageUrl: true, heroLeftImageUrl: true, heroImage3Url: true },
    });
    if (settings) {
      if (settings.heroImageUrl) urls.push(settings.heroImageUrl);
      if (settings.heroLeftImageUrl) urls.push(settings.heroLeftImageUrl);
      if (settings.heroImage3Url) urls.push(settings.heroImage3Url);
    }

    // AI session approved keys
    const sessions = await this.prisma.aiImageSession.findMany({
      where: { status: 'APPROVED' },
      select: { approvedKeys: true },
    });
    sessions.forEach((s) => urls.push(...(s.approvedKeys || [])));

    return urls.filter(Boolean);
  }

  // ── Extract S3 key from a full URL ────────────────────────────────────────────
  extractS3KeyFromUrl(url: string | null): string | null {
    if (!url) return null;

    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    const region = this.config.get<string>('AWS_REGION');
    const cfDomain = this.config.get<string>('CLOUDFRONT_DOMAIN');

    try {
      // Handle CloudFront URLs
      if (cfDomain && url.includes(cfDomain)) {
        const parsed = new URL(url);
        return parsed.pathname.replace(/^\//, '');
      }

      // Handle S3 URLs
      if (bucket && url.includes(bucket)) {
        const s3Prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
        if (url.startsWith(s3Prefix)) {
          return url.replace(s3Prefix, '');
        }
        // Virtual-hosted style
        const altPrefix = `https://${bucket}.s3.amazonaws.com/`;
        if (url.startsWith(altPrefix)) {
          return url.replace(altPrefix, '');
        }
      }

      // If it's already a key (no http prefix)
      if (!url.startsWith('http')) {
        return url;
      }
    } catch {
      // Invalid URL
    }

    return null;
  }

  // ── Get audit logs ────────────────────────────────────────────────────────────
  async getAuditLogs(page = 1, limit = 50, action?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Write audit log entry ─────────────────────────────────────────────────────
  async writeAuditLog(params: {
    adminId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    s3Key?: string;
    metadata?: Record<string, any>;
    success?: boolean;
    errorMsg?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          entityType: params.entityType || 'S3',
          entityId: params.entityId || null,
          s3Key: params.s3Key || null,
          metadata: params.metadata || null,
          success: params.success !== false,
          errorMsg: params.errorMsg || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  // ── Utility: chunk array ──────────────────────────────────────────────────────
  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}
