import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  Req,
  Body,
  UseGuards,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { S3CleanupService } from '../s3-cleanup/s3-cleanup.service';
import { ImageOptimizerService } from './image-optimizer.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB

@Controller('uploads')
export class UploadsController {
  private s3: AWS.S3;
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private config: ConfigService,
    private s3Cleanup: S3CleanupService,
    private imageOptimizer: ImageOptimizerService,
  ) {
    const uploadDriver = this.config.get('UPLOAD_DRIVER') || 's3';
    if (uploadDriver !== 'local') {
      this.s3 = new AWS.S3({
        region: this.config.get('AWS_REGION'),
      });
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Basic MIME type validation
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('File size exceeds 15MB limit');
    }

    const uploadDriver = this.config.get('UPLOAD_DRIVER') || 's3';
    const isLocal = uploadDriver === 'local';

    const isVideo = file.mimetype.startsWith('video/');
    const prefix = isVideo ? 'videos' : 'products';
    const uuid = uuidv4();

    const host = req.get('host');
    const protocol = req.protocol;

    // Check if it's a processable image to generate optimized variants
    const processImage = !isVideo && this.imageOptimizer.isProcessableImage(file.mimetype);
    let optimized = null;
    let mainBuffer = file.buffer;
    let mainMime = file.mimetype;
    let ext = path.extname(file.originalname) || (file.mimetype.includes('png') ? '.png' : '.jpg');

    if (processImage) {
      try {
        const compressed = await this.imageOptimizer.compressMainImage(file.buffer, file.mimetype);
        mainBuffer = compressed.buffer;
        mainMime = compressed.mimetype;
        ext = compressed.ext;
        optimized = await this.imageOptimizer.optimize(mainBuffer);
      } catch (err) {
        this.logger.warn(`Optimization failed, falling back to original image upload: ${err.message}`);
      }
    }

    const mainKey = `${prefix}/${uuid}${ext}`;

    if (isLocal) {
      const uploadDir = path.join(process.cwd(), 'uploads', prefix);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Save compressed/original main
      fs.writeFileSync(path.join(uploadDir, `${uuid}${ext}`), mainBuffer);

      // Save optimized variants if generated
      if (optimized) {
        fs.writeFileSync(path.join(uploadDir, `${uuid}_thumbnail.webp`), optimized.thumbnail);
        fs.writeFileSync(path.join(uploadDir, `${uuid}_small.webp`), optimized.small);
        fs.writeFileSync(path.join(uploadDir, `${uuid}_medium.webp`), optimized.medium);
        fs.writeFileSync(path.join(uploadDir, `${uuid}_large.webp`), optimized.large);
        fs.writeFileSync(path.join(uploadDir, `${uuid}_avif.avif`), optimized.avif);
      }

      const url = `${protocol}://${host}/api/v1/uploads/${prefix}/${uuid}${ext}`;

      return {
        url,
        key: mainKey,
        blurDataUrl: optimized?.blurDataUrl || null,
      };
    }

    // AWS S3 Upload flow
    const bucket = this.config.get('AWS_S3_BUCKET');
    
    // Upload compressed/original main
    await this.s3.putObject({
      Bucket: bucket,
      Key: mainKey,
      Body: mainBuffer,
      ContentType: mainMime,
      CacheControl: isVideo
        ? 'public, max-age=86400'
        : 'public, max-age=31536000, immutable',
    }).promise();

    // Upload optimized variants if generated
    if (optimized) {
      const variants = [
        { suffix: 'thumbnail', body: optimized.thumbnail, mime: 'image/webp' },
        { suffix: 'small', body: optimized.small, mime: 'image/webp' },
        { suffix: 'medium', body: optimized.medium, mime: 'image/webp' },
        { suffix: 'large', body: optimized.large, mime: 'image/webp' },
        { suffix: 'avif', body: optimized.avif, mime: 'image/avif' },
      ];

      await Promise.all(
        variants.map((v) =>
          this.s3.putObject({
            Bucket: bucket,
            Key: `${prefix}/${uuid}_${v.suffix}.${v.mime.split('/')[1]}`,
            Body: v.body,
            ContentType: v.mime,
            CacheControl: 'public, max-age=31536000, immutable',
          }).promise()
        )
      );
    }

    const cfDomain = this.config.get<string>('CLOUDFRONT_DOMAIN');
    const baseUrl = cfDomain
      ? `https://${cfDomain}`
      : `https://${bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com`;

    const url = `${baseUrl}/${mainKey}`;

    this.logger.log(`Uploaded file: ${mainKey} with ${optimized ? '5 optimized variants' : 'no variants'}`);

    // Audit log
    const adminId = (req as any).user?.id || 'ANONYMOUS';
    await this.s3Cleanup.writeAuditLog({
      adminId,
      action: 'UPLOAD',
      entityType: isVideo ? 'VIDEO' : 'IMAGE',
      s3Key: mainKey,
      metadata: {
        size: mainBuffer.length,
        mimeType: mainMime,
        hasVariants: !!optimized,
      },
    });

    return {
      url,
      key: mainKey,
      blurDataUrl: optimized?.blurDataUrl || null,
    };
  }

  // Admin-only: delete a specific S3 object by key
  @Delete('s3-object')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteS3Object(
    @Body() body: { key: string },
    @Req() req: any,
  ) {
    if (!body.key) throw new BadRequestException('key is required');

    const adminId = req.user?.id || 'ADMIN';
    
    // Also delete variants from S3 if it's an image
    const bucket = this.config.get('AWS_S3_BUCKET');
    const uploadDriver = this.config.get('UPLOAD_DRIVER') || 's3';

    if (uploadDriver !== 'local' && body.key.startsWith('products/')) {
      const dotIndex = body.key.lastIndexOf('.');
      if (dotIndex !== -1) {
        const base = body.key.substring(0, dotIndex);
        const suffixes = ['_thumbnail.webp', '_small.webp', '_medium.webp', '_large.webp', '_avif.avif'];
        
        await Promise.all(
          suffixes.map((suf) =>
            this.s3.deleteObject({
              Bucket: bucket,
              Key: `${base}${suf}`,
            }).promise().catch((err) => {
              this.logger.warn(`Failed to delete S3 variant: ${base}${suf} - ${err.message}`);
            })
          )
        );
      }
    }

    await this.s3Cleanup.safeDeleteS3Object(body.key, adminId);
  }
}
