'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Filter, SlidersHorizontal } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data } = await api.get('/products');
        setProducts(data.data);
      } catch (error) {
        console.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-outfit font-bold">All Products</h1>
        <button className="flex items-center gap-2 text-sm font-medium border px-4 py-2 rounded-md hover:bg-muted transition-colors">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Filters (Mock) */}
        <div className="hidden md:block space-y-6">
          <div>
            <h3 className="font-medium mb-3">Categories</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><label className="flex items-center gap-2"><input type="checkbox" /> Sarees</label></li>
              <li><label className="flex items-center gap-2"><input type="checkbox" /> Kurta Sets</label></li>
              <li><label className="flex items-center gap-2"><input type="checkbox" /> Dresses</label></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-3">Price Range</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><label className="flex items-center gap-2"><input type="checkbox" /> Under ₹2,000</label></li>
              <li><label className="flex items-center gap-2"><input type="checkbox" /> ₹2,000 - ₹5,000</label></li>
              <li><label className="flex items-center gap-2"><input type="checkbox" /> Over ₹5,000</label></li>
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
              {products.map((product: any) => (
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
                    {product.salePrice && product.basePrice && product.salePrice < product.basePrice && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                        SALE
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-sm md:text-base line-clamp-1">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold">{formatPrice(product.salePrice || product.basePrice)}</span>
                    {product.salePrice && product.basePrice && product.salePrice < product.basePrice && (
                      <span className="text-muted-foreground line-through text-sm">
                        {formatPrice(product.basePrice)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
