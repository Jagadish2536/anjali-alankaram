'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, X, Package, Loader2, RefreshCw, Eye, Printer, Calendar, FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { printOrderLabel, printBulkOrderLabels } from '@/lib/printLabel';
import { LabelSizeModal } from '@/components/admin/LabelSizeModal';

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
  'ALL', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PAYMENT_VERIFIED', 'CANCELLED', 'PENDING_PAYMENT',
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black rounded-full border ${STATUS_COLOR[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// Show count badge on every tab
const TAB_LABELS: Record<string, string> = {
  ALL:              'All Orders',
  CONFIRMED:        'Confirmed',
  SHIPPED:          'Shipped',
  IN_TRANSIT:       'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED:        'Delivered',
  PAYMENT_VERIFIED: 'Payment Verified',
  CANCELLED:        'Cancelled',
  PENDING_PAYMENT:  'Pending Payment',
};

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

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkOption, setBulkOption] = useState<'ALL' | 'DATE_SINGLE' | 'DATE_RANGE'>('ALL');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [dateOrderCount, setDateOrderCount] = useState<number | null>(null);
  const [isCheckingDateCount, setIsCheckingDateCount] = useState(false);

  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<any | null>(null);
  const [bulkOrdersForLabel, setBulkOrdersForLabel] = useState<any[] | null>(null);
  const [bulkFilterInfo, setBulkFilterInfo] = useState<string>('');

  const checkDateCount = useCallback(async () => {
    setIsCheckingDateCount(true);
    try {
      let res: any;
      try {
        res = await api.get('/orders/admin/all?status=CONFIRMED&limit=500');
      } catch (_e) {
        res = await api.get('/orders/admin/all?status=CONFIRMED');
      }
      const result = Array.isArray(res.data) ? res.data : res.data?.orders ?? [];
      
      if (bulkOption === 'DATE_SINGLE') {
        const matched = result.filter((o: any) => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt).toISOString().split('T')[0];
          return d === selectedDate;
        });
        setDateOrderCount(matched.length);
      } else if (bulkOption === 'DATE_RANGE') {
        const matched = result.filter((o: any) => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt).toISOString().split('T')[0];
          return d >= fromDate && d <= toDate;
        });
        setDateOrderCount(matched.length);
      } else {
        setDateOrderCount(result.length);
      }
    } catch (_e) {
      setDateOrderCount(0);
    } finally {
      setIsCheckingDateCount(false);
    }
  }, [bulkOption, selectedDate, fromDate, toDate]);

  useEffect(() => {
    if (isBulkModalOpen) {
      checkDateCount();
    }
  }, [isBulkModalOpen, bulkOption, selectedDate, fromDate, toDate, checkDateCount]);

  const handlePrintBulkLabels = async () => {
    setIsGeneratingBulk(true);
    try {
      let res: any;
      try {
        res = await api.get('/orders/admin/all?status=CONFIRMED&limit=500');
      } catch (_e) {
        res = await api.get('/orders/admin/all?status=CONFIRMED');
      }
      let result = Array.isArray(res.data) ? res.data : res.data?.orders ?? [];

      if (result.length === 0 && orders.length > 0) {
        result = orders;
      }

      if (bulkOption === 'DATE_SINGLE') {
        result = result.filter((o: any) => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt).toISOString().split('T')[0];
          return d === selectedDate;
        });
      } else if (bulkOption === 'DATE_RANGE') {
        result = result.filter((o: any) => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt).toISOString().split('T')[0];
          return d >= fromDate && d <= toDate;
        });
      }

      if (result.length === 0) {
        alert(
          bulkOption === 'DATE_SINGLE'
            ? `No confirmed orders found for date ${selectedDate}.`
            : bulkOption === 'DATE_RANGE'
            ? `No confirmed orders found between ${fromDate} and ${toDate}.`
            : 'No confirmed orders found.',
        );
        return;
      }

      let filterText = 'All Confirmed';
      if (bulkOption === 'DATE_SINGLE') {
        filterText = `Date: ${selectedDate}`;
      } else if (bulkOption === 'DATE_RANGE') {
        filterText = `From ${fromDate} to ${toDate}`;
      }

      setBulkOrdersForLabel(result);
      setSelectedOrderForLabel(null);
      setBulkFilterInfo(filterText);
      setIsBulkModalOpen(false);
      setIsSizeModalOpen(true);
    } catch (err: any) {
      alert('Failed to generate bulk labels: ' + err.message);
    } finally {
      setIsGeneratingBulk(false);
    }
  };

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
    } catch (err) {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, fetchOrders]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchOrders(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search, fetchOrders]);

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" /> Download Labels PDF
            </button>
            <button onClick={() => fetchOrders(page)}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-xl hover:bg-white transition-colors bg-white shadow-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          {STATUS_FILTER_TABS.map(s => {
            const count = s === 'ALL'
              ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
              : (statusCounts[s] ?? 0);
            const isActive = statusFilter === s;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors shrink-0 flex items-center gap-1.5 ${
                  isActive ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-muted-foreground hover:border-gray-300'
                }`}>
                <span>{TAB_LABELS[s] ?? s.replace(/_/g, ' ')}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
                }`}>
                  {count}
                </span>
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
                            <button onClick={() => {
                              setSelectedOrderForLabel(order);
                              setBulkOrdersForLabel(null);
                              setIsSizeModalOpen(true);
                            }}
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

      {/* Bulk Print Labels Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-outfit font-black text-foreground flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" /> Print Confirmed Order Labels
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download or print shipping labels for confirmed orders
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: All Confirmed Orders */}
              <label
                onClick={() => setBulkOption('ALL')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  bulkOption === 'ALL'
                    ? 'border-primary bg-primary/[0.03] shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="bulkOption"
                  checked={bulkOption === 'ALL'}
                  onChange={() => setBulkOption('ALL')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">
                      1. Download all confirmed orders print labels
                    </span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-extrabold rounded-full shrink-0">
                      {statusCounts['CONFIRMED'] ?? 0} Orders
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Print labels for all currently active confirmed orders in one consolidated PDF document.
                  </p>
                </div>
              </label>

              {/* Option 2: Select Specific Single Date */}
              <label
                onClick={() => setBulkOption('DATE_SINGLE')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  bulkOption === 'DATE_SINGLE'
                    ? 'border-primary bg-primary/[0.03] shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="bulkOption"
                  checked={bulkOption === 'DATE_SINGLE'}
                  onChange={() => setBulkOption('DATE_SINGLE')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">
                      2. Select specific single date
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filter confirmed orders created on a specific single date.
                  </p>

                  {bulkOption === 'DATE_SINGLE' && (
                    <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      />
                      {isCheckingDateCount ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Checking count...
                        </span>
                      ) : dateOrderCount !== null ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          {dateOrderCount} label(s) found
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </label>

              {/* Option 3: Select Date Range (From Date to To Date) */}
              <label
                onClick={() => setBulkOption('DATE_RANGE')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  bulkOption === 'DATE_RANGE'
                    ? 'border-primary bg-primary/[0.03] shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="bulkOption"
                  checked={bulkOption === 'DATE_RANGE'}
                  onChange={() => setBulkOption('DATE_RANGE')}
                  className="mt-1 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">
                      3. Select date range (From Date → To Date)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Filter confirmed orders created between a custom date range.
                  </p>

                  {bulkOption === 'DATE_RANGE' && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">From Date:</span>
                          <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">To Date:</span>
                          <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {isCheckingDateCount ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Checking count...
                          </span>
                        ) : dateOrderCount !== null ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            {dateOrderCount} label(s) found in date range
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t pt-4">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrintBulkLabels}
                disabled={isGeneratingBulk || (bulkOption !== 'ALL' && dateOrderCount === 0)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm active:scale-95"
              >
                {isGeneratingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating PDF...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" /> Download / Print Labels PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Label Size Selection & Preview Modal */}
      <LabelSizeModal
        isOpen={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
        order={selectedOrderForLabel}
        orders={bulkOrdersForLabel || undefined}
        filterInfo={bulkFilterInfo}
      />
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
