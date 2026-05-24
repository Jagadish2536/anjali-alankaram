'use client';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Search, X, Package, MapPin, CreditCard, Check, Clock, Truck,
  CheckCircle2, XCircle, RotateCcw, Loader2, RefreshCw, History,
  PackageCheck, ArrowRight, Eye, Printer, QrCode, ScanLine,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

// ── Delivery Partners ────────────────────────────────────────────
const DELIVERY_PARTNERS = [
  { id: 'india_post', name: 'India Post', trackingBase: 'https://www.indiapost.gov.in/VAS/Pages/trackconsignment.aspx' },
  { id: 'dtdc',       name: 'DTDC',       trackingBase: 'https://www.dtdc.in/tracking.asp' },
  { id: 'bluedart',   name: 'BlueDart',   trackingBase: 'https://www.bluedart.com/tracking' },
  { id: 'delhivery',  name: 'Delhivery',  trackingBase: 'https://www.delhivery.com/track/' },
  { id: 'ekart',      name: 'Ekart',      trackingBase: 'https://ekartlogistics.com/shipmenttrack/' },
  { id: 'xpressbees', name: 'XpressBees', trackingBase: 'https://www.xpressbees.com/shipment/tracking' },
  { id: 'other',      name: 'Other',      trackingBase: '' },
];

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

const ADMIN_ORDER_STEPS = [
  { label: 'Order Placed',     keys: ['PENDING_PAYMENT', 'PAYMENT_VERIFIED'] },
  { label: 'Confirmed',        keys: ['CONFIRMED', 'INVENTORY_RESERVED', 'PROCESSING', 'PICKING'] },
  { label: 'Packed',           keys: ['PACKED', 'READY_FOR_SHIPMENT'] },
  { label: 'Shipped',          keys: ['SHIPPED'] },
  { label: 'In Transit',       keys: ['IN_TRANSIT'] },
  { label: 'Out for Delivery', keys: ['OUT_FOR_DELIVERY'] },
  { label: 'Delivered',        keys: ['DELIVERED'] },
];

const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT:    ['PAYMENT_VERIFIED', 'CANCELLED'],
  PAYMENT_VERIFIED:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:          ['PACKED', 'CANCELLED'],
  INVENTORY_RESERVED: ['PACKED', 'CANCELLED'],
  PROCESSING:         ['PACKED', 'CANCELLED'],
  PICKING:            ['PACKED', 'CANCELLED'],
  PACKED:             ['SHIPPED'],       // must go through assign-courier modal
  SHIPPED:            ['IN_TRANSIT', 'OUT_FOR_DELIVERY'],
  IN_TRANSIT:         ['OUT_FOR_DELIVERY', 'DELIVERED'],
  OUT_FOR_DELIVERY:   ['DELIVERED'],
  DELIVERED:          [],
  RETURN_REQUESTED:   ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED:    ['PICKUP_SCHEDULED'],
  PICKUP_SCHEDULED:   ['RETURNED'],
  RETURNED:           ['REFUND_INITIATED'],
  REFUND_INITIATED:   ['REFUNDED'],
};

const STATUS_FILTER_TABS = [
  'ALL', 'PENDING_PAYMENT', 'CONFIRMED', 'PACKED', 'SHIPPED',
  'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'REFUNDED',
];

const ALL_STATUSES = [
  'PENDING_PAYMENT','PAYMENT_VERIFIED','CONFIRMED','INVENTORY_RESERVED','PROCESSING',
  'PICKING','PACKED','READY_FOR_SHIPMENT','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY',
  'DELIVERED','CANCELLED','RETURN_REQUESTED','RETURN_APPROVED','RETURN_REJECTED',
  'PICKUP_SCHEDULED','RETURNED','REFUND_INITIATED','REFUNDED',
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-full border ${STATUS_COLOR[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ── History Panel ─────────────────────────────────────────────────
function HistoryPanel({ orderId }: { orderId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/orders/admin/${orderId}/history`)
      .then(r => setHistory(r.data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [orderId]);
  if (loading) return <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>;
  return (
    <div className="space-y-3 py-2 max-h-48 overflow-y-auto">
      {history.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>
        : history.map((h, i) => (
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
                {h.actorRole || 'SYSTEM'} · {new Date(h.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}

// ── Print Label ────────────────────────────────────────────────────
function printOrderLabel(order: any) {
  const w = window.open('', '_blank', 'width=600,height=800');
  if (!w) return;
  const items = (order.items || []).map((it: any) =>
    `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;">${it.productName}</td>
     <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">${(it.variantInfo?.size || '')}${it.variantInfo?.color ? ' / ' + it.variantInfo.color : ''}</td>
     <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
     <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:right;">₹${Number(it.totalPrice || it.unitPrice * it.quantity).toLocaleString('en-IN')}</td></tr>`
  ).join('');
  w.document.write(`<!DOCTYPE html><html><head><title>Order Label — ${order.orderNumber}</title>
  <style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:24px;}
  h2{margin:0 0 4px;font-size:18px;}
  .section{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:12px 0;}
  .label{font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280;letter-spacing:.05em;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th{background:#f3f4f6;padding:6px 8px;font-size:11px;text-align:left;border:1px solid #e5e7eb;}
  .total-row td{font-weight:700;border-top:2px solid #111;}
  .divider{border:none;border-top:2px dashed #e5e7eb;margin:16px 0;}
  @media print{button{display:none;}}
  </style></head><body>
  <button onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#8B0030;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;">🖨 Print Label</button>
  <div style="border:2px solid #111;border-radius:8px;padding:20px;">
    <h2>📦 Anjali Alankaram</h2>
    <p style="margin:0;font-size:12px;color:#6b7280;">Order Management Label</p>
    <hr class="divider"/>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="section">
        <div class="label">Order Info</div>
        <p style="margin:6px 0;font-size:16px;font-weight:700;font-family:monospace;">#${order.orderNumber}</p>
        <p style="margin:2px 0;font-size:12px;">Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <p style="margin:2px 0;font-size:12px;">Payment: ${order.paymentMethod === 'RAZORPAY' ? 'Online (Paid)' : 'Cash on Delivery'}</p>
        ${order.awbCode ? `<p style="margin:6px 0;font-size:12px;"><strong>AWB:</strong> ${order.awbCode}</p>` : ''}
        ${order.courierName ? `<p style="margin:2px 0;font-size:12px;"><strong>Courier:</strong> ${order.courierName}</p>` : ''}
      </div>
      <div class="section">
        <div class="label">Customer</div>
        <p style="margin:6px 0;font-weight:700;">${order.user?.name || 'Customer'}</p>
        <p style="margin:2px 0;font-size:12px;">${order.user?.phone || ''}</p>
        <p style="margin:2px 0;font-size:12px;">${order.user?.email || ''}</p>
      </div>
    </div>
    <div class="section">
      <div class="label">📍 Delivery Address</div>
      <p style="margin:6px 0;font-weight:700;font-size:15px;">${order.address?.name || ''}</p>
      <p style="margin:2px 0;">${order.address?.line1 || ''}${order.address?.line2 ? ', ' + order.address.line2 : ''}</p>
      <p style="margin:2px 0;">${order.address?.city || ''}, ${order.address?.state || ''} — <strong>${order.address?.pincode || ''}</strong></p>
      <p style="margin:6px 0;font-size:15px;font-weight:700;">📞 ${order.address?.phone || ''}</p>
    </div>
    <div class="section">
      <div class="label">Order Items</div>
      <table>
        <thead><tr>
          <th>Product</th><th style="text-align:center;">Variant</th>
          <th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th>
        </tr></thead>
        <tbody>${items}
        <tr class="total-row">
          <td colspan="3" style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">Total</td>
          <td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">₹${Number(order.totalAmount).toLocaleString('en-IN')}</td>
        </tr></tbody>
      </table>
    </div>
  </div>
  </body></html>`);
  w.document.close();
}

// ── Assign Courier Modal ──────────────────────────────────────────
function AssignCourierModal({ order, onClose, onAssigned }: {
  order: any;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [courier, setCourier] = useState('');
  const [awb, setAwb] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const awbRef = useRef<HTMLInputElement>(null);

  const selectedPartner = DELIVERY_PARTNERS.find(p => p.id === courier);

  const handleScanFocus = () => {
    setScanning(true);
    awbRef.current?.focus();
  };

  const handleAssign = async () => {
    if (!courier) { setError('Please select a delivery partner'); return; }
    if (!awb.trim()) { setError('Please enter or scan the AWB / tracking number'); return; }
    setLoading(true);
    setError('');
    try {
      await api.put(`/orders/admin/${order.id}/assign-courier`, {
        courierName: selectedPartner?.name || courier,
        awbCode: awb.trim(),
        trackingUrl: trackingUrl || (selectedPartner?.trackingBase ? `${selectedPartner.trackingBase}?awb=${awb.trim()}` : ''),
        notes: `Dispatched via ${selectedPartner?.name || courier}. AWB: ${awb.trim()}`,
      });
      onAssigned();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to assign courier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-base">Assign Delivery Partner</h3>
            <p className="text-xs text-muted-foreground">Order #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Courier Select */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Delivery Partner *</label>
            <div className="grid grid-cols-2 gap-2">
              {DELIVERY_PARTNERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setCourier(p.id)}
                  className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-left ${
                    courier === p.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* AWB / Tracking Number + Barcode Scanner */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">
              AWB / Tracking Number *
            </label>
            <div className="flex gap-2">
              <input
                ref={awbRef}
                value={awb}
                onChange={e => { setAwb(e.target.value); setScanning(false); }}
                placeholder={scanning ? '▌ Scan barcode now…' : 'Enter or scan AWB code'}
                className={`flex-1 border-2 rounded-xl px-3 py-2.5 text-sm outline-none transition-all ${
                  scanning ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-mono' : 'border-border focus:border-primary'
                }`}
                autoComplete="off"
              />
              <button
                onClick={handleScanFocus}
                title="Click then scan barcode with USB scanner"
                className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all ${
                  scanning ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary hover:text-primary'
                }`}
              >
                <ScanLine className="w-4 h-4" />
              </button>
            </div>
            {scanning && (
              <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                <ScanLine className="w-3 h-3 animate-pulse" />
                Ready for barcode scanner — scan now or type manually
              </p>
            )}
          </div>

          {/* Tracking URL */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Tracking URL (auto-filled)</label>
            <input
              value={trackingUrl || (selectedPartner?.trackingBase && awb ? `${selectedPartner.trackingBase}?awb=${awb}` : '')}
              onChange={e => setTrackingUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border-2 border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 h-11 rounded-xl border-2 border-border text-sm font-bold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Mark as Shipped
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order Detail Slide Panel ───────────────────────────────────────
function OrderDetailPanel({ order, onClose, onStatusUpdate, onRefresh }: {
  order: any;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string, extra?: any) => Promise<void>;
  onRefresh: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [notes, setNotes] = useState('');
  const [pickupSlot, setPickupSlot] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState('');
  const [showCourierModal, setShowCourierModal] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const nextStatuses = NEXT_STATUS[order.status] || [];

  const handleUpdate = async (status: string) => {
    if (status === 'SHIPPED') { setShowCourierModal(true); return; }
    setUpdating(true);
    try {
      await onStatusUpdate(order.id, status, {
        cancelReason: cancelReason || undefined,
        notes: notes || undefined,
        pickupSlot: pickupSlot || undefined,
      });
      showToast(`Status → ${status.replace(/_/g, ' ')}`);
      setSelectedStatus('');
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Update failed');
    } finally { setUpdating(false); }
  };

  const curIdx = ADMIN_ORDER_STEPS.findIndex(s => s.keys.includes(order.status));
  const isReturnFlow = ['RETURN_REQUESTED','RETURN_APPROVED','PICKUP_SCHEDULED','RETURNED','REFUND_INITIATED','REFUNDED'].includes(order.status);

  return (
    <>
      {showCourierModal && (
        <AssignCourierModal
          order={order}
          onClose={() => setShowCourierModal(false)}
          onAssigned={() => { onRefresh(); showToast('Order shipped! Tracking assigned.'); }}
        />
      )}
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="ml-auto relative bg-white w-full max-w-xl shadow-2xl overflow-y-auto h-full">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b bg-white/95 backdrop-blur-sm">
            <div>
              <h2 className="font-black text-sm sm:text-base">Order #{order.orderNumber}</h2>
              <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => printOrderLabel(order)}
                title="Print shipping label"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print Label
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {toast && (
            <div className="mx-4 sm:mx-6 mt-4 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" /> {toast}
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-5">
            {/* Status + History toggle */}
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

            {/* Timeline */}
            {!isReturnFlow && order.status !== 'CANCELLED' && (
              <div className="bg-gray-50 rounded-xl p-4 border overflow-x-auto">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Order Timeline</p>
                <div className="flex items-center min-w-max">
                  {ADMIN_ORDER_STEPS.map((step, i) => {
                    const done = i <= curIdx;
                    const active = i === curIdx;
                    return (
                      <div key={step.label} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                            done ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-400'
                          } ${active ? 'ring-2 ring-primary/30 scale-110' : ''}`}>
                            {done ? <Check className="w-3 h-3" /> : <span className="text-[9px] font-black">{i + 1}</span>}
                          </div>
                          <p className={`text-[9px] text-center leading-tight w-12 font-medium ${done ? 'text-primary' : 'text-gray-400'}`}>{step.label}</p>
                        </div>
                        {i < ADMIN_ORDER_STEPS.length - 1 && (
                          <div className={`w-8 h-0.5 mx-1 mb-4 shrink-0 ${i < curIdx ? 'bg-primary' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {order.user?.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="font-bold text-sm">{order.user?.name || 'Customer'}</p>
                  <p className="text-xs text-muted-foreground">{order.user?.phone} {order.user?.email && `· ${order.user.email}`}</p>
                </div>
              </div>
            </div>

            {/* Delivery Address — prominent for packing */}
            {order.address && (
              <div className="border-2 border-primary/20 bg-primary/5 rounded-xl p-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Delivery Address (stick on package)
                </p>
                <p className="font-black text-base">{order.address.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{order.address.line1}{order.address.line2 && `, ${order.address.line2}`}</p>
                <p className="text-sm text-muted-foreground">{order.address.city}, {order.address.state} — <strong className="text-foreground">{order.address.pincode}</strong></p>
                <p className="text-base font-bold text-foreground mt-1.5">📞 {order.address.phone}</p>
              </div>
            )}

            {/* Tracking info (if shipped) */}
            {order.awbCode && (
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                <p className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Truck className="w-3 h-3" /> Shipping Info
                </p>
                <p className="text-sm"><strong>Courier:</strong> {order.courierName}</p>
                <p className="text-sm font-mono mt-1"><strong>AWB:</strong> {order.awbCode}</p>
                {order.trackingUrl && (
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-cyan-700 underline mt-1 block">Track shipment →</a>
                )}
              </div>
            )}

            {/* Items */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Items ({order.items?.length})</p>
              <div className="space-y-3">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {(item.imageUrl || item.product?.images?.[0]) && (
                      <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-muted/20 shrink-0">
                        <Image src={item.imageUrl || item.product.images[0]} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantInfo?.size} {item.variantInfo?.color && `· ${item.variantInfo.color}`} · Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-black shrink-0">{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" /> Payment
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-green-600"><span>Discount {order.couponCode && `(${order.couponCode})`}</span><span>-{formatPrice(order.discountAmount)}</span></div>
                )}
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{Number(order.shippingCharge) > 0 ? formatPrice(order.shippingCharge) : 'Free'}</span></div>
                <div className="flex justify-between font-black border-t pt-1.5"><span>Total</span><span>{formatPrice(order.totalAmount)}</span></div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">{order.paymentMethod === 'RAZORPAY' ? 'Online (Razorpay)' : 'Cash on Delivery'}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin note */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Admin Note</p>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Note about this status change..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>

            {/* Cancel reason */}
            {nextStatuses.includes('CANCELLED') && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cancel Reason</p>
                <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            )}

            {/* Pickup slot */}
            {order.status === 'RETURN_APPROVED' && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Pickup Slot</p>
                <input value={pickupSlot} onChange={e => setPickupSlot(e.target.value)}
                  placeholder="e.g. 25 May, 10AM–12PM"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            )}

            {/* Next action buttons */}
            {nextStatuses.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {nextStatuses.map(status => (
                    <button key={status} onClick={() => handleUpdate(status)} disabled={updating}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors disabled:opacity-50 ${
                        status === 'CANCELLED' || status === 'RETURN_REJECTED'
                          ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                          : status === 'SHIPPED'
                          ? 'border-primary bg-primary text-white hover:bg-primary/90'
                          : 'border-primary/20 text-primary bg-primary/5 hover:bg-primary/10'
                      }`}>
                      {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {status === 'SHIPPED' && <Truck className="w-3.5 h-3.5" />}
                      {status === 'SHIPPED' ? 'Assign & Ship' : status.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
                {nextStatuses.includes('SHIPPED') && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    "Assign & Ship" opens delivery partner selection with barcode scanner support
                  </p>
                )}
              </div>
            )}

            {/* Force override */}
            <details className="border rounded-xl overflow-hidden">
              <summary className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-gray-50">
                ⚠ Force Status Override (Admin)
              </summary>
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                    className="flex-1 border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary bg-white">
                    <option value="">Select any status…</option>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                  <button onClick={() => selectedStatus && handleUpdate(selectedStatus)} disabled={!selectedStatus || updating}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-primary/90 flex items-center gap-2">
                    {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Apply
                  </button>
                </div>
                <p className="text-[10px] text-red-500 mt-1.5">Bypasses normal workflow rules — use carefully</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────
function AdminOrdersContent() {
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
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-outfit font-black flex items-center gap-2">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Order Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{total} total orders</p>
          </div>
          <button onClick={() => fetchOrders(page)}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-sm border rounded-xl hover:bg-white transition-colors bg-white shadow-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Status Filter Tabs — horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          {STATUS_FILTER_TABS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors shrink-0 ${
                statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-muted-foreground hover:border-gray-300'
              }`}>{s === 'ALL' ? 'All Orders' : s.replace(/_/g, ' ')}</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by order#, customer name or phone…"
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Orders — Table on desktop, Cards on mobile */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading orders…
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-lg">No orders found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {orders.map(order => (
                <div key={order.id} className="bg-white border rounded-xl p-4 shadow-sm" onClick={() => setSelectedOrder(order)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold font-mono text-xs">#{order.orderNumber}</p>
                      <p className="font-medium text-sm mt-0.5">{order.user?.name || 'Customer'}</p>
                      <p className="text-xs text-muted-foreground">{order.user?.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black">{formatPrice(order.totalAmount)}</p>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {order.paymentMethod === 'RAZORPAY' ? 'Online' : 'COD'}</span>
                    <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  {order.awbCode && <p className="text-[10px] text-muted-foreground font-mono mt-1">AWB: {order.awbCode} · {order.courierName}</p>}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          <p className="font-bold font-mono text-xs">{order.orderNumber}</p>
                          {order.awbCode && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">AWB: {order.awbCode}</p>}
                          {order.courierName && <p className="text-[10px] text-muted-foreground">{order.courierName}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{order.user?.name || 'Customer'}</p>
                          <p className="text-xs text-muted-foreground">{order.user?.phone || order.user?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                          <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                            {order.items?.[0]?.productName}{order.items?.length > 1 && ` +${order.items.length - 1}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-black">{formatPrice(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs">{order.paymentMethod === 'RAZORPAY' ? 'Online' : 'COD'}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setSelectedOrder(order)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
                              <Eye className="w-3 h-3" /> Manage
                            </button>
                            <button onClick={() => printOrderLabel(order)}
                              className="p-1.5 text-muted-foreground hover:text-foreground border rounded-lg hover:bg-gray-50 transition-colors" title="Print label">
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">{total} orders</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1}
                      className="px-3 py-1.5 text-xs font-bold border rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
                    <span className="text-xs text-muted-foreground px-2">Page {page} of {totalPages}</span>
                    <button onClick={() => fetchOrders(page + 1)} disabled={page >= totalPages}
                      className="px-3 py-1.5 text-xs font-bold border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile pagination */}
            {totalPages > 1 && (
              <div className="flex sm:hidden items-center justify-between mt-4">
                <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1}
                  className="px-4 py-2 text-xs font-bold border rounded-xl disabled:opacity-40 bg-white">← Previous</button>
                <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
                <button onClick={() => fetchOrders(page + 1)} disabled={page >= totalPages}
                  className="px-4 py-2 text-xs font-bold border rounded-xl disabled:opacity-40 bg-white">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
          onRefresh={() => fetchOrders(page)}
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
