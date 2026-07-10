import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { LotusDivider } from '@/components/homepage/LotusDivider';
import { MobileCollectionCard } from '@/components/homepage/CollectionCard';
import { ProductCard } from '@/components/common/ProductCard';
import { VideoCarousel } from '@/components/homepage/VideoCarousel';
import { CustomerReviewsSection } from '@/components/homepage/CustomerReviewsSection';
import { AppDownloadSection } from '@/components/homepage/AppDownloadSection';

// ── Lily Watermark BG ─────────────────────────────────────────────────────────
const lilyBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 100C60 100 30 80 30 55C30 40 44 28 60 28C76 28 90 40 90 55C90 80 60 100 60 100Z' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 100C60 100 42 76 42 52C42 38 50 24 60 24C70 24 78 38 78 52C78 76 60 100 60 100Z' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 28C60 28 36 36 32 54' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3Cpath d='M60 28C60 28 84 36 88 54' stroke='%23ffffff' stroke-width='1' fill='none' opacity='0.12'/%3E%3C/svg%3E")`;

// ── Product Section Component ─────────────────────────────────────────────────
function ProductSection({
  id,
  title,
  href,
  products,
}: {
  id: string;
  title: string;
  href: string;
  products: any[];
}) {
  if (products.length === 0) {
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
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Helper to compute dynamic color gradient & text styles for hero section ───
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

  const l1 = Math.min(95, Math.max(70, baseL + 54));
  const l2 = Math.min(85, Math.max(50, baseL + 34));
  const l3 = Math.min(70, Math.max(35, baseL + 14));
  const l4 = baseL;

  return {
    gradient: `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${l1}%) 0%, hsl(${hue}, ${sat}%, ${l2}%) 30%, hsl(${hue}, ${sat}%, ${l3}%) 65%, hsl(${hue}, ${sat}%, ${l4}%) 100%)`,
    textColor: `hsl(${hue}, ${sat}%, 12%)`
  };
}

// ── Server-side data fetchers with revalidation (ISR 5 min) ──────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function fetchFromApi(endpoint: string, searchParams: Record<string, string> = {}) {
  try {
    const query = new URLSearchParams(searchParams).toString();
    const url = `${API_BASE}${endpoint}${query ? `?${query}` : ''}`;
    const res = await fetch(url, {
      next: { revalidate: 300 } // 5 minutes cache revalidation
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data?.data || data?.reviews || [];
  } catch (error) {
    console.error(`Failed to fetch from API: ${endpoint}`, error);
    return [];
  }
}

async function fetchSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      next: { revalidate: 300 }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data;
  } catch {
    return {};
  }
}

// ── Page Metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata() {
  const s = await fetchSettings();
  return {
    title: s.heroTitle || 'Anjali Alankaram — Indian Luxury Ethnic Fashion',
    description: s.heroSubtitle || 'Shop premium designer lehengas, elegant sarees, kurtis, and wedding gowns.',
    alternates: {
      canonical: 'https://anjalialankaram.com',
    },
    openGraph: {
      title: s.heroTitle || 'Anjali Alankaram',
      description: s.heroSubtitle,
      url: 'https://anjalialankaram.com',
      siteName: 'Anjali Alankaram',
      images: [
        {
          url: s.heroImageUrl || 'https://anjalialankaram.com/og-image.jpg',
          width: 1200,
          height: 630,
        },
      ],
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: s.heroTitle,
      description: s.heroSubtitle,
      images: [s.heroImageUrl || 'https://anjalialankaram.com/og-image.jpg'],
    },
  };
}

// ── Main RSC Page ─────────────────────────────────────────────────────────────
export default async function Home() {
  // Parallel fetch pattern
  const [
    settings,
    categories,
    bestSellers,
    newArrivals,
    reelProducts,
    recentReviews
  ] = await Promise.all([
    fetchSettings(),
    fetchFromApi('/categories'),
    fetchFromApi('/products', { isBestseller: 'true', limit: '4' }),
    fetchFromApi('/products', { isNewArrival: 'true', limit: '4' }),
    fetchFromApi('/products', { hasReel: 'true', limit: '10' }),
    fetchFromApi('/reviews', { limit: '10', sort: 'recent' })
  ]);

  const s = settings as any;
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
      {/* Dynamic sitemap structured data schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': 'Anjali Alankaram',
            'url': 'https://anjalialankaram.com',
            'potentialAction': {
              '@type': 'SearchAction',
              'target': 'https://anjalialankaram.com/products?search={search_term_string}',
              'query-input': 'required name=search_term_string'
            }
          })
        }}
      />

      {/* ── § 1 MARQUEE TOP ──────────────── */}
      {s.marqueeEnabled !== false && <LotusDivider text={marqueeText} />}

      {/* ── § 2 HERO — Angled collage layout ── */}
      <section
        className="w-full overflow-hidden relative md:min-h-[clamp(280px,42vw,560px)]"
        style={{ background: heroStyles.gradient }}
        aria-label="Hero banner"
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: lilyBg, backgroundSize: '120px 120px', opacity: 0.06 }} />

        <div className="relative z-10 md:h-full flex flex-col md:grid md:grid-cols-2 py-2 md:py-0">
          
          {/* Left: text on gradient */}
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

          {/* Right: angled photo collage */}
          <div className="relative flex items-center justify-center overflow-hidden pr-[2%] pb-0 md:pb-0 h-[140px] md:h-auto">
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

      {/* ── § 3 SHOP BY COLLECTIONS ── */}
      <section className="pt-3 pb-10 md:pt-10 md:pb-14 px-4 max-w-7xl mx-auto overflow-hidden" aria-labelledby="collections-heading">
        <h2 id="collections-heading" className="block font-cormorant text-2xl md:text-4xl font-bold text-center text-foreground mb-6 md:mb-8">
          Shop by Collections
        </h2>

        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">No collections yet</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-8 justify-items-center">
            {categories.map((cat: any) => (
              <MobileCollectionCard key={cat.id} cat={cat} />
            ))}
          </div>
        )}
      </section>

      {/* ── § 4 LOTUS MARQUEE DIVIDER ────────────────────── */}
      {s.marqueeEnabled !== false && <LotusDivider text={marqueeText} />}

      {/* ── § 5 BEST SELLERS ──────────────────────────────────────────── */}
      <Suspense fallback={
        <div className="py-20 text-center text-muted-foreground animate-pulse">Loading best sellers…</div>
      }>
        <ProductSection
          id="bestsellers-heading"
          title="Best Sellers"
          href="/products?filter=bestseller"
          products={bestSellers}
        />
      </Suspense>

      {/* ── § 6 NEW ARRIVALS ──────────────────────────────────────────── */}
      <Suspense fallback={
        <div className="py-20 text-center text-muted-foreground animate-pulse">Loading new arrivals…</div>
      }>
        <ProductSection
          id="new-arrivals-heading"
          title="New Arrivals"
          href="/products?filter=new"
          products={newArrivals}
        />
      </Suspense>

      {/* ── § 7 FEATURED VIDEOS ───────────────────────────────────────── */}
      <Suspense fallback={null}>
        <VideoCarousel videos={reelProducts} />
      </Suspense>

      {/* ── § 8 LOTUS MARQUEE DIVIDER ─────────────────────────────────── */}
      {s.marqueeEnabled !== false && <LotusDivider text={marqueeText} />}

      {/* ── § 9 WHAT OUR CUSTOMERS SAY ────────────────────────────────── */}
      {s.reviewsEnabled !== false && (
        <Suspense fallback={null}>
          <CustomerReviewsSection reviews={recentReviews} />
        </Suspense>
      )}
      
      {/* ── § 10 APP DOWNLOAD SECTION ─────────────────────────────────── */}
      <AppDownloadSection />
    </div>
  );
}
