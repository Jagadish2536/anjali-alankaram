'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ShoppingBag, Star, ChevronLeft, ChevronRight, Play, Video } from 'lucide-react';

// ── Lotus SVG ────────────────────────────────────────────────────────────────
const LotusSVG = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 60 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M30 44C30 44 10 32 10 20C10 14 18 8 30 8C42 8 50 14 50 20C50 32 30 44 30 44Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M30 44C30 44 16 30 16 18C16 12 22 6 30 6C38 6 44 12 44 18C44 30 30 44 30 44Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M30 44C30 44 22 28 22 17C22 11 26 5 30 5C34 5 38 11 38 17C38 28 30 44 30 44Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M30 8C30 8 15 14 12 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M30 8C30 8 45 14 48 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M30 44L30 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 46C20 46 25 44 30 46C35 44 40 46 40 46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ── Lotus Marquee Divider — text from admin settings ─────────────────────────
function LotusDivider({ text }: { text?: string }) {
  const displayText = text || 'Free Delivery on All Orders';
  const items = Array(12).fill(null).flatMap((_, i) => [
    { type: 'text', val: displayText, key: `t${i}` },
    { type: 'lotus', key: `l${i}` },
  ]);

  // Adjust scroll duration based on character length so speed is uniform & slower
  const duration = Math.max(40, Math.min(300, Math.round(displayText.length * 1.8)));

  return (
    <div className="w-full bg-primary overflow-hidden py-2.5" aria-hidden="true">
      <div className="flex animate-marquee" style={{ animationDuration: `${duration}s`, width: 'max-content' }}>
        {[...items, ...items].map((item, idx) =>
          item.type === 'lotus'
            ? <LotusSVG key={`${item.key}-${idx}`} className="w-8 h-6 text-primary-foreground/70 shrink-0 mx-3" />
            : <span key={`${item.key}-${idx}`} className="text-primary-foreground/90 text-xs font-medium tracking-wider uppercase shrink-0 mx-2">{item.val}</span>
        )}
      </div>
    </div>
  );
}

// ── Lily Watermark BG ─────────────────────────────────────────────────────────
const lilyBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 100C60 100 30 80 30 55C30 40 44 28 60 28C76 28 90 40 90 55C90 80 60 100 60 100Z' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 100C60 100 42 76 42 52C42 38 50 24 60 24C70 24 78 38 78 52C78 76 60 100 60 100Z' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 28C60 28 36 36 32 54' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 28C60 28 84 36 88 54' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3C/svg%3E")`;

// ── Category card — horizontal scroll card style ──────────────────────────────
function CollectionCard({ cat }: { cat: any }) {
  const img = (cat.image && cat.image.trim() !== '') ? cat.image : '/placeholder.png';
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nX = (x / rect.width) - 0.5;
    const nY = (y / rect.height) - 0.5;
    setTilt({ x: -nY * 14, y: nX * 14 });
  };

  return (
    <Link
      href={`/products?category=${cat.slug}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="group relative flex-shrink-0 w-40 md:w-52 aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer block animate-scale-in"
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, ${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, 1)`,
        transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease' : 'transform 0.08s ease-out, box-shadow 0.08s ease-out',
        boxShadow: tilt.x !== 0 || tilt.y !== 0 ? '0 20px 40px rgba(0,0,0,0.18)' : 'none'
      }}
    >
      <Image src={img} alt={cat.name} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700" />
      {/* Light gradient only at bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <span className="text-white font-outfit font-semibold text-base drop-shadow-md">{cat.name}</span>
      </div>
    </Link>
  );
}

// ── Category card — mobile 3-col circular grid ────────────────────────────────
function MobileCollectionCard({ cat }: { cat: any }) {
  const img = (cat.image && cat.image.trim() !== '') ? cat.image : '/placeholder.png';
  return (
    <Link
      href={`/products?category=${cat.slug}`}
      className="flex flex-col items-center gap-2 group animate-scale-in"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-full overflow-hidden border-2 border-primary/10 shadow-md group-hover:shadow-lg group-active:scale-95 transition-all duration-300">
        <Image src={img} alt={cat.name} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-500" />
      </div>
      <span className="text-[11px] md:text-xs lg:text-sm font-semibold text-center text-foreground leading-tight px-1 group-hover:text-primary transition-colors">{cat.name}</span>
    </Link>
  );
}

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAddToCart }: { product: any; onAddToCart?: (id: string) => void }) {
  const [localColor, setLocalColor] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nX = (x / rect.width) - 0.5;
    const nY = (y / rect.height) - 0.5;
    setTilt({ x: -nY * 14, y: nX * 14 });
  };

  const hasDiscount = product.salePrice && product.basePrice && Number(product.salePrice) < Number(product.basePrice);
  const discountPct = hasDiscount ? Math.round(((Number(product.basePrice) - Number(product.salePrice)) / Number(product.basePrice)) * 100) : 0;

  // Use variant-level stock totals (same as shop page)
  const totalStock = (() => {
    if (localColor) {
      const colorVariants = product.variants?.filter((v: any) => v.color === localColor) || [];
      if (colorVariants.length > 0)
        return colorVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
    }
    return product.variants && product.variants.length > 0
      ? product.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0)
      : (product.stock ?? 0);
  })();
  const isOutOfStock = totalStock === 0;
  const isLowStock = !isOutOfStock && totalStock > 0 && totalStock < 5;

  const displayImage = (() => {
    if (localColor) {
      const match = product.variants?.find((v: any) => v.color === localColor && v.images?.length > 0);
      if (match?.images?.[0] && match.images[0].trim() !== '') return match.images[0];
    }
    const mainImg = product.images?.[0];
    return (mainImg && mainImg.trim() !== '') ? mainImg : '/placeholder.png';
  })();

  const href = localColor
    ? `/products/${product.slug}?color=${encodeURIComponent(localColor)}`
    : `/products/${product.slug}`;

  // Unique list of colors with their hex values
  const productColors = (() => {
    const map = new Map<string, string>();
    product.variants?.forEach((v: any) => {
      if (v.isActive !== false && v.color && v.color.trim() !== '' && !map.has(v.color)) {
        map.set(v.color, v.colorHex || '');
      }
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  })();

  return (
    <div className="group flex flex-col relative animate-scale-in transition-all duration-300 ease-out p-1 rounded-2xl">
      <Link
        href={href}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="block relative aspect-[3/4] overflow-hidden rounded-xl bg-muted mb-2 shadow-sm"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, ${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, 1)`,
          transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease' : 'transform 0.08s ease-out, box-shadow 0.08s ease-out',
          boxShadow: tilt.x !== 0 || tilt.y !== 0 ? '0 15px 30px rgba(0,0,0,0.15)' : 'none',
          zIndex: tilt.x !== 0 || tilt.y !== 0 ? 10 : 1
        }}
      >
        <Image src={displayImage} alt={product.name} fill className={`object-cover object-center group-hover:scale-105 transition-transform duration-500 ${isOutOfStock ? 'grayscale opacity-70' : ''}`} />

        {/* Top-left badge: OUT OF STOCK takes priority over discount */}
        {isOutOfStock ? (
          <span className="absolute top-2 left-2 bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            OUT OF STOCK
          </span>
        ) : hasDiscount ? (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            {discountPct}% OFF
          </span>
        ) : null}

        {/* Low stock badge — bottom-left */}
        {isLowStock && (
          <span className="absolute bottom-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow animate-pulse">
            Only {totalStock} left! Hurry
          </span>
        )}

        {onAddToCart && !isOutOfStock && (
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart(product.id); }}
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200"
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        )}
      </Link>
      <Link href={href}>
        <h3 className="text-sm font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">{product.name}</h3>
        <div className="flex items-center gap-2 mt-0.5">
          {isOutOfStock ? (
            <span className="text-xs font-semibold text-muted-foreground">Out of Stock</span>
          ) : (
            <>
              <span className="font-semibold text-sm">{formatPrice(product.salePrice || product.basePrice)}</span>
              {hasDiscount && (
                <span className="text-muted-foreground line-through text-xs">{formatPrice(product.basePrice)}</span>
              )}
            </>
          )}
        </div>
      </Link>

      {/* Render interactive color swatches */}
      {productColors.length > 1 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {productColors.map(({ name, hex }) => {
            const isSelected = localColor === name || (!localColor && productColors[0].name === name);
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
}

// ── Product section with empty state ─────────────────────────────────────────
function ProductSection({
  id, title, href, products, isLoading,
}: {
  id: string; title: string; href: string; products: any[]; isLoading: boolean;
}) {
  if (!isLoading && products.length === 0) {
    return (
      <section className="py-10 px-4" aria-labelledby={id}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 id={id} className="font-outfit text-2xl font-bold text-foreground">{title}</h2>
            <Link href={href} className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Shop more
            </Link>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 py-12 text-center">
            <p className="text-muted-foreground text-sm">No {title.toLowerCase()} yet — check back soon!</p>
            <Link href="/products" className="mt-4 inline-block text-primary text-sm font-semibold hover:underline">Browse all products →</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 px-4" aria-labelledby={id}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 id={id} className="font-outfit text-2xl font-bold text-foreground">{title}</h2>
          <Link href={href} className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Shop more
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {isLoading
            ? Array(4).fill(null).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col gap-2">
                  <div className="bg-muted aspect-[3/4] rounded-xl w-full" />
                  <div className="h-3 bg-muted w-3/4 rounded" />
                  <div className="h-3 bg-muted w-1/4 rounded" />
                </div>
              ))
            : products.map(p => <ProductCard key={p.id} product={p} />)
          }
        </div>
      </div>
    </section>
  );
}

// ── Robust Autoplay Video Component ──────────────────────────────────────────
function AutoplayVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Direct DOM mutation is more reliable in React/WebViews for autoplay policies
    video.muted = true;
    video.defaultMuted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: try playing on any user interaction with the document
        const triggerPlay = () => {
          video.play().catch(() => {});
          document.removeEventListener('click', triggerPlay);
          document.removeEventListener('touchstart', triggerPlay);
        };
        document.addEventListener('click', triggerPlay);
        document.addEventListener('touchstart', triggerPlay);
      });
    }
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className={className}
    />
  );
}

// ── Video Card Item — with custom 3D cursor tilt ────────────────────────────────
function VideoCard({ vid, index, getStyle }: { vid: any; index: number; getStyle: (i: number) => any }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nX = (x / rect.width) - 0.5;
    const nY = (y / rect.height) - 0.5;
    setTilt({ x: -nY * 14, y: nX * 14 });
  };

  const style = getStyle(index);

  return (
    <div 
      className="absolute flex flex-col items-center" 
      style={{ 
        ...style, 
        zIndex: tilt.x !== 0 || tilt.y !== 0 ? 30 : style.zIndex 
      }}
    >
      <div className="animate-scale-in flex flex-col items-center">
        {vid.videoUrl ? (
          <Link
            href={`/products/${vid.slug}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            className="relative w-56 md:w-64 rounded-2xl overflow-hidden shadow-xl cursor-pointer block group"
            style={{ 
              aspectRatio: '9/16', 
              maxHeight: 390,
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, ${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, 1)`,
              transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'transform 0.08s ease-out'
            }}
          >
            <AutoplayVideo
              src={vid.videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
            <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-primary">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white text-xs font-semibold line-clamp-1 drop-shadow-md">{vid.name}</p>
            </div>
          </Link>
        ) : (
          <a
            href={vid.instagramReelUrl || `/products/${vid.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            className="relative w-56 md:w-64 rounded-2xl overflow-hidden shadow-xl cursor-pointer block group"
            style={{ 
              aspectRatio: '9/16', 
              maxHeight: 390,
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, ${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, 1)`,
              transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'transform 0.08s ease-out'
            }}
          >
            <Image src={vid.images?.[0] || ''} alt={vid.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-primary fill-primary ml-0.5" />
              </div>
            </div>
            <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white text-xs font-semibold line-clamp-1 drop-shadow-md">{vid.name}</p>
            </div>
          </a>
        )}
        <Link
          href={`/products/${vid.slug}`}
          className="mt-3.5 inline-flex items-center justify-center gap-1.5 px-5 py-2 text-[11px] font-bold tracking-wider uppercase bg-primary text-primary-foreground rounded-full hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all hover:shadow-md shadow-sm"
        >
          <span>View Product</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Featured Videos Carousel ───────────────────────────────────────────────────
function VideoCarousel({ videos }: { videos: any[] }) {
  const [center, setCenter] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = videos.length;

  useEffect(() => {
    if (total > 0) setCenter(Math.min(2, total - 1));
  }, [total]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || total === 0) return;

    let startX = 0;
    let startY = 0;
    let endX = 0;

    const handleStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      endX = startX;
    };

    const handleMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      
      const deltaX = startX - currentX;
      const deltaY = startY - currentY;

      // If swipe is mostly horizontal, prevent page scroll for neat swiping
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
      endX = currentX;
    };

    const handleEnd = () => {
      const distance = startX - endX;
      if (Math.abs(distance) > 40) {
        if (distance > 0) {
          setCenter(c => (c + 1) % total);
        } else {
          setCenter(c => (c - 1 + total) % total);
        }
      }
    };

    element.addEventListener('touchstart', handleStart, { passive: true });
    element.addEventListener('touchmove', handleMove, { passive: false });
    element.addEventListener('touchend', handleEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleStart);
      element.removeEventListener('touchmove', handleMove);
      element.removeEventListener('touchend', handleEnd);
    };
  }, [videos, total]);

  if (total === 0) return null;

  const prev = () => setCenter(c => (c - 1 + total) % total);
  const next = () => setCenter(c => (c + 1) % total);

  const getStyle = (i: number) => {
    const diff = ((i - center + total) % total + total) % total;
    const pos = diff <= total / 2 ? diff : diff - total;
    const absPos = Math.abs(pos);
    const scale = absPos === 0 ? 1 : absPos === 1 ? 0.82 : 0.65;
    const translateX = pos * 265;
    const zIndex = 10 - absPos * 3;
    const opacity = absPos > 2 ? 0 : absPos === 2 ? 0.45 : 1;
    const blur = absPos === 2 ? 'blur(2px)' : 'none';
    return { transform: `translateX(${translateX}px) scale(${scale})`, zIndex, opacity, filter: blur, transition: 'all 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' };
  };

  return (
    <section className="py-16 bg-background overflow-hidden">
      <h2 className="font-cormorant text-3xl md:text-4xl font-bold text-center text-primary mb-12">Featured Videos</h2>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center select-none"
        style={{ height: 500 }}
      >
        <button
          onClick={prev}
          className="hidden md:flex absolute left-4 md:left-12 z-20 w-10 h-10 rounded-full border border-foreground/20 items-center justify-center hover:bg-foreground/5 transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="relative flex items-center justify-center" style={{ width: '100%', maxWidth: 760 }}>
          {videos.map((vid, i) => (
            <VideoCard key={vid.id} vid={vid} index={i} getStyle={getStyle} />
          ))}
        </div>
        <button
          onClick={next}
          className="hidden md:flex absolute right-4 md:right-12 z-20 w-10 h-10 rounded-full border border-foreground/20 items-center justify-center hover:bg-foreground/5 transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex justify-center gap-2 mt-8">
        {videos.map((_, i) => (
          <button key={i} onClick={() => setCenter(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${i === center ? 'bg-primary scale-125' : 'bg-foreground/20'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

// ── Stars Row ─────────────────────────────────────────────────────────────────
function StarsRow({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-4 h-4 ${s <= rating ? 'fill-primary stroke-primary' : 'fill-none stroke-muted-foreground/40'}`} />
      ))}
    </div>
  );
}

// ── Reviews section ───────────────────────────────────────────────────────────
function CustomerReviewsSection({ reviews }: { reviews: any[] }) {
  const [idx, setIdx] = useState(0);

  if (reviews.length === 0) return null;

  const review = reviews[idx];

  return (
    <section className="py-14 px-4" aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="font-cormorant text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
        What Our Customers Say
      </h2>
      <div className="max-w-3xl mx-auto">
        <Link
          href={review.product?.slug ? `/products/${review.product.slug}` : '/products'}
          className="flex flex-col md:flex-row gap-8 items-center bg-white rounded-3xl p-8 shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="relative shrink-0 w-52 h-64">
            <div className="absolute -top-3 -left-3 w-40 h-52 rounded-2xl overflow-hidden border-4 border-white shadow-md rotate-[-4deg]">
              <Image
                src={reviews[(idx + 1) % reviews.length]?.product?.images?.[0] || ''}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute top-4 left-4 w-44 h-56 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
              <Image
                src={review.product?.images?.[0] || ''}
                alt={review.product?.name || 'Product'}
                fill
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-cormorant text-2xl font-bold text-primary mb-2">{review.user?.name || 'Customer'}</p>
            <StarsRow rating={review.rating} className="mb-4" />
            <p className="text-foreground/80 text-sm leading-relaxed italic">&ldquo;{review.comment}&rdquo;</p>
            {review.product?.name && (
              <p className="text-xs text-muted-foreground mt-3">on <span className="font-semibold text-foreground">{review.product.name}</span></p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={(e) => { e.preventDefault(); setIdx(i => (i - 1 + reviews.length) % reviews.length); }}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setIdx(i => (i + 1) % reviews.length); }}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Next review"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

// ── App Download & Install Section ───────────────────────────────────────────
function AppDownloadSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [shouldHide, setShouldHide] = useState(true);

  useEffect(() => {
    const isAndroidApp = window.navigator.userAgent.includes('AnjaliAlankaramAndroidApp');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isAndroidApp || isStandalone) {
      setShouldHide(true);
    } else {
      setShouldHide(false);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  if (shouldHide) return null;

  return (
    <section className="py-16 px-4 bg-muted/30 border-y border-primary/5" aria-labelledby="app-download-heading">
      <div className="max-w-6xl mx-auto bg-gradient-to-br from-primary to-primary/90 rounded-3xl overflow-hidden shadow-xl text-white">
        <div className="flex flex-col md:flex-row items-center justify-between p-8 md:p-14 gap-8">
          
          {/* Left Column: Description & Actions */}
          <div className="flex-1 space-y-6 max-w-xl text-left">
            <span className="inline-block bg-white/10 backdrop-blur-md text-white/90 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-white/10">
              Anjali Alankaram Mobile
            </span>
            <h2 id="app-download-heading" className="font-cormorant text-3xl md:text-5xl font-bold leading-tight">
              Bring Luxury Fashion to Your Fingertips
            </h2>
            <p className="text-white/80 text-sm md:text-base leading-relaxed">
              Experience the absolute best of Anjali Alankaram. Download our Android mobile app or install our Web PWA for exclusive collections, instant order tracking, fast checkout, and members-only BOGO offers.
            </p>

            <div className="flex flex-col gap-4 pt-2 w-full text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                
                {/* Android: Direct APK Download */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-outfit">Android Users</h4>
                    <p className="text-[11px] text-white/70 mt-1">Download and install our mobile app directly onto your Android device.</p>
                  </div>
                  <a
                    href="/app-release.apk"
                    download="AnjaliAlankaram.apk"
                    className="flex items-center justify-center gap-3 bg-black/80 hover:bg-black/95 px-5 py-2.5 rounded-xl border border-white/10 transition-all active:scale-95 group shadow-md w-full cursor-pointer"
                  >
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 0 1-.399-1.284V3.098c0-.495.18-.956.4-1.284zm11.238 9.133l2.84 2.84L5.617 21.03l9.23-10.083zM18.8 12.502l3.414-1.972a1.004 1.004 0 0 0 0-1.74l-3.414-1.972-2.316 2.317 2.316 2.367zm-3.953-1.635L5.617 2.97l12.07 7.247-2.84 2.65z"/>
                    </svg>
                    <div className="text-left">
                      <p className="text-[9px] text-white/60 uppercase font-semibold leading-none">Get it on</p>
                      <p className="text-sm font-bold leading-tight mt-0.5">Direct APK Download</p>
                    </div>
                  </a>
                </div>

                {/* iOS: Safari Instructions */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-outfit">iOS Users</h4>
                    <p className="text-[11px] text-white/70 mt-1">Install on iPhone/iPad to run from your Home Screen.</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-left w-full">
                    <p className="text-[10px] text-white/95 leading-relaxed">
                      Open site in <span className="font-semibold text-white">Safari</span> ➔ tap <span className="font-semibold text-white">three dots</span> / <span className="font-semibold text-white">Share</span> menu ➔ select <span className="font-semibold text-white">Share / View More</span> ➔ tap <span className="font-semibold text-white">Add to Home Screen</span>.
                    </p>
                  </div>
                </div>

              </div>

              {/* Desktop / PWA Install Option */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-outfit">Desktop Users</h4>
                  <p className="text-[11px] text-white/70 mt-1">
                    Press the install icon in your browser's address bar (top right) or click the install button.
                  </p>
                </div>
                {isInstallable ? (
                  <button
                    onClick={handleInstallClick}
                    className="bg-white text-primary hover:bg-white/95 text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
                  >
                    <svg className="w-4 h-4 text-primary fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Install App</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-white/40 italic font-medium shrink-0">App already installed / PWA active</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mockup */}
          <div className="relative shrink-0 w-64 md:w-80 h-72 md:h-96 flex items-center justify-center">
            {/* Soft decorative background circles */}
            <div className="absolute w-56 md:w-72 h-56 md:h-72 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute w-40 h-40 rounded-full bg-amber-400/10 blur-2xl" />

            {/* Premium Mobile Phone Visual Container */}
            <div className="relative w-44 md:w-56 aspect-[9/18.5] bg-neutral-900 rounded-[36px] p-2.5 shadow-2xl border-4 border-neutral-800 rotate-[4deg] transition-all hover:rotate-[2deg] duration-500 overflow-hidden">
              {/* Speaker / Camera Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
              </div>
              
              {/* Screen Content Wrapper */}
              <div className="relative w-full h-full bg-white rounded-[26px] overflow-hidden flex flex-col pt-4">
                {/* Simulated App Header */}
                <div className="px-3 py-1 flex items-center justify-between border-b shrink-0 bg-primary text-white">
                  <span className="text-[10px] font-bold tracking-widest font-outfit uppercase">ANJALI</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                
                {/* Simulated Shop Content */}
                <div className="flex-1 p-2 space-y-2.5 overflow-hidden select-none bg-gray-50/50">
                  {/* Banner */}
                  <div className="bg-primary/5 rounded-lg p-2 text-center border border-primary/10">
                    <p className="text-[9px] font-bold text-primary">FESTIVE EDIT</p>
                    <p className="text-[7px] text-muted-foreground mt-0.5">Shop Silk Sarees & Gowns</p>
                  </div>
                  
                  {/* Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white rounded-md p-1 border shadow-xs">
                      <div className="relative aspect-[3/4] bg-muted rounded-xs overflow-hidden">
                        <Image src="/placeholder.png" alt="ethnic" fill className="object-cover" />
                      </div>
                      <div className="h-1 bg-gray-200 w-3/4 rounded mt-1.5" />
                      <div className="h-1 bg-gray-200 w-1/4 rounded mt-1" />
                    </div>
                    <div className="bg-white rounded-md p-1 border shadow-xs">
                      <div className="relative aspect-[3/4] bg-muted rounded-xs overflow-hidden">
                        <Image src="/placeholder.png" alt="designer" fill className="object-cover" />
                      </div>
                      <div className="h-1 bg-gray-200 w-3/4 rounded mt-1.5" />
                      <div className="h-1 bg-gray-200 w-1/4 rounded mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// Helper to compute dynamic color gradient & text styles for hero section
function getHeroThemeStyles(primaryColorHex: string) {
  let hex = primaryColorHex || '#2C5043';
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  let r = 0, g = 0, b = 0;
  if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    return {
      gradient: 'linear-gradient(135deg, #b8d4c4 0%, #7aab90 30%, #4a7a62 65%, #2c5043 100%)',
      textColor: '#1a3828'
    };
  }

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hue = Math.round(h * 360);
  const sat = Math.round(s * 100);
  const baseL = Math.round(l * 100);

  // Staggered light to dark gradient stops
  const l1 = Math.min(95, Math.max(70, baseL + 54));
  const l2 = Math.min(85, Math.max(50, baseL + 34));
  const l3 = Math.min(70, Math.max(35, baseL + 14));
  const l4 = baseL;

  return {
    gradient: `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${l1}%) 0%, hsl(${hue}, ${sat}%, ${l2}%) 30%, hsl(${hue}, ${sat}%, ${l3}%) 65%, hsl(${hue}, ${sat}%, ${l4}%) 100%)`,
    textColor: `hsl(${hue}, ${sat}%, 12%)`
  };
}

// ── Main Homepage ─────────────────────────────────────────────────────────────
export default function Home() {
  const { settings, fetchSettings } = useSettingsStore();
  const s = settings as any;
  const [categories, setCategories] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [reelProducts, setReelProducts] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [bsLoading, setBsLoading] = useState(true);
  const [naLoading, setNaLoading] = useState(true);

  const [showAllCollections, setShowAllCollections] = useState(false);
  const collectionScrollRef = useRef<HTMLDivElement>(null);

  const scrollCollections = (direction: 'left' | 'right') => {
    const container = collectionScrollRef.current;
    if (!container) return;
    const scrollAmount = direction === 'left' ? -350 : 350;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  useEffect(() => {
    fetchSettings();

    // Categories for "Shop by collections"
    api.get('/categories').then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.data || [];
      setCategories(list);
    }).catch(() => {});

    // Best sellers
    api.get('/products', { params: { isBestseller: 'true', limit: 4, t: Date.now() } })
      .then(({ data }) => { const l = Array.isArray(data) ? data : data?.data || []; setBestSellers(l.slice(0, 4)); setBsLoading(false); })
.catch(() => { setBestSellers([]); setBsLoading(false); });

    // New arrivals
    api.get('/products', { params: { isNewArrival: 'true', limit: 4, t: Date.now() } })
      .then(({ data }) => { const l = Array.isArray(data) ? data : data?.data || []; setNewArrivals(l.slice(0, 4)); setNaLoading(false); })
      .catch(() => { setNewArrivals([]); setNaLoading(false); });

    // Featured reel products
    api.get('/products', { params: { hasReel: 'true', limit: 10, t: Date.now() } })
      .then(({ data }) => {
        const l = Array.isArray(data) ? data : data?.data || [];
        setReelProducts(l.filter((p: any) => p.instagramReelUrl || p.videoUrl));
      })
      .catch(() => setReelProducts([]));

    // Real reviews
    api.get('/reviews', { params: { limit: 10, sort: 'recent', t: Date.now() } })
      .then(({ data }) => {
        const l = Array.isArray(data) ? data : data?.data || data?.reviews || [];
        setRecentReviews(l.filter((r: any) => r.comment && r.rating >= 4));
      })
      .catch(() => setRecentReviews([]));
  }, []);

  const marqueeText = s.marqueeText || 'Free Delivery on All Orders';
  const heroImage = s.heroImageUrl || '';
  const heroLeftImage = s.heroLeftImageUrl || '';
  const heroTitle = s.heroTitle || 'Make Every Occasion Special';
  const heroSubtitle = s.heroSubtitle || 'Designer Lehengas & Elegant Gowns for Festive Looks';
  const heroTitleEnabled = s.heroTitleEnabled !== false;
  const heroSubtitleEnabled = s.heroSubtitleEnabled !== false;

  const heroStyles = getHeroThemeStyles(s.themePrimaryColor);

  return (
    <div className="flex flex-col">

      {/* ── § 1 MARQUEE TOP (same text as admin marquee) ──────────────── */}
      {s.marqueeEnabled !== false && <LotusDivider text={marqueeText} />}

      {/* ── § 2 HERO — Usha Designers layout (all screens) ── */}
      <section
        className="w-full overflow-hidden relative md:min-h-[clamp(280px,42vw,560px)]"
        style={{ background: heroStyles.gradient }}
        aria-label="Hero banner"
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: lilyBg, backgroundSize: '120px 120px', opacity: 0.06 }} />

        <div className="relative z-10 md:h-full flex flex-col md:grid md:grid-cols-2 py-2 md:py-0">

          {/* ── Left: text on gradient ── */}
          <div className="flex flex-col justify-center px-[5%] py-4 md:py-12 lg:py-16 space-y-2 md:space-y-4 text-center md:text-left items-center md:items-start">
            {heroTitleEnabled && (
              <h1
                className="font-cormorant font-bold leading-none tracking-tight uppercase animate-slide-up"
                style={{ fontSize: 'clamp(1.8rem, 6vw, 5.5rem)', color: heroStyles.textColor }}
              >
                {heroTitle}
              </h1>
            )}
            {heroSubtitleEnabled && (
              <p
                className="leading-snug animate-slide-up animate-delay-100 font-sans max-w-xs md:max-w-sm"
                style={{ fontSize: 'clamp(0.7rem, 1.4vw, 1.1rem)', color: heroStyles.textColor, opacity: 0.8 }}
              >
                {heroSubtitle}
              </p>
            )}
            <Link
              href="/products"
              className="mt-2 md:mt-4 inline-block text-white font-bold uppercase tracking-widest rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all animate-slide-up animate-delay-200 font-sans"
              style={{ 
                fontSize: 'clamp(0.6rem, 1.1vw, 0.85rem)', 
                padding: 'clamp(7px, 1.1vw, 14px) clamp(16px, 2.8vw, 36px)',
                backgroundColor: heroStyles.textColor
              }}
            >
              SHOP NOW
            </Link>
          </div>

          {/* ── Right: 3 angled photo collage ── */}
          <div className="relative flex items-center justify-center overflow-hidden pr-[2%] pb-0 md:pb-0 h-[140px] md:h-auto">
            {/* 3 photos in angled/tilted frames */}
            <div className="flex items-center justify-center gap-[clamp(4px,1.2vw,16px)] h-full md:h-[80%] w-full">
              {/* Photo 1 — left, tilted left */}
              <div className="animate-slide-up animate-delay-100 flex-shrink-0">
                <div className="animate-float">
                  <div
                    className="relative overflow-hidden shadow-xl -rotate-6 transition-all duration-500 hover:scale-105 hover:rotate-0 cursor-pointer"
                    style={{
                      width: 'clamp(70px, 18vw, 200px)',
                      height: 'clamp(110px, 28vw, 320px)',
                      borderRadius: 'clamp(16px, 3vw, 40px)',
                    }}
                  >
                    <Image src={heroLeftImage || '/placeholder.png'} alt="Look 1" fill className="object-cover object-top" priority />
                  </div>
                </div>
              </div>
              {/* Photo 2 — center, tallest, straight */}
              <div className="animate-slide-up animate-delay-300 flex-shrink-0" style={{ zIndex: 10 }}>
                <div className="animate-float-reverse">
                  <div
                    className="relative overflow-hidden shadow-2xl transition-all duration-500 hover:scale-105 cursor-pointer"
                    style={{
                      width: 'clamp(80px, 20vw, 220px)',
                      height: 'clamp(130px, 34vw, 380px)',
                      borderRadius: 'clamp(20px, 4vw, 50px)',
                    }}
                  >
                    <Image src={heroImage || '/placeholder.png'} alt="Look 2" fill className="object-cover object-top" priority />
                  </div>
                </div>
              </div>
              {/* Photo 3 — right, tilted right */}
              <div className="animate-slide-up animate-delay-500 flex-shrink-0">
                <div className="animate-float">
                  <div
                    className="relative overflow-hidden shadow-xl rotate-6 transition-all duration-500 hover:scale-105 hover:rotate-0 cursor-pointer"
                    style={{
                      width: 'clamp(70px, 18vw, 200px)',
                      height: 'clamp(110px, 28vw, 320px)',
                      borderRadius: 'clamp(16px, 3vw, 40px)',
                    }}
                  >
                    <Image src={s.heroImage3Url || '/placeholder.png'} alt="Look 3" fill className="object-cover object-top" priority />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── § 3 SHOP BY COLLECTIONS — circular grid (all screens) ── */}
      <section className="pt-3 pb-10 md:pt-10 md:pb-14 px-4 max-w-7xl mx-auto overflow-hidden" aria-labelledby="collections-heading">
        <h2 id="collections-heading" className="block font-cormorant text-2xl md:text-4xl font-bold text-center text-foreground mb-6 md:mb-8">
          Shop by Collections
        </h2>

        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">No collections yet</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8 justify-items-center">
            {categories.map(cat => (
              <MobileCollectionCard key={cat.id} cat={cat} />
            ))}
          </div>
        )}
      </section>


      {/* ── § 4 LOTUS MARQUEE DIVIDER (admin text) ────────────────────── */}
      {s.marqueeEnabled !== false && <LotusDivider text={marqueeText} />}

      {/* ── § 5 BEST SELLERS ──────────────────────────────────────────── */}
      <ProductSection
        id="bestsellers-heading"
        title="Best Sellers"
        href="/products?filter=bestseller"
        products={bestSellers}
        isLoading={bsLoading}
      />

      {/* ── § 6 NEW ARRIVALS ──────────────────────────────────────────── */}
      <ProductSection
        id="new-arrivals-heading"
        title="New Arrivals"
        href="/products?filter=new"
        products={newArrivals}
        isLoading={naLoading}
      />

      {/* ── § 7 FEATURED VIDEOS ───────────────────────────────────────── */}
      <VideoCarousel videos={reelProducts} />

      {/* ── § 8 LOTUS MARQUEE DIVIDER ─────────────────────────────────── */}
      {s.marqueeEnabled !== false && <LotusDivider text={marqueeText} />}

      {/* ── § 9 WHAT OUR CUSTOMERS SAY ────────────────────────────────── */}
      <CustomerReviewsSection reviews={recentReviews} />
      
      {/* ── § 10 APP DOWNLOAD SECTION ─────────────────────────────────── */}
      <AppDownloadSection />

    </div>
  );
}
