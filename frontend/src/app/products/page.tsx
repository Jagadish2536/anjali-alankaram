'use client';
import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { SlidersHorizontal } from 'lucide-react';

function ProductsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get('category');
  const filter = searchParams.get('filter');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const searchQuery = searchParams.get('search') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all active categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data } = await api.get('/categories');
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories');
      }
    }
    fetchCategories();
  }, []);

  // Fetch filtered products
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const params: any = {};
        
        // Normalize 'sarees' (from static URL links) to 'saree' (used in seed / db)
        let finalCategorySlug = categorySlug;
        if (categorySlug === 'sarees') {
          finalCategorySlug = 'saree';
        }

        if (finalCategorySlug) {
          params.categorySlug = finalCategorySlug;
        }
        if (filter === 'new') {
          params.isNewArrival = 'true';
        }
        if (searchQuery) {
          params.search = searchQuery;
        }
        if (minPrice) {
          params.minPrice = minPrice;
        }
        if (maxPrice) {
          params.maxPrice = maxPrice;
        }

        // Cache busting timestamp to ensure we reload fresh admin portal edits instantly
        params.t = Date.now().toString();

        const { data } = await api.get('/products', { params });
        setProducts(data.data);
      } catch (error) {
        console.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [categorySlug, filter, minPrice, maxPrice, searchQuery]);

  const createQueryString = (params: Record<string, string | null>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null) {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, value);
      }
    }
    return newSearchParams.toString();
  };

  const handleCategoryChange = (slug: string) => {
    // Check if category is already active (handling normalisation for sarees vs saree)
    const isCurrentActive = categorySlug === slug || (slug === 'saree' && categorySlug === 'sarees');
    const newCategory = isCurrentActive ? null : slug;
    const queryString = createQueryString({ category: newCategory });
    router.push(`${pathname}?${queryString}`);
  };

  const handlePriceChange = (range: 'under2000' | '2000to5000' | 'over5000') => {
    let newMin: string | null = null;
    let newMax: string | null = null;

    const isUnder2000 = !minPrice && maxPrice === '2000';
    const is2000to5000 = minPrice === '2000' && maxPrice === '5000';
    const isOver5000 = minPrice === '5000' && !maxPrice;

    const isCurrentActive = 
      (range === 'under2000' && isUnder2000) ||
      (range === '2000to5000' && is2000to5000) ||
      (range === 'over5000' && isOver5000);

    if (!isCurrentActive) {
      if (range === 'under2000') {
        newMax = '2000';
      } else if (range === '2000to5000') {
        newMin = '2000';
        newMax = '5000';
      } else if (range === 'over5000') {
        newMin = '5000';
      }
    }

    const queryString = createQueryString({ minPrice: newMin, maxPrice: newMax });
    router.push(`${pathname}?${queryString}`);
  };

  let pageTitle = 'All Products';
  if (searchQuery) {
    pageTitle = `Search: "${searchQuery}"`;
  } else if (filter === 'new') {
    pageTitle = 'New Arrivals';
  } else if (categorySlug) {
    pageTitle = categorySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Fallback to static category objects if DB is empty or still loading
  const displayedCategories = categories.length > 0 ? categories : [
    { id: 'saree-static', name: 'sarees', slug: 'saree' },
    { id: 'kurta-static', name: 'kurta sets', slug: 'kurta-sets' },
    { id: 'dresses-static', name: 'dresses', slug: 'dresses' }
  ];

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-outfit font-bold">{pageTitle}</h1>
        <button className="flex items-center gap-2 text-sm font-medium border px-4 py-2 rounded-md hover:bg-muted transition-colors md:hidden">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="hidden md:block space-y-6">
          <div>
            <h3 className="font-medium mb-3">Categories</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {displayedCategories.map((cat) => {
                const isChecked = categorySlug === cat.slug || (cat.slug === 'saree' && categorySlug === 'sarees');
                const displayName = cat.name === 'saree' ? 'Sarees' : cat.name;
                return (
                  <li key={cat.id}>
                    <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => handleCategoryChange(cat.slug)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="capitalize">{displayName}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-3">Price Range</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                  <input 
                    type="checkbox" 
                    checked={!minPrice && maxPrice === '2000'}
                    onChange={() => handlePriceChange('under2000')}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  /> 
                  Under ₹2,000
                </label>
              </li>
              <li>
                <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                  <input 
                    type="checkbox" 
                    checked={minPrice === '2000' && maxPrice === '5000'}
                    onChange={() => handlePriceChange('2000to5000')}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  /> 
                  ₹2,000 - ₹5,000
                </label>
              </li>
              <li>
                <label className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                  <input 
                    type="checkbox" 
                    checked={minPrice === '5000' && !maxPrice}
                    onChange={() => handlePriceChange('over5000')}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  /> 
                  Over ₹5,000
                </label>
              </li>
            </ul>
          </div>
        </div>

        {/* Product Grid */}
        <div className="md:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse flex flex-col gap-2">
                  <div className="bg-muted aspect-[3/4] rounded-xl w-full"></div>
                  <div className="h-4 bg-muted w-3/4 rounded mt-2"></div>
                  <div className="h-4 bg-muted w-1/4 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {products.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground">
                  No products found.
                </div>
              ) : (
                products.map((product: any) => {
                  const hasDiscount = product.salePrice && product.basePrice && Number(product.salePrice) < Number(product.basePrice);
                  const discountPct = hasDiscount ? Math.round(((Number(product.basePrice) - Number(product.salePrice)) / Number(product.basePrice)) * 100) : 0;

                  return (
                    <Link href={`/products/${product.slug}`} key={product.id} className="group flex flex-col">
                      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-accent/20 mb-3">
                        {product.images && product.images[0] ? (
                          <Image 
                            src={product.images[0]} 
                            alt={product.name}
                            fill
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            No Image
                          </div>
                        )}
                        {hasDiscount && (
                          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                            {discountPct}% OFF
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-sm md:text-base line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold">{formatPrice(product.salePrice || product.basePrice)}</span>
                        {hasDiscount && (
                          <>
                            <span className="text-muted-foreground line-through text-xs">
                              {formatPrice(product.basePrice)}
                            </span>
                            <span className="text-green-600 text-xs font-bold">
                              ({discountPct}% OFF)
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container py-20 text-center text-muted-foreground">
        Loading catalog...
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
