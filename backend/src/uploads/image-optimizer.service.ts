import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface OptimizedVariants {
  thumbnail: Buffer;
  small: Buffer;
  medium: Buffer;
  large: Buffer;
  avif: Buffer;
  blurDataUrl: string;
}

@Injectable()
export class ImageOptimizerService {
  private readonly logger = new Logger(ImageOptimizerService.name);

  /**
   * Generates multiple size and format variants for a product image.
   * Sizes:
   *  - thumbnail: 200x200 webp (square fit for carts/wishlists)
   *  - small: 400x600 webp (portrait fit for mobile catalogue listing)
   *  - medium: 800x1200 webp (standard resolution for details)
   *  - large: 1200x1800 webp (high resolution for zoom/lightbox)
   *  - avif: 800x1200 avif (high compression modern format)
   *  - blurDataUrl: 8x12 png base64 (lqip placeholder)
   */
  async optimize(buffer: Buffer): Promise<OptimizedVariants> {
    try {
      const metadata = await sharp(buffer).metadata();
      this.logger.debug(`Optimizing image: original dimensions ${metadata.width}x${metadata.height}, format ${metadata.format}`);

      // 1. Generate Thumbnail (200x200 WebP, cover fit)
      const thumbnail = await sharp(buffer)
        .resize(200, 200, { fit: 'cover', position: 'top' })
        .webp({ quality: 80 })
        .toBuffer();

      // 2. Generate Small (400x600 WebP)
      const small = await sharp(buffer)
        .resize(400, 600, { fit: 'cover', position: 'top' })
        .webp({ quality: 82 })
        .toBuffer();

      // 3. Generate Medium (800x1200 WebP)
      const medium = await sharp(buffer)
        .resize(800, 1200, { fit: 'cover', position: 'top' })
        .webp({ quality: 85 })
        .toBuffer();

      // 4. Generate Large (1200x1800 WebP)
      const large = await sharp(buffer)
        .resize(1200, 1800, { fit: 'cover', position: 'top' })
        .webp({ quality: 88 })
        .toBuffer();

      // 5. Generate AVIF (800x1200 AVIF)
      const avif = await sharp(buffer)
        .resize(800, 1200, { fit: 'cover', position: 'top' })
        .avif({ quality: 75, effort: 3 })
        .toBuffer();

      // 6. Generate low-quality image placeholder (LQIP) Blur Data URL (8x12 png base64)
      const blurBuffer = await sharp(buffer)
        .resize(8, 12, { fit: 'cover' })
        .png()
        .toBuffer();
      const blurDataUrl = `data:image/png;base64,${blurBuffer.toString('base64')}`;

      this.logger.log(`Generated 5 optimized variants successfully`);

      return {
        thumbnail,
        small,
        medium,
        large,
        avif,
        blurDataUrl,
      };
    } catch (error) {
      this.logger.error('Failed to optimize image variants', error.stack);
      throw error;
    }
  }

  async compressMainImage(buffer: Buffer, mimetype: string): Promise<{ buffer: Buffer; mimetype: string; ext: string }> {
    try {
      const metadata = await sharp(buffer).metadata();
      const format = metadata.format;
      
      let ext = mimetype.includes('png') ? '.png' : '.jpg';
      let outputMime = mimetype;

      let pipeline = sharp(buffer);
      
      // Limit dimensions to max 2000px on the longest side to keep it crisp but reasonably sized
      if (metadata.width && metadata.height && (metadata.width > 2000 || metadata.height > 2000)) {
        pipeline = pipeline.resize(2000, 2000, { fit: 'inside', withoutEnlargement: true });
      }

      let outputBuffer: Buffer;
      const formatToUse = (format === 'png' || mimetype.includes('png')) ? 'png' : 'jpeg';
      
      if (formatToUse === 'png') {
        outputBuffer = await pipeline.png({ quality: 85, compressionLevel: 9 }).toBuffer();
        outputMime = 'image/png';
        ext = '.png';
      } else {
        outputBuffer = await pipeline.jpeg({ quality: 85, progressive: true }).toBuffer();
        outputMime = 'image/jpeg';
        ext = '.jpg';
      }

      // If the image is still > 500kb (512,000 bytes) and format is png, convert to webp for better compression
      if (outputBuffer.length > 500 * 1024) {
        outputBuffer = await sharp(buffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        outputMime = 'image/webp';
        ext = '.webp';
      }

      // If it is still > 500kb, lower webp quality to 75
      if (outputBuffer.length > 500 * 1024) {
        outputBuffer = await sharp(buffer)
          .resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 75 })
          .toBuffer();
      }

      // If it is still > 500kb, lower webp quality to 70 and max size 1200
      if (outputBuffer.length > 500 * 1024) {
        outputBuffer = await sharp(buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer();
      }

      this.logger.log(`Compressed main image from ${buffer.length} to ${outputBuffer.length} bytes (target <= 500kb)`);

      return { buffer: outputBuffer, mimetype: outputMime, ext };
    } catch (err: any) {
      this.logger.error('Failed to compress main image: ' + err.message);
      return { buffer, mimetype, ext: mimetype.includes('png') ? '.png' : '.jpg' };
    }
  }

  /**
   * Helper to check if file mimetype is an image that can be processed.
   */
  isProcessableImage(mimetype: string): boolean {
    const processable = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/heif', 'image/avif'];
    return processable.includes(mimetype);
  }
}
