'use client';

import React, { useState } from 'react';
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

export const CustomerReviewsSection: React.FC<{ reviews: ReviewData[] }> = ({ reviews }) => {
  const [idx, setIdx] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const filteredReviews = reviews.filter(r => r.rating === 4 || r.rating === 5);

  if (filteredReviews.length === 0) return null;

  // Clamp index in case data changed
  const activeIdx = idx >= filteredReviews.length ? 0 : idx;
  const review = filteredReviews[activeIdx];
  const currentImage = review.product?.images?.[0] || '/placeholder.png';

  const transitionTo = (newIdx: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setIdx(newIdx);
      setIsTransitioning(false);
    }, 250);
  };

  return (
    <section className="py-14 px-4 bg-muted/10 border-t border-border" aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="font-cormorant text-3xl md:text-4xl font-bold text-center text-primary mb-12">
        What Our Customers Say
      </h2>
      <div className="max-w-3xl mx-auto">
        <Link
          href={review.product?.slug ? `/products/${review.product.slug}` : '/products'}
          className={`flex flex-col md:flex-row gap-8 items-center bg-white rounded-3xl p-8 shadow-sm border border-border hover:shadow-md transition-all duration-300 ${
            isTransitioning ? 'opacity-0 scale-[0.98] translate-y-2' : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          <div className="relative shrink-0 w-44 h-56 rounded-2xl overflow-hidden border border-border shadow-md">
            <OptimizedImage
              src={currentImage}
              alt={review.product?.name || 'Product'}
              fill
              sizes="180px"
              className="object-cover"
            />
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
                onClick={(e) => {
                  e.preventDefault();
                  const prevIdx = (activeIdx - 1 + filteredReviews.length) % filteredReviews.length;
                  transitionTo(prevIdx);
                }}
                className="w-9 h-9 rounded-full border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary text-primary transition-all shadow-sm"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const nextIdx = (activeIdx + 1) % filteredReviews.length;
                  transitionTo(nextIdx);
                }}
                className="w-9 h-9 rounded-full border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary text-primary transition-all shadow-sm"
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
};
