'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { OptimizedImage } from '../common/OptimizedImage';

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
}

export const CollectionCard: React.FC<{ cat: CategoryData }> = ({ cat }) => {
  const img = cat.image && cat.image.trim() !== '' ? cat.image : '/placeholder.png';
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
      <OptimizedImage
        src={img}
        alt={cat.name}
        fill
        sizes="(max-width: 640px) 150px, 250px"
        className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <span className="text-white font-outfit font-semibold text-base drop-shadow-md">{cat.name}</span>
      </div>
    </Link>
  );
};

export const MobileCollectionCard: React.FC<{ cat: CategoryData }> = ({ cat }) => {
  const img = cat.image && cat.image.trim() !== '' ? cat.image : '/placeholder.png';
  return (
    <Link
      href={`/products?category=${cat.slug}`}
      className="flex flex-col items-center gap-2 group animate-scale-in"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-full overflow-hidden border-2 border-primary/10 shadow-md group-hover:shadow-lg group-active:scale-95 transition-all duration-300">
        <OptimizedImage
          src={img}
          alt={cat.name}
          fill
          sizes="(max-width: 640px) 80px, 150px"
          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <span className="text-[11px] md:text-xs lg:text-sm font-semibold text-center text-foreground leading-tight px-1 group-hover:text-primary transition-colors">{cat.name}</span>
    </Link>
  );
};
