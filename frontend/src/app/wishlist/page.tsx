'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { HeartOff, ShoppingBag } from 'lucide-react';

import { useWishlistStore } from '@/store/useWishlistStore';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const { items: wishlistItems, fetchWishlist, removeItem: removeFromWishlist, isLoading } = useWishlistStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated, fetchWishlist]);

  const handleAddToCart = async (product: any) => {
    if (!product.variants || product.variants.length === 0) return;
    try {
      // Just add the first available variant for simplicity in this demo
      const variant = product.variants.find((v: any) => v.stock > 0) || product.variants[0];
      await addItem(variant.id, 1);
      alert('Added to cart!');
      await removeFromWishlist(product.id);
    } catch (e) {
      alert('Failed to add to cart');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <HeartOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Your Wishlist</h1>
        <p className="text-muted-foreground mb-8">Please login to view your saved items.</p>
        <Link href="/login" className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium block w-full">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-outfit font-bold mb-10">My Wishlist</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse flex flex-col gap-2">
              <div className="bg-muted aspect-[3/4] rounded-xl w-full"></div>
              <div className="h-4 bg-muted w-3/4 rounded mt-2"></div>
            </div>
          ))}
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="text-center py-20 border rounded-2xl bg-muted/10">
          <HeartOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-6">Save items you love here to easily find them later.</p>
          <Link href="/products" className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium inline-block">
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {wishlistItems.map(({ product }) => (
            <div key={product.id} className="group flex flex-col relative">
              <button 
                onClick={() => removeFromWishlist(product.id)}
                className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-red-500 hover:bg-white transition-colors"
                aria-label="Remove from wishlist"
              >
                <HeartOff className="w-4 h-4" />
              </button>
              
              <Link href={`/products/${product.slug}`} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-accent/20 mb-3 block">
                {product.images?.[0] && product.images[0].trim() !== '' ? (
                  <Image src={product.images[0]} alt={product.name} fill className="object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Image src="/placeholder.png" alt={product.name} fill className="object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                )}
              </Link>
              
              <Link href={`/products/${product.slug}`}>
                <h3 className="font-medium text-sm md:text-base line-clamp-1 hover:text-primary transition-colors">{product.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold">{formatPrice(product.salePrice || product.basePrice)}</span>
                </div>
              </Link>
              
              <button 
                onClick={() => handleAddToCart(product)}
                className="mt-3 w-full py-2 border rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> Move to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
