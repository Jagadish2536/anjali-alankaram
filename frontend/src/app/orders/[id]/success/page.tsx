'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import {
  CheckCircle2, Package, MapPin, ArrowRight,
  Loader2, Home, ShoppingBag
} from 'lucide-react';

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { clearCart } = useCartStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear cart after successful order
    clearCart?.();

    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data);
      } catch {
        // If order fetch fails, still show success but without details
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  const isPaid = order?.paymentStatus === 'PAID' || order?.paymentMethod === 'COD';
  const isCOD = order?.paymentMethod === 'COD';

  return (
    <div className="min-h-screen bg-[#f5f5f6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Success card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">

          {/* Green header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-8 py-10 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50 duration-500">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Order Placed!</h1>
            <p className="text-green-100 text-sm mt-1">
              {isCOD
                ? 'Your order has been confirmed. Pay on delivery.'
                : 'Payment successful. Your order is confirmed.'}
            </p>
          </div>

          {/* Order details */}
          <div className="px-8 py-6 space-y-5">

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : order ? (
              <>
                {/* Order number */}
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-sm text-muted-foreground font-medium">Order Number</span>
                  <span className="font-bold text-sm">#{order.orderNumber}</span>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {(order.items || []).slice(0, 3).map((item: any) => {
                    const img = item.product?.images?.[0];
                    const src = (img && img.trim() !== '') ? img : '/placeholder.png';
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <img
                          src={src}
                          alt={item.product?.name || ''}
                          className="w-12 h-14 object-cover rounded-lg border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.variant?.size && `Size: ${item.variant.size} · `}
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">
                          ₹{Number(item.price).toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                  {(order.items?.length || 0) > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{order.items.length - 3} more item(s)
                    </p>
                  )}
                </div>

                {/* Payment info */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-bold">₹{Number(order.totalAmount).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment</span>
                    <span className={`font-bold ${isCOD ? 'text-amber-600' : 'text-green-600'}`}>
                      {isCOD ? 'Cash on Delivery' : 'Paid Online'}
                    </span>
                  </div>
                </div>

                {/* Delivery address */}
                {order.address && (
                  <div className="flex gap-3 items-start text-sm">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{order.address.name}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {order.address.line1}
                        {order.address.line2 ? `, ${order.address.line2}` : ''},{' '}
                        {order.address.city} — {order.address.pincode}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <Package className="w-10 h-10 text-primary/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Order confirmed!</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-8 pb-8 space-y-3">
            <Link
              href={`/orders/${id}`}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground h-12 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              <Package className="w-4 h-4" />
              Track My Order
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/"
                className="flex items-center justify-center gap-1.5 h-10 border rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link
                href="/products"
                className="flex items-center justify-center gap-1.5 h-10 border rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Shop More
              </Link>
            </div>
          </div>
        </div>

        {/* Estimated delivery */}
        <div className="mt-4 bg-white rounded-2xl px-6 py-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Estimated Delivery</p>
            <p className="text-xs text-muted-foreground">
              {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'short',
              })}
              {' '}–{' '}
              {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'short',
              })}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
