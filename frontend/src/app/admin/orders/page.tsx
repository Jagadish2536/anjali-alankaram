'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Search, X, Package, MapPin, CreditCard, Check, Clock, Truck,
  CheckCircle2, XCircle, RotateCcw, Loader2, RefreshCw, History,
  PackageCheck, Zap, ArrowRight, Eye,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

// ── Status config ────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  DELIVERED:          'bg-green-50 text-green-700 border-green-200',
  CANCELLED:          'bg-red-50 text-red-700 border-red-200',
  REFUNDED:           'bg-gray-100 text-gray-600 border-gray-200',
  PENDING_PAYMENT:    'bg-orange-50 text-orange-700 border-orange-200',
  PAYMENT_VERIFIED:   'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:          'bg-indigo-50 text-indigo-700 border-indigo-200',
  INVENTORY_RESERVED: 'bg-violet-50 text-violet-700 border-violet-200',
  PROCESSING:         'bg-yellow-50 text-yellow-700 border-yellow-200',
  PICKING:            'bg-amber-50 text-amber-700 border-amber-200',
  PACKED:             'bg-lime-50 text-lime-700 border-lime-200',
  READY_FOR_SHIPMENT: 'bg-teal-50 text-teal-700 border-teal-200',
  SHIPPED:            'bg-cyan-50 text-cyan-700 border-cyan-200',
  IN_TRANSIT:         'bg-sky-50 text-sky-700 border-sky-200',
  OUT_FOR_DELIVERY:   'bg-blue-50 text-blue-700 border-blue-200',
  RETURN_REQUESTED:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  RETURN_APPROVED:    'bg-teal-50 text-teal-700 border-teal-200',
  PICKUP_SCHEDULED:   'bg-blue-50 text-blue-700 border-blue-200',
  RETURNED:           'bg-purple-50 text-purple-700 border-purple-200',
  REFUND_INITIATED:   'bg-orange-50 text-orange-700 border-orange-200',
  RETURN_REJECTED:    'bg-rose-50 text-rose-700 border-rose-200',
};

// ── Simplified customer-facing timeline steps (admin sees same milestones) ──
const ADMIN_ORDER_STEPS = [
  { label: 'Order Placed',      keys: ['PENDING_PAYMENT', 'PAYMENT_VERIFIED'] },
  { label: 'Order Confirmed',   keys: ['CONFIRMED', 'INVENTORY_RESERVED', 'PROCESSING', 'PICKING'] },
  { label: 'Packed',            keys: ['PACKED', 'READY_FOR_SHIPMENT'] },
  { label: 'Shipped',           keys: ['SHIPPED'] },
  { label: 'In Transit',        keys: ['IN_TRANSIT'] },
  { label: 'Out for Delivery',  keys: ['OUT_FOR_DELIVERY'] },
  { label: 'Delivered',         keys: ['DELIVERED'] },
];

const ADMIN_RETURN_STEPS = [
  { label: 'Return Initiated',  keys: ['RETURN_REQUESTED', 'RETURN_APPROVED'] },
  { label: 'Order Picked Up',   keys: ['PICKUP_SCHEDULED', 'RETURNED'] },
  { label: 'Payment Processed', keys: ['REFUND_INITIATED'] },
  { label: 'Payment Refunded',  keys: ['REFUNDED'] },
];

const ADMIN_REPLACE_STEPS = [
  { label: 'Replacement Initiated', keys: ['RETURN_REQUESTED', 'RETURN_APPROVED'] },
  { label: 'Order Picked Up',       keys: ['PICKUP_SCHEDULED', 'RETURNED'] },
  { label: 'Processing',            keys: ['REFUND_INITIATED'] },
  { label: 'Replacement Sent',      keys: ['REFUNDED'] },
];

const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT:    ['PAYMENT_VERIFIED', 'CANCELLED'],
  PAYMENT_VERIFIED:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:          ['INVENTORY_RESERVED', 'PACKED', 'CANCELLED'],
  INVENTORY_RESERVED: ['PROCESSING', 'PACKED', 'CANCELLED'],
  PROCESSING:         ['PICKING', 'PACKED', 'CANCELLED'],
  PICKING:            ['PACKED', 'CANCELLED'],
  PACKED:             ['SHIPPED'],
  SHIPPED:            ['IN_TRANSIT', 'OUT_FOR_DELIVERY'],
  IN_TRANSIT:         ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY:   ['DELIVERED'],
  DELIVERED:          ['RETURN_REQUESTED'],
  RETURN_REQUESTED:   ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED:    ['PICKUP_SCHEDULED'],
  PICKUP_SCHEDULED:   ['RETURNED'],
  RETURNED:           ['REFUND_INITIATED'],
  REFUND_INITIATED:   ['REFUNDED'],
};

const ALL_STATUSES = [
  'ALL', 'PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'CONFIRMED', 'INVENTORY_RESERVED',
  'PROCESSING', 'PICKING', 'PACKED', 'READY_FOR_SHIPMENT', 'SHIPPED', 'IN_TRANSIT',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_APPROVED',
  'PICKUP_SCHEDULED', 'RETURNED', 'REFUND_INITIATED', 'REFUNDED',
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-full border ${STATUS_COLOR[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ── History Panel ────────────────────────────────────────────────
function HistoryPanel({ orderId }: { orderId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/admin/${orderId}/history`)
      .then(r => setHistory(r.data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div className="py-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading history...</div>;

  return (
    <div className="space-y-3 py-2">
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No status history yet</p>
      ) : history.map((h, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {h.fromStatus && <StatusBadge status={h.fromStatus} />}
              {h.fromStatus && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              <StatusBadge status={h.toStatus} />
            </div>
            {h.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{h.notes}"</p>}
            <p className="text-[10px] text-muted-foreground mt-1">
              {h.actorRole || 'SYSTEM'}{h.actorName && ` · ${h.actorName}`} · {new Date(h.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Order Detail Panel ─────────────────────────────────────────
function OrderDetailPanel({ order, onClose, onStatusUpdate }: {
  order: any;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string, extra?: any) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const [awb, setAwb] = useState(order.awbCode || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');
  const [cancelReason, setCancelReason] = useState('');
  const [notes, setNotes] = useState('');
  const [courierName, setCourierName] = useState(order.courierName || '');
  const [pickupSlot, setPickupSlot] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const nextStatuses = NEXT_STATUS[order.status] || [];

  const handleUpdate = async (status: string) => {
    setUpdating(true);
    try {
      await onStatusUpdate(order.id, status, {
        awbCode: awb || undefined,
        trackingUrl: trackingUrl || undefined,
        cancelReason: cancelReason || undefined,
        courierName: courierName || undefined,
        notes: notes || undefined,
        pickupSlot: pickupSlot || undefined,
      });
      showToast(`Status updated to ${status.replace(/_/g, ' ')}`);
      setSelectedStatus('');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Update failed');
    } finally { setUpdating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="ml-auto relative bg-white w-full max-w-xl shadow-2xl overflow-y-auto animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-white/90 backdrop-blur-sm">
          <div>
            <h2 className="font-black text-base">Order #{order.orderNumber}</h2>
            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {toast && (
          <div className="mx-6 mt-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4" /> {toast}
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Status + Current */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Current Status</p>
              <StatusBadge status={order.status} />
            </div>
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
              <History className="w-3.5 h-3.5" /> {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {/* Visual timeline */}
          {(() => {
            const isReturn = ['RETURN_REQUESTED','RETURN_APPROVED','PICKUP_SCHEDULED','RETURNED','REFUND_INITIATED','REFUNDED'].includes(order.status);
            const isReplace = isReturn && order.returnReason?.startsWith?.('REPLACEMENT:');
            const steps = isReturn ? (isReplace ? ADMIN_REPLACE_STEPS : ADMIN_RETURN_STEPS) : ADMIN_ORDER_STEPS;
            const curIdx = steps.findIndex(s => s.keys.includes(order.status));
            if (order.status === 'CANCELLED' || order.status === 'RETURN_REJECTED') return null;
            return (
              <div className="bg-gray-50 rounded-xl p-4 border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Order Timeline</p>
                <div className="flex items-center gap-0">
                  {steps.map((step, i) => {
                    const done = i <= curIdx;
                    const active = i === curIdx;
                    return (
                      <div key={step.label} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 text-[10px] font-black transition-all ${
                            done ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-400'
                          } ${active ? 'ring-2 ring-primary/30 scale-110' : ''}`}>
                            {done ? <Check className="w-3 h-3" /> : (i + 1)}
                          </div>
                          <p className={`text-[8px] text-center leading-tight max-w-[48px] font-medium ${
                            done ? 'text-primary' : 'text-gray-400'
                          }`}>{step.label}</p>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-0.5 mb-4 ${i < curIdx ? 'bg-primary' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {showHistory && (
            <div className="bg-gray-50 rounded-xl p-4 border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Status History</p>
              <HistoryPanel orderId={order.id} />
            </div>
          )}

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Customer</p>
            <div className="flex items-center gap-3">
              {order.user?.avatar ? (
                <div className="relative w-9 h-9 rounded-full overflow-hidden"><Image src={order.user.avatar} alt="" fill className="object-cover" /></div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {order.user?.name?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
              <div>
                <p className="font-bold text-sm">{order.user?.name || 'Customer'}</p>
                <p className="text-xs text-muted-foreground">{order.user?.phone || order.user?.email}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {order.address && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Delivery Address
              </p>
              <div className="text-sm space-y-0.5">
                <p className="font-bold">{order.address.name}</p>
                <p className="text-muted-foreground">{order.address.line1}{order.address.line2 && `, ${order.address.line2}`}</p>
                <p className="text-muted-foreground">{order.address.city}, {order.address.state} — {order.address.pincode}</p>
                <p className="font-medium">{order.address.phone}</p>
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Items ({order.items?.length})</p>
            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex gap-3 items-center">
                  {(item.imageUrl || item.product?.images?.[0]) && (
                    <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-muted/20 shrink-0">
                      <Image src={item.imageUrl || item.product.images[0]} alt="" fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.sku && <span className="font-mono">{item.sku} · </span>}
                      {item.variantInfo?.size} {item.variantInfo?.color && `· ${item.variantInfo.color}`} · Qty: {item.quantity}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.isPicked && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">✓ Picked</span>}
                      {item.isPacked && <span className="text-[9px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full font-bold">✓ Packed</span>}
                    </div>
                  </div>
                  <p className="text-sm font-black shrink-0">{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CreditCard className="w-3 h-3" /> Payment
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600"><span>Coupon {order.couponCode && `(${order.couponCode})`}</span><span>-{formatPrice(order.discountAmount)}</span></div>
              )}
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{Number(order.shippingCharge) > 0 ? formatPrice(order.shippingCharge) : 'Free'}</span></div>
              {Number(order.giftCharge) > 0 && <div className="flex justify-between text-muted-foreground"><span>Gift Wrap</span><span>{formatPrice(order.giftCharge)}</span></div>}
              <div className="flex justify-between font-black border-t pt-1.5"><span>Total</span><span>{formatPrice(order.totalAmount)}</span></div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground text-xs">{order.paymentMethod === 'RAZORPAY' ? 'Online (Razorpay)' : 'Cash on Delivery'}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : order.paymentStatus === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping fields */}
          {(order.status === 'PACKED' || order.status === 'READY_FOR_SHIPMENT' || order.status === 'SHIPPED' || order.awbCode) && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Shipping Details</p>
              <input value={awb} onChange={e => setAwb(e.target.value)}
                placeholder="AWB Code / Tracking Number"
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              <input value={courierName} onChange={e => setCourierName(e.target.value)}
                placeholder="Courier Name (e.g. Delhivery)"
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              <input value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)}
                placeholder="Tracking URL"
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}

          {order.status === 'RETURN_APPROVED' && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Pickup Slot</p>
              <input value={pickupSlot} onChange={e => setPickupSlot(e.target.value)}
                placeholder="e.g. 25 May, 10AM–12PM"
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}

          {/* Admin notes */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Admin Note (optional)</p>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add a note about this status change..."
              className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {/* Cancel reason */}
          {(nextStatuses.includes('CANCELLED') && order.status !== 'CANCELLED') && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cancel Reason</p>
              <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}

          {/* Status Update Buttons */}
          {nextStatuses.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map(status => (
                  <button key={status} onClick={() => handleUpdate(status)} disabled={updating}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors disabled:opacity-50 ${
                      status === 'CANCELLED' || status === 'RETURN_REJECTED'
                        ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                        : 'border-primary/20 text-primary bg-primary/5 hover:bg-primary/10'
                    }`}>
                    {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {status.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Force status override */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Force Override</p>
            <div className="flex gap-2">
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-white">
                <option value="">Select any status...</option>
                {ALL_STATUSES.filter(s => s !== 'ALL').map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <button onClick={() => selectedStatus && handleUpdate(selectedStatus)} disabled={!selectedStatus || updating}
                className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-primary/90 flex items-center gap-2">
                {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Apply
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Admin override — bypasses state machine rules</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      params.set('page', p.toString());
      params.set('limit', '20');
      const { data } = await api.get(`/orders/admin/all?${params.toString()}`);
      const result = Array.isArray(data) ? data : data.orders ?? [];
      setOrders(result);
      setTotal(data.total ?? result.length);
      setTotalPages(data.totalPages ?? 1);
      setPage(p);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(1); }, [statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => fetchOrders(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleStatusUpdate = async (id: string, status: string, extra?: any) => {
    await api.put(`/orders/admin/${id}/status`, { status, ...extra });
    await fetchOrders(page);
    if (selectedOrder?.id === id) {
      const updated = orders.find(o => o.id === id);
      if (updated) setSelectedOrder({ ...updated, status });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-outfit font-black flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" /> Order Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} total orders
            </p>
          </div>
          <button onClick={() => fetchOrders(page)}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-xl hover:bg-white transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Status Filter Row */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {['ALL', 'PENDING_PAYMENT', 'CONFIRMED', 'INVENTORY_RESERVED', 'PROCESSING', 'PICKING', 'PACKED', 'READY_FOR_SHIPMENT', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'CANCELLED', 'REFUNDED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-gray-200 text-muted-foreground hover:border-gray-300'
              }`}>{s === 'ALL' ? 'All Orders' : s.replace(/_/g, ' ')}</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search orders by order number, customer name, phone, or email..."
            className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-lg">No orders found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-bold font-mono text-xs">{order.orderNumber}</p>
                        {order.awbCode && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">AWB: {order.awbCode}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{order.user?.name || 'Customer'}</p>
                        <p className="text-xs text-muted-foreground">{order.user?.phone || order.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs">
                          {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {order.items?.[0]?.productName}
                          {order.items?.length > 1 && ` +${order.items.length - 1} more`}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-black">{formatPrice(order.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{order.paymentMethod === 'RAZORPAY' ? 'Online' : 'COD'}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100">
                          <Eye className="w-3 h-3" /> Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">{total} orders total</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-bold border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground px-2">Page {page} of {totalPages}</span>
                  <button onClick={() => fetchOrders(page + 1)} disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs font-bold border rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Detail Slide Panel */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}
