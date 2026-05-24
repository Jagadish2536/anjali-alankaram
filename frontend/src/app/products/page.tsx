'use client';
import { useState, useEffect, Suspense, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { ChevronDown, ChevronRight, ShoppingBag } from 'lucide-react';

// ── Damask pattern (same as footer) ──────────────────────────────────────────
const damaskBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.6' opacity='0.15'%3E%3Cellipse cx='40' cy='20' rx='6' ry='10'/%3E%3Cellipse cx='40' cy='60' rx='6' ry='10'/%3E%3Cellipse cx='20' cy='40' rx='10' ry='6'/%3E%3Cellipse cx='60' cy='40' rx='10' ry='6'/%3E%3Ccircle cx='40' cy='40' r='5'/%3E%3Cpath d='M40 10 C35 15 32 22 32 28 C32 34 35 38 40 40 C45 38 48 34 48 28 C48 22 45 15 40 10Z'/%3E%3Cpath d='M40 70 C35 65 32 58 32 52 C32 46 35 42 40 40 C45 42 48 46 48 52 C48 58 45 65 40 70Z'/%3E%3Cpath d='M10 40 C15 35 22 32 28 32 C34 32 38 35 40 40 C38 45 34 48 28 48 C22 48 15 45 10 40Z'/%3E%3Cpath d='M70 40 C65 35 58 32 52 32 C46 32 42 35 40 40 C42 45 46 48 52 48 C58 48 65 45 70 40Z'/%3E%3C/g%3E%3C/svg%3E")`;

// ── Accordion filter group ────────────────────────────────────────────────────
function FilterGroup({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between py-3 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

// ── Price range slider ────────────────────────────────────────────────────────
function PriceSlider({
  min, max, value, onChange
}: {
  min: number; max: number; value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const rangeRef = useRef<HTMLDivElement>(null);
  const lowPct = ((value[0] - min) / (max - min)) * 100;
  const highPct = ((value[1] - min) / (max - min)) * 100;

  return (
    <div className="px-1 py-2 space-y-4">
      {/* Track */}
      <div ref={rangeRef} className="relative h-1.5 bg-muted rounded-full mt-2">
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
        />
        {/* Low thumb */}
        <input
          type="range" min={min} max={max} value={value[0]}
          onChange={e => { const v = Number(e.target.value); if (v < value[1]) onChange([v, value[1]]); }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: value[0] > max - 10 ? 5 : 3 }}
        />
        {/* High thumb */}
        <input
          type="range" min={min} max={max} value={value[1]}
          onChange={e => { const v = Number(e.target.value); if (v > value[0]) onChange([value[0], v]); }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ zIndex: 4 }}
        />
        {/* Thumb visuals */}
        <div className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${lowPct}%` }} />
        <div className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${highPct}%` }} />
      </div>

      {/* Value inputs */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5 flex-1">
          <span className="text-muted-foreground text-xs">₹</span>
          <span className="font-medium">{value[0]}</span>
        </div>
        <span className="text-muted-foreground">to</span>
        <div className="flex items-center gap-1 border border-border rounded-lg px-2 py-1.5 flex-1">
          <span className="text-muted-foreground text-xs">₹</span>
          <span className="font-medium">{value[1]}</span>
        </div>
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: any }) {
  const hasDiscount = product.salePrice && product.basePrice && Number(product.salePrice) < Number(product.basePrice);
  const discountPct = hasDiscount ? Math.round(((Number(product.basePrice) - Number(product.salePrice)) / Number(product.basePrice)) * 100) : 0;
  const isSoldOut = product.stock === 0;

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted mb-3">
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
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
      <h3 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
      <div className="flex items-center gap-2 mt-1">
        <span className="font-semibold text-sm">{formatPrice(product.salePrice || product.basePrice)}</span>
        {hasDiscount && (
          <span className="text-muted-foreground line-through text-xs">{formatPrice(product.basePrice)}</span>
        )}
      </div>
    </Link>
  );
}

// ── Main content ──────────────────────────────────────────────────────────────
function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category');
  const filter = searchParams.get('filter');
  const searchQuery = searchParams.get('search') || '';

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [maxPossible] = useState(10000);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.data || [];
      setCategories(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const params: any = { t: Date.now() };
        let slug = categorySlug;
        if (slug === 'sarees') slug = 'saree';
        if (slug) params.categorySlug = slug;
        if (filter === 'new') params.isNewArrival = 'true';
        if (searchQuery) params.search = searchQuery;
        if (priceRange[0] > 0) params.minPrice = priceRange[0];
        if (priceRange[1] < maxPossible) params.maxPrice = priceRange[1];

        const { data } = await api.get('/products', { params });
        let list = Array.isArray(data) ? data : data?.data || [];

        // Client-side sort
        if (sortBy === 'newest') list = [...list];
        else if (sortBy === 'price-asc') list = [...list].sort((a, b) => Number(a.salePrice || a.basePrice) - Number(b.salePrice || b.basePrice));
        else if (sortBy === 'price-desc') list = [...list].sort((a, b) => Number(b.salePrice || b.basePrice) - Number(a.salePrice || a.basePrice));

        setProducts(list);
      } catch { setProducts([]); }
      finally { setIsLoading(false); }
    }
    fetchProducts();
  }, [categorySlug, filter, searchQuery, priceRange, sortBy, maxPossible]);

  const handleCategoryClick = (slug: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    const isActive = categorySlug === slug || (slug === 'saree' && categorySlug === 'sarees');
    if (isActive) sp.delete('category'); else sp.set('category', slug);
    router.push(`${pathname}?${sp.toString()}`);
  };

  // Build page title
  let pageTitle = 'All Products';
  let breadcrumb = 'Shop';
  if (searchQuery) { pageTitle = `"${searchQuery}"`; breadcrumb = 'Search'; }
  else if (filter === 'new') { pageTitle = 'New Arrivals'; breadcrumb = 'New Arrivals'; }
  else if (categorySlug) {
    pageTitle = categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    breadcrumb = pageTitle;
  }

  const displayedCategories = categories.length > 0 ? categories : [
    { id: 's1', name: 'Sarees', slug: 'saree' },
    { id: 's2', name: 'Kurti Sets', slug: 'kurti-sets' },
    { id: 's3', name: 'Lehengas', slug: 'lehengas' },
    { id: 's4', name: 'Gowns', slug: 'gowns' },
    { id: 's5', name: 'Kids', slug: 'kids' },
    { id: 's6', name: 'Jewellery', slug: 'jewellery' },
  ];

  const SidebarContent = () => (
    <div className="space-y-1">
      <p className="font-cormorant text-xl font-bold text-primary mb-4">Filters</p>

      <FilterGroup title="Price" defaultOpen>
        <PriceSlider min={0} max={maxPossible} value={priceRange} onChange={setPriceRange} />
      </FilterGroup>

      <FilterGroup title="Category">
        <div className="space-y-2 pt-1">
          {displayedCategories.map(cat => {
            const isActive = categorySlug === cat.slug || (cat.slug === 'saree' && categorySlug === 'sarees');
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors ${isActive ? 'text-primary font-semibold bg-primary/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="space-y-2 pt-1">
          {['In Stock', 'Out of Stock'].map(opt => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedAvailability.includes(opt)}
                onChange={() => setSelectedAvailability(prev =>
                  prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                )}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div>
      {/* ── Category Banner Header ─────────────────────────────────────────── */}
      <div
        className="relative py-8 md:py-12"
        style={{ background: 'hsl(345, 80%, 28%)', backgroundImage: damaskBg, backgroundSize: '80px 80px' }}
      >
        {/* Breadcrumb */}
        <div className="container">
          <div className="flex items-center gap-1.5 text-white/50 text-xs mb-3">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/80">{breadcrumb}</span>
          </div>
          <h1 className="font-outfit text-3xl md:text-4xl font-bold text-white tracking-widest uppercase">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="container py-10">
        {/* Sort bar + count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-3">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(o => !o)}
              className="md:hidden flex items-center gap-2 text-sm font-medium border px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
            </button>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="newest">Date, new to old</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Mobile filters panel */}
        {showMobileFilters && (
          <div className="md:hidden mb-6 p-5 border rounded-2xl bg-card">
            <SidebarContent />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden md:block space-y-2">
            <SidebarContent />
          </aside>

          {/* Product grid */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {Array(6).fill(null).map((_, i) => (
                  <div key={i} className="animate-pulse flex flex-col gap-2">
                    <div className="bg-muted aspect-[3/4] rounded-xl w-full" />
                    <div className="h-3 bg-muted w-3/4 rounded" />
                    <div className="h-3 bg-muted w-1/4 rounded" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-muted-foreground text-lg">No products found.</p>
                <Link href="/products" className="mt-4 inline-block text-primary hover:underline text-sm">
                  View all products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container py-20 text-center text-muted-foreground">Loading catalog…</div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
