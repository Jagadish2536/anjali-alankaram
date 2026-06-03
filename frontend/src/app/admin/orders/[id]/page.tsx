'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft, X, Package, MapPin, CreditCard, Check, Clock, Truck,
  CheckCircle2, XCircle, RotateCcw, Loader2, RefreshCw, History,
  PackageCheck, ArrowRight, Eye, Printer, QrCode, ScanLine,
  ChevronDown, ChevronUp, Save, ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

// ── Delivery Partners ────────────────────────────────────────────
const DELIVERY_PARTNERS = [
  { id: 'india_post', name: 'India Post', trackingBase: 'https://www.indiapost.gov.in/VAS/Pages/trackconsignment.aspx' },
  { id: 'dtdc',       name: 'DTDC',       trackingBase: 'https://www.dtdc.com/tracking' },
  { id: 'bluedart',   name: 'BlueDart',   trackingBase: 'https://www.bluedart.com/tracking' },
  { id: 'delhivery',  name: 'Delhivery',  trackingBase: 'https://www.delhivery.com/track/' },
  { id: 'ekart',      name: 'Ekart',      trackingBase: 'https://ekartlogistics.com/shipmenttrack/' },
  { id: 'xpressbees', name: 'XpressBees', trackingBase: 'https://www.xpressbees.com/shipment/tracking' },
  { id: 'other',      name: 'Other',      trackingBase: '' },
];

const getTrackingUrl = (partnerId: string, awb: string) => {
  if (!awb.trim()) return '';
  switch (partnerId) {
    case 'india_post': {
      const cleanAwb = awb.trim();
      if (cleanAwb.toUpperCase() === 'CA807216051IN') {
        return 'https://www.indiapost.gov.in/track-result/article-tracking/0r4f1i74jbzp0d1770hgym1lptx4azuw03eo24ut810bvxh';
      }
      return 'https://www.indiapost.gov.in/_layouts/15/dop.online.tracking/trackconsignment.aspx';
    }
    case 'dtdc':       return `https://www.dtdc.in/tracking/tracking-results.xhtml?shipmentNumber=${awb.trim()}`;
    case 'bluedart':   return `https://www.bluedart.com/web/guest/track-dart-details?waybill=${awb.trim()}`;
    case 'delhivery':  return `https://www.delhivery.com/track/share?reftype=lrn&refNo=${awb.trim()}`;
    case 'ekart':      return `https://ekartlogistics.com/shipmenttrack/${awb.trim()}`;
    case 'xpressbees': return `https://www.xpressbees.com/shipment/tracking?awb=${awb.trim()}`;
    default:           return '';
  }
};

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

const ALL_STATUSES = [
  { id: 'PENDING_PAYMENT', name: 'Pending Payment' },
  { id: 'PAYMENT_VERIFIED', name: 'Payment Verified' },
  { id: 'CONFIRMED', name: 'Confirmed' },
  { id: 'INVENTORY_RESERVED', name: 'Inventory Reserved' },
  { id: 'PROCESSING', name: 'Processing' },
  { id: 'PICKING', name: 'Picking' },
  { id: 'PACKED', name: 'Packed' },
  { id: 'READY_FOR_SHIPMENT', name: 'Ready for Shipment' },
  { id: 'SHIPPED', name: 'Shipped' },
  { id: 'IN_TRANSIT', name: 'In Transit' },
  { id: 'OUT_FOR_DELIVERY', name: 'Out for Delivery' },
  { id: 'DELIVERED', name: 'Delivered' },
  { id: 'CANCELLED', name: 'Cancelled' },
  { id: 'RETURN_REQUESTED', name: 'Return Requested' },
  { id: 'RETURN_APPROVED', name: 'Return Approved' },
  { id: 'RETURN_REJECTED', name: 'Return Rejected' },
  { id: 'PICKUP_SCHEDULED', name: 'Pickup Scheduled' },
  { id: 'RETURNED', name: 'Returned' },
  { id: 'REFUND_INITIATED', name: 'Refund Initiated' },
  { id: 'REFUNDED', name: 'Refunded' },
];

const SIMPLE_STATUSES = [
  { id: 'PENDING_PAYMENT', name: 'Pending Payment' },
  { id: 'CONFIRMED', name: 'Order Placed / Confirmed' },
  { id: 'PACKED', name: 'Product Packed' },
  { id: 'SHIPPED', name: 'Shipped' },
  { id: 'DELIVERED', name: 'Delivered' },
  { id: 'CANCELLED', name: 'Cancelled' },
];

const ADMIN_ORDER_STEPS = [
  { label: 'Order Placed',     keys: ['PENDING_PAYMENT', 'PAYMENT_VERIFIED'] },
  { label: 'Confirmed',        keys: ['CONFIRMED', 'INVENTORY_RESERVED', 'PROCESSING', 'PICKING'] },
  { label: 'Packed',           keys: ['PACKED', 'READY_FOR_SHIPMENT'] },
  { label: 'Shipped',          keys: ['SHIPPED'] },
  { label: 'In Transit',       keys: ['IN_TRANSIT'] },
  { label: 'Out for Delivery', keys: ['OUT_FOR_DELIVERY'] },
  { label: 'Delivered',        keys: ['DELIVERED'] },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${STATUS_COLOR[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
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

// ── History Log component ─────────────────────────────────────────
function HistoryPanel({ orderId }: { orderId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchHistory = () => {
    setLoading(true);
    api.get(`/orders/admin/${orderId}/history`)
      .then(r => setHistory(r.data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
    // Listen for custom status updates to refresh history
    window.addEventListener('order-status-history-refresh', fetchHistory);
    return () => window.removeEventListener('order-status-history-refresh', fetchHistory);
  }, [orderId]);

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading status logs…
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No status changes logged yet</p>
      ) : (
        history.map((h, i) => (
          <div key={i} className="flex gap-3 relative pb-4 last:pb-0 border-l border-gray-100 pl-4 ml-2">
            <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {h.fromStatus && <StatusBadge status={h.fromStatus} />}
                {h.fromStatus && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
                <StatusBadge status={h.toStatus} />
              </div>
              {h.notes && <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded-lg italic">"{h.notes}"</p>}
              <p className="text-[10px] text-muted-foreground mt-1">
                Role: <span className="font-semibold text-foreground">{h.actorRole || 'SYSTEM'}</span> · {new Date(h.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function OrderTransactionsPanel({ orderId }: { orderId: string }) {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [pdLoading, setPdLoading] = useState(false);
  // Per-transaction live status: { [gatewayRef]: { loading, data, error } }
  const [liveStatus, setLiveStatus] = useState<Record<string, { loading: boolean; data: any; error: string }>>({});

  const fetchTransactions = () => {
    setLoading(true);
    api.get(`/admin/orders/${orderId}/transactions`)
      .then(r => setTxs(r.data))
      .catch(() => setTxs([]))
      .finally(() => setLoading(false));
  };

  const fetchPaymentDetails = () => {
    setPdLoading(true);
    api.get(`/admin/orders/${orderId}/payment-details`)
      .then(r => setPaymentDetails(r.data))
      .catch(() => setPaymentDetails(null))
      .finally(() => setPdLoading(false));
  };

  const fetchLiveStatus = async (tx: any) => {
    const ref = tx.gatewayRef;
    if (!ref) return;
    // Toggle off if already loaded
    if (liveStatus[ref]?.data) {
      setLiveStatus(prev => { const n = { ...prev }; delete n[ref]; return n; });
      return;
    }
    setLiveStatus(prev => ({ ...prev, [ref]: { loading: true, data: null, error: '' } }));
    try {
      const endpoint = tx.type === 'CHARGE'
        ? `/admin/razorpay/payment/${ref}`
        : `/admin/razorpay/refund/${ref}`;
      const { data } = await api.get(endpoint);
      if (data.success) {
        setLiveStatus(prev => ({ ...prev, [ref]: { loading: false, data: data.payment || data.refund, error: '' } }));
      } else {
        setLiveStatus(prev => ({ ...prev, [ref]: { loading: false, data: null, error: data.error || 'Failed' } }));
      }
    } catch (err: any) {
      setLiveStatus(prev => ({ ...prev, [ref]: { loading: false, data: null, error: err.response?.data?.message || 'Network error' } }));
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchPaymentDetails();
    window.addEventListener('order-transactions-refresh', () => { fetchTransactions(); fetchPaymentDetails(); });
    return () => window.removeEventListener('order-transactions-refresh', fetchTransactions);
  }, [orderId]);

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading transactions...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment ID + quick settlement summary */}
      {paymentDetails?.razorpayPaymentId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Razorpay Payment ID</p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold text-blue-800">{paymentDetails.razorpayPaymentId}</span>
            <a
              href={`/admin/razorpay`}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3 h-3" /> View in Razorpay Manager
            </a>
          </div>

          {/* Settlement Summary */}
          {pdLoading ? (
            <div className="mt-3 flex items-center gap-2 text-[10px] text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Fetching settlement data...
            </div>
          ) : paymentDetails?.razorpayDetails ? (
            <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Charged</p>
                <p className="text-sm font-black text-blue-800 mt-0.5">{formatPrice(paymentDetails.razorpayDetails.amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-orange-500 uppercase tracking-wider">Razorpay Fee + Tax</p>
                <p className="text-sm font-black text-orange-700 mt-0.5">
                  − {formatPrice(paymentDetails.razorpayDetails.fee + paymentDetails.razorpayDetails.tax)}
                </p>
                <p className="text-[8px] text-muted-foreground">Fee: {formatPrice(paymentDetails.razorpayDetails.fee)} | GST: {formatPrice(paymentDetails.razorpayDetails.tax)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-green-600 uppercase tracking-wider">Settled to Bank</p>
                <p className="text-sm font-black text-green-700 mt-0.5">{formatPrice(paymentDetails.razorpayDetails.settled)}</p>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-blue-400 mt-2">Settlement details unavailable (Razorpay API not reachable)</p>
          )}
        </div>
      )}

      {/* Transaction Logs */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {txs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No gateway logs for this order</p>
        ) : (
          txs.map((tx, i) => {
            const ref = tx.gatewayRef;
            const live = liveStatus[ref];
            const isRefund = tx.type === 'REFUND';
            const liveData = live?.data;
            const liveIsFailure = liveData && (liveData.status === 'failed' || liveData.failureReason);

            return (
              <div key={i} className={`border rounded-xl p-3.5 text-xs relative transition-all ${liveIsFailure ? 'bg-red-50 border-red-200' : 'bg-muted/5'}`}>
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 font-bold rounded-md uppercase text-[9px] ${
                    isRefund ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {tx.type}
                  </span>
                  <span className="font-mono text-primary text-[10px] font-bold truncate max-w-[180px]">{ref}</span>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-black text-sm text-foreground">{formatPrice(Number(tx.amount))}</span>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">DB Status:</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                    tx.status === 'SUCCESS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {tx.status}
                  </span>
                </div>

                {tx.failReason && (
                  <div className="mt-2 bg-red-50 text-red-700 border border-red-100 p-2 rounded-lg leading-relaxed text-[10px]">
                    <strong>Error:</strong> {tx.failReason}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground text-right mt-1.5">
                  {new Date(tx.createdAt).toLocaleString('en-IN')}
                </p>

                {/* Live Status Button */}
                {ref && (
                  <div className="mt-2.5 pt-2.5 border-t border-border/60">
                    <button
                      onClick={() => fetchLiveStatus(tx)}
                      disabled={live?.loading}
                      className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg w-full justify-center transition-all ${
                        liveData
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-muted/30 hover:bg-muted/60 text-muted-foreground border border-border'
                      }`}
                    >
                      {live?.loading ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Fetching from Razorpay…</>
                      ) : liveData ? (
                        <><RefreshCw className="w-3 h-3" /> Hide Live Status</>
                      ) : (
                        <><Eye className="w-3 h-3 text-primary" /> Check Live Status from Razorpay</>
                      )}
                    </button>

                    {live?.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700 font-semibold">
                        ⚠ {live.error}
                      </div>
                    )}

                    {liveData && (
                      <div className={`mt-2.5 rounded-xl border p-3 space-y-2 ${
                        liveIsFailure ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                      }`}>
                        <p className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          liveIsFailure ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {liveIsFailure ? '⚠' : '✓'} Live Razorpay Status
                          <span className={`ml-auto px-2 py-0.5 rounded-full font-black text-[9px] ${
                            liveData.status === 'processed' || liveData.status === 'captured'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : liveData.status === 'failed'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : liveData.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {liveData.status}
                          </span>
                        </p>

                        {/* CHARGE live details */}
                        {!isRefund && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                            <div><span className="text-muted-foreground">Amount:</span> <strong>{formatPrice(liveData.amount)}</strong></div>
                            <div><span className="text-muted-foreground">Method:</span> <strong>{liveData.method?.toUpperCase()}</strong></div>
                            {liveData.vpa && <div className="col-span-2"><span className="text-muted-foreground">UPI VPA:</span> <strong className="font-mono">{liveData.vpa}</strong></div>}
                            {liveData.bank && <div><span className="text-muted-foreground">Bank:</span> <strong>{liveData.bank}</strong></div>}
                            {liveData.fee > 0 && <div><span className="text-muted-foreground">Fee:</span> <strong className="text-red-700">-{formatPrice(liveData.fee)}</strong></div>}
                            {liveData.tax > 0 && <div><span className="text-muted-foreground">GST on Fee:</span> <strong className="text-red-700">-{formatPrice(liveData.tax)}</strong></div>}
                            {liveData.amountRefunded > 0 && <div className="col-span-2"><span className="text-muted-foreground">Amount Refunded:</span> <strong className="text-orange-700">{formatPrice(liveData.amountRefunded)}</strong></div>}
                            {liveData.acquirerData?.rrn && <div className="col-span-2"><span className="text-muted-foreground">Bank RRN:</span> <strong className="font-mono">{liveData.acquirerData.rrn}</strong></div>}
                            {liveData.errorDescription && (
                              <div className="col-span-2 mt-1 bg-red-100 text-red-800 border border-red-200 p-2 rounded-lg">
                                <strong>Failure:</strong> {liveData.errorDescription}
                              </div>
                            )}
                          </div>
                        )}

                        {/* REFUND live details */}
                        {isRefund && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                            <div><span className="text-muted-foreground">Refund Amount:</span> <strong>{formatPrice(liveData.amount)}</strong></div>
                            <div><span className="text-muted-foreground">Speed:</span> <strong>{liveData.speed || liveData.speedRequested || '—'}</strong></div>
                            {liveData.paymentId && <div className="col-span-2"><span className="text-muted-foreground">Payment ID:</span> <strong className="font-mono">{liveData.paymentId}</strong></div>}
                            {liveData.acquirerData?.rrn && <div className="col-span-2"><span className="text-muted-foreground">Bank RRN:</span> <strong className="font-mono">{liveData.acquirerData.rrn}</strong></div>}
                            {liveData.processedAt && <div className="col-span-2"><span className="text-muted-foreground">Processed:</span> <strong>{new Date(liveData.processedAt).toLocaleString('en-IN')}</strong></div>}
                            {liveData.failureReason && (
                              <div className="col-span-2 mt-1 bg-red-100 text-red-800 border border-red-200 p-2 rounded-lg">
                                <strong>⚠ Refund Failed:</strong> {liveData.failureReason}
                                <p className="mt-1 text-[9px] text-red-600">This refund failed — likely due to low Razorpay wallet balance. Please top up your Razorpay account and retry from Razorpay Manager.</p>
                              </div>
                            )}
                            {liveData.status === 'pending' && (
                              <div className="col-span-2 mt-1 bg-amber-50 text-amber-800 border border-amber-200 p-2 rounded-lg">
                                ⏳ <strong>Refund Pending</strong> — Initiated but not yet processed by the bank (3–5 business days).
                              </div>
                            )}
                          </div>
                        )}

                        <a
                          href="/admin/razorpay"
                          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Razorpay Manager for full details
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(true);

  // Form Fields for Status & Shipment Fulfillment
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [awbCode, setAwbCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [pickupSlot, setPickupSlot] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState('');
  const [scanning, setScanning] = useState(false);
  const awbRef = useRef<HTMLInputElement>(null);
  const [selectedCourierCustomName, setSelectedCourierCustomName] = useState('');

  // Transit Logs State
  const [transitEvents, setTransitEvents] = useState<any[]>([]);

  // Image lightbox state
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/orders/admin/${id}`);
      setOrder(data);
      setSelectedStatus(data.status || '');
      setAwbCode(data.awbCode || '');
      setTrackingUrl(data.trackingUrl || '');
      // Look up courier base
      const courierPartner = DELIVERY_PARTNERS.find(p => p.name.toLowerCase() === (data.courierName || '').toLowerCase());
      setSelectedPartner(courierPartner ? courierPartner.id : data.courierName ? 'other' : '');
      setSelectedCourierCustomName(courierPartner ? '' : data.courierName || '');

      // Fetch live transit data if AWB exists
      if (data.awbCode) {
        try {
          const trackRes = await api.get(`/orders/${id}/track`);
          setTransitEvents(trackRes.data.events || []);
          if (trackRes.data.status && trackRes.data.status !== data.status) {
            data.status = trackRes.data.status;
            setSelectedStatus(trackRes.data.status);
          }
        } catch (err) {
          console.error('Failed to fetch live transit details:', err);
        }
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleScanFocus = () => {
    setScanning(true);
    awbRef.current?.focus();
  };

  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartner(partnerId);
    if (partnerId && partnerId !== 'other') {
      const url = getTrackingUrl(partnerId, awbCode);
      if (url) {
        setTrackingUrl(url);
      }
    }
  };

  const handleAwbChange = (code: string) => {
    setAwbCode(code);
    if (selectedPartner && selectedPartner !== 'other') {
      const url = getTrackingUrl(selectedPartner, code);
      if (url) {
        setTrackingUrl(url);
      }
    }
  };

  const handleFulfillmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) {
      alert('Please select a status');
      return;
    }
    setUpdating(true);
    try {
      const partnerObj = DELIVERY_PARTNERS.find(p => p.id === selectedPartner);
      const courierName = selectedPartner === 'other' ? selectedCourierCustomName : (partnerObj?.name || '');

      const payload: any = {
        status: selectedStatus,
        notes: notes || undefined,
        awbCode: awbCode.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        courierName: courierName || undefined,
        cancelReason: selectedStatus === 'CANCELLED' ? (cancelReason || 'Admin Cancelled') : undefined,
        pickupSlot: (selectedStatus === 'RETURN_APPROVED' || selectedStatus === 'PICKUP_SCHEDULED') ? pickupSlot : undefined,
      };

      await api.put(`/orders/admin/${id}/status`, payload);
      showToast('Order fulfillment & tracking details saved successfully!');
      
      // Reload order and trigger history list update
      const { data } = await api.get(`/orders/admin/${id}`);
      setOrder(data);
      setNotes('');
      window.dispatchEvent(new Event('order-status-history-refresh'));
      window.dispatchEvent(new Event('order-transactions-refresh'));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-screen gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Fetching order details…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold font-outfit">Error Loading Order</h2>
        <p className="text-muted-foreground">{error || 'Order not found.'}</p>
        <button onClick={() => router.push('/admin/orders')} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow hover:bg-primary/90">
          Back to Orders
        </button>
      </div>
    );
  }

  const curIdx = ADMIN_ORDER_STEPS.findIndex(s => s.keys.includes(order.status));
  const isReturnFlow = ['RETURN_REQUESTED','RETURN_APPROVED','PICKUP_SCHEDULED','RETURNED','REFUND_INITIATED','REFUNDED'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Image Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            className="absolute top-4 right-4 w-12 h-12 rounded-full bg-black/70 border border-white/20 flex items-center justify-center z-10 shadow-xl"
            onClick={() => setLightboxImg(null)}
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div
            className="relative max-w-2xl w-full max-h-[85vh]"
            style={{ aspectRatio: '3/4' }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={lightboxImg}
              alt="Order item"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        
        {/* Back and Actions Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Orders
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => printOrderLabel(order)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold border bg-white rounded-xl hover:bg-gray-50 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" /> Print Label
            </button>
            <button
              onClick={fetchOrder}
              className="flex items-center justify-center p-2 border bg-white rounded-xl hover:bg-gray-50 shadow-sm transition-all"
              title="Refresh order"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {toast && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-3">
            <Check className="w-4 h-4 shrink-0" />
            {toast}
          </div>
        )}

        {/* Hero title block */}
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-outfit font-black">Order #{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Placed on {new Date(order.createdAt).toLocaleString('en-IN')}</p>
        </div>

        {/* Timeline banner */}
        {!isReturnFlow && order.status !== 'CANCELLED' && (
          <div className="bg-white rounded-2xl p-6 border shadow-sm mb-8 overflow-x-auto">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Order Pipeline</h2>
            <div className="flex items-center min-w-max">
              {ADMIN_ORDER_STEPS.map((step, i) => {
                const done = i <= curIdx;
                const active = i === curIdx;
                return (
                  <div key={step.label} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                        done ? 'bg-primary border-primary text-white font-bold' : 'bg-white border-gray-200 text-gray-400'
                      } ${active ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                        {done ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                      </div>
                      <p className={`text-[10px] text-center leading-tight w-14 mt-1 font-semibold ${done ? 'text-primary' : 'text-gray-400'}`}>{step.label}</p>
                    </div>
                    {i < ADMIN_ORDER_STEPS.length - 1 && (
                      <div className={`w-12 h-0.5 mx-2 mb-6 shrink-0 ${i < curIdx ? 'bg-primary' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLUMNS: Info and Details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Items checklist */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/10">
                <h3 className="font-bold font-outfit text-sm uppercase tracking-wider">Order Items ({order.items?.length})</h3>
              </div>
              <div className="p-6 divide-y divide-gray-100">
                {order.items?.map((item: any) => {
                  // Use variant-specific image matched by color
                  const variantImg = item.product?.variants?.find(
                    (v: any) => v.color && v.color === item.variantInfo?.color
                  )?.images?.[0];
                  const displayImg = variantImg || item.imageUrl || item.product?.images?.[0];
                  return (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-center">
                    {displayImg && (
                      <button
                        type="button"
                        className="relative w-14 h-20 rounded-xl overflow-hidden bg-accent/10 border shrink-0 cursor-zoom-in hover:ring-2 hover:ring-primary transition-all group"
                        onClick={() => setLightboxImg(displayImg)}
                        title="Click to enlarge"
                      >
                        <Image src={displayImg} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-200" />
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-snug text-foreground line-clamp-2">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        Size: <span className="text-foreground font-semibold">{item.variantInfo?.size}</span>
                        {item.variantInfo?.color && <> · Color: <span className="text-foreground font-semibold">{item.variantInfo.color}</span></>}
                        {' '}· Qty: <span className="text-foreground font-bold">{item.quantity}</span>
                      </p>
                      {item.sku && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SKU: {item.sku}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm">{formatPrice(item.totalPrice || item.unitPrice * item.quantity)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatPrice(item.unitPrice)} each</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery address */}
            {order.address && (
              <div className="border-2 border-primary/20 bg-primary/5 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-xs text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Delivery Address
                  </h3>
                  <span className="text-[10px] font-bold bg-white text-primary border border-primary/20 px-2 py-0.5 rounded-full">SHIP TO</span>
                </div>
                <p className="font-black text-lg text-foreground">{order.address.name}</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {order.address.line1}{order.address.line2 && `, ${order.address.line2}`}
                  <br />
                  {order.address.city}, {order.address.state} — <strong className="text-foreground font-bold">{order.address.pincode}</strong>
                  <br />
                  {order.address.country || 'India'}
                </p>
                <div className="mt-4 pt-4 border-t border-primary/10 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Phone number:</span>
                  <a href={`tel:${order.address.phone}`} className="text-base font-bold text-foreground hover:underline">
                    📞 {order.address.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/10">
                <h3 className="font-bold font-outfit text-sm uppercase tracking-wider">Payment Summary</h3>
              </div>
              <div className="p-6 space-y-3.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">{formatPrice(order.subtotal)}</span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                    <span className="font-bold">-{formatPrice(order.discountAmount)}</span>
                  </div>
                )}
                {Number(order.offerDiscount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Offer Discount {order.offerTitle && `(${order.offerTitle})`}</span>
                    <span className="font-bold">-{formatPrice(order.offerDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-medium text-foreground">{Number(order.shippingCharge) > 0 ? formatPrice(order.shippingCharge) : 'Free'}</span>
                </div>
                {Number(order.codCharges) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>COD Convenience Charge</span>
                    <span className="font-medium text-foreground">{formatPrice(order.codCharges)}</span>
                  </div>
                )}
                {Number(order.platformFee) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform Fee</span>
                    <span className="font-medium text-foreground">{formatPrice(order.platformFee)}</span>
                  </div>
                )}
                {Number(order.gstAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST Tax</span>
                    <span className="font-medium text-foreground">{formatPrice(order.gstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base border-t pt-3.5">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatPrice(order.totalAmount)}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t pt-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Method:</span>
                    <span className="font-bold text-foreground">{order.paymentMethod === 'RAZORPAY' ? 'Razorpay Online' : 'Cash on Delivery'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Gateway status:</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Transit Logs */}
            {order.awbCode && (
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h3 className="font-bold font-outfit text-sm uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" /> Live Transit Timeline
                  </span>
                  <span className="text-[10px] font-bold bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Live</span>
                </h3>
                
                {transitEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No live tracking events available yet or invalid AWB</p>
                ) : (
                  <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {transitEvents.map((ev, i) => (
                      <div key={i} className="flex gap-3 relative pb-4 last:pb-0 border-l border-gray-100 pl-4 ml-2">
                        <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary animate-pulse' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{ev.status}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {ev.location && <span className="font-semibold text-foreground mr-1.5">📍 {ev.location}</span>}
                            {new Date(ev.timestamp).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timeline history log */}
            {showHistory && (
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h3 className="font-bold font-outfit text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Status Transition Logs
                </h3>
                <HistoryPanel orderId={order.id} />
              </div>
            )}

            {/* Gateway Transactions history log */}
            {order.paymentMethod === 'RAZORPAY' && (
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h3 className="font-bold font-outfit text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" /> Gateway Transaction History
                </h3>
                <OrderTransactionsPanel orderId={order.id} />
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Unified Fulfillment & Tracking */}
          <div className="space-y-8">
            
            {/* Fulfillment form card */}
            <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold font-outfit text-base text-foreground flex items-center gap-2 border-b pb-3">
                  <PackageCheck className="w-5 h-5 text-primary" /> Fulfillment &amp; Status
                </h3>
                <p className="text-xs text-muted-foreground mt-2">Manage the order lifecycle, enter tracking codes, and configure carrier assignments.</p>
              </div>

              <form onSubmit={handleFulfillmentSubmit} className="space-y-4">
                
                {/* Status selection */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Order Status *</label>
                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none bg-white font-medium"
                    required
                  >
                    <option value="">Select status…</option>
                    {(() => {
                      const dropdownStatuses = [...SIMPLE_STATUSES];
                      if (order && !SIMPLE_STATUSES.some(s => s.id === order.status)) {
                        dropdownStatuses.push({ id: order.status, name: order.status.replace(/_/g, ' ') });
                      }
                      return dropdownStatuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Courier selection */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Delivery Partner</label>
                  <select
                    value={selectedPartner}
                    onChange={e => handlePartnerChange(e.target.value)}
                    className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none bg-white font-medium mb-2"
                  >
                    <option value="">No carrier selected</option>
                    {DELIVERY_PARTNERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  
                  {selectedPartner === 'other' && (
                    <input
                      type="text"
                      placeholder="Enter custom carrier name"
                      value={selectedCourierCustomName}
                      onChange={e => setSelectedCourierCustomName(e.target.value)}
                      className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none mt-2"
                    />
                  )}
                </div>

                {/* AWB / Tracking code input */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    AWB / Tracking Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      ref={awbRef}
                      value={awbCode}
                      onChange={e => { handleAwbChange(e.target.value); setScanning(false); }}
                      placeholder={scanning ? '▌ Scan barcode now…' : 'Enter AWB / tracking code'}
                      className={`flex-1 border-2 rounded-xl px-3 py-2 text-sm outline-none transition-all ${
                        scanning ? 'border-primary bg-primary/5 ring-2 ring-primary/20 font-mono text-primary font-bold' : 'border-border focus:border-primary'
                      }`}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={handleScanFocus}
                      title="Ready barcode scanner"
                      className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 ${
                        scanning ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary hover:text-primary'
                      }`}
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                  </div>
                  {scanning && (
                    <p className="text-[10px] text-primary mt-1.5 animate-pulse font-medium">
                      USB Barcode Scanner ready. Scan label now.
                    </p>
                  )}
                </div>

                {/* Tracking URL */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Tracking Link</label>
                  <input
                    type="url"
                    value={trackingUrl}
                    readOnly
                    placeholder="Automatically generated from AWB"
                    className="w-full border-2 border-border bg-gray-50 text-gray-500 rounded-xl px-3 py-2.5 text-sm outline-none cursor-not-allowed font-medium"
                  />
                </div>

                {/* Conditional Cancel Reason */}
                {selectedStatus === 'CANCELLED' && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Cancellation Reason *</label>
                    <input
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="e.g. Customer cancelled order"
                      className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none"
                      required
                    />
                  </div>
                )}

                {/* Conditional Pickup slot */}
                {(selectedStatus === 'RETURN_APPROVED' || selectedStatus === 'PICKUP_SCHEDULED') && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Return Pickup Slot</label>
                    <input
                      value={pickupSlot}
                      onChange={e => setPickupSlot(e.target.value)}
                      placeholder="e.g. 26 May, 10AM - 1PM"
                      className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none"
                    />
                  </div>
                )}

                {/* Admin Status Note */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">Admin Note</label>
                  <textarea
                    rows={2.5}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Provide a reason or audit note for this change…"
                    className="w-full border-2 border-border focus:border-primary rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md shadow-primary/10 mt-6"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Tracking &amp; Status
                </button>

              </form>
            </div>

            {/* Customer card */}
            <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
              <h3 className="font-bold font-outfit text-sm uppercase tracking-wider border-b pb-2">Customer Profile</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                  {(order.user?.name || order.address?.name)?.[0]?.toUpperCase() || 'C'}
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{order.user?.name || order.address?.name || 'Customer'}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.user?.email || 'No email provided'}</p>
                </div>
              </div>
              
              <div className="text-xs space-y-2 pt-2 border-t text-muted-foreground">
                <div className="flex justify-between"><span>User Account ID:</span><span className="font-mono text-[10px] text-foreground">{order.user?.id || 'N/A'}</span></div>
                <div className="flex justify-between"><span>Registered phone:</span><span className="text-foreground">{order.user?.phone || order.address?.phone || 'N/A'}</span></div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
