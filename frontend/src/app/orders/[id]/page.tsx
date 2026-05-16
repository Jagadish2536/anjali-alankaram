'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Package, Truck, CheckCircle2, ChevronLeft, AlertCircle, XCircle } from 'lucide-react';

export default function DetailedOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login');
    
    async function fetchOrder() {
      try {
        const { data } = await api.get(`/orders/${params.id}`);
        setOrder(data);
      } catch (e) {
        console.error('Failed to fetch order details');
      } finally {
        setIsLoading(false);
      }
    }
    if (params.id) fetchOrder();
  }, [params.id, isAuthenticated, router]);

  const handleAction = async (action: 'cancel' | 'return') => {
    const reason = prompt(`Please provide a reason for ${action}ing this order:`);
    if (!reason) return;

    setIsReturning(true);
    try {
      const endpoint = `/orders/${order.id}/${action}`;
      await api.post(endpoint, { reason });
      // Refresh order
      const { data } = await api.get(`/orders/${order.id}`);
      setOrder(data);
      alert(`Order ${action} request submitted successfully.`);
    } catch (e: any) {
      alert(e.response?.data?.message || `Failed to ${action} order`);
    } finally {
      setIsReturning(false);
    }
  };

  if (isLoading) return <div className="container py-20 text-center animate-pulse">Loading Order Details...</div>;
  if (!order) return <div className="container py-20 text-center">Order not found</div>;

  // Determine timeline progress
  const timeline = [
    { key: 'CONFIRMED', label: 'Order Confirmed', icon: Package },
    { key: 'PACKED', label: 'Packed', icon: Package },
    { key: 'SHIPPED', label: 'Shipped', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
  ];

  const currentStatusIndex = timeline.findIndex(t => t.key === order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isReturned = order.status.includes('RETURN');

  return (
    <div className="container py-10 max-w-4xl">
      <Link href="/profile" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Orders
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground mt-1">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        
        {/* Action Buttons based on status */}
        <div className="flex gap-3">
          {(order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'PACKED') && (
            <button 
              onClick={() => handleAction('cancel')}
              disabled={isReturning}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}
          {order.status === 'DELIVERED' && (
            <button 
              onClick={() => handleAction('return')}
              disabled={isReturning}
              className="px-4 py-2 text-sm font-medium text-orange-600 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
            >
              Request Return
            </button>
          )}
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="bg-white border rounded-2xl p-6 md:p-10 shadow-sm mb-8">
        <h2 className="text-lg font-bold mb-8">Delivery Status</h2>
        
        {isCancelled ? (
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
            <XCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Order Cancelled</p>
              <p className="text-sm mt-1 text-red-600/80">This order was cancelled. Any payments made will be refunded within 5-7 business days.</p>
            </div>
          </div>
        ) : isReturned ? (
          <div className="flex items-center gap-3 text-orange-600 bg-orange-50 p-4 rounded-xl border border-orange-100">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-bold">Return Status: {order.status.replace('_', ' ')}</p>
              <p className="text-sm mt-1 text-orange-600/80">We have received your return request. Our team will contact you shortly.</p>
            </div>
          </div>
        ) : (
          <div className="relative flex justify-between">
            {/* Connecting line */}
            <div className="absolute top-5 left-0 w-full h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-in-out" 
                style={{ width: `${Math.max(0, (currentStatusIndex / (timeline.length - 1)) * 100)}%` }}
              />
            </div>
            
            {/* Steps */}
            {timeline.map((step, index) => {
              const isCompleted = currentStatusIndex >= index;
              const isCurrent = currentStatusIndex === index;
              const Icon = step.icon;
              
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500
                    ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className={`text-xs md:text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Estimated Delivery Note */}
        {!isCancelled && !isReturned && order.status !== 'DELIVERED' && (
          <p className="text-center text-sm text-muted-foreground mt-10">
            Estimated Delivery: <strong className="text-foreground">Within 5-7 business days</strong>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Items */}
        <div className="md:col-span-2 bg-white border rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Items in Order</h2>
          <div className="space-y-6">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex gap-4 border-b pb-6 last:border-0 last:pb-0">
                <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-accent/20 shrink-0">
                  {item.product.images?.[0] && (
                    <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                  )}
                </div>
                <div>
                  <Link href={`/products/${item.product.slug}`} className="font-medium hover:text-primary transition-colors">
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">
                    Size: {item.variant.size} | Qty: {item.quantity}
                  </p>
                  <p className="font-bold mt-2">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Sidebar */}
        <div className="space-y-8">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Payment Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(order.totalAmount - (order.shippingFee || 0))}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{order.shippingFee ? formatPrice(order.shippingFee) : 'Free'}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="pt-3 border-t flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Payment Method</p>
              <p className="text-sm font-medium">{order.paymentMethod === 'RAZORPAY' ? 'Paid Online (Razorpay)' : 'Cash on Delivery'}</p>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Delivery Address</h2>
            <p className="font-medium">{order.address?.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{order.address?.line1}, {order.address?.line2}</p>
            <p className="text-sm text-muted-foreground">{order.address?.city}, {order.address?.state} - {order.address?.pincode}</p>
            <p className="text-sm font-medium mt-3">Phone: {order.address?.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
