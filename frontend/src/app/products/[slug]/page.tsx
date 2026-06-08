'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Star, Minus, Plus, ShoppingBag, Heart, Zap,
  Instagram, ExternalLink, Truck, ShieldCheck,
  RefreshCw, CheckCircle2, MapPin, Package, Loader2,
  X, Ruler, Send, Trash2, ThumbsUp, ChevronRight, Eye, ChevronDown,
  Share2, MessageCircle, Link2, Copy, Check
} from 'lucide-react';

// ── Lotus marquee ──────────────────────────────────────────────────────────────
const LotusSVG = () => (
  <svg viewBox="0 0 60 48" className="w-7 h-5 text-primary-foreground/70 shrink-0 mx-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M30 44C30 44 10 32 10 20C10 14 18 8 30 8C42 8 50 14 50 20C50 32 30 44 30 44Z"/>
    <path d="M30 44C30 44 16 30 16 18C16 12 22 6 30 6C38 6 44 12 44 18C44 30 30 44 30 44Z"/>
    <path d="M30 8C30 8 15 14 12 24" strokeLinecap="round"/>
    <path d="M30 8C30 8 45 14 48 24" strokeLinecap="round"/>
  </svg>
);

const MARQUEE_ITEMS = [
  'Free Delivery', 'Premium Quality',
  'Exchange is allowed only for damaged, defective, or wrong products',
  'Free Delivery', 'Premium Quality',
  'Exchange is allowed only for damaged, defective, or wrong products',
];

function LotusPolicyMarquee() {
  const items = MARQUEE_ITEMS.flatMap((t, i) => [{ type: 'text', val: t, key: `t${i}` }, { type: 'lotus', key: `l${i}` }]);
  const totalLength = MARQUEE_ITEMS.reduce((acc, t) => acc + t.length, 0);
  const duration = Math.max(80, Math.round(totalLength * 1.5));
  return (
    <div className="w-full bg-primary overflow-hidden py-2" aria-hidden="true">
      <div className="flex animate-marquee" style={{ animationDuration: `${duration}s`, width: 'max-content' }}>
        {[...items, ...items].map((item, idx) =>
          item.type === 'lotus'
            ? <LotusSVG key={`${item.key}-${idx}`} />
            : <span key={`${item.key}-${idx}`} className="text-primary-foreground/80 text-xs font-medium tracking-wide shrink-0 mx-2">{item.val}</span>
        )}
      </div>
    </div>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'How long does shipping take?', a: 'Orders are typically delivered within 5–8 business days across India. Express delivery options are available at checkout.' },
  { q: 'What is your return policy?', a: 'Exchange is allowed only for damaged, defective, or wrong products. Please raise a request within 48 hours of delivery with photos.' },
  { q: 'Do you offer international shipping?', a: 'Currently we ship within India only. We are working on expanding to international shipping soon.' },
];

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-0 border-t">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border-b">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between py-4 text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
          >
            {item.q}
            <ChevronDown className={`w-4 h-4 shrink-0 ml-4 transition-transform duration-200 ${open === i ? 'rotate-180 text-primary' : 'text-muted-foreground'}`} />
          </button>
          {open === i && (
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Image Lightbox Modal ────────────────────────────────────────────────────
function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initialIndex);

  // Keyboard navigation + body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center"
      onClick={onClose}
      // Touch swipe inside lightbox
      onTouchStart={e => {
        (e.currentTarget as HTMLDivElement).dataset.lbX = String(e.touches[0].clientX);
      }}
      onTouchEnd={e => {
        const el = e.currentTarget as HTMLDivElement;
        const dx = Number(el.dataset.lbX ?? 0) - e.changedTouches[0].clientX;
        if (Math.abs(dx) > 40) {
          if (dx > 0) setCurrent(c => (c + 1) % images.length);
          else setCurrent(c => (c - 1 + images.length) % images.length);
        }
        delete el.dataset.lbX;
      }}
    >
      {/* Close button — large, solid, always visible, safe-area aware */}
      <button
        className="absolute top-safe right-4 w-12 h-12 rounded-full bg-black/70 border border-white/20 flex items-center justify-center z-[210] shadow-xl"
        style={{ top: 'max(env(safe-area-inset-top, 0px) + 12px, 20px)' }}
        onClick={e => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Counter — offset right to not clash with close button */}
      <div className="absolute top-5 left-4 text-white/70 text-sm font-medium z-10 select-none bg-black/40 px-3 py-1 rounded-full">
        {current + 1} / {images.length}
      </div>

      {/* Main image */}
      <div
        className="relative w-full max-w-2xl px-8 md:px-16 flex items-center justify-center"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            className="absolute left-0 md:left-2 w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center transition-colors z-10"
            onClick={() => setCurrent(c => (c - 1 + images.length) % images.length)}
            aria-label="Previous image"
          >
            <span className="text-white text-2xl leading-none">‹</span>
          </button>
        )}

        <div
          className="relative w-full transition-opacity duration-200"
          style={{ aspectRatio: '3/4', maxHeight: '78vh' }}
        >
          <Image
            src={images[current]}
            alt={`Image ${current + 1}`}
            fill
            className="object-contain select-none"
            priority
            draggable={false}
          />
        </div>

        {images.length > 1 && (
          <button
            className="absolute right-0 md:right-2 w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center transition-colors z-10"
            onClick={() => setCurrent(c => (c + 1) % images.length)}
            aria-label="Next image"
          >
            <span className="text-white text-2xl leading-none">›</span>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="flex gap-2 mt-4 px-4 overflow-x-auto max-w-full"
          onClick={e => e.stopPropagation()}
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                current === i ? 'border-white scale-110 shadow-lg' : 'border-white/20 opacity-50 hover:opacity-100'
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={img} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Swipe hint on mobile — safe-area aware bottom */}
      <p
        className="absolute text-white/30 text-xs md:hidden select-none left-1/2 -translate-x-1/2"
        style={{ bottom: 'max(env(safe-area-inset-bottom, 0px) + 8px, 16px)' }}
      >
        ← Swipe images · Tap outside to close →
      </p>
    </div>
  );
}

// ── Size Guide Modal ────────────────────────────────────────────────────────
function SizeGuideModal({ sizeGuide, onClose }: { sizeGuide: any[]; onClose: () => void }) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');

  const convert = (val: string | undefined) => {
    if (!val || val === '—') return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return val; // non-numeric (e.g. "Free Size") — show as-is
    return unit === 'cm' ? (num * 2.54).toFixed(1) : val;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <Ruler className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold font-outfit">Size Guide</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Inch / CM toggle */}
            <div className="flex items-center bg-muted/30 rounded-xl p-1 gap-1">
              <button
                onClick={() => setUnit('in')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  unit === 'in' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Inches
              </button>
              <button
                onClick={() => setUnit('cm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  unit === 'cm' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                CM
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, hsl(340,60%,52%), hsl(340,60%,40%))' }}>
                  {['Size', `Bust (${unit})`, `Waist (${unit})`, `Hips (${unit})`, `Length (${unit})`].map(h => (
                    <th key={h} className="px-5 py-3.5 text-white font-semibold text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeGuide.map((row: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                    <td className="px-5 py-3 font-bold text-primary">{row.size}</td>
                    <td className="px-5 py-3 text-muted-foreground">{convert(row.bust) || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{convert(row.waist) || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{convert(row.hips) || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{convert(row.length) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-bold text-blue-800 mb-1">How to measure</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li><strong>Bust:</strong> Measure around the fullest part of your chest</li>
              <li><strong>Waist:</strong> Measure around your natural waistline</li>
              <li><strong>Hips:</strong> Measure around the fullest part of your hips</li>
              <li><strong>Length:</strong> From shoulder to hemline</li>
            </ul>
            {unit === 'cm' && (
              <p className="text-xs text-blue-500 mt-2 italic">Values are converted from inches (1 in = 2.54 cm)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Share Modal ─────────────────────────────────────────────────────────────
function ShareModal({ productName, onClose }: { productName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = `Check out this amazing product: ${productName}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
      color: 'bg-[#25D366] hover:bg-[#20bd5a] text-white',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank'),
    },
    {
      name: 'Instagram',
      icon: <Instagram className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white',
      action: () => window.open(`https://www.instagram.com/`, '_blank'),
    },
    {
      name: 'SMS / iMessage',
      icon: <MessageCircle className="w-6 h-6" />,
      color: 'bg-[#34C759] hover:bg-[#2ab34d] text-white',
      action: () => window.open(`sms:?body=${encodeURIComponent(text + ' ' + url)}`, '_blank'),
    },
    {
      name: 'Copy Link',
      icon: copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />,
      color: copied ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-muted hover:bg-muted/80 text-foreground',
      action: handleCopy,
    },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, text, url });
      } catch {}
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:w-auto md:min-w-[380px] md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          {/* Drag handle */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/20 md:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              <h3 className="font-outfit text-lg font-bold">Share this product</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product snippet */}
        <div className="mx-6 mb-4 p-3 bg-muted/30 rounded-xl border flex items-center gap-3">
          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">{url}</p>
        </div>

        {/* Share buttons grid */}
        <div className="px-6 pb-2">
          <div className="grid grid-cols-4 gap-3">
            {shareOptions.map(opt => (
              <button
                key={opt.name}
                onClick={opt.action}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${opt.color}`}
              >
                <span className="text-2xl flex items-center justify-center w-10 h-10">{opt.icon}</span>
                <span className="text-[10px] font-semibold leading-tight text-center">{opt.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Native share — only shown on devices that support Web Share API */}
        {(() => {
          const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
          if (!canNativeShare) return null;
          return (
            <div className="px-6 mt-3">
              <button
                onClick={handleNativeShare}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4" /> Share via…
              </button>
            </div>
          );
        })()}

        <div className="h-6" />
      </div>
    </div>
  );
}

// ── Star Rater ──────────────────────────────────────────────────────────────
function StarRater({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="text-2xl transition-transform hover:scale-125"
        >
          <Star className={`w-7 h-7 transition-colors ${s <= (hover || value) ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground'}`} />
        </button>
      ))}
    </div>
  );
}

// ── Review Card ─────────────────────────────────────────────────────────────
function ReviewCard({ review, onDelete, currentUserId }: { review: any; onDelete: () => void; currentUserId?: string }) {
  return (
    <div className="border rounded-2xl p-5 space-y-3 hover:border-primary/20 transition-colors bg-white">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
            {review.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-bold">{review.user?.name || 'Customer'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground'}`} />
                ))}
              </div>
              {review.isVerified && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Verified Purchase
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {review.userId === currentUserId && (
            <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {review.title && <p className="text-sm font-bold">{review.title}</p>}
      {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(() => Math.floor(Math.random() * 25) + 8);
  const [activeDetailTab, setActiveDetailTab] = useState<'description' | 'shipping'>('description');

  // Real-time active viewer counter heartbeat
  useEffect(() => {
    if (!params.slug) return;

    // Get or generate a unique visitor ID stored in localStorage
    let visitorId = '';
    if (typeof window !== 'undefined') {
      try {
        visitorId = localStorage.getItem('product_visitor_id') || '';
        if (!visitorId) {
          visitorId = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('product_visitor_id', visitorId);
        }
      } catch (e) {
        visitorId = 'vis_' + Math.random().toString(36).substring(2, 15);
      }
    }

    const sendHeartbeat = async () => {
      try {
        const { data } = await api.post(`/products/${params.slug}/viewers`, { visitorId });
        if (data && typeof data.count === 'number') {
          setViewerCount(data.count);
        }
      } catch (err) {
        console.error('Failed to send viewer heartbeat:', err);
      }
    };

    // Ping immediately on mount/slug change
    sendHeartbeat();

    // Ping every 20 seconds
    const interval = setInterval(sendHeartbeat, 20000);

    return () => {
      clearInterval(interval);
    };
  }, [params.slug]);

  // Wishlist
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Buy Now
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  // Delivery / pincode
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Cart feedback
  const [addedToCart, setAddedToCart] = useState(false);

  // Size guide modal
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Share modal
  const [showShare, setShowShare] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submitingReview, setSubmitingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  const { addItem, isLoading: isCartLoading, items: cartItems, fetchCart } = useCartStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart().catch(() => {});
    }
  }, [isAuthenticated, fetchCart]);

  const isAlreadyInCart = selectedVariant 
    ? (cartItems || []).some((item: any) => item.variant?.id === selectedVariant.id)
    : false;

  const hasColour = product?.variants?.some((v: any) => v.color && v.color.trim() !== '') || false;

  // ── Fetch product ───────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data } = await api.get(`/products/${params.slug}`);
        setProduct(data);
        if (data.variants?.length > 0) {
          // Pre-select the colour from the ?color= query param (e.g. from product listing filter)
          const colorParam = searchParams?.get('color');
          const matched = colorParam
            ? data.variants.find((v: any) =>
                v.color?.toLowerCase() === colorParam.toLowerCase()
              )
            : null;
          setSelectedVariant(matched || data.variants[0]);
        }
      } catch {
        console.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }
    if (params.slug) fetchProduct();
  }, [params.slug, searchParams]);

  // ── Fetch wishlist status ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !product) return;
    api.get('/wishlist').then(({ data }) => {
      const ids = data.items?.map((i: any) => i.productId) || [];
      setIsWishlisted(ids.includes(product.id));
    }).catch(() => {});
  }, [isAuthenticated, product]);

  // ── Fetch reviews ───────────────────────────────────────────────────────
  const fetchReviews = async (productId: string) => {
    setReviewsLoading(true);
    try {
      const { data } = await api.get(`/reviews/product/${productId}`);
      setReviews(Array.isArray(data) ? data : []);
    } catch { setReviews([]); }
    finally { setReviewsLoading(false); }
  };

  useEffect(() => {
    if (product?.id) fetchReviews(product.id);
  }, [product?.id]);

  // ── Fetch related products ──────────────────────────────────────────────
  useEffect(() => {
    if (!product?.category?.slug) return;
    api.get('/products', { params: { categorySlug: product.category.slug, limit: 6, t: Date.now() } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setRelatedProducts(list.filter((p: any) => p.id !== product.id).slice(0, 5));
      }).catch(() => {});
  }, [product?.category?.slug, product?.id]);

  // Reset carousel to first image when colour changes
  useEffect(() => { setActiveImage(0); }, [selectedVariant?.id]);

  if (isLoading) return (
    <div className="container py-20 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
      <p className="text-muted-foreground">Loading product…</p>
    </div>
  );
  if (!product) return <div className="container py-20 text-center text-muted-foreground">Product not found</div>;

  const currentPrice = Number(product.salePrice || product.basePrice) + Number(selectedVariant?.extraPrice || 0);
  const originalPrice = Number(product.basePrice) + Number(selectedVariant?.extraPrice || 0);
  const discountPct = currentPrice < originalPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const allImages: string[] = (() => {
    const imgs = (selectedVariant?.images?.length > 0 ? selectedVariant.images : product.images) || [];
    const validImgs = imgs.filter((img: string) => img && img.trim() !== '');
    return validImgs.length > 0 ? validImgs : ['/placeholder.png'];
  })();
  const sizeGuide: any[] = Array.isArray(product.sizeGuide) ? product.sizeGuide : [];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    try {
      await addItem(selectedVariant.id, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch { alert('Failed to add to cart. Please try again.'); }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;
    if (!isAuthenticated) { router.push('/login?returnUrl=' + window.location.pathname); return; }
    setIsBuyingNow(true);
    try {
      await addItem(selectedVariant.id, quantity);
      router.push('/checkout');
    } catch { alert('Failed. Please try again.'); }
    finally { setIsBuyingNow(false); }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await api.delete(`/wishlist/${product.id}`);
        setIsWishlisted(false);
      } else {
        await api.post(`/wishlist/${product.id}`, {});
        setIsWishlisted(true);
      }
    } catch { alert('Could not update wishlist'); }
    finally { setWishlistLoading(false); }
  };

  const checkPincode = async () => {
    if (pincode.length !== 6) { setPincodeStatus({ ok: false, msg: 'Please enter a valid 6-digit pincode.' }); return; }
    setCheckingPin(true);
    setPincodeStatus(null);
    await new Promise(r => setTimeout(r, 800));
    const ok = parseInt(pincode[0]) <= 8;
    setPincodeStatus({ ok, msg: ok ? `Delivery available to ${pincode}. Estimated 3–5 business days.` : `Sorry, delivery is not available to pincode ${pincode} yet.` });
    setCheckingPin(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!reviewForm.comment.trim()) { setReviewError('Please write a review comment.'); return; }
    setSubmitingReview(true);
    setReviewError('');
    try {
      await api.post('/reviews', { productId: product.id, ...reviewForm });
      setReviewSuccess(true);
      setReviewForm({ rating: 5, title: '', comment: '' });
      await fetchReviews(product.id);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review.');
    } finally { setSubmitingReview(false); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Delete your review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch { alert('Failed to delete review.'); }
  };

  const ratingBreakdown = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0
  }));

  return (
    <div>
      {showSizeGuide && sizeGuide.length > 0 && (
        <SizeGuideModal sizeGuide={sizeGuide} onClose={() => setShowSizeGuide(false)} />
      )}
      {lightboxOpen && allImages.length > 0 && (
        <ImageLightbox images={allImages} initialIndex={activeImage} onClose={() => setLightboxOpen(false)} />
      )}
      {showShare && (
        <ShareModal productName={product.name} onClose={() => setShowShare(false)} />
      )}

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="container py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {product.isBestseller
            ? <><Link href="/products?filter=bestseller" className="hover:text-primary transition-colors">Best Sellers</Link><ChevronRight className="w-3 h-3" /></>
            : product.category?.name
            ? <><Link href={`/products?category=${product.category.slug}`} className="hover:text-primary transition-colors">{product.category.name}</Link><ChevronRight className="w-3 h-3" /></>
            : null
          }
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </div>
      </div>

      {/* ── MOBILE FIXED BOTTOM BAR ───────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-[60px] left-0 right-0 z-40 bg-[#FDF5EC] border-t border-primary/10 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Variant dropdown */}
        {product.variants?.length > 0 && (
          <div className="relative flex-1">
            <select
              value={selectedVariant?.id || ''}
              onChange={e => {
                const v = product.variants.find((vv: any) => vv.id === e.target.value);
                if (v) setSelectedVariant(v);
              }}
              className="w-full h-12 rounded-xl border-2 border-primary/20 bg-white text-foreground text-sm font-medium px-3 pr-8 outline-none appearance-none cursor-pointer"
            >
              {product.variants.map((v: any) => (
                <option key={v.id} value={v.id} disabled={v.stock === 0}>
                  {v.color && v.color.trim() ? `${v.color} — ` : ''}{v.size ? v.size + ' — ' : ''}₹{Number(product.salePrice || product.basePrice).toLocaleString('en-IN')}{v.stock === 0 ? ' (Out of Stock)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        )}
        {/* Add to Cart */}
        <button
          onClick={isAlreadyInCart ? () => router.push('/cart') : handleAddToCart}
          disabled={isCartLoading || (!isAlreadyInCart && (!selectedVariant || selectedVariant?.stock === 0))}
          className={`flex-[1.5] h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
            isAlreadyInCart
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : addedToCart
              ? 'bg-green-600 text-white'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isAlreadyInCart ? (
            <>Go to cart</>
          ) : addedToCart ? (
            <><CheckCircle2 className="w-4 h-4" />Added!</>
          ) : isCartLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Add to cart'
          )}
        </button>
      </div>

      {/* Extra padding so content isn't hidden behind sticky bars on mobile */}
      <div className="container py-4 pb-[140px] md:pb-[80px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 isolate">

          {/* ── Images ─────────────────────────────────────────────────── */}
          <div className="relative z-0 md:sticky md:top-4 md:self-start isolate">

            {/* MOBILE: full-width swipe carousel with dots */}
            <div className="md:hidden">
              <div className="relative w-full bg-muted/10" style={{ aspectRatio: '3/4', overflow: 'hidden' }}>
                {/* Image track — swipe via touch */}
                <div
                  className="flex h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${activeImage * 100}%)` }}
                >
                  {allImages.length > 0 ? allImages.map((img: string, i: number) => (
                    <div key={i} className="relative shrink-0 w-full h-full">
                      <Image src={img} alt={product.name} fill className="object-cover" priority={i === 0} />
                    </div>
                  )) : (
                    <div className="shrink-0 w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                  )}
                </div>

                {/* Touch swipe handlers + tap-to-open lightbox */}
                <div
                  className="absolute inset-0 z-10"
                  onTouchStart={e => {
                    const t = e.touches[0];
                    (e.currentTarget as HTMLDivElement).dataset.touchX = String(t.clientX);
                    (e.currentTarget as HTMLDivElement).dataset.touchY = String(t.clientY);
                    (e.currentTarget as HTMLDivElement).dataset.moved = '0';
                  }}
                  onTouchMove={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    const dx = Math.abs(Number(el.dataset.touchX ?? 0) - e.touches[0].clientX);
                    if (dx > 8) el.dataset.moved = '1';
                  }}
                  onTouchEnd={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    const startX = Number(el.dataset.touchX ?? 0);
                    const startY = Number(el.dataset.touchY ?? 0);
                    const dx = startX - e.changedTouches[0].clientX;
                    const dy = startY - e.changedTouches[0].clientY;
                    const moved = el.dataset.moved === '1';
                    if (!moved && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                      // Tap — open lightbox
                      setLightboxOpen(true);
                    } else if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                      // Swipe — change image
                      if (dx > 0) setActiveImage(i => Math.min(i + 1, allImages.length - 1));
                      else setActiveImage(i => Math.max(i - 1, 0));
                    }
                    delete el.dataset.touchX;
                    delete el.dataset.touchY;
                    delete el.dataset.moved;
                  }}
                  style={{ touchAction: 'pan-y' }}
                />

                <div className="absolute bottom-3 left-3 bg-black/30 rounded-full p-1.5 pointer-events-none z-20 opacity-50">
                  <Eye className="w-3.5 h-3.5 text-white" />
                </div>

                {/* Discount badge */}
                {discountPct > 0 && (
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full shadow z-20">{discountPct}% OFF</div>
                )}

                {/* Wishlist button */}
                <button
                  onClick={e => { e.stopPropagation(); handleWishlist(); }}
                  disabled={wishlistLoading}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-md z-20 ${
                    isWishlisted ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-foreground'
                  }`}
                  aria-label="Wishlist"
                >
                  {wishlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />}
                </button>
              </div>

              {/* Dot indicators */}
              {allImages.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {allImages.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`rounded-full transition-all duration-200 ${
                        i === activeImage
                          ? 'w-5 h-2 bg-primary'
                          : 'w-2 h-2 bg-primary/25'
                      }`}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* DESKTOP: vertical thumbnails + main image */}
            <div className="hidden md:flex gap-3">
              {allImages.length > 1 && (
                <div className="flex flex-col gap-2 shrink-0">
                  {allImages.slice(0, 6).map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImage === i ? 'border-primary shadow-md' : 'border-transparent hover:border-primary/40'
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div
                className="relative flex-1 aspect-[3/4] overflow-hidden rounded-2xl bg-accent/20 group cursor-zoom-in"
                onClick={() => allImages.length > 0 && setLightboxOpen(true)}
              >
                {allImages[activeImage] && (
                  <Image src={allImages[activeImage]} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" priority />
                )}
                <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">🔍 Zoom</div>
                {discountPct > 0 && (
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full shadow">{discountPct}% OFF</div>
                )}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={e => { e.stopPropagation(); handleWishlist(); }}
                    disabled={wishlistLoading}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shadow transition-all backdrop-blur-sm ${
                      isWishlisted ? 'bg-primary text-primary-foreground' : 'bg-white/80 text-gray-600 hover:text-primary'
                    }`}
                    aria-label="Wishlist"
                  >
                    {wishlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* ── Details ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Name + social proof */}
          <div>
            <h1 className="font-outfit text-2xl md:text-3xl font-bold text-foreground leading-tight">{product.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(Number(product.avgRating)) ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground fill-none opacity-40'}`} />)}
              </div>
              <button onClick={() => { setActiveTab('reviews'); document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-xs text-muted-foreground hover:text-primary underline">{product.reviewCount} reviews</button>
              {product.isBestseller && <span className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">🔥 Bestseller</span>}
            </div>
          </div>

          {/* Price + stock + social proof */}
          <div className="space-y-1.5">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-outfit font-bold">₹ {Number(currentPrice).toLocaleString('en-IN')}</span>
              {discountPct > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through mb-0.5">{formatPrice(originalPrice)}</span>
                  <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full mb-0.5">{discountPct}% OFF</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {selectedVariant ? `${selectedVariant.stock > 0 ? selectedVariant.stock : 0} In Stock` : '100 In Stock'}
              </span>
            </div>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground font-medium">
              <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{viewerCount} people are viewing this right now</span>
            </p>
          </div>

          {/* Size + Colour Selector */}
          {product.variants?.length > 0 && (() => {
            // Extract unique colours (non-empty)
            const colouredVariants = product.variants.filter((v: any) => v.color && v.color.trim() !== '');
            const uniqueColours = colouredVariants.length > 0
              ? Array.from(new Map(colouredVariants.map((v: any) => [v.color, v])).values()) as any[]
              : [];
            const hasColour = uniqueColours.length > 0;

            return (
              <div className="space-y-4">
                {/* Colour swatches */}
                {hasColour && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold">Colour</h3>
                      {selectedVariant?.color && (
                        <span className="text-xs text-muted-foreground font-medium">
                          — {selectedVariant.color}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {uniqueColours.map((v: any) => {
                        // Is this colour hex or a name? Detect by leading '#'
                        const isHex = v.color?.startsWith('#');
                        const selectedColorGroup = selectedVariant?.color;
                        const isSelected = selectedColorGroup === v.color;
                        const outOfStock = product.variants
                          .filter((vv: any) => vv.color === v.color)
                          .every((vv: any) => vv.stock === 0);
                        return (
                          <button
                            key={v.id}
                            title={v.color}
                            disabled={outOfStock}
                            onClick={() => {
                              // Select first in-stock variant of this colour
                              const match = product.variants.find(
                                (vv: any) => vv.color === v.color && vv.stock > 0
                              ) || product.variants.find((vv: any) => vv.color === v.color);
                              if (match) setSelectedVariant(match);
                            }}
                            className={`relative w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:border-foreground/40'
                            } ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {isHex ? (
                              <span
                                className="block w-7 h-7 rounded-full"
                                style={{ backgroundColor: v.color }}
                              />
                            ) : (
                              <span
                                className="block w-7 h-7 rounded-full border border-border"
                                style={{ backgroundColor: v.color }}
                              />
                            )}
                            {outOfStock && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="block w-8 h-0.5 bg-muted-foreground/60 rotate-45 rounded-full" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">Select Size</h3>
                    {sizeGuide.length > 0 && (
                      <button onClick={() => setShowSizeGuide(true)} className="text-xs text-primary flex items-center gap-1 hover:underline font-medium">
                        <Ruler className="w-3.5 h-3.5" /> Size Guide
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.variants
                      .filter((v: any) => !hasColour || v.color === selectedVariant?.color)
                      .map((v: any) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          disabled={v.stock === 0}
                          className={`h-11 px-5 rounded-full border-2 text-sm font-semibold transition-all ${
                            selectedVariant?.id === v.id
                              ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                              : v.stock === 0 ? 'border-muted text-muted-foreground bg-muted/30 cursor-not-allowed line-through' : 'border-input hover:border-primary hover:text-primary'
                          }`}
                        >
                          {v.size}{v.stock === 0 && ' ✕'}
                        </button>
                      ))}
                  </div>
                  {selectedVariant && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedVariant.stock > 0 ? <><span className="text-green-600 font-bold">✓ In Stock</span> — {selectedVariant.stock} left</> : <span className="text-red-600 font-bold">Out of Stock</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Quantity */}
          <div>
            <p className="text-sm font-semibold mb-2">Quantity</p>
            <div className="flex items-center border border-border rounded-xl h-11 w-36 justify-between px-4 bg-white">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-muted-foreground hover:text-foreground"><Minus className="w-4 h-4" /></button>
              <span className="font-semibold text-sm">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} disabled={!selectedVariant || selectedVariant.stock <= quantity} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                id="add-to-cart-btn"
                onClick={isAlreadyInCart ? () => router.push('/cart') : handleAddToCart}
                disabled={isCartLoading || (!isAlreadyInCart && (!selectedVariant || selectedVariant?.stock === 0))}
                className={`flex-1 h-12 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
                  isAlreadyInCart
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-50 hover:bg-emerald-100/50'
                    : addedToCart
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-primary text-primary hover:bg-primary/5'
                }`}
              >
                {isAlreadyInCart ? (
                  <>Go to cart</>
                ) : addedToCart ? (
                  <><CheckCircle2 className="w-4 h-4" />Added!</>
                ) : isCartLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Add to cart'
                )}
              </button>
              {/* Share button */}
              <button
                id="share-btn"
                onClick={() => setShowShare(true)}
                className="h-12 w-12 shrink-0 rounded-xl border-2 border-input flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all active:scale-95"
                aria-label="Share product"
                title="Share this product"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            <button
              id="buy-now-btn"
              onClick={handleBuyNow}
              disabled={isBuyingNow || isCartLoading || !selectedVariant || selectedVariant?.stock === 0}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
            >
              {isBuyingNow ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : 'BUY NOW'}
            </button>
            <p className="text-xs text-muted-foreground text-center">📦 Estimated Delivery: 10 - 12 days</p>
          </div>

          {/* ── DELIVERY OPTIONS ─────────────────────────────────────── */}
          <div className="border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/10">
              <Truck className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold uppercase tracking-wide">Delivery Options</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="pincode-input"
                      type="tel" maxLength={6} placeholder="Enter pincode"
                      value={pincode}
                      onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setPincodeStatus(null); }}
                      onKeyDown={e => e.key === 'Enter' && checkPincode()}
                      className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary bg-muted/10"
                    />
                  </div>
                  <button onClick={checkPincode} disabled={checkingPin || pincode.length < 6} className="px-5 py-2.5 rounded-xl text-sm font-bold text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40">
                    {checkingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                  </button>
                </div>
                {pincodeStatus ? (
                  <p className={`text-xs mt-2 flex items-center gap-1.5 font-medium ${pincodeStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {pincodeStatus.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : '⚠'} {pincodeStatus.msg}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">Enter your PIN code to check delivery availability &amp; estimated time</p>
                )}
              </div>
              <div className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0"><ShieldCheck className="w-3.5 h-3.5 text-green-600" /></div>
                  <span className="text-sm text-muted-foreground">100% Original Products</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Truck className="w-3.5 h-3.5 text-blue-600" /></div>
                  <span className="text-sm text-muted-foreground">Estimated delivery in 10–12 business days</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Package className="w-3.5 h-3.5 text-primary" /></div>
                  <span className="text-sm text-muted-foreground">Carefully packed &amp; insured shipping</span>
                </div>
              </div>
            </div>
          </div>

          </div>

        </div>
      </div>

      {/* ── Lotus Policy Marquee ────────────────────────────────────────────── */}
      <LotusPolicyMarquee />

      {/* ── Product Description + Shipping Tabs ─────────────────────────────── */}
      <div className="container py-10">
        <div className="flex border-b border-border mb-8">
          {(['description', 'shipping'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveDetailTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors -mb-[2px] ${
                activeDetailTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'description' ? 'Product description' : 'Shipping & Refund'}
            </button>
          ))}
        </div>

        {activeDetailTab === 'description' && (
          <div className="max-w-3xl space-y-4 text-sm text-muted-foreground leading-relaxed">
            {product.description ? (
              <p className="whitespace-pre-wrap">{product.description}</p>
            ) : (
              <p className="text-muted-foreground/60">No description available.</p>
            )}
            {(product.material || product.careInstructions) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {product.material && (
                  <div className="p-4 bg-muted/20 rounded-xl border">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Material</p>
                    <p className="font-medium text-foreground">{product.material}</p>
                  </div>
                )}
                {product.careInstructions && (
                  <div className="p-4 bg-muted/20 rounded-xl border">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Care Instructions</p>
                    <p className="font-medium text-foreground">{product.careInstructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeDetailTab === 'shipping' && (
          <div className="max-w-3xl text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>📦 <strong>Delivery Time:</strong> Orders are delivered within 10–12 business days across India.</p>
            <p>🔄 <strong>Exchange Policy:</strong> Exchange is allowed only for damaged, defective, or wrong products. Contact us within 48 hours of delivery.</p>
            <p>💳 <strong>Payment:</strong> We accept UPI and Credit/Debit Cards.</p>
          </div>
        )}
      </div>

      {/* ── Reviews section ──────────────────────────────────────────────────── */}
      <div id="reviews-section" className="container pb-10 mt-4">
        <h2 className="font-outfit text-xl font-bold text-foreground mb-6">Customer Reviews</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Summary panel */}
          <div className="space-y-6">
            <div className="p-6 border rounded-2xl text-center bg-white shadow-sm">
              <div className="text-6xl font-outfit font-bold text-foreground">{Number(product.avgRating).toFixed(1)}</div>
              <div className="flex justify-center gap-1 my-2">
                {[1,2,3,4,5].map(s => <Star key={s} className={`w-5 h-5 ${s <= Math.round(Number(product.avgRating)) ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground fill-none'}`} />)}
              </div>
              <p className="text-sm text-muted-foreground">{product.reviewCount} reviews</p>
            </div>
            <div className="space-y-2">
              {ratingBreakdown.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-4 text-right font-medium">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400 shrink-0" />
                  <div className="flex-1 bg-muted/20 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-5">{count}</span>
                </div>
              ))}
            </div>

            {/* Write review form */}
            {isAuthenticated ? (
              <div className="border rounded-2xl p-5 bg-white shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-primary" /> Write a Review</h3>
                {reviewSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Review submitted!
                  </div>
                )}
                {reviewError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <X className="w-4 h-4" /> {reviewError}
                  </div>
                )}
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wide">Your Rating</label>
                    <StarRater value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-muted-foreground uppercase tracking-wide">Title (optional)</label>
                    <input
                      type="text"
                      placeholder="Summarise your experience"
                      className="w-full px-3 py-2 bg-muted/20 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                      value={reviewForm.title}
                      onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-muted-foreground uppercase tracking-wide">Review *</label>
                    <textarea
                      required rows={4}
                      placeholder="Tell others what you think about this product..."
                      className="w-full px-3 py-2 bg-muted/20 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                      value={reviewForm.comment}
                      onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitingReview}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Submit Review</>}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-5 border rounded-2xl text-center bg-muted/5">
                <p className="text-sm text-muted-foreground mb-3">Sign in to leave a review</p>
                <button onClick={() => router.push('/login')} className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90">Sign In</button>
              </div>
            )}
          </div>

          {/* Review list */}
          <div className="lg:col-span-2 space-y-4">
            {reviewsLoading ? (
              <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary/60 mx-auto" /></div>
            ) : reviews.length === 0 ? (
              <div className="py-16 text-center border rounded-2xl bg-muted/5">
                <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No reviews yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Be the first to review this product!</p>
              </div>
            ) : (
              reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={user?.id}
                  onDelete={() => handleDeleteReview(review.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>


      {/* ── Instagram Reel ─────────────────────────────────────────────── */}
      {product.instagramReelUrl && (() => {
        const match = product.instagramReelUrl.match(/instagram\.com\/(reel|p)\/([A-Za-z0-9_-]+)/);
        if (!match) return null;
        return (
          <div className="container mt-4 mb-8">
            <div className="rounded-2xl overflow-hidden border shadow">
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5 text-white" />
                  <span className="font-bold text-white">See it in action</span>
                </div>
                <a href={product.instagramReelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
                  View on Instagram <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-center py-6 bg-pink-50">
                <iframe src={`https://www.instagram.com/reel/${match[2]}/embed/`} width="360" height="480" frameBorder="0" scrolling="no" allowTransparency allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" className="rounded-xl shadow-xl max-w-full" title="Instagram Reel" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="container py-8">
        <h2 className="font-cormorant text-3xl font-bold text-center text-primary mb-8">Frequently Asked Questions</h2>
        <div className="max-w-2xl mx-auto">
          <FaqAccordion />
        </div>
      </div>

      {/* ── You Might Also Like ───────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="container py-8 pb-16">
          <h2 className="font-cormorant text-3xl font-bold text-center text-foreground mb-8">You Might Also Like</h2>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {relatedProducts.map(rp => (
              <Link key={rp.id} href={`/products/${rp.slug}`} className="group shrink-0 w-44">
                <div className="relative w-44 aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-2">
                  {rp.images?.[0] && rp.images[0].trim() !== ''
                    ? <Image src={rp.images[0]} alt={rp.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <Image src="/placeholder.png" alt={rp.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  }
                  <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{rp.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">₹ {Number(rp.salePrice || rp.basePrice).toLocaleString('en-IN')}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Sticky bottom buy bar — shown on mobile only, above bottom nav ─── */}
      <div className="md:hidden fixed bottom-[60px] left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg py-2.5 px-3 flex items-center gap-2">
        {allImages[0] && (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
            <Image src={allImages[0]} alt={product.name} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground line-clamp-1">{product.name}</p>
          <p className="text-xs font-bold text-primary">₹ {Number(currentPrice).toLocaleString('en-IN')}</p>
        </div>
        {/* Variant selector */}
        {product.variants?.length > 0 && selectedVariant && (
          <select
            value={selectedVariant.id}
            onChange={e => setSelectedVariant(product.variants.find((v: any) => v.id === e.target.value))}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary shrink-0 max-w-[100px]"
          >
            {product.variants
              .filter((v: any) => !hasColour || v.color === selectedVariant?.color)
              .map((v: any) => (
                <option key={v.id} value={v.id} disabled={v.stock === 0}>
                  {v.size || 'Default'}
                </option>
              ))}
          </select>
        )}
        <button
          onClick={handleBuyNow}
          disabled={isBuyingNow || !selectedVariant || selectedVariant?.stock === 0}
          className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {isBuyingNow ? 'Wait…' : 'Buy Now'}
        </button>
        <button
          onClick={isAlreadyInCart ? () => router.push('/cart') : handleAddToCart}
          disabled={isCartLoading || (!isAlreadyInCart && (!selectedVariant || selectedVariant?.stock === 0))}
          className={`shrink-0 text-xs font-bold px-4 py-2.5 rounded-xl border-2 transition-colors disabled:opacity-50 whitespace-nowrap ${
            isAlreadyInCart
              ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
              : addedToCart
              ? 'border-green-500 text-green-600 bg-green-50'
              : 'border-primary text-primary hover:bg-primary/5'
          }`}
        >
          {isAlreadyInCart ? 'Go to cart' : addedToCart ? '✓ Added' : 'Cart'}
        </button>
      </div>

      {/* ── Desktop sticky buy bar — hidden on mobile ─────────────────────── */}
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-lg py-2.5 px-4 items-center gap-3">
        {allImages[0] && (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
            <Image src={allImages[0]} alt={product.name} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-1">{product.name}</p>
        </div>
        {product.variants?.length > 0 && selectedVariant && (
          <select
            value={selectedVariant.id}
            onChange={e => setSelectedVariant(product.variants.find((v: any) => v.id === e.target.value))}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary shrink-0 max-w-[140px]"
          >
            {product.variants
              .filter((v: any) => !hasColour || v.color === selectedVariant?.color)
              .map((v: any) => (
                <option key={v.id} value={v.id} disabled={v.stock === 0}>
                  {v.size || 'Default'} — ₹{Number(Number(product.salePrice || product.basePrice) + Number(v.extraPrice || 0)).toLocaleString('en-IN')}
                </option>
              ))}
          </select>
        )}
        <div className="flex items-center border border-border rounded-lg h-8 gap-0 shrink-0">
          <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-7 h-full flex items-center justify-center text-muted-foreground hover:text-foreground border-r border-border"><Minus className="w-3 h-3" /></button>
          <span className="w-7 text-center text-xs font-semibold">{quantity}</span>
          <button onClick={() => setQuantity(q => q + 1)} className="w-7 h-full flex items-center justify-center text-muted-foreground hover:text-foreground border-l border-border"><Plus className="w-3 h-3" /></button>
        </div>
        <button
          onClick={isAlreadyInCart ? () => router.push('/cart') : handleAddToCart}
          disabled={isCartLoading || (!isAlreadyInCart && (!selectedVariant || selectedVariant?.stock === 0))}
          className={`shrink-0 text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
            isAlreadyInCart
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {isAlreadyInCart ? 'Go to cart' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
}
