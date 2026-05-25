'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  Package, Truck, CheckCircle2, ChevronLeft, AlertCircle,
  XCircle, Clock, RotateCcw, RefreshCw, MapPin, CreditCard,
  Loader2, Check, ExternalLink, ShieldCheck,
  PackageCheck, Zap, Bell, Warehouse
} from 'lucide-react';

// ─── Status definitions ────────────────────────────────────────────

// User-facing timeline: 7 friendly milestones
// Internal statuses PAYMENT_VERIFIED, INVENTORY_RESERVED, PROCESSING, PICKING,
// READY_FOR_SHIPMENT are collapsed into adjacent visible steps.
const ALL_STATUSES = [
  {
    key: 'PENDING_PAYMENT',
    // also represents ORDER_PLACED state for COD (PAYMENT_VERIFIED before CONFIRMED)
    label: 'Order Placed',
    icon: Clock,
    color: 'orange',
    // All internal keys that map to this step
    keys: ['PENDING_PAYMENT', 'PAYMENT_VERIFIED'],
  },
  {
    key: 'CONFIRMED',
    label: 'Order Confirmed',
    icon: Package,
    color: 'indigo',
    keys: ['CONFIRMED', 'INVENTORY_RESERVED', 'PROCESSING', 'PICKING'],
  },
  {
    key: 'PACKED',
    label: 'Packed',
    icon: PackageCheck,
    color: 'lime',
    keys: ['PACKED', 'READY_FOR_SHIPMENT'],
  },
  {
    key: 'SHIPPED',
    label: 'Shipped',
    icon: Truck,
    color: 'cyan',
    keys: ['SHIPPED'],
  },
  {
    key: 'IN_TRANSIT',
    label: 'In Transit',
    icon: Truck,
    color: 'sky',
    keys: ['IN_TRANSIT'],
  },
  {
    key: 'OUT_FOR_DELIVERY',
    label: 'Out for Delivery',
    icon: Truck,
    color: 'blue',
    keys: ['OUT_FOR_DELIVERY'],
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    icon: CheckCircle2,
    color: 'green',
    keys: ['DELIVERED'],
  },
];

// Return flow: 4 friendly milestones
const RETURN_STATUSES = [
  {
    key: 'RETURN_REQUESTED',
    label: 'Return Initiated',
    icon: RotateCcw,
    color: 'yellow',
    keys: ['RETURN_REQUESTED', 'RETURN_APPROVED'],
  },
  {
    key: 'PICKUP_SCHEDULED',
    label: 'Order Picked Up',
    icon: Package,
    color: 'blue',
    keys: ['PICKUP_SCHEDULED', 'RETURNED'],
  },
  {
    key: 'REFUND_INITIATED',
    label: 'Payment Processed',
    icon: RefreshCw,
    color: 'orange',
    keys: ['REFUND_INITIATED'],
  },
  {
    key: 'REFUNDED',
    label: 'Payment Refunded',
    icon: CheckCircle2,
    color: 'green',
    keys: ['REFUNDED'],
  },
];

// Replacement flow: same 4-step structure but replacement-specific labels
const REPLACEMENT_STATUSES = [
  {
    key: 'RETURN_REQUESTED',
    label: 'Replacement Initiated',
    icon: RefreshCw,
    color: 'yellow',
    keys: ['RETURN_REQUESTED', 'RETURN_APPROVED'],
  },
  {
    key: 'PICKUP_SCHEDULED',
    label: 'Order Picked Up',
    icon: Package,
    color: 'blue',
    keys: ['PICKUP_SCHEDULED', 'RETURNED'],
  },
  {
    key: 'REFUND_INITIATED',
    label: 'Processing Replacement',
    icon: Zap,
    color: 'orange',
    keys: ['REFUND_INITIATED'],
  },
  {
    key: 'REFUNDED',
    label: 'Replacement Dispatched',
    icon: CheckCircle2,
    color: 'green',
    keys: ['REFUNDED'],
  },
];

const STATUS_BADGE: Record<string, string> = {
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

// ─── Action Modal (Cancel / Return) ────────────────────────────────────

function ActionModal({ type, onConfirm, onCancel, loading }: {
  type: 'return' | 'cancel';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const reasons = {
    cancel: ['Changed my mind', 'Found a better price', 'Ordered by mistake', 'Delivery too slow'],
    return: ['Wrong size/fit', 'Defective product', 'Not as described', 'Received wrong item'],
  };
  const title = { cancel: 'Cancel Order', return: 'Request Return' }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in slide-in-from-bottom-4">
        <h3 className="font-black text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">Please select a reason to proceed</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {reasons[type].map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border-2 text-left transition-colors ${
                reason === r ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:border-gray-200'
              }`}>{r}</button>
          ))}
        </div>

        <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Or type a custom reason..."
          className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none mb-4" />

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-11 border rounded-xl font-medium text-sm hover:bg-gray-50">Back</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason.trim() || loading}
            className={`flex-1 h-11 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors ${
              type === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
            }`}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Replacement Modal ───────────────────────────────────────────────

function ReplacementModal({ order, onConfirm, onCancel, loading }: {
  order: any;
  onConfirm: (reason: string, variantId?: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [stockChecking, setStockChecking] = useState(false);
  const [stockError, setStockError] = useState('');

  const currentVariantId = order?.items?.[0]?.variantId;
  const productSlug = order?.items?.[0]?.product?.slug;

  // Load all variants of the same product via slug
  useEffect(() => {
    if (!productSlug) return;
    setStockChecking(true);
    api.get(`/products/${productSlug}`)
      .then(({ data }) => setVariants(data.variants || []))
      .catch(() => {})
      .finally(() => setStockChecking(false));
  }, [productSlug]);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    if (selectedVariantId) {
      const v = variants.find(v => v.id === selectedVariantId);
      const available = (v?.stock ?? 0) - (v?.reservedStock ?? 0);
      if (available < 1) {
        setStockError(`Selected size is out of stock. Please choose another.`);
        return;
      }
    }
    setStockError('');
    onConfirm(reason, selectedVariantId || undefined);
  };

  const reasons = ['Wrong size delivered', 'Color not matching', 'Defective product', 'Missing item', 'Changed mind on size'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 max-h-[90vh] flex flex-col">

        <div className="p-6 border-b">
          <h3 className="font-black text-lg">Request Replacement</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Select new size and reason for replacement</p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Size picker */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Select New Size</p>
            {stockChecking ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking available sizes...
              </div>
            ) : variants.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {variants.map(v => {
                  const available = (v.stock ?? 0) - (v.reservedStock ?? 0);
                  const isCurrentSize = v.id === currentVariantId;
                  const isSelected = v.id === selectedVariantId;
                  const isOOS = available < 1;
                  return (
                    <button
                      key={v.id}
                      disabled={isOOS || isCurrentSize}
                      onClick={() => { setSelectedVariantId(v.id); setStockError(''); }}
                      className={`relative px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        isCurrentSize
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : isOOS
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                          : isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      {v.size || v.sku}
                      {isCurrentSize && <span className="ml-1 text-[10px] font-normal">(current)</span>}
                      {isOOS && !isCurrentSize && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-red-100 text-red-500 px-1 rounded font-bold">OOS</span>
                      )}
                      {!isOOS && !isCurrentSize && (
                        <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">{available} left</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No size options found. Your request will be handled by our team.</p>
            )}
            {stockError && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />{stockError}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Reason for Replacement</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {reasons.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border-2 text-left transition-colors ${
                    reason === r ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:border-gray-200'
                  }`}>{r}</button>
              ))}
            </div>
            <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Or type a custom reason..."
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {/* Summary */}
          {selectedVariantId && (() => {
            const v = variants.find(v => v.id === selectedVariantId);
            const cur = variants.find(v => v.id === currentVariantId);
            return v ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                <p className="font-bold text-amber-800">Replacement Summary</p>
                <p className="text-amber-700 text-xs mt-1">
                  {cur?.size || 'Current'} → {v.size || v.sku} &nbsp;·&nbsp; Stock available: {(v.stock ?? 0) - (v.reservedStock ?? 0)}
                </p>
                <p className="text-amber-600 text-xs mt-0.5">Stock will be swapped immediately upon confirmation.</p>
              </div>
            ) : null;
          })()}
        </div>

        <div className="p-6 border-t flex gap-3">
          <button onClick={onCancel} className="flex-1 h-11 border rounded-xl font-medium text-sm hover:bg-gray-50">Back</button>
          <button onClick={handleConfirm} disabled={!reason.trim() || loading}
            className="flex-1 h-11 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Replacement
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<'cancel' | 'return' | 'replace' | null>(null);
  const [toast, setToast] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const pollRef = useRef<any>(null);
  const [transitEvents, setTransitEvents] = useState<any[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${params.id}`);
      setOrder(data);
      if (data.awbCode) {
        try {
          const trackRes = await api.get(`/orders/${params.id}/track`);
          setTransitEvents(trackRes.data.events || []);
          if (trackRes.data.status && trackRes.data.status !== data.status) {
            data.status = trackRes.data.status;
          }
        } catch (err) {
          console.error('Failed to fetch transit details:', err);
        }
      }
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [params.id]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (params.id) fetchOrder();
  }, [params.id, isAuthenticated, router, fetchOrder]);

  // Polling for live updates until delivered/cancelled
  useEffect(() => {
    if (!order) return;
    const terminalStatuses = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (terminalStatuses.includes(order.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(fetchOrder, 30000); // poll every 30s
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [order?.status, fetchOrder]);

  const handleAction = async (type: 'cancel' | 'return', reason: string) => {
    setActionLoading(true);
    try {
      await api.post(`/orders/${order.id}/${type}`, { reason });
      await fetchOrder();
      showToast(`${type === 'cancel' ? 'Cancellation' : 'Return'} request submitted.`);
      setModal(null);
    } catch (e: any) {
      showToast(e.response?.data?.message || `Failed to ${type} order`);
    } finally { setActionLoading(false); }
  };

  const handleReplace = async (reason: string, replacementVariantId?: string) => {
    setActionLoading(true);
    try {
      await api.post(`/orders/${order.id}/replace`, { reason, replacementVariantId });
      await fetchOrder();
      showToast('Replacement request submitted. Our team will process it shortly.');
      setModal(null);
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to request replacement');
    } finally { setActionLoading(false); }
  };

  if (isLoading) return (
    <div className="container py-20 flex items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading order...
    </div>
  );
  if (!order) return <div className="container py-20 text-center text-muted-foreground">Order not found</div>;

  const isCancelled = order.status === 'CANCELLED';
  const isReturnFlow = ['RETURN_REQUESTED','RETURN_APPROVED','PICKUP_SCHEDULED','RETURNED','REFUND_INITIATED','REFUNDED'].includes(order.status);
  // Detect replacement: returnReason starts with 'REPLACEMENT:'
  const isReplacementFlow = isReturnFlow && order.returnReason?.startsWith?.('REPLACEMENT:');
  const isDelivered = order.status === 'DELIVERED';
  // Allow cancel until order is packed (inclusive) — admin can cancel any time
  const canCancel = ['PENDING_PAYMENT','PAYMENT_VERIFIED','CONFIRMED','INVENTORY_RESERVED','PROCESSING','PICKING'].includes(order.status);

  // Return/Replace eligibility
  const firstItem = order.items?.[0];
  const itemReturnEnabled = firstItem?.returnEnabled !== false;
  const itemReplaceEnabled = firstItem?.replaceEnabled !== false;
  const itemReturnDays = firstItem?.returnDays ?? 14;
  const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
  const daysSince = deliveredAt ? Math.floor((Date.now() - deliveredAt.getTime()) / 86400000) : null;
  const canReturn = isDelivered && itemReturnEnabled && daysSince !== null && daysSince <= itemReturnDays;
  const canReplace = isDelivered && itemReplaceEnabled && daysSince !== null && daysSince <= itemReturnDays;
  const returnExpired = isDelivered && itemReturnEnabled && daysSince !== null && daysSince > itemReturnDays;

  // Timeline — pick the right set based on flow
  const activeStatuses = isReturnFlow
    ? (isReplacementFlow ? REPLACEMENT_STATUSES : RETURN_STATUSES)
    : ALL_STATUSES;

  // currentIdx: find which step the current status belongs to
  const currentIdx = activeStatuses.findIndex(s => s.keys.includes(order.status));

  // History lookup helper — returns the earliest history entry for any key in the step
  const getHistoryEntry = (keys: string[]) =>
    keys
      .map(k => order.statusHistory?.find((h: any) => h.toStatus === k))
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

  return (
    <div className="container py-8 max-w-4xl">
      <Link href="/profile" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to My Orders
      </Link>

      {toast && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-outfit font-black">Order #{order.orderNumber}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm flex items-center gap-2">
            Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            {!['DELIVERED','CANCELLED','REFUNDED'].includes(order.status) && (
              <span className="flex items-center gap-1 text-primary text-xs font-medium animate-pulse">
                <Bell className="w-3 h-3" /> Live tracking
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-xs font-black border ${STATUS_BADGE[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {order.status.replace(/_/g, ' ')}
          </span>
          {canCancel && (
            <button onClick={() => setModal('cancel')} disabled={actionLoading}
              className="px-4 py-1.5 text-sm font-bold text-red-600 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
              Cancel
            </button>
          )}
          {canReturn && (
            <button onClick={() => setModal('return')} disabled={actionLoading}
              className="px-4 py-1.5 text-sm font-bold text-orange-600 border border-orange-200 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Return
            </button>
          )}
          {canReplace && (
            <button onClick={() => setModal('replace')} disabled={actionLoading}
              className="px-4 py-1.5 text-sm font-bold text-teal-600 border border-teal-200 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Replace
            </button>
          )}
        </div>
      </div>

      {/* Return Window Notice */}
      {isDelivered && !isReturnFlow && (
        <div className={`mb-5 px-4 py-3 rounded-xl border text-sm flex items-start gap-3 ${
          canReturn ? 'bg-green-50 border-green-200 text-green-800' :
          returnExpired ? 'bg-gray-50 border-gray-200 text-gray-500' :
          'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${canReturn ? 'text-green-600' : 'text-gray-400'}`} />
          <p>
            {canReturn && <><strong>{itemReturnDays - (daysSince || 0)} days left</strong> to return or replace this order.</>}
            {returnExpired && <>Return window of <strong>{itemReturnDays} days</strong> has expired.</>}
            {!itemReturnEnabled && !returnExpired && <>This product is not eligible for returns.</>}
          </p>
        </div>
      )}

      {/* Main tracking card */}
      <div className="bg-white border rounded-2xl shadow-sm mb-6 overflow-hidden">
        {/* Status Banner */}
        {isCancelled && (
          <div className="flex items-center gap-3 text-red-700 bg-red-50 p-5 border-b border-red-100">
            <XCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">Order Cancelled</p>
              {order.cancelReason && <p className="text-sm opacity-80 mt-0.5">Reason: {order.cancelReason}</p>}
            </div>
          </div>
        )}

        {isReturnFlow && (
          <div className={`flex items-center gap-3 p-5 border-b ${STATUS_BADGE[order.status] || ''}`}>
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">{order.status.replace(/_/g, ' ')}</p>
              {order.status === 'RETURN_REQUESTED' && <p className="text-sm mt-0.5 opacity-80">Your request is under review. We'll notify you shortly.</p>}
              {order.status === 'RETURN_APPROVED' && <p className="text-sm mt-0.5 opacity-80">Return approved! Pickup will be scheduled soon.</p>}
              {order.status === 'PICKUP_SCHEDULED' && order.pickupSlot && <p className="text-sm mt-0.5 opacity-80">Pickup scheduled: {order.pickupSlot}</p>}
              {order.status === 'RETURNED' && <p className="text-sm mt-0.5 opacity-80">Item returned. Refund will be processed shortly.</p>}
              {order.status === 'REFUND_INITIATED' && <p className="text-sm mt-0.5 opacity-80">Refund initiated. You'll receive it within 5-7 business days.</p>}
              {order.status === 'REFUNDED' && <p className="text-sm mt-0.5 opacity-80">Refund successfully processed to your original payment method.</p>}
              {order.returnReason && <p className="text-xs mt-1 opacity-70">Reason: {order.returnReason}</p>}
            </div>
          </div>
        )}

        {/* Order Timeline */}
        {!isCancelled && (
          <div className="p-5 md:p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-base">Order Timeline</h2>
              <button onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-primary hover:underline font-medium">
                {showHistory ? 'Hide' : 'View'} history
              </button>
            </div>

            {/* Compact stepper for mobile, horizontal for desktop */}
            <div className="hidden md:flex items-start overflow-x-auto pb-2 gap-0">
              {activeStatuses.map((step, i) => {
                const Icon = step.icon;
                const done = i <= currentIdx;
                const active = i === currentIdx;
                const histEntry = getHistoryEntry(step.keys);
                return (
                  <div key={step.key} className="flex items-start flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div title={step.label}
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all cursor-default ${
                          done ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' : 'bg-white border-gray-200 text-gray-300'
                        } ${active ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className={`text-[9px] text-center font-semibold w-16 leading-tight ${done ? 'text-foreground' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {histEntry && (
                        <p className="text-[8px] text-gray-400 text-center w-16">
                          {new Date(histEntry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    {i < activeStatuses.length - 1 && (
                      <div className={`flex-1 h-0.5 mt-4 mx-1 transition-colors ${i < currentIdx ? 'bg-primary' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile vertical timeline */}
            <div className="md:hidden space-y-0">
              {activeStatuses.map((step, i) => {
                const Icon = step.icon;
                const done = i <= currentIdx;
                const active = i === currentIdx;
                const histEntry = getHistoryEntry(step.keys);
                return (
                  <div key={step.key} className="flex gap-3 relative">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 ${
                        done ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-300'
                      } ${active ? 'ring-4 ring-primary/15' : ''}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {i < activeStatuses.length - 1 && (
                        <div className={`w-0.5 flex-1 my-1 ${i < currentIdx ? 'bg-primary' : 'bg-gray-200'}`} style={{ minHeight: '24px' }} />
                      )}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${done ? 'text-foreground' : 'text-gray-400'}`}>{step.label}</p>
                      {histEntry && <p className="text-xs text-muted-foreground mt-0.5">{new Date(histEntry.createdAt).toLocaleString('en-IN')}</p>}
                      {histEntry?.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{histEntry.notes}"</p>}
                      {active && !done && <p className="text-[10px] text-primary font-medium mt-0.5 animate-pulse">In progress…</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full history log */}
            {showHistory && order.statusHistory?.length > 0 && (
              <div className="mt-6 border-t pt-5">
                <h3 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider">Full Audit Log</h3>
                <div className="space-y-3">
                  {order.statusHistory.map((h: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {h.fromStatus && <span className="text-muted-foreground">{h.fromStatus.replace(/_/g,' ')} → </span>}
                          {h.toStatus.replace(/_/g,' ')}
                        </p>
                        {h.notes && <p className="text-xs text-muted-foreground mt-0.5">"{h.notes}"</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {h.actorRole || 'System'} · {new Date(h.createdAt).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking / delivery info */}
            {order.awbCode && (
              <div className="mt-5 pt-4 border-t flex items-center gap-3 text-sm flex-wrap">
                <Truck className="w-4 h-4 text-primary shrink-0" />
                {order.courierName && <span className="font-medium">{order.courierName}</span>}
                <span className="text-muted-foreground">AWB: <strong className="font-mono text-foreground">{order.awbCode}</strong></span>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-primary font-bold hover:underline flex items-center gap-1 ml-auto">
                    Track Package <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Live transit details */}
            {order.awbCode && transitEvents.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-primary" /> Live Shipment Transit Logs
                </h3>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                  {transitEvents.map((ev, i) => (
                    <div key={i} className="flex gap-3 relative pb-4 last:pb-0 border-l border-gray-150 pl-4 ml-1.5">
                      <div className={`absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full ${i === 0 ? 'bg-primary animate-pulse' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground leading-snug">{ev.status}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(ev.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ev.description}</p>
                        {ev.location && (
                          <p className="text-[10px] text-primary/80 font-bold mt-1">📍 {ev.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isCancelled && !isReturnFlow && order.status !== 'DELIVERED' && (
              <p className="text-center text-sm text-muted-foreground mt-5">
                {order.estimatedDelivery
                  ? <>Expected by <strong className="text-foreground">{new Date(order.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</strong></>
                  : 'Estimated delivery: Within 5-7 business days'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Items + Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Items */}
        <div className="md:col-span-2 bg-white border rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-base mb-4">Items ({order.items?.length})</h2>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                <div className="relative w-[70px] h-[85px] rounded-xl overflow-hidden bg-muted/20 shrink-0">
                  {(item.imageUrl || item.product?.images?.[0]) && (
                    <Image src={item.imageUrl || item.product.images[0]} alt={item.productName} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-snug">{item.productName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.sku && <span className="font-mono">SKU: {item.sku} · </span>}
                    {item.variantInfo?.size && `Size: ${item.variantInfo.size}`}
                    {item.variantInfo?.color && ` · ${item.variantInfo.color}`}
                    {` · Qty: ${item.quantity}`}
                  </p>
                  <p className="font-bold mt-1.5 text-primary text-sm">{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</p>
                  {/* Fulfillment badges */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {item.isPicked && <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-medium">✓ Picked</span>}
                    {item.isPacked && <span className="text-[10px] text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full font-medium">✓ Packed</span>}
                    {item.returnEnabled !== false ? (
                      <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full font-medium">{item.returnDays || 14}d Return</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">No Return</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold mb-4 text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Payment Summary</h2>
            <div className="space-y-2 text-sm">

              {/* Subtotal */}
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.subtotal) || Number(order.totalAmount) || 0)}</span>
              </div>

              {/* Coupon discount */}
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Coupon {order.couponCode && <span className="text-xs bg-green-50 border border-green-200 rounded px-1.5 py-0.5 font-mono ml-1">{order.couponCode}</span>}</span>
                  <span>− {formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                {Number(order.shippingCharge) > 0
                  ? <span>{formatPrice(Number(order.shippingCharge))}</span>
                  : <span className="text-green-600 font-bold">FREE</span>
                }
              </div>

              {/* Gift wrap */}
              {Number(order.giftCharge) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Gift Packaging</span>
                  <span>{formatPrice(Number(order.giftCharge))}</span>
                </div>
              )}

              {/* Platform fee (if stored in notes — backend doesn't store separately yet) */}
              {order.platformFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Fee</span>
                  <span>{formatPrice(Number(order.platformFee))}</span>
                </div>
              )}

              {/* COD charge */}
              {order.paymentMethod === 'COD' && Number(order.codCharges) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>COD Charges</span>
                  <span>{formatPrice(Number(order.codCharges))}</span>
                </div>
              )}

              {/* GST */}
              {Number(order.gstAmount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST</span>
                  <span>{formatPrice(Number(order.gstAmount))}</span>
                </div>
              )}

              {/* Total */}
              <div className="pt-2 border-t flex justify-between font-black text-base">
                <span>Total</span>
                <span>{formatPrice(Number(order.totalAmount))}</span>
              </div>

              {/* Savings badge */}
              {Number(order.discountAmount) > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-1.5 flex items-center gap-1.5 mt-1">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-green-700 font-bold">You saved {formatPrice(Number(order.discountAmount))}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">Payment</p>
              <p className="text-sm font-medium">{order.paymentMethod === 'RAZORPAY' ? 'Online (Razorpay)' : 'Cash on Delivery'}</p>
              <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold mb-3 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Delivery Address</h2>
            {order.address ? (
              <div className="text-sm space-y-0.5">
                <p className="font-bold">{order.address.name}</p>
                <p className="text-muted-foreground">{order.address.line1}</p>
                {order.address.line2 && <p className="text-muted-foreground">{order.address.line2}</p>}
                <p className="text-muted-foreground">{order.address.city}, {order.address.state} — {order.address.pincode}</p>
                <p className="font-medium mt-2">{order.address.phone}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">No address</p>}
          </div>

          {/* Warehouse info (if assigned) */}
          {order.warehouse && (
            <div className="bg-white border rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold mb-2 text-sm flex items-center gap-2"><Warehouse className="w-4 h-4 text-primary" /> Fulfillment Center</h2>
              <p className="text-sm font-medium">{order.warehouse.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{order.warehouse.code}</p>
            </div>
          )}

          {/* Trust badge */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <ShieldCheck className="w-4 h-4" /> 100% Authentic & Secure
            </div>
          </div>
        </div>
      </div>

      {/* Cancel / Return Modal */}
      {modal && modal !== 'replace' && (
        <ActionModal
          type={modal as 'cancel' | 'return'}
          loading={actionLoading}
          onCancel={() => setModal(null)}
          onConfirm={async (reason) => {
            if (modal === 'cancel') await handleAction('cancel', reason);
            else await handleAction('return', reason);
          }}
        />
      )}

      {/* Replacement Modal */}
      {modal === 'replace' && (
        <ReplacementModal
          order={order}
          loading={actionLoading}
          onCancel={() => setModal(null)}
          onConfirm={handleReplace}
        />
      )}
    </div>
  );
}
