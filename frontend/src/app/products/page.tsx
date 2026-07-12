'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { ProductCard } from '@/components/common/ProductCard';

// ── Damask pattern ────────────────────────────────────────────────────────────
const damaskBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.6' opacity='0.15'%3E%3Cellipse cx='40' cy='20' rx='6' ry='10'/%3E%3Cellipse cx='40' cy='60' rx='6' ry='10'/%3E%3Cellipse cx='20' cy='40' rx='10' ry='6'/%3E%3Cellipse cx='60' cy='40' rx='10' ry='6'/%3E%3Ccircle cx='40' cy='40' r='5'/%3E%3Cpath d='M40 10 C35 15 32 22 32 28 C32 34 35 38 40 40 C45 38 48 34 48 28 C48 22 45 15 40 10Z'/%3E%3Cpath d='M40 70 C35 65 32 58 32 52 C32 46 35 42 40 40 C45 42 48 46 48 52 C48 58 45 65 40 70Z'/%3E%3Cpath d='M10 40 C15 35 22 32 28 32 C34 32 38 35 40 40 C38 45 34 48 28 48 C22 48 15 45 10 40Z'/%3E%3Cpath d='M70 40 C65 35 58 32 52 32 C46 32 42 35 40 40 C42 45 46 48 52 48 C58 48 65 45 70 40Z'/%3E%3C/g%3E%3C/svg%3E")`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTotalStock(product: any): number {
  if (!product.variants || product.variants.length === 0) return product.stock ?? 0;
  return product.variants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
}

function getUniqueSizes(products: any[]): string[] {
  const set = new Set<string>();
  products.forEach(p => p.variants?.forEach((v: any) => { if (v.size) set.add(v.size); }));
  return Array.from(set).sort();
}

function getUniqueColors(products: any[]): { name: string; hex: string }[] {
  const map = new Map<string, string>();
  products.forEach(p => p.variants?.forEach((v: any) => {
    if (v.color && !map.has(v.color)) map.set(v.color, v.colorHex || '');
  }));
  return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
}

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
function PriceSlider({ min, max, value, onChange }: {
  min: number; max: number; value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const lowPct = ((value[0] - min) / (max - min)) * 100;
  const highPct = ((value[1] - min) / (max - min)) * 100;

  return (
    <div className="px-1 py-2 space-y-4">
      <div className="relative h-1.5 bg-muted rounded-full mt-2">
        <div className="absolute h-full bg-primary rounded-full" style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }} />
        <input type="range" min={min} max={max} value={value[0]}
          onChange={e => { const v = Number(e.target.value); if (v < value[1]) onChange([v, value[1]]); }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" style={{ zIndex: value[0] > max - 10 ? 5 : 3 }} />
        <input type="range" min={min} max={max} value={value[1]}
          onChange={e => { const v = Number(e.target.value); if (v > value[0]) onChange([value[0], v]); }}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" style={{ zIndex: 4 }} />
        <div className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${lowPct}%` }} />
        <div className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${highPct}%` }} />
      </div>
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

// ── Main content ──────────────────────────────────────────────────────────────
function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category');
  const filter = searchParams.get('filter');
  const searchQuery = searchParams.get('search') || '';

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const [sortBy, setSortBy] = useState('recommended');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [maxPossible] = useState(10000);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter selections
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDiscountRange, setSelectedDiscountRange] = useState<number | null>(null);

  // Sync category param from URL into state
  const categoryParam = searchParams.get('category') || '';
  useEffect(() => {
    if (categoryParam) {
      const slugs = categoryParam.split(',').map(s => s.trim()).filter(Boolean);
      const canonicals = slugs.map(slug => slug === 'sarees' ? 'saree' : slug);
      setSelectedCategories(canonicals);
    } else {
      setSelectedCategories([]);
    }
  }, [categoryParam]);

  const toggleCategory = (slug: string) => {
    setSelectedCategories(prev => {
      const canonical = slug === 'sarees' ? 'saree' : slug;
      const next = prev.includes(canonical) 
        ? prev.filter(x => x !== canonical) 
        : [...prev, canonical];
      
      const sp = new URLSearchParams(window.location.search);
      if (next.length > 0) {
        sp.set('category', next.join(','));
      } else {
        sp.delete('category');
      }
      router.push(`${pathname}?${sp.toString()}`, { scroll: false });
      return next;
    });
  };

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.data || [];
      setCategories(list);
    }).catch(() => {});
  }, []);

  // Fetch initial products on filter change
  useEffect(() => {
    async function fetchInitialProducts() {
      setIsLoading(true);
      try {
        const params: any = { limit: 12, t: Date.now() };
        let slug = categorySlug;
        if (slug) {
          slug = slug
            .split(',')
            .map(s => s.trim() === 'sarees' ? 'saree' : s.trim())
            .filter(Boolean)
            .join(',');
          params.categorySlug = slug;
        }
        if (filter === 'new') params.isNewArrival = 'true';
        if (filter === 'bestseller') params.isBestseller = 'true';
        if (searchQuery) params.search = searchQuery;
        if (priceRange[0] > 0) params.minPrice = priceRange[0];
        if (priceRange[1] < maxPossible) params.maxPrice = priceRange[1];

        const { data } = await api.get('/products', { params });
        const list = data?.data || [];
        setAllProducts(list);
        setNextCursor(data?.meta?.nextCursor || null);
        setHasMore(data?.meta?.hasMore || false);
        setTotalCount(data?.meta?.total || 0);
      } catch {
        setAllProducts([]);
        setNextCursor(null);
        setHasMore(false);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialProducts();
  }, [categorySlug, filter, searchQuery, priceRange, maxPossible]);

  // Fetch more products on scroll (Infinite Scroll)
  const fetchMoreProducts = useCallback(async () => {
    if (isFetchingMore || !nextCursor || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const params: any = { limit: 12, cursor: nextCursor };
      let slug = categorySlug;
      if (slug) {
        slug = slug
          .split(',')
          .map(s => s.trim() === 'sarees' ? 'saree' : s.trim())
          .filter(Boolean)
          .join(',');
        params.categorySlug = slug;
      }
      if (filter === 'new') params.isNewArrival = 'true';
      if (filter === 'bestseller') params.isBestseller = 'true';
      if (searchQuery) params.search = searchQuery;
      if (priceRange[0] > 0) params.minPrice = priceRange[0];
      if (priceRange[1] < maxPossible) params.maxPrice = priceRange[1];

      const { data } = await api.get('/products', { params });
      const newList = data?.data || [];
      
      setAllProducts(prev => [...prev, ...newList]);
      setNextCursor(data?.meta?.nextCursor || null);
      setHasMore(data?.meta?.hasMore || false);
      setTotalCount(data?.meta?.total || 0);
    } catch (e) {
      console.error('Failed to fetch more products', e);
    } finally {
      setIsFetchingMore(false);
    }
  }, [nextCursor, hasMore, isFetchingMore, categorySlug, filter, searchQuery, priceRange, maxPossible]);

  // Setup intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          fetchMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isFetchingMore, fetchMoreProducts]);

  // Lock body scroll when mobile filters are open
  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFilters]);

  // ── Client-side filtering & sorting ──────────────────────────────────────
  const displayedProducts = (() => {
    let list = [...allProducts];

    // Category filter
    if (selectedCategories.length > 0) {
      list = list.filter(p => 
        p.category?.slug && selectedCategories.some(catSlug => 
          catSlug === p.category.slug || (catSlug === 'saree' && p.category.slug === 'sarees') || (catSlug === 'sarees' && p.category.slug === 'saree')
        )
      );
    }

    // Discount range filter
    if (selectedDiscountRange !== null) {
      list = list.filter(p => {
        const base = Number(p.basePrice);
        const sale = p.salePrice ? Number(p.salePrice) : null;
        let pct = p.discountPercent || 0;
        if (!pct && sale && base > 0) {
          pct = Math.round(((base - sale) / base) * 100);
        }
        return pct >= selectedDiscountRange;
      });
    }

    // Size filter
    if (selectedSizes.length > 0) {
      list = list.filter(p =>
        p.variants?.some((v: any) => selectedSizes.includes(v.size))
      );
    }

    // Color filter
    if (selectedColors.length > 0) {
      list = list.filter(p =>
        p.variants?.some((v: any) => selectedColors.includes(v.color))
      );
    }

    // Sort
    if (sortBy === 'whatsnew') {
      list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'popularity') {
      list = list.sort((a, b) => (b.totalSold || 0) - (a.totalSold || 0));
    } else if (sortBy === 'better-discount') {
      list = list.sort((a, b) => {
        const getPct = (p: any) => {
          const base = Number(p.basePrice);
          const sale = p.salePrice ? Number(p.salePrice) : null;
          let pct = p.discountPercent || 0;
          if (!pct && sale && base > 0) {
            pct = Math.round(((base - sale) / base) * 100);
          }
          return pct;
        };
        return getPct(b) - getPct(a);
      });
    } else if (sortBy === 'price-asc') {
      list = list.sort((a, b) => Number(a.salePrice || a.basePrice) - Number(b.salePrice || b.basePrice));
    } else if (sortBy === 'price-desc') {
      list = list.sort((a, b) => Number(b.salePrice || b.basePrice) - Number(a.salePrice || a.basePrice));
    } else if (sortBy === 'rating') {
      list = list.sort((a, b) => Number(b.avgRating || 0) - Number(a.avgRating || 0));
    }

    return list;
  })();

  // ── Render Items Calculation ─────────────────────────────────────────────
  const renderItems: { key: string; product: any; activeColor: string | undefined }[] = (() => {
    const isShopAll = !categorySlug;

    if (isShopAll) {
      return displayedProducts.flatMap((p): { key: string; product: any; activeColor: string | undefined }[] => {
        const uniqueColors = Array.from(
          new Set(
            p.variants
              ?.map((v: any) => v.color)
              .filter((color: any) => typeof color === 'string' && color.trim() !== '')
          )
        ) as string[];

        if (uniqueColors.length === 0) {
          return [{ key: p.id, product: p, activeColor: undefined }];
        }

        const colorsToShow = selectedColors.length > 0
          ? uniqueColors.filter(c => selectedColors.includes(c))
          : uniqueColors;

        return colorsToShow.map(color => ({
          key: `${p.id}-${color}`,
          product: p,
          activeColor: color
        }));
      });
    } else {
      return displayedProducts.map(p => {
        let activeColor: string | undefined = undefined;
        if (selectedColors.length > 0) {
          activeColor = p.variants?.find((v: any) => selectedColors.includes(v.color))?.color;
        }

        return {
          key: p.id,
          product: p,
          activeColor
        };
      });
    }
  })();

  const availableSizes = getUniqueSizes(allProducts);
  const availableColors = getUniqueColors(allProducts);

  const handleCategoryClick = (slug: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    const isActive = categorySlug === slug || (slug === 'saree' && categorySlug === 'sarees');
    if (isActive) sp.delete('category'); else sp.set('category', slug);
    router.push(`${pathname}?${sp.toString()}`);
  };

  const toggleSize = (size: string) =>
    setSelectedSizes(prev => prev.includes(size) ? prev.filter(x => x !== size) : [...prev, size]);

  const toggleColor = (color: string) =>
    setSelectedColors(prev => prev.includes(color) ? prev.filter(x => x !== color) : [...prev, color]);
  const clearAllFilters = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedCategories([]);
    setSelectedDiscountRange(null);
    setPriceRange([0, maxPossible]);

    const sp = new URLSearchParams(window.location.search);
    sp.delete('category');
    sp.delete('search');
    router.push(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  const hasActiveFilters = selectedSizes.length > 0 || selectedColors.length > 0 || selectedCategories.length > 0 || selectedDiscountRange !== null || priceRange[0] > 0 || priceRange[1] < maxPossible;

  let pageTitle = 'All Products';
  let breadcrumb = 'Shop';
  if (searchQuery) { pageTitle = `"${searchQuery}"`; breadcrumb = 'Search'; }
  else if (filter === 'new') { pageTitle = 'New Arrivals'; breadcrumb = 'New Arrivals'; }
  else if (filter === 'bestseller') { pageTitle = 'Best Sellers'; breadcrumb = 'Best Sellers'; }
  else if (categorySlug) {
    if (categorySlug.includes(',')) {
      pageTitle = categorySlug
        .split(',')
        .map(slug => slug.trim().split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
        .join(', ');
    } else {
      pageTitle = categorySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
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
      <div className="flex items-center justify-between mb-4">
        <p className="font-cormorant text-xl font-bold text-primary">Filters</p>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      <FilterGroup title="Price" defaultOpen>
        <PriceSlider min={0} max={maxPossible} value={priceRange} onChange={setPriceRange} />
      </FilterGroup>

      <FilterGroup title="Category">
        <div className="space-y-2 pt-1">
          {displayedCategories.map(cat => {
            const isChecked = selectedCategories.includes(cat.slug) || (cat.slug === 'saree' && selectedCategories.includes('sarees')) || (cat.slug === 'sarees' && selectedCategories.includes('saree'));
            return (
              <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCategory(cat.slug)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
              </label>
            );
          })}
        </div>
      </FilterGroup>

      {availableSizes.length > 0 && (
        <FilterGroup title="Size">
          <div className="flex flex-wrap gap-2 pt-1">
            {availableSizes.map(size => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  selectedSizes.includes(size)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}

      {availableColors.length > 0 && (
        <FilterGroup title="Colour">
          <div className="space-y-2 pt-1">
            {availableColors.map(({ name, hex }) => (
              <label key={name} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedColors.includes(name)}
                  onChange={() => toggleColor(name)}
                  className="sr-only"
                />
                <div
                  onClick={() => toggleColor(name)}
                  className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors cursor-pointer ${selectedColors.includes(name) ? 'border-primary bg-primary' : 'border-gray-300'}`}
                >
                  {selectedColors.includes(name) && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                {hex ? (
                  <span
                    className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                    style={{ background: hex }}
                  />
                ) : null}
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors capitalize">{name}</span>
              </label>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Discount Range">
        <div className="space-y-2 pt-1">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(val => (
            <label key={val} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="discount-range"
                checked={selectedDiscountRange === val}
                onClick={() => setSelectedDiscountRange(prev => prev === val ? null : val)}
                onChange={() => {}}
                className="w-4 h-4 rounded-full border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{val}% and above</span>
            </label>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  const activeChips: { label: string; onRemove: () => void }[] = [
    ...selectedSizes.map(s => ({ label: `Size: ${s}`, onRemove: () => toggleSize(s) })),
    ...selectedColors.map(c => ({ label: `Colour: ${c}`, onRemove: () => toggleColor(c) })),
    ...selectedCategories.map(c => {
      const catObj = displayedCategories.find(dc => dc.slug === c);
      return { label: `Category: ${catObj?.name || c}`, onRemove: () => toggleCategory(c) };
    }),
    ...(selectedDiscountRange !== null ? [{ label: `Discount: ${selectedDiscountRange}%+`, onRemove: () => setSelectedDiscountRange(null) }] : []),
  ];

  return (
    <div>
      {/* ── Category Banner Header ─────────────────────────────────────────── */}
      <div
        className="relative py-8 md:py-12 bg-primary"
        style={{ backgroundImage: damaskBg, backgroundSize: '80px 80px' }}
      >
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
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading…' : `${hasActiveFilters ? renderItems.length : totalCount} product${(hasActiveFilters ? renderItems.length : totalCount) !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-3">
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
              className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer font-medium"
            >
              <option value="recommended">Recommended</option>
              <option value="whatsnew">What's New</option>
              <option value="popularity">Popularity</option>
              <option value="better-discount">Better Discount</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {activeChips.map(chip => (
              <button
                key={chip.label}
                onClick={chip.onRemove}
                className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
              >
                {chip.label} <X className="w-3 h-3" />
              </button>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-primary px-2 py-1.5 underline">
              Clear all
            </button>
          </div>
        )}

        {/* Mobile Slide-over Drawer Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 md:hidden ${
            showMobileFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setShowMobileFilters(false)}
        />

        {/* Mobile Slide-over Drawer Content */}
        <div
          className={`fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-background z-50 shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out ${
            showMobileFilters ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <span className="text-base font-bold tracking-wide uppercase">Filters</span>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-2">
            <SidebarContent />
          </div>

          <div className="p-4 border-t bg-muted/20 flex items-center gap-3">
            <button
              onClick={() => {
                clearAllFilters();
                setShowMobileFilters(false);
              }}
              className="flex-1 py-2.5 text-sm font-semibold border rounded-xl hover:bg-muted transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="flex-1 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="hidden md:block space-y-2">
            <SidebarContent />
          </aside>

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
            ) : renderItems.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-muted-foreground text-lg">No products found.</p>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="mt-3 text-primary hover:underline text-sm font-medium">
                    Clear filters
                  </button>
                )}
                <Link href="/products" className="mt-2 block text-primary hover:underline text-sm">
                  View all products
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {renderItems.map(({ key, product, activeColor }) => (
                    <ProductCard
                      key={key}
                      product={product}
                      activeColor={activeColor}
                    />
                  ))}
                </div>
                
                {/* Infinite Scroll target observer node */}
                {hasMore && (
                  <div 
                    ref={loadMoreRef} 
                    className="flex justify-center items-center py-10 mt-6"
                  >
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
                  </div>
                )}
              </>
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
      <div className="container py-20 text-center text-muted-foreground animate-pulse">Loading catalog…</div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
