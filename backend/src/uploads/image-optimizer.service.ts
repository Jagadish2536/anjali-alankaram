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

  /**
   * Helper to check if file mimetype is an image that can be processed.
   */
  isProcessableImage(mimetype: string): boolean {
    const processable = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/heif', 'image/avif'];
    return processable.includes(mimetype);
  }
}
