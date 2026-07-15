'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Script from 'next/script';
import {
  Tag, Gift, MapPin, ChevronRight, Check,
  Loader2, ShieldCheck, X, Package, ChevronDown, Percent,
  AlertTriangle
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
const STEPS = ['BAG', 'ADDRESS', 'PAYMENT'];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              i < step ? 'bg-green-500 border-green-500 text-white' :
              i === step ? 'border-primary text-primary bg-primary/10' :
              'border-gray-300 text-gray-400 bg-white'
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] font-bold tracking-widest ${i === step ? 'text-primary' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
              {s}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-10 sm:w-20 h-0.5 mx-1 mb-5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function PincodeChecker() {
  const [pincode, setPincode] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const check = () => {
    if (pincode.length !== 6) return;
    setLoading(true);
    setTimeout(() => {
      setResult(`Delivery available to ${pincode} in 3–5 business days.`);
      setLoading(false); setOpen(false);
    }, 800);
  };
  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          {result
            ? <span className="text-green-700 font-medium text-xs">{result}</span>
            : <span>Check delivery time &amp; services</span>}
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="text-xs font-bold text-primary border border-primary px-3 py-1.5 rounded hover:bg-primary/5 transition-colors">
          ENTER PIN CODE
        </button>
      </div>
      {open && (
        <div className="border-t px-4 py-3 bg-muted/10 flex gap-2">
          <label htmlFor="pincode-check-input" className="sr-only">Enter 6-digit pincode</label>
          <input id="pincode-check-input" name="pincode" type="text" maxLength={6} placeholder="Enter 6-digit pincode"
            className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
            value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && check()} />
          <button onClick={check} disabled={pincode.length !== 6 || loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, removeItem, updateItem, fetchCart, clearCart, appliedOffer } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { settings, fetchSettings, isFetched } = useSettingsStore();

  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY');
  const [isProcessing, setIsProcessing] = useState(false);
  const isSuccessRef = useRef(false);
  const [showPaymentWarningModal, setShowPaymentWarningModal] = useState(false);
  const [showPlatformFeeModal, setShowPlatformFeeModal] = useState(false);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  // Lock body scroll when payment policy modal or platform fee modal is open
  useEffect(() => {
    if (!showPaymentWarningModal && !showPlatformFeeModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showPaymentWarningModal, showPlatformFeeModal]);

  // Qty edit state
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const couponInputRef = useRef<HTMLInputElement>(null);

  // Gift
  const [giftAdded, setGiftAdded] = useState(false);
  // giftPrice is derived from admin settings below (giftAmount field)

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Lock body scroll when address form modal is open
  useEffect(() => {
    if (!showAddressForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showAddressForm]);
  const [newAddress, setNewAddress] = useState({
    name: '', phone: '', pincode: '', line1: '', line2: '', locality: '', city: '', state: '',
    addressType: 'Home' as 'Home' | 'Office',
    isDefault: false,
  });

  // ── Load admin settings & data ─────────────────────────────────────────────
  useEffect(() => {
    // Always fetch fresh settings so checkout reflects latest admin regional config
    fetchSettings();
    if (items.length === 0) fetchCart();
    loadAddresses();
  }, []);

  useEffect(() => {
    if (isFetched && settings.maintenanceMode) {
      router.push('/cart');
    }
  }, [settings.maintenanceMode, isFetched]);

  useEffect(() => {
    if (items.length === 0 && !useCartStore.getState().isLoading && !isSuccessRef.current) {
      router.push('/cart');
    }
  }, [items.length]);

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/users/addresses');
      setAddresses(data);
      const def = data.find((a: any) => a.isDefault) || data[0];
      if (def) setSelectedAddress(def.id);
    } catch { /* no addresses */ }
  };

  // ── Pricing from admin settings ────────────────────────────────────────────
  const freeShippingThreshold: number = settings.freeShippingThreshold;
  const shippingEnabled: boolean = settings.shippingEnabled ?? true;
  const shippingCharge: number = settings.shippingCharge;
  const platformFeeEnabled: boolean = settings.platformFeeEnabled;
  const platformFeeAmount: number = settings.platformFeeAmount;
  const codEnabled: boolean = settings.codEnabled;
  const codCharges: number = settings.codCharges;
  const gstEnabled: boolean = settings.gstEnabled;
  const gstRate: number = settings.gstRate;
  const couponsEnabled: boolean = settings.couponsEnabled;
  const giftEnabled: boolean = settings.giftEnabled;
  const giftPrice: number = settings.giftAmount;
  
  const offerDiscount = appliedOffer ? Number(appliedOffer.discount) : 0;

  // Shipping: free if shippingEnabled is off, or if subtotal >= threshold, else charge shippingCharge
  const shipping = !shippingEnabled ? 0 : (subtotal >= freeShippingThreshold ? 0 : shippingCharge);
  const platformFee = platformFeeEnabled ? platformFeeAmount : 0;
  const codFee = paymentMethod === 'COD' ? codCharges : 0;
  const gstAmount = gstEnabled ? Math.round(subtotal * gstRate / 100) : 0;
  const giftFee = giftAdded ? giftPrice : 0;
  const total = subtotal - couponDiscount - offerDiscount + shipping + platformFee + codFee + gstAmount + giftFee;

  // ── Qty change ────────────────────────────────────────────────────────────
  const handleQtyChange = async (itemId: string, qty: number) => {
    if (qty < 1) return;
    setUpdatingItem(itemId);
    try { await updateItem(itemId, qty); }
    catch { /* ignore */ }
    finally { setUpdatingItem(null); }
  };

  // ── Coupon ────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    setCouponMsg(null);
    try {
      const { data } = await api.post('/coupons/validate', {
        code: couponCode,
        subtotal,
        userId: user?.id,   // pass userId for per-user limit check
      });
      setCouponDiscount(data.discount || 0);
      setCouponMsg({ type: 'ok', text: `Coupon applied! You save ${formatPrice(data.discount)}` });
    } catch (e: any) {
      setCouponMsg({ type: 'err', text: e.response?.data?.message || 'Invalid or expired coupon code.' });
      setCouponDiscount(0);
    } finally { setApplyingCoupon(false); }
  };

  const focusCouponInput = () => {
    couponInputRef.current?.focus();
    couponInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── Address ───────────────────────────────────────────────────────────────
  const handleSaveAddress = async () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.pincode || !newAddress.line1 || !newAddress.city)
      return alert('Please fill all required fields');
    try {
      await api.post('/users/addresses', {
        name: newAddress.name,
        phone: newAddress.phone,
        pincode: newAddress.pincode,
        line1: newAddress.line1,
        line2: newAddress.locality ? `${newAddress.line2 ? newAddress.line2 + ', ' : ''}${newAddress.locality}` : newAddress.line2,
        city: newAddress.city,
        state: newAddress.state,
        isDefault: newAddress.isDefault,
      });
      setShowAddressForm(false);
      setNewAddress({ name: '', phone: '', pincode: '', line1: '', line2: '', locality: '', city: '', state: '', addressType: 'Home', isDefault: false });
      loadAddresses();
    } catch { alert('Failed to save address'); }
  };

  // ── Place order ────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!selectedAddress) return alert('Please select a delivery address');
    setIsProcessing(true);
    try {
      const { data } = await api.post('/orders', {
        addressId: selectedAddress,
        paymentMethod,
        couponCode: couponCode.trim() || undefined,
        isGift: giftAdded,
        giftMessage: giftAdded ? 'Gift packaging requested' : undefined,
      });

      if (paymentMethod === 'COD') {
        // Clear cart and go to success page
        isSuccessRef.current = true;
        clearCart();
        router.push(`/orders/${data.order.id}/success`);
      } else if (data.razorpayOrderId) {
        const options = {
          key: data.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: Math.round(data.order.totalAmount * 100),
          currency: 'INR',
          name: 'Anjali Alankaram',
          description: 'Order Payment',
          order_id: data.razorpayOrderId,
          handler: async (response: any) => {
            try {
              // Verify payment with backend
              await api.post('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: data.order.id,
              });
            } catch {
              // Even if verify call fails, payment was captured — still go to success
            }
            isSuccessRef.current = true;
            clearCart();
            router.push(`/orders/${data.order.id}/success`);
          },
          prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
          theme: { color: '#B76E79' },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              router.push('/cart');
            },
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', () => {
          setIsProcessing(false);
          alert('Payment failed. Please try again.');
          router.push('/cart');
        });
        rzp.open();
        return; // Don't hit finally block while modal is open
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f6]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-outfit text-xl md:text-2xl font-bold text-primary hidden md:block">Anjali Alankaram</Link>
          <div className="flex-1 md:flex-none flex justify-center">
            <StepBar step={step} />
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-green-700 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" /> 100% SECURE
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* STEP 0 — BAG */}
          {step === 0 && (
            <>
              <PincodeChecker />

              {appliedOffer && offerDiscount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3 animate-in fade-in">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 border border-green-200">
                    <Percent className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800">🎉 Offer Applied: {appliedOffer.title}!</p>
                    <p className="text-xs text-green-600 mt-0.5">Automatically saved <strong>{formatPrice(offerDiscount)}</strong> on your items.</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-bold">{items.length}/{items.length} ITEMS SELECTED</span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y">
                  {items.map(item => {
                    const basePrice = Number(item.product.salePrice || item.product.basePrice);
                    const origPrice = Number(item.product.basePrice);
                    const discountPct = item.product.salePrice && origPrice > 0
                      ? Math.round((1 - Number(item.product.salePrice) / origPrice) * 100) : 0;

                    return (
                      <div key={item.id} className="flex gap-4 p-5">
                        {/* Image — use selected variant's colour image, fall back to main product image */}
                        <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-gray-100 shrink-0 border">
                          {(() => {
                            const src =
                              item.variant?.images?.[0] ||
                              item.product.images?.[0];
                            const finalSrc = (src && src.trim() !== '') ? src : '/placeholder.png';
                            return <Image src={finalSrc} alt={item.product.name} fill className="object-cover" />;
                          })()}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <p className="font-bold text-sm leading-snug">{item.product.name}</p>
                            <button onClick={() => removeItem(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Size, Colour & Qty */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {/* Size — read-only */}
                            <div className="flex items-center gap-1 border rounded px-2.5 py-1.5 text-xs font-medium bg-gray-50">
                              <span className="text-muted-foreground">Size:</span>
                              <span className="font-bold">{item.variant?.size || 'Free'}</span>
                            </div>

                            {/* Colour chip — only if colour is set */}
                            {item.variant?.color && (
                              <div className="flex items-center gap-1.5 border rounded px-2.5 py-1.5 text-xs font-medium bg-gray-50">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0 shadow-sm"
                                  style={{ backgroundColor: item.variant?.colorHex || item.variant?.color || '#ccc' }}
                                />
                                <span className="text-muted-foreground">Colour:</span>
                                <span className="font-bold capitalize">{item.variant.color}</span>
                              </div>
                            )}

                            {/* Qty — functional dropdown */}
                            <div className="relative">
                              <select
                                value={item.quantity}
                                disabled={updatingItem === item.id}
                                onChange={e => handleQtyChange(item.id, parseInt(e.target.value))}
                                className="appearance-none border rounded px-2.5 py-1.5 pr-6 text-xs font-medium bg-white cursor-pointer hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors disabled:opacity-50"
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                  <option key={n} value={n}>Qty: {n}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                              {updatingItem === item.id && (
                                <Loader2 className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="flex items-baseline gap-2 mt-3">
                            <span className="font-bold text-base">{formatPrice(basePrice * item.quantity)}</span>
                            {discountPct > 0 && (
                              <>
                                <span className="text-muted-foreground line-through text-xs">{formatPrice(origPrice * item.quantity)}</span>
                                <span className="text-green-600 text-xs font-bold">{discountPct}% off</span>
                              </>
                            )}
                          </div>


                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isAuthenticated && (
                  <div className="flex items-center gap-3 px-5 py-4 border-t bg-gray-50">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-primary border-2 border-white" />)}
                    </div>
                    <span className="text-sm text-muted-foreground flex-1">Login to see items from your existing bag and wishlist.</span>
                    <Link href="/login?returnUrl=/checkout" className="text-primary font-bold text-sm hover:underline">LOGIN NOW</Link>
                  </div>
                )}
              </div>

              <button onClick={() => setStep(1)}
                className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
                CONTINUE →
              </button>
            </>
          )}

          {/* STEP 1 — ADDRESS */}
          {step === 1 && (
            <div className="bg-white rounded-xl border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-base">Delivery Address</h2>
                <button onClick={() => setStep(0)} className="text-xs text-primary font-bold hover:underline">← Back to Bag</button>
              </div>
              <div className="p-5 space-y-3">
                {addresses.length === 0 && !showAddressForm && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No saved addresses. Add one below.</p>
                )}
                {addresses.map(addr => (
                  <label key={addr.id} htmlFor={`addr-${addr.id}`} className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-all ${selectedAddress === addr.id ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-gray-300'}`}>
                    <input id={`addr-${addr.id}`} type="radio" name="addr" value={addr.id} checked={selectedAddress === addr.id}
                      onChange={e => setSelectedAddress(e.target.value)} className="mt-1 accent-primary" />
                    <div>
                      <p className="font-bold text-sm">{addr.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                      <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                      <p className="text-xs font-medium mt-1">{addr.phone}</p>
                    </div>
                  </label>
                ))}

                {!showAddressForm ? (
                  <button onClick={() => setShowAddressForm(true)}
                    className="w-full border-2 border-dashed border-primary/40 rounded-xl py-3 text-sm font-bold text-primary hover:border-primary hover:bg-primary/5 transition-colors">
                    + Add New Address
                  </button>
                ) : null}

                {addresses.length > 0 && (
                  <button onClick={() => {
                    if (settings.paymentPolicyEnabled) {
                      setShowPaymentWarningModal(true);
                    } else {
                      setStep(2);
                    }
                  }} disabled={!selectedAddress}
                    className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2">
                    CONTINUE TO PAYMENT →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — PAYMENT */}
          {step === 2 && (
            <div className="bg-white rounded-xl border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-base">Payment Method</h2>
                <button onClick={() => setStep(1)} className="text-xs text-primary font-bold hover:underline">← Change Address</button>
              </div>
              <div className="p-5 space-y-3">
                <label htmlFor="pay-razorpay" className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'RAZORPAY' ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-gray-300'}`}>
                  <input id="pay-razorpay" type="radio" name="pay" value="RAZORPAY" checked={paymentMethod === 'RAZORPAY'}
                    onChange={() => setPaymentMethod('RAZORPAY')} className="mt-1 accent-primary" />
                  <div>
                    <p className="font-bold text-sm">💳 Pay Online</p>
                    <p className="text-xs text-muted-foreground mt-0.5">UPI, Cards, Net Banking via Razorpay — fast &amp; secure</p>
                  </div>
                </label>

                {codEnabled && (
                  <label htmlFor="pay-cod" className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-gray-300'}`}>
                    <input id="pay-cod" type="radio" name="pay" value="COD" checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')} className="mt-1 accent-primary" />
                    <div>
                      <p className="font-bold text-sm">💵 Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pay when you receive your order.
                        {codCharges > 0 && <span className="text-amber-600 font-medium"> Extra ₹{codCharges} COD fee applies.</span>}
                      </p>
                    </div>
                  </label>
                )}

                <button onClick={handlePlaceOrder} disabled={isProcessing}
                  className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
                  {isProcessing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    : <>Place Order &bull; {formatPrice(total)}</>
                  }
                </button>

                <p className="text-center text-[11px] text-muted-foreground">
                  By placing the order, you agree to our{' '}
                  <Link href="/terms" className="underline text-primary">Terms of Use</Link>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* Coupons — only shown when admin has enabled coupons */}
          {couponsEnabled && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Coupons</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-0 border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                <Tag className="w-4 h-4 text-primary ml-3 shrink-0" />
                <label htmlFor="coupon-code-input" className="sr-only">Apply Coupons</label>
                <input
                  ref={couponInputRef}
                  id="coupon-code-input"
                  name="couponCode"
                  type="text" placeholder="Apply Coupons" value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  className="flex-1 py-2.5 px-2 text-sm outline-none font-medium bg-transparent"
                />
                <button onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode.trim()}
                  className="px-4 py-2.5 text-primary font-bold text-sm border-l hover:bg-primary/5 transition-colors disabled:opacity-40 whitespace-nowrap">
                  {applyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'APPLY'}
                </button>
              </div>
              {couponMsg && (
                <p className={`text-xs font-medium flex items-center gap-1 ${couponMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                  {couponMsg.type === 'ok' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {couponMsg.text}
                </p>
              )}
              {couponDiscount === 0 && !isAuthenticated && (
                <p className="text-xs text-muted-foreground">
                  <Link href="/login?returnUrl=/checkout" className="text-primary font-semibold hover:underline">Login</Link>
                  {' '}to get upto <span className="text-primary font-bold">₹300 OFF</span> on first order
                </p>
              )}
            </div>
          </div>
          )}

          {/* Gift packaging — only shown when admin has enabled it */}
          {giftEnabled && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">Gifting &amp; Personalisation</p>
            </div>
            <div className="p-4">
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                  <Gift className="w-5 h-5 text-rose-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Buying for a loved one?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Gift Packaging and personalised message on card. Only for <strong>₹{giftPrice}</strong></p>
                  <button onClick={() => setGiftAdded(g => !g)}
                    className={`mt-2 text-xs font-bold transition-colors ${giftAdded ? 'text-red-500 hover:text-red-600' : 'text-primary hover:underline'}`}>
                    {giftAdded ? '✓ GIFT PACKAGE ADDED' : 'ADD GIFT PACKAGE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Price Details — driven by admin settings */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase">
                Price Details ({items.length} Item{items.length > 1 ? 's' : ''})
              </p>
            </div>
            <div className="p-4 space-y-3 text-sm">

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total MRP</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {/* Coupon discount row — only if coupons enabled */}
              {couponsEnabled && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coupon Discount</span>
                {couponDiscount > 0
                  ? <span className="text-green-600 font-bold">− {formatPrice(couponDiscount)}</span>
                  : (
                    <button onClick={focusCouponInput}
                      className="text-primary font-bold text-xs hover:underline">
                      Apply Coupon
                    </button>
                  )
                }
              </div>
              )}

              {/* Offer discount row */}
              {offerDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    Offer Discount ({appliedOffer?.title})
                  </span>
                  <span className="text-green-600 font-bold">− {formatPrice(offerDiscount)}</span>
                </div>
              )}

              {/* Platform fee — only if admin enabled it */}
              {platformFeeEnabled && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Platform Fee
                    <button
                      type="button"
                      onClick={() => setShowPlatformFeeModal(true)}
                      className="text-[10px] text-primary border-b border-primary/50 cursor-pointer leading-none hover:text-primary/80 focus:outline-none"
                    >
                      Know More
                    </button>
                  </span>
                  <span className="font-medium">₹{platformFeeAmount}</span>
                </div>
              )}

              {/* GST — only if admin enabled it */}
              {gstEnabled && gstAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST ({gstRate}%)</span>
                  <span className="font-medium">{formatPrice(gstAmount)}</span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                {shipping === 0
                  ? <span className="text-green-600 font-bold">FREE</span>
                  : <span className="font-medium">{formatPrice(shipping)}</span>
                }
              </div>

              {/* COD charges */}
              {paymentMethod === 'COD' && codCharges > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">COD Charges</span>
                  <span className="font-medium">₹{codCharges}</span>
                </div>
              )}

              {/* Gift */}
              {giftAdded && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gift Packaging</span>
                  <span className="font-medium">₹{giftPrice}</span>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-3 flex justify-between items-center font-bold text-base">
                <span>Total Amount</span>
                <span>{formatPrice(total)}</span>
              </div>

              {/* Savings banner */}
              {(couponDiscount > 0 || offerDiscount > 0) && (
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-xs text-green-700 font-bold">You save {formatPrice(couponDiscount + offerDiscount)} on this order!</p>
                </div>
              )}

              {/* Free shipping hint */}
              {shipping > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Add {formatPrice(freeShippingThreshold - subtotal)} more to get <strong>FREE delivery</strong>!
                </p>
              )}
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 py-2">
            {[{ icon: '🔒', text: '100% Secure' }, { icon: '⚡', text: 'Fast Delivery' }].map(b => (
              <div key={b.text} className="flex flex-col items-center gap-1">
                <span className="text-xl">{b.icon}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ADD NEW ADDRESS MODAL ── */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddressForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b shrink-0">
              <h2 className="text-base font-black tracking-widest uppercase">Add New Address</h2>
              <button onClick={() => setShowAddressForm(false)} className="text-gray-500 hover:text-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

              {/* Contact Details */}
              <div>
                <p className="text-xs font-black tracking-widest text-gray-500 uppercase mb-3">Contact Details</p>
                <div className="space-y-3">
                  <label htmlFor="addr-name" className="sr-only">Full Name</label>
                  <input id="addr-name" name="name" type="text" placeholder="Name*"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={newAddress.name} onChange={e => setNewAddress(p => ({ ...p, name: e.target.value }))} />
                  
                  <label htmlFor="addr-phone" className="sr-only">WhatsApp Number</label>
                  <input id="addr-phone" name="phone" type="tel" placeholder="WhatsApp Number*" maxLength={10}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={newAddress.phone} onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} />
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="text-xs font-black tracking-widest text-gray-500 uppercase mb-3">Address</p>
                <div className="space-y-3">
                  <label htmlFor="addr-pincode" className="sr-only">Pin Code</label>
                  <input id="addr-pincode" name="pincode" type="text" placeholder="Pin Code*" maxLength={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={newAddress.pincode} onChange={e => setNewAddress(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '') }))} />

                  <div>
                    <label htmlFor="addr-line1" className="sr-only">House Number/Tower/Block</label>
                    <input id="addr-line1" name="line1" type="text" placeholder="House Number/Tower/Block*"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                      value={newAddress.line1} onChange={e => setNewAddress(p => ({ ...p, line1: e.target.value }))} />
                    <p className="text-[11px] text-amber-600 mt-1 ml-1">*House Number will allow a doorstep delivery</p>
                  </div>

                  <div>
                    <label htmlFor="addr-line2" className="sr-only">Address (locality, building, street)</label>
                    <input id="addr-line2" name="line2" type="text" placeholder="Address (locality, building, street)*"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                      value={newAddress.line2} onChange={e => setNewAddress(p => ({ ...p, line2: e.target.value }))} />
                    <p className="text-[11px] text-amber-600 mt-1 ml-1">*Please update society/apartment details</p>
                  </div>

                  <label htmlFor="addr-locality" className="sr-only">Locality / Town</label>
                  <input id="addr-locality" name="locality" type="text" placeholder="Locality / Town*"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                    value={newAddress.locality} onChange={e => setNewAddress(p => ({ ...p, locality: e.target.value }))} />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="addr-city" className="sr-only">City / District</label>
                      <input id="addr-city" name="city" type="text" placeholder="City / District*"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all bg-gray-50"
                        value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor="addr-state" className="sr-only">State</label>
                      <input id="addr-state" name="state" type="text" placeholder="State*"
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all bg-gray-50"
                        value={newAddress.state} onChange={e => setNewAddress(p => ({ ...p, state: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Type */}
              <div>
                <p className="text-xs font-black tracking-widest text-gray-500 uppercase mb-3">Address Type</p>
                <div className="flex items-center gap-8">
                  {(['Home', 'Office'] as const).map(type => (
                    <label key={type} className="flex items-center gap-2.5 cursor-pointer" onClick={() => setNewAddress(p => ({ ...p, addressType: type }))}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${newAddress.addressType === type ? 'border-primary' : 'border-gray-300'}`}>
                        {newAddress.addressType === type && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Default checkbox */}
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => setNewAddress(p => ({ ...p, isDefault: !p.isDefault }))}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${newAddress.isDefault ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                  {newAddress.isDefault && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium text-gray-700">Make this as my default address</span>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t shrink-0 flex gap-3">
              <button onClick={() => setShowAddressForm(false)}
                className="flex-1 h-12 rounded-full border-2 border-gray-300 font-bold text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveAddress}
                className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/30">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── PAYMENT POLICY CONFIRMATION MODAL ── */}
      {showPaymentWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaymentWarningModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header/Icon */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-500">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight font-outfit">
                Important Policy
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Please review our terms before proceeding to payment.
              </p>
            </div>

            {/* Warnings list */}
            <div className="bg-[#FAF9F6] border border-amber-100 rounded-xl p-4 space-y-3 mb-6 max-h-[35vh] overflow-y-auto">
              {(settings.paymentPolicyPoints || []).map((pt: string, idx: number) => {
                const colonIdx = pt.indexOf(':');
                if (colonIdx !== -1) {
                  const boldPart = pt.substring(0, colonIdx + 1);
                  const normalPart = pt.substring(colonIdx + 1);
                  return (
                    <div key={idx} className="flex gap-2 items-start text-sm text-gray-700 text-left">
                      <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                      <span><strong>{boldPart}</strong>{normalPart}</span>
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex gap-2 items-start text-sm text-gray-700 text-left">
                    <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{pt}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-center font-bold text-sm text-gray-800 mb-6">
              Are you sure you want to continue?
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowPaymentWarningModal(false);
                  setStep(2);
                }}
                className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
              >
                Go to Payment
              </button>
              
              <button
                onClick={() => {
                  setShowPaymentWarningModal(false);
                  router.push('/cart');
                }}
                className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 h-12 rounded-xl font-bold text-sm transition-colors border border-gray-200"
              >
                Go to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlatformFeeModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlatformFeeModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-outfit font-bold text-lg text-foreground mb-2">About Platform Fee</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              This small fee is charged per order to support our digital infrastructure and ensure a safe, secure, and premium shopping experience.
            </p>
            <button
              onClick={() => setShowPlatformFeeModal(false)}
              className="mt-5 w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-all text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
