'use client';

import React from 'react';

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

export const LotusDivider: React.FC<{ text?: string }> = ({ text }) => {
  const displayText = text || 'Free Delivery on All Orders';
  const items = Array(12).fill(null).flatMap((_, i) => [
    { type: 'text', val: displayText, key: `t${i}` },
    { type: 'lotus', key: `l${i}` },
  ]);

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
};
