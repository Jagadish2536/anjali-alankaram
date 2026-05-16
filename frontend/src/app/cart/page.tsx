'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatPrice } from '@/lib/utils';
import { Trash2, Minus, Plus, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const { items, subtotal, fetchCart, updateItem, removeItem, isLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated, fetchCart]);

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
        <p className="text-muted-foreground mb-8">Please login to view your cart.</p>
        <Link href="/login" className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium block w-full">
          Login / Sign Up
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !isLoading) {
    return (
      <div className="container py-20 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
        <Link href="/products" className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium">
          Start Shopping
        </Link>
      </div>
    );
  }

  const shipping = subtotal > 499 ? 0 : 49;
  const total = subtotal + shipping;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-outfit font-bold mb-10">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => {
            const unitPrice = Number(item.product.salePrice || item.product.basePrice) + Number(item.variant.extraPrice);
            return (
              <div key={item.id} className="flex gap-6 border-b pb-6">
                <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-accent/20 shrink-0">
                  {item.product.images?.[0] && (
                    <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{item.product.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Size: {item.variant.size} {item.variant.color ? `| Color: ${item.variant.color}` : ''}</p>
                    </div>
                    <span className="font-bold">{formatPrice(unitPrice * item.quantity)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center border rounded-md h-10">
                      <button 
                        onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                        disabled={isLoading || item.quantity <= 1}
                        className="px-3 hover:text-primary disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        disabled={isLoading || item.quantity >= item.variant.stock}
                        className="px-3 hover:text-primary disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeItem(item.id)}
                      disabled={isLoading}
                      className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="bg-muted/30 p-6 rounded-2xl h-fit sticky top-24">
          <h2 className="text-xl font-bold mb-6">Order Summary</h2>
          
          <div className="space-y-4 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Shipping</span>
              {shipping === 0 ? (
                <span className="text-green-600 font-medium">Free</span>
              ) : (
                <span className="font-medium">{formatPrice(shipping)}</span>
              )}
            </div>
            {shipping > 0 && (
              <p className="text-xs text-muted-foreground">Add {formatPrice(499 - subtotal)} more for free shipping.</p>
            )}
          </div>
          
          <div className="border-t pt-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-xl">{formatPrice(total)}</span>
            </div>
          </div>

          <Link href="/checkout" className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            Proceed to Checkout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
