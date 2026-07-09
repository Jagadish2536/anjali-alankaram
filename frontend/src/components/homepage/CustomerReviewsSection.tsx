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

  if (reviews.length === 0) return null;

  const review = reviews[idx];
  const currentImage = review.product?.images?.[0] || '/placeholder.png';
  const nextImage = reviews[(idx + 1) % reviews.length]?.product?.images?.[0] || '/placeholder.png';

  return (
    <section className="py-14 px-4 bg-muted/10 border-t border-border" aria-labelledby="testimonials-heading">
      <h2 id="testimonials-heading" className="font-cormorant text-3xl md:text-4xl font-bold text-center text-primary mb-12">
        What Our Customers Say
      </h2>
      <div className="max-w-3xl mx-auto">
        <Link
          href={review.product?.slug ? `/products/${review.product.slug}` : '/products'}
          className="flex flex-col md:flex-row gap-8 items-center bg-white rounded-3xl p-8 shadow-sm border border-border hover:shadow-md transition-shadow"
        >
          <div className="relative shrink-0 w-52 h-64">
            <div className="absolute -top-3 -left-3 w-40 h-52 rounded-2xl overflow-hidden border-4 border-white shadow-md rotate-[-4deg]">
              <OptimizedImage
                src={nextImage}
                alt=""
                fill
                sizes="150px"
                className="object-cover"
              />
            </div>
            <div className="absolute top-4 left-4 w-44 h-56 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
              <OptimizedImage
                src={currentImage}
                alt={review.product?.name || 'Product'}
                fill
                sizes="180px"
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
                className="w-9 h-9 rounded-full border border-primary/20 flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary text-primary transition-all shadow-sm"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setIdx(i => (i + 1) % reviews.length); }}
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
