'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ShoppingBag, Star, ChevronLeft, ChevronRight, Play } from 'lucide-react';

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

// ── Lotus Marquee Divider ────────────────────────────────────────────────────
function LotusDivider({ text }: { text?: string }) {
  const items = text
    ? Array(14).fill(null).flatMap((_, i) => [{ type: 'text', val: text, key: `t${i}` }, { type: 'lotus', key: `l${i}` }])
    : Array(20).fill(null).map((_, i) => ({ type: 'lotus', key: `l${i}` }));

  return (
    <div className="w-full bg-primary overflow-hidden py-2.5" aria-hidden="true">
      <div className="flex animate-marquee" style={{ width: 'max-content' }}>
        {[...items, ...items].map((item, idx) =>
          item.type === 'lotus'
            ? <LotusSVG key={`${item.key}-${idx}`} className="w-8 h-6 text-primary-foreground/70 shrink-0 mx-3" />
            : <span key={`${item.key}-${idx}`} className="text-primary-foreground/90 text-xs font-medium tracking-wider uppercase shrink-0 mx-2">{item.val}</span>
        )}
      </div>
    </div>
  );
}

// ── Lily Watermark BG (SVG data URI) ─────────────────────────────────────────
const lilyBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 100C60 100 30 80 30 55C30 40 44 28 60 28C76 28 90 40 90 55C90 80 60 100 60 100Z' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 100C60 100 42 76 42 52C42 38 50 24 60 24C70 24 78 38 78 52C78 76 60 100 60 100Z' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 28C60 28 36 36 32 54' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 28C60 28 84 36 88 54' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3C/svg%3E")`;

// ── Category card ────────────────────────────────────────────────────────────
function CollectionCard({ cat }: { cat: any }) {
  const img = cat.image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600';
  return (
    <Link href={`/products?category=${cat.slug}`} className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer block">
      <div className="absolute inset-0 bg-primary" style={{ backgroundImage: lilyBg, backgroundSize: '120px 120px' }} />
      <Image src={img} alt={cat.name} fill className="object-cover object-top group-hover:scale-105 transition-transform duration-700 mix-blend-multiply opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute bottom-4 left-4">
        <span className="text-white font-outfit font-semibold text-base drop-shadow-md">{cat.name}</span>
      </div>
    </Link>
  );
}

// ── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAddToCart }: { product: any; onAddToCart?: (id: string) => void }) {
  const hasDiscount = product.salePrice && product.basePrice && Number(product.salePrice) < Number(product.basePrice);
  const discountPct = hasDiscount ? Math.round(((Number(product.basePrice) - Number(product.salePrice)) / Number(product.basePrice)) * 100) : 0;
  const isSoldOut = product.stock === 0;

  return (
    <div className="group flex flex-col relative">
      <Link href={`/products/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden rounded-xl bg-muted mb-3">
        {product.images?.[0] ? (
          <Image src={product.images[0]} alt={product.name} fill className="object-cover object-center group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">No Image</div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            {discountPct}% OFF
          </span>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-foreground text-xs font-bold px-3 py-1 rounded-full shadow">SOLD OUT</span>
          </div>
        )}
        {onAddToCart && !isSoldOut && (
          <button
            onClick={(e) => { e.preventDefault(); onAddToCart(product.id); }}
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-200"
            aria-label="Add to cart"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        )}
      </Link>
      <Link href={`/products/${product.slug}`}>
        <h3 className="text-sm font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-sm">{formatPrice(product.salePrice || product.basePrice)}</span>
          {hasDiscount && (
            <span className="text-muted-foreground line-through text-xs">{formatPrice(product.basePrice)}</span>
          )}
        </div>
      </Link>
    </div>
  );
}

// ── Featured Videos Carousel (real Instagram reel URLs from products) ─────────
function VideoCarousel({ videos }: { videos: any[] }) {
  const [center, setCenter] = useState(0);

  useEffect(() => {
    if (videos.length > 0) setCenter(Math.min(2, videos.length - 1));
  }, [videos.length]);

  if (videos.length === 0) {
    return (
      <section className="py-16 bg-background">
        <h2 className="font-cormorant text-3xl md:text-4xl font-bold text-center text-primary mb-6">Featured Videos</h2>
        <p className="text-center text-muted-foreground text-sm">No videos yet — add an Instagram Reel URL to a product to feature it here.</p>
      </section>
    );
  }

  const total = videos.length;
  const prev = () => setCenter(c => (c - 1 + total) % total);
  const next = () => setCenter(c => (c + 1) % total);

  const getStyle = (i: number) => {
    const diff = ((i - center + total) % total + total) % total;
    const pos = diff <= total / 2 ? diff : diff - total;
    const absPos = Math.abs(pos);
    const scale = absPos === 0 ? 1 : absPos === 1 ? 0.82 : 0.65;
    const translateX = pos * 220;
    const zIndex = 10 - absPos * 3;
    const opacity = absPos > 2 ? 0 : absPos === 2 ? 0.45 : 1;
    const blur = absPos === 2 ? 'blur(2px)' : 'none';
    return { transform: `translateX(${translateX}px) scale(${scale})`, zIndex, opacity, filter: blur, transition: 'all 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' };
  };

  return (
    <section className="py-16 bg-background">
      <h2 className="font-cormorant text-3xl md:text-4xl font-bold text-center text-primary mb-12">Featured Videos</h2>
      <div className="relative flex items-center justify-center" style={{ height: 380 }}>
        <button onClick={prev} className="absolute left-4 md:left-12 z-20 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors" aria-label="Previous">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="relative flex items-center justify-center" style={{ width: '100%', maxWidth: 700 }}>
          {videos.map((vid, i) => (
            <div key={vid.id} className="absolute" style={getStyle(i)}>
              <Link
                href={`/products/${vid.slug}`}
                className="relative w-52 rounded-2xl overflow-hidden shadow-xl cursor-pointer block group"
                style={{ aspectRatio: '9/16', maxHeight: 340 }}
              >
                <Image src={vid.images?.[0] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=400'} alt={vid.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-primary fill-primary ml-0.5" />
                  </div>
                </div>
                {/* Instagram badge */}
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-xs font-semibold line-clamp-1 drop-shadow-md">{vid.name}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
        <button onClick={next} className="absolute right-4 md:right-12 z-20 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors" aria-label="Next">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      {/* Dot pagination */}
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

// ── "What Our Customers Say" — real reviews from DB, each links to product ────
function CustomerReviewsSection({ reviews }: { reviews: any[] }) {
  const [idx, setIdx] = useState(0);

  if (reviews.length === 0) {
    return (
      <section className="py-14 px-4" aria-labelledby="testimonials-heading">
        <h2 id="testimonials-heading" className="font-cormorant text-3xl md:text-4xl font-bold text-center text-foreground mb-6">
          What Our Customers Say
        </h2>
        <p className="text-center text-muted-foreground text-sm">No reviews yet — be the first to review a product!</p>
      </section>
    );
  }

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
          {/* Product image */}
          <div className="relative shrink-0 w-52 h-64">
            <div className="absolute -top-3 -left-3 w-40 h-52 rounded-2xl overflow-hidden border-4 border-white shadow-md rotate-[-4deg]">
              <Image
                src={reviews[(idx + 1) % reviews.length]?.product?.images?.[0] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=400'}
                alt=""
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute top-4 left-4 w-44 h-56 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
              <Image
                src={review.product?.images?.[0] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=400'}
                alt={review.product?.name || 'Product'}
                fill
                className="object-cover"
              />
            </div>
          </div>
          {/* Text */}
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

// ── Main Homepage ─────────────────────────────────────────────────────────────
export default function Home() {
  const { settings, fetchSettings } = useSettingsStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [sareeProducts, setSareeProducts] = useState<any[]>([]);
  const [kurtiProducts, setKurtiProducts] = useState<any[]>([]);
  const [lehengaProducts, setLehengaProducts] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [reelProducts, setReelProducts] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sarees' | 'kurti-sets' | 'lehengas'>('sarees');

  useEffect(() => {
    fetchSettings();

    api.get('/categories').then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.data || [];
      setCategories(list.length > 0 ? list : FALLBACK_CATS);
    }).catch(() => setCategories(FALLBACK_CATS));

    // Fetch product sections
    const fetchProducts = async (slug: string, setter: (d: any[]) => void) => {
      try {
        const { data } = await api.get('/products', { params: { categorySlug: slug, limit: 4, t: Date.now() } });
        const list = Array.isArray(data) ? data : data?.data || [];
        setter(list.slice(0, 4));
      } catch { setter([]); }
    };

    fetchProducts('saree', setSareeProducts);
    fetchProducts('kurti-sets', setKurtiProducts);
    fetchProducts('lehengas', setLehengaProducts);

    api.get('/products', { params: { isBestseller: 'true', limit: 4, t: Date.now() } })
      .then(({ data }) => { const l = Array.isArray(data) ? data : data?.data || []; setBestSellers(l.slice(0, 4)); })
      .catch(() => setBestSellers([]));

    api.get('/products', { params: { isNewArrival: 'true', limit: 4, t: Date.now() } })
      .then(({ data }) => { const l = Array.isArray(data) ? data : data?.data || []; setNewArrivals(l.slice(0, 4)); })
      .catch(() => setNewArrivals([]));

    // Fetch products with Instagram Reel URLs for featured videos
    api.get('/products', { params: { hasReel: 'true', limit: 10, t: Date.now() } })
      .then(({ data }) => {
        const l = Array.isArray(data) ? data : data?.data || [];
        setReelProducts(l.filter((p: any) => p.instagramReelUrl));
      })
      .catch(() => setReelProducts([]));

    // Fetch real reviews
    api.get('/reviews', { params: { limit: 10, sort: 'recent', t: Date.now() } })
      .then(({ data }) => {
        const l = Array.isArray(data) ? data : data?.data || data?.reviews || [];
        setRecentReviews(l.filter((r: any) => r.comment && r.rating >= 4));
      })
      .catch(() => setRecentReviews([]));
  }, []);

  const FALLBACK_CATS = [
    { id: '1', name: 'Sarees', slug: 'sarees', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=600' },
    { id: '2', name: 'Kurti Sets', slug: 'kurti-sets', image: 'https://images.unsplash.com/photo-1583391733958-d25e27a26aca?q=80&w=600' },
    { id: '3', name: 'Gowns', slug: 'gowns', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600' },
    { id: '4', name: 'Lehengas', slug: 'lehengas', image: 'https://images.unsplash.com/photo-1596455607563-ad6193f78b78?q=80&w=600' },
    { id: '5', name: 'Stretchable Blouses', slug: 'stretchable-blouses', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600' },
    { id: '6', name: 'Kids', slug: 'kids', image: 'https://images.unsplash.com/photo-1503944583220-5d1384befa45?q=80&w=600' },
    { id: '7', name: 'Jewellery', slug: 'jewellery', image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?q=80&w=600' },
  ];

  const displayCats = categories.length > 0 ? categories : FALLBACK_CATS;
  const tabProducts = activeTab === 'sarees' ? sareeProducts : activeTab === 'kurti-sets' ? kurtiProducts : lehengaProducts;
  const marqueeText = (settings as any).marqueeText || 'Free Delivery';

  return (
    <div className="flex flex-col">

      {/* ── § 1 HERO ──────────────────────────────────────────────────────── */}
      <section
        className="relative w-full overflow-hidden flex items-center"
        style={{ minHeight: '60vh', background: 'hsl(345, 80%, 28%)' }}
        aria-label="Hero banner"
      >
        {/* Lily watermark pattern */}
        <div className="absolute inset-0" style={{ backgroundImage: lilyBg, backgroundSize: '140px 140px', opacity: 0.25 }} />

        {/* Model image — right half */}
        <div className="absolute right-0 top-0 h-full w-1/2 md:w-[45%] opacity-90">
          <Image
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800"
            alt="Model in saree"
            fill
            className="object-cover object-top"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-primary/90" />
        </div>

        {/* Text content */}
        <div className="relative z-10 container py-16 md:py-24 max-w-2xl">
          <h1 className="font-cormorant text-5xl md:text-7xl font-bold text-white leading-tight">
            Make Every<br />Occasion Special
          </h1>
          <p className="text-white/80 text-base md:text-lg mt-4 mb-8 max-w-sm">
            Designer Lehengas &amp; Elegant Gowns for Festive Looks
          </p>
          <Link
            href="/products"
            className="inline-block bg-white text-primary font-bold px-8 py-3 rounded-full hover:bg-cream hover:shadow-lg transition-all duration-200 active:scale-95"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* ── § 2 SHOP BY COLLECTIONS ──────────────────────────────────────── */}
      <section className="py-14 px-4" aria-labelledby="collections-heading">
        <h2 id="collections-heading" className="font-cormorant text-3xl md:text-4xl font-bold text-center text-foreground mb-10">
          Shop by collections
        </h2>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayCats.map(cat => <CollectionCard key={cat.id} cat={cat} />)}
        </div>
      </section>

      {/* ── § 3 LOTUS DIVIDER ────────────────────────────────────────────── */}
      <LotusDivider />

      {/* ── § 4 WOMEN'S COLLECTION (TABBED) ─────────────────────────────── */}
      <section className="py-14 px-4" aria-labelledby="womens-collection-heading">
        <h2 id="womens-collection-heading" className="font-cormorant text-3xl md:text-4xl font-bold text-center text-foreground mb-8">
          Women&apos;s Collection — <em>Grace in Every Stitch</em>
        </h2>

        {/* Tab bar */}
        <div className="flex justify-center gap-8 mb-10 border-b border-border max-w-md mx-auto">
          {([
            { key: 'sarees', label: 'Sarees' },
            { key: 'kurti-sets', label: 'Kurti Sets' },
            { key: 'lehengas', label: 'Lehengas' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {tabProducts.length > 0
            ? tabProducts.map(p => <ProductCard key={p.id} product={p} />)
            : Array(4).fill(null).map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col gap-2">
                  <div className="bg-muted aspect-[3/4] rounded-xl w-full" />
                  <div className="h-3 bg-muted w-3/4 rounded" />
                  <div className="h-3 bg-muted w-1/4 rounded" />
                </div>
              ))
          }
        </div>

        <div className="flex justify-center mt-10">
          <Link
            href={`/products?category=${activeTab}`}
            className="bg-primary text-primary-foreground px-10 py-3 rounded-full font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* ── § 5 BEST SELLERS ─────────────────────────────────────────────── */}
      <section className="py-10 px-4" aria-labelledby="bestsellers-heading">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 id="bestsellers-heading" className="font-outfit text-2xl font-bold text-foreground">Best Sellers</h2>
            <Link
              href="/products?filter=bestseller"
              className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Shop more
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {bestSellers.length > 0
              ? bestSellers.map(p => <ProductCard key={p.id} product={p} />)
              : Array(4).fill(null).map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-2">
                    <div className="bg-muted aspect-[3/4] rounded-xl w-full" />
                    <div className="h-3 bg-muted w-3/4 rounded" />
                    <div className="h-3 bg-muted w-1/4 rounded" />
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── § 6 FEATURED VIDEOS ──────────────────────────────────────────── */}
      <VideoCarousel videos={reelProducts} />

      {/* ── § 7 MARQUEE DIVIDER (admin-configurable text) ─────────────────── */}
      <LotusDivider text={marqueeText} />

      {/* ── § 8 NEW ARRIVALS ─────────────────────────────────────────────── */}
      <section className="py-10 px-4" aria-labelledby="new-arrivals-heading">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 id="new-arrivals-heading" className="font-outfit text-2xl font-bold text-foreground">New Arrivals</h2>
            <Link
              href="/products?filter=new"
              className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Shop more
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {newArrivals.length > 0
              ? newArrivals.map(p => <ProductCard key={p.id} product={p} />)
              : Array(4).fill(null).map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-2">
                    <div className="bg-muted aspect-[3/4] rounded-xl w-full" />
                    <div className="h-3 bg-muted w-3/4 rounded" />
                    <div className="h-3 bg-muted w-1/4 rounded" />
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── § 9 WHAT OUR CUSTOMERS SAY (real reviews, click → product page) ─ */}
      <CustomerReviewsSection reviews={recentReviews} />

    </div>
  );
}
