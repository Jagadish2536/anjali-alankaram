'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  // If true, will not attempt to rewrite to optimized variants (e.g. for external OAuth avatars)
  raw?: boolean;
}

/**
 * Premium Responsive Optimized Image Component
 *
 * Automatically maps standard S3/CloudFront URLs to their corresponding pre-generated
 * WebP and AVIF variants (thumbnail, small, medium, large, avif).
 *
 * Fallback mechanism: If the optimized image variant fails to load (e.g., if it's a legacy upload),
 * it gracefully falls back to the original image URL.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  raw = false,
  sizes,
  priority = false,
  className = '',
  ...props
}) => {
  const [errorCount, setErrorCount] = useState(0);

  // If raw, or external non-S3/non-CloudFront URL, or a base64 string, render standard Next.js Image
  const isProcessable =
    !raw &&
    src &&
    typeof src === 'string' &&
    !src.startsWith('data:') &&
    (src.includes('.amazonaws.com') || src.includes('.cloudfront.net') || src.includes('/api/v1/uploads'));

  if (!isProcessable) {
    return (
      <Image
        src={src || '/placeholder.png'}
        alt={alt || ''}
        sizes={sizes}
        priority={priority}
        className={className}
        {...props}
      />
    );
  }

  // Helper to construct variant URL
  const getVariantUrl = (originalUrl: string, suffix: string, ext: string): string => {
    // Locate the file extension (e.g. .jpg, .png, .webp)
    const dotIndex = originalUrl.lastIndexOf('.');
    if (dotIndex === -1) return originalUrl;

    const base = originalUrl.substring(0, dotIndex);
    return `${base}_${suffix}.${ext}`;
  };

  // If the optimized variants fail, fallback to original
  if (errorCount >= 2) {
    return (
      <Image
        src={src}
        alt={alt || ''}
        sizes={sizes}
        priority={priority}
        className={className}
        {...props}
      />
    );
  }

  // Construct URLs
  const avifUrl = getVariantUrl(src, 'avif', 'avif');
  const largeUrl = getVariantUrl(src, 'large', 'webp');
  const mediumUrl = getVariantUrl(src, 'medium', 'webp');
  const smallUrl = getVariantUrl(src, 'small', 'webp');
  const thumbnailUrl = getVariantUrl(src, 'thumbnail', 'webp');

  // Handle fallback on error
  const handleError = () => {
    setErrorCount((prev) => prev + 1);
  };

  return (
    <picture className="w-full h-full">
      {/* 1. Try AVIF first (highest compression) */}
      <source srcSet={avifUrl} type="image/avif" />

      {/* 2. Responsive WebP srcSet */}
      <source
        srcSet={`${thumbnailUrl} 200w, ${smallUrl} 400w, ${mediumUrl} 800w, ${largeUrl} 1200w`}
        type="image/webp"
        sizes={sizes || '(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px'}
      />

      {/* 3. Fallback standard Image element (WebP medium size by default, falls back to original on error) */}
      <Image
        src={mediumUrl}
        alt={alt || ''}
        sizes={sizes || '(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px'}
        priority={priority}
        onError={handleError}
        className={className}
        {...props}
      />
    </picture>
  );
};
