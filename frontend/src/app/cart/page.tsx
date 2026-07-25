'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatPrice } from '@/lib/utils';
import { api } from '@/lib/api';
import { Trash2, Minus, Plus, ArrowRight, Tag, Percent, Copy, Check, Gift, ZoomIn, X, Loader2 } from 'lucide-react';

export default function CartPage() {
  const { items, subtotal, fetchCart, updateItem, removeItem, isLoading, appliedOffer } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();

  const { user } = useAuthStore();
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      fetchDeals();
    }
  }, [isAuthenticated, fetchCart]);

  const fetchDeals = async () => {
    try {
      const [offersRes, couponsRes] = await Promise.all([
        api.get('/offers/active'),
        api.get('/coupons/active'),
      ]);
      setActiveOffers(offersRes.data || []);
      setActiveCoupons(couponsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch deals', err);
    } finally {
      setLoadingDeals(false);
    }
  };

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim();
    if (!code) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', {
        code,
        subtotal,
        userId: user?.id,
      });
      setAppliedCoupon({
        id: data.coupon?.id,
        code: data.coupon?.code || code.toUpperCase(),
        discount: Number(data.discount || 0),
        type: data.coupon?.type,
        value: data.coupon?.value,
      });
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err.response?.data?.message || 'Invalid or expired coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setCouponInput(code);
    handleApplyCoupon(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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

  const freeShippingThreshold = Number(settings.freeShippingThreshold || 0);
  const shippingEnabled = settings.shippingEnabled ?? true;
  const shippingCharge = Number(settings.shippingCharge || 0);
  const platformFee = settings.platformFeeEnabled ? Number(settings.platformFeeAmount || 0) : 0;

  const offerDiscount = appliedOffer ? Number(appliedOffer.discount) : 0;
  const couponDiscount = appliedCoupon ? Number(appliedCoupon.discount) : 0;

  const isFreeShipping = !shippingEnabled || (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold);
  const shipping = isFreeShipping ? 0 : shippingCharge;

  const taxableAmount = Math.max(0, subtotal - offerDiscount - couponDiscount);
  const gstAmount = settings.gstEnabled && settings.gstRate ? Math.round((taxableAmount * (Number(settings.gstRate) / 100)) * 100) / 100 : 0;

  const total = Math.max(0, taxableAmount + shipping + platformFee + gstAmount);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-outfit font-bold mb-6">Shopping Cart</h1>

      {/* Applied Offer Banner */}
      {appliedOffer && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-800 animate-in fade-in slide-in-from-top-4">
          <div className="bg-green-100 p-2 rounded-xl text-green-700">
            <Gift className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">🎉 Offer Applied: {appliedOffer.title}</p>
            <p className="text-xs text-green-700/80 mt-0.5">Automatically saved {formatPrice(offerDiscount)} on this order!</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => {
            const unitPrice = Number(item.product.salePrice || item.product.basePrice) + Number(item.variant.extraPrice);
            return (
              <div key={item.id} className="flex gap-6 border-b pb-6">
                <div 
                  onClick={() => {
                    const src = item.variant.images?.[0] || item.product.images?.[0];
                    const finalSrc = (src && src.trim() !== '') ? src : '/placeholder.png';
                    setActiveZoomImage(finalSrc);
                  }}
                  className="relative w-24 h-32 rounded-lg overflow-hidden bg-accent/20 shrink-0 cursor-zoom-in group border hover:border-primary/20 transition-all shadow-sm"
                >
                  {(() => {
                    const src = item.variant.images?.[0] || item.product.images?.[0];
                    const finalSrc = (src && src.trim() !== '') ? src : '/placeholder.png';
                    return (
                      <>
                        <Image
                          src={finalSrc}
                          alt={item.product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                          <ZoomIn className="w-5 h-5 text-white drop-shadow-sm" />
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <Link 
                        href={`/products/${item.product.slug}${item.variant.color ? `?color=${encodeURIComponent(item.variant.color)}` : ''}`}
                        className="hover:text-primary transition-colors text-left"
                      >
                        <h3 className="font-medium text-lg hover:underline decoration-primary/30 leading-snug">{item.product.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">Size: {item.variant.size} {item.variant.color ? `| Color: ${item.variant.color}` : ''}</p>
                    </div>
                    <span className="font-bold shrink-0">{formatPrice(unitPrice * item.quantity)}</span>
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
          
          <div className="space-y-3.5 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>

            {/* Offer Discount */}
            {appliedOffer && (
              <div className="flex justify-between text-green-600 font-medium">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 shrink-0" />
                  Offer Discount ({appliedOffer.title})
                </span>
                <span>− {formatPrice(offerDiscount)}</span>
              </div>
            )}

            {/* Coupon Discount */}
            {appliedCoupon && (
              <div className="flex justify-between text-green-600 font-medium">
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 shrink-0" />
                  Coupon Discount ({appliedCoupon.code})
                </span>
                <span>− {formatPrice(couponDiscount)}</span>
              </div>
            )}

            {/* Platform Fee */}
            {settings.platformFeeEnabled && platformFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="font-medium">{formatPrice(platformFee)}</span>
              </div>
            )}

            {/* Shipping */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Shipping Fee</span>
              {shipping === 0 ? (
                <span className="text-green-600 font-medium">Free</span>
              ) : (
                <span className="font-medium">{formatPrice(shipping)}</span>
              )}
            </div>

            {/* GST Tax */}
            {settings.gstEnabled && gstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({settings.gstRate}%)</span>
                <span className="font-medium">{formatPrice(gstAmount)}</span>
              </div>
            )}

            {shipping > 0 && freeShippingThreshold > 0 && subtotal < freeShippingThreshold && (
              <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg border border-primary/10 mt-1">
                Add {formatPrice(freeShippingThreshold - subtotal)} more to qualify for <strong>FREE Shipping</strong>!
              </p>
            )}
          </div>

          {/* Coupon Input Box */}
          {settings.couponsEnabled && !appliedCoupon && (
            <div className="mb-6 pt-4 border-t border-border/60">
              <label htmlFor="cart-coupon-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Apply Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  id="cart-coupon-input"
                  name="couponCode"
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                  placeholder="e.g. WELCOME10"
                  className="flex-1 bg-white border rounded-xl px-3 py-2 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleApplyCoupon()}
                  disabled={validatingCoupon || !couponInput.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                >
                  {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-xs text-red-500 mt-1.5 font-medium">{couponError}</p>}
            </div>
          )}

          {appliedCoupon && (
            <div className="mb-6 pt-4 border-t border-border/60 flex items-center justify-between bg-green-50 border-green-200 border rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-700" />
                <div>
                  <p className="text-xs font-bold text-green-800">Coupon {appliedCoupon.code} Applied</p>
                  <p className="text-[11px] text-green-700">Saved {formatPrice(couponDiscount)}</p>
                </div>
              </div>
              <button
                onClick={() => setAppliedCoupon(null)}
                className="text-xs text-red-600 hover:underline font-bold"
              >
                Remove
              </button>
            </div>
          )}
          
          <div className="border-t pt-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-xl">{formatPrice(total)}</span>
            </div>
          </div>

          {settings.maintenanceMode ? (
            <button
              disabled
              className="w-full bg-primary/40 text-primary-foreground/75 h-14 rounded-full font-medium flex items-center justify-center gap-2 cursor-not-allowed"
            >
              Shopping Disabled (Store Maintenance)
            </button>
          ) : (
            <Link 
              href={appliedCoupon ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.code)}` : '/checkout'} 
              className="w-full bg-primary text-primary-foreground h-14 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Offers & Coupons Section */}
      {!loadingDeals && (activeOffers.length > 0 || activeCoupons.length > 0) && (
        <div className="mt-16 border-t pt-10 space-y-8 animate-in fade-in duration-500">
          <div>
            <h2 className="text-2xl font-outfit font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" /> Special Offers &amp; Coupons
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Maximize your savings with these active deals. Offer discounts are applied automatically in your cart!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Active Offers (Auto-applied) */}
            {activeOffers.length > 0 && (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                  <Percent className="w-5 h-5" /> Auto-Applied Offers
                </h3>
                <div className="space-y-3">
                  {activeOffers.map(o => (
                    <div key={o.id} className="bg-white border rounded-xl p-4 shadow-sm flex items-start gap-3">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg mt-0.5">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">{o.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Formula: Buy {o.buyQuantity} Get {o.getQuantity} Free (cheapest items free)
                        </p>
                        {(o.minProductPrice || o.maxProductPrice) && (
                          <p className="text-[11px] font-semibold text-primary mt-1">
                            Valid on products: {o.minProductPrice ? `₹${o.minProductPrice}` : '₹0'} - {o.maxProductPrice ? `₹${o.maxProductPrice}` : 'Any Price'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Coupons (Copy & apply at checkout) */}
            {activeCoupons.length > 0 && (
              <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2 text-purple-700">
                  <Tag className="w-5 h-5" /> Coupon Codes
                </h3>
                <div className="space-y-3">
                  {activeCoupons.map(c => (
                    <div key={c.id} className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-purple-100 text-purple-700/80 p-2 rounded-lg mt-0.5">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                            {c.code}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.type === 'PERCENTAGE' ? `${c.value}% Off` : `₹${c.value} Off`} {c.minOrderValue ? `on orders above ₹${c.minOrderValue}` : ''}
                          </p>
                          {c.expiresAt && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              Expires: {new Date(c.expiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyCode(c.code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          copiedCode === c.code
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {copiedCode === c.code ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Code
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IMAGE ZOOM MODAL / LIGHTBOX ── */}
      {activeZoomImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveZoomImage(null)}
        >
          <button 
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center z-10 transition-colors"
            onClick={() => setActiveZoomImage(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div 
            className="relative max-w-2xl max-h-[85vh] w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Image 
              src={activeZoomImage} 
              alt="Enlarged product image" 
              fill
              className="object-contain"
              sizes="(max-w-768px) 100vw, 800px"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
