'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { OptimizedImage } from '../common/OptimizedImage';

interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  user?: {
    name: string;
    avatar?: string | null;
  };
  product?: {
    name: string;
    slug: string;
    images?: string[];
  };
}

function StarsRow({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-4 h-4 ${s <= rating ? 'fill-primary stroke-primary' : 'fill-none stroke-muted-foreground/40'}`} />
      ))}
    </div>
  );
}

function ReviewCard({ review, index, getStyle }: { review: ReviewData; index: number; getStyle: (i: number) => any }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nX = (x / rect.width) - 0.5;
    const nY = (y / rect.height) - 0.5;
    setTilt({ x: -nY * 14, y: nX * 14 });
  };

  const style = getStyle(index);
  const currentImage = review.product?.images?.[0] || '/placeholder.png';

  return (
    <div 
      className="absolute flex flex-col items-center" 
      style={{ 
        ...style, 
        zIndex: tilt.x !== 0 || tilt.y !== 0 ? 30 : style.zIndex 
      }}
    >
      <div className="animate-scale-in flex flex-col items-center w-[300px] sm:w-[500px]">
        <Link
          href={review.product?.slug ? `/products/${review.product.slug}` : '/products'}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          className="flex flex-col sm:flex-row gap-6 items-center bg-white rounded-3xl p-6 shadow-xl border border-border cursor-pointer block group text-left w-full h-[360px] sm:h-[260px]"
          style={{ 
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, ${tilt.x !== 0 || tilt.y !== 0 ? 1.03 : 1}, 1)`,
            transition: tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'transform 0.08s ease-out'
          }}
        >
          <div className="relative shrink-0 w-28 h-36 sm:w-32 sm:h-40 rounded-2xl overflow-hidden border border-border shadow-md">
            <OptimizedImage
              src={currentImage}
              alt={review.product?.name || 'Product'}
              fill
              sizes="150px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-1">
            <div>
              <p className="font-cormorant text-xl font-bold text-primary mb-1 line-clamp-1">{review.user?.name || 'Customer'}</p>
              <StarsRow rating={review.rating} className="mb-2" />
              <p className="text-foreground/80 text-xs sm:text-sm leading-relaxed italic line-clamp-4">&ldquo;{review.comment}&rdquo;</p>
            </div>
            {review.product?.name && (
              <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1">on <span className="font-semibold text-foreground">{review.product.name}</span></p>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}

export const CustomerReviewsSection: React.FC<{ reviews: ReviewData[] }> = ({ reviews }) => {
  const [center, setCenter] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredReviews = reviews.filter(r => r.rating === 4 || r.rating === 5);
  const total = filteredReviews.length;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (total > 0) {
      setCenter(Math.min(1, total - 1));
    }
  }, [total]);

  const prev = () => setCenter(c => (c - 1 + total) % total);
  const next = () => setCenter(c => (c + 1) % total);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || total <= 1) return;

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
  }, [filteredReviews, total]);

  if (total === 0) return null;

  const getStyle = (i: number) => {
    const diff = ((i - center + total) % total + total) % total;
    const pos = diff <= total / 2 ? diff : diff - total;
    const absPos = Math.abs(pos);
    const scale = absPos === 0 ? 1 : absPos === 1 ? 0.82 : 0.65;
    const step = isMobile ? 180 : 350;
    const translateX = pos * step;
    const zIndex = 10 - absPos * 3;
    const opacity = absPos > 2 ? 0 : absPos === 2 ? 0.45 : 1;
    const blur = absPos === 2 ? 'blur(2px)' : 'none';
    return { 
      transform: `translateX(${translateX}px) scale(${scale})`, 
      zIndex, 
      opacity, 
      filter: blur, 
      transition: 'all 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' 
    };
  };

  return (
    <section className="py-16 bg-muted/10 border-t border-border overflow-hidden" aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="font-cormorant text-3xl md:text-4xl font-bold text-center text-primary mb-12">
        What Our Customers Say
      </h2>
      <div
        ref={containerRef}
        className="relative flex items-center justify-center select-none"
        style={{ height: isMobile ? 400 : 320 }}
      >
        {total > 1 && (
          <button
            onClick={prev}
            className="hidden md:flex absolute left-4 md:left-12 z-20 w-10 h-10 rounded-full border border-primary/20 items-center justify-center hover:bg-primary/5 transition-colors"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
        )}
        <div className="relative flex items-center justify-center animate-fade-in" style={{ width: '100%', maxWidth: 760 }}>
          {filteredReviews.map((review, i) => (
            <ReviewCard key={review.id} review={review} index={i} getStyle={getStyle} />
          ))}
        </div>
        {total > 1 && (
          <button
            onClick={next}
            className="hidden md:flex absolute right-4 md:right-12 z-20 w-10 h-10 rounded-full border border-primary/20 items-center justify-center hover:bg-primary/5 transition-colors"
            aria-label="Next review"
          >
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>
      {total > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {filteredReviews.map((_, i) => (
            <button key={i} onClick={() => setCenter(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${i === center ? 'bg-primary scale-125' : 'bg-primary/20'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
