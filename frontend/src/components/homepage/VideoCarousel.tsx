'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Play, Video } from 'lucide-react';
import { OptimizedImage } from '../common/OptimizedImage';

interface VideoData {
  id: string;
  name: string;
  slug: string;
  videoUrl?: string | null;
  instagramReelUrl?: string | null;
  images?: string[];
}

function AutoplayVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
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

function VideoCard({ vid, index, getStyle }: { vid: VideoData; index: number; getStyle: (i: number) => any }) {
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
            <OptimizedImage
              src={vid.images?.[0] || ''}
              alt={vid.name}
              fill
              sizes="250px"
              className="object-cover"
            />
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

export const VideoCarousel: React.FC<{ videos: VideoData[] }> = ({ videos }) => {
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
};
