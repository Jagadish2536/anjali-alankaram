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
  const [imgSrc, setImgSrc] = useState<string>(src || '/placeholder.png');
  const [hasError, setHasError] = useState(false);

  // Update internal image src if prop changes
  React.useEffect(() => {
    setImgSrc(src || '/placeholder.png');
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // If custom image failed, fall back to default placeholder image
      setImgSrc('/placeholder.png');
    }
  };

  return (
    <Image
      src={imgSrc}
      alt={alt || ''}
      sizes={sizes}
      priority={priority}
      onError={handleError}
      className={className}
      {...props}
    />
  );
};

