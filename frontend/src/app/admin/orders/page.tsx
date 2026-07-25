'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, X, Package, Loader2, RefreshCw, Eye, Printer
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { printOrderLabel } from '@/lib/printLabel';

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

const STATUS_FILTER_TABS = [
  'ALL', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'PAYMENT_VERIFIED', 'CANCELLED', 'PENDING_PAYMENT',
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-full border ${STATUS_COLOR[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

const BADGE_STATUSES = ['CONFIRMED', 'PAYMENT_VERIFIED', 'PENDING_PAYMENT'];

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'CONFIRMED';
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const { settings, fetchSettings } = useSettingsStore();

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
      if (data.statusCounts) {
        setStatusCounts(data.statusCounts);
      }
      setPage(p);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchOrders(1); }, [statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => fetchOrders(1), 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          {STATUS_FILTER_TABS.map(s => {
            const isBadgeStatus = BADGE_STATUSES.includes(s);
            const count = statusCounts[s] ?? 0;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors shrink-0 flex items-center gap-1.5 ${
                  statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-muted-foreground hover:border-gray-300'
                }`}>
                <span>{s === 'ALL' ? 'All Orders' : s.replace(/_/g, ' ')}</span>
                {isBadgeStatus && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    statusFilter === s ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="admin-order-search"
            name="orderSearch"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by order#, customer name or phone…"
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
          />
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
                <div key={order.id} className="bg-white border rounded-xl p-4 shadow-sm cursor-pointer hover:shadow" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold font-mono text-xs">#{order.orderNumber}</p>
                      <p className="font-medium text-sm mt-0.5">{order.user?.name || 'Customer'}</p>
                      <p className="text-xs text-muted-foreground">{order.user?.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm">{formatPrice(order.totalAmount)}</p>
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
                            <button onClick={() => router.push(`/admin/orders/${order.id}`)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
                              <Eye className="w-3 h-3" /> Manage
                            </button>
                            <button onClick={() => printOrderLabel(order, settings.storeAddress)}
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
