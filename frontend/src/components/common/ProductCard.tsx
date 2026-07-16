'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number | string;
    salePrice?: number | string | null;
    images?: string[];
    variants?: Array<{
      id: string;
      size: string;
      color?: string | null;
      colorHex?: string | null;
      stock: number;
      isActive: boolean;
      images?: string[];
    }>;
    stock?: number;
    avgRating?: number | string;
    reviewCount?: number;
  };
  activeColor?: string;
  onAddToCart?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  activeColor = '',
  onAddToCart,
}) => {
  const [localColor, setLocalColor] = useState(activeColor);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const showProductId = mounted && isAuthenticated && user && ['ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER', 'ORDER_MANAGER', 'WAREHOUSE_STAFF'].includes(user.role || '');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nX = (x / rect.width) - 0.5;
    const nY = (y / rect.height) - 0.5;
    setTilt({ x: -nY * 12, y: nX * 12 });
  };

  useEffect(() => {
    setLocalColor(activeColor);
  }, [activeColor]);

  const hasDiscount =
    product.salePrice &&
    product.basePrice &&
    Number(product.salePrice) < Number(product.basePrice);

  const discountPct = hasDiscount
    ? Math.round(
        ((Number(product.basePrice) - Number(product.salePrice)) /
          Number(product.basePrice)) *
          100,
      )
    : 0;

  // Compute stock
  const totalStock = (() => {
    if (localColor) {
      const colorVariants =
        product.variants?.filter((v) => v.color === localColor) || [];
      if (colorVariants.length > 0) {
        return colorVariants.reduce(
          (sum, v) => sum + (Number(v.stock) || 0),
          0,
        );
      }
    }
    if (!product.variants || product.variants.length === 0) {
      return product.stock ?? 0;
    }
    return product.variants.reduce(
      (sum, v) => sum + (Number(v.stock) || 0),
      0,
    );
  })();

  const isOutOfStock = totalStock === 0;
  const isLowStock = !isOutOfStock && totalStock > 0 && totalStock < 5;

  // Resolve display image
  const displayImage = (() => {
    if (localColor) {
      const match = product.variants?.find(
        (v) => v.color === localColor && v.images && v.images.length > 0,
      );
      if (match?.images?.[0] && match.images[0].trim() !== '') {
        return match.images[0];
      }
    }
    const mainImg = product.images?.[0];
    return mainImg && mainImg.trim() !== '' ? mainImg : '/placeholder.png';
  })();

  const href = localColor
    ? `/products/${product.slug}?color=${encodeURIComponent(localColor)}`
    : `/products/${product.slug}`;

  // Unique list of colors with their hex values
  const productColors = (() => {
    const map = new Map<string, string>();
    product.variants?.forEach((v) => {
      if (
        v.isActive !== false &&
        v.color &&
        v.color.trim() !== '' &&
        !map.has(v.color)
      ) {
        map.set(v.color, v.colorHex || '');
      }
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  })();

  return (
    <div className="group flex flex-col relative animate-scale-in transition-all duration-300 ease-out p-1 rounded-2xl">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted mb-2.5 shadow-sm"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, ${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, 1)`,
          transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease' : 'transform 0.08s ease-out, box-shadow 0.08s ease-out',
          boxShadow: tilt.x !== 0 || tilt.y !== 0 ? '0 15px 30px rgba(0,0,0,0.15)' : 'none',
          zIndex: tilt.x !== 0 || tilt.y !== 0 ? 10 : 1
        }}
      >
        <Link href={href} className="absolute inset-0 block">
          <OptimizedImage
            src={displayImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover object-center group-hover:scale-105 transition-transform duration-500 ${
              isOutOfStock ? 'grayscale opacity-70' : ''
            }`}
          />
        </Link>

        {/* Top-left badge: OUT OF STOCK takes priority over discount */}
        {isOutOfStock ? (
          <span className="absolute top-2 left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
            OUT OF STOCK
          </span>
        ) : hasDiscount ? (
          <span className="absolute top-2 left-2 bg-primary text-white text-[11px] font-bold px-2 py-1 rounded shadow">
            {discountPct}% OFF
          </span>
        ) : null}

        {/* Low stock badge — bottom-left */}
        {isLowStock && (
          <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow animate-pulse">
            Only {totalStock} left! Hurry
          </span>
        )}

        {/* Wishlist Heart Icon */}
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center cursor-pointer md:opacity-0 md:group-hover:opacity-100 md:scale-90 md:group-hover:scale-100 transition-all duration-200 hover:bg-primary hover:text-white">
          <Heart className="w-3.5 h-3.5 text-primary hover:text-white" />
        </div>

        {/* Add to Cart quick button */}
        {onAddToCart && !isOutOfStock && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product.id);
            }}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200"
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <Link href={href} className="block mt-1">
        <h3 className="text-sm font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
          {product.name}
        </h3>
        {showProductId && (
          <div 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border mt-1 w-fit select-all cursor-text" 
            title="Product ID (Double-click to select all)"
          >
            ID: {product.id}
          </div>
        )}
        {product.avgRating !== undefined && Number(product.avgRating) > 0 && (
          <div className="flex items-center mt-1 mb-1">
            <div className="inline-flex items-center gap-1 bg-[#008037] text-white text-[11px] font-bold px-2 py-0.5 rounded">
              <span>{Number(product.avgRating).toFixed(1)}</span>
              <span className="text-[9px]">★</span>
              {product.reviewCount !== undefined && Number(product.reviewCount) > 0 && (
                <>
                  <span className="text-white/40 mx-0.5">|</span>
                  <span>{product.reviewCount}</span>
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {isOutOfStock ? (
            <span className="text-xs font-semibold text-muted-foreground">
              Out of Stock
            </span>
          ) : (
            <>
              <span className="font-semibold text-sm">
                {formatPrice(product.salePrice || product.basePrice)}
              </span>
              {hasDiscount && (
                <span className="text-muted-foreground line-through text-xs">
                  {formatPrice(product.basePrice)}
                </span>
              )}
            </>
          )}
        </div>
      </Link>

      {/* Render interactive color swatches */}
      {productColors.length > 1 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {productColors.map(({ name, hex }) => {
            const isSelected =
              localColor === name ||
              (!localColor && productColors[0].name === name);
            return (
              <button
                key={name}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLocalColor(name);
                }}
                onMouseEnter={() => {
                  setLocalColor(name);
                }}
                className={`w-4 h-4 rounded-full border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-1 border-transparent scale-110'
                    : 'border-gray-300 hover:scale-105'
                }`}
                style={{ backgroundColor: hex || '#ccc' }}
                title={name}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
