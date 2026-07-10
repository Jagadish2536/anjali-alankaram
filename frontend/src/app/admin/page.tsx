'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import {
  TrendingUp, Users, ShoppingBag, Clock, ArrowUpRight,
  Package, CheckCircle2, RefreshCw, Download, Eye,
  ShoppingCart, AlertCircle, Star, RotateCcw, Radio,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

// ── Tiny SVG Bar Chart ────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/20 rounded-t-sm relative group"
            style={{ height: `${Math.max((d.value / max) * 80, 2)}px` }}
          >
            <div
              className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all"
              style={{ height: `${Math.max((d.value / max) * 80, 2)}px` }}
            />
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 whitespace-nowrap bg-white shadow px-1 rounded">
              {d.value > 0 ? formatPrice(d.value) : '0'}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Legacy
  PENDING:            { label: 'Pending',             color: 'bg-orange-100 text-orange-700' },
  // New statuses
  PENDING_PAYMENT:    { label: 'Awaiting Payment',    color: 'bg-orange-100 text-orange-700' },
  PAYMENT_VERIFIED:   { label: 'Payment Verified',    color: 'bg-blue-100 text-blue-700' },
  CONFIRMED:          { label: 'Confirmed',            color: 'bg-blue-100 text-blue-700' },
  INVENTORY_RESERVED: { label: 'Inventory Reserved',  color: 'bg-violet-100 text-violet-700' },
  PROCESSING:         { label: 'Processing',           color: 'bg-indigo-100 text-indigo-700' },
  PICKING:            { label: 'Picking',              color: 'bg-amber-100 text-amber-700' },
  PACKED:             { label: 'Packed',               color: 'bg-lime-100 text-lime-700' },
  READY_FOR_SHIPMENT: { label: 'Ready for Shipment',  color: 'bg-teal-100 text-teal-700' },
  SHIPPED:            { label: 'Shipped',              color: 'bg-violet-100 text-violet-700' },
  IN_TRANSIT:         { label: 'In Transit',           color: 'bg-sky-100 text-sky-700' },
  OUT_FOR_DELIVERY:   { label: 'Out for Delivery',    color: 'bg-cyan-100 text-cyan-700' },
  DELIVERED:          { label: 'Delivered',            color: 'bg-green-100 text-green-700' },
  CANCELLED:          { label: 'Cancelled',            color: 'bg-red-100 text-red-700' },
  RETURN_REQUESTED:   { label: 'Return Requested',    color: 'bg-yellow-100 text-yellow-700' },
  RETURN_APPROVED:    { label: 'Return Approved',     color: 'bg-teal-100 text-teal-700' },
  PICKUP_SCHEDULED:   { label: 'Pickup Scheduled',    color: 'bg-blue-100 text-blue-700' },
  RETURNED:           { label: 'Returned',             color: 'bg-purple-100 text-purple-700' },
  REFUND_INITIATED:   { label: 'Refund Initiated',    color: 'bg-orange-100 text-orange-700' },
  REFUNDED:           { label: 'Refunded',             color: 'bg-gray-100 text-gray-600' },
  RETURN_REJECTED:    { label: 'Return Rejected',     color: 'bg-rose-100 text-rose-700' },
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalSales: 0, totalOrders: 0, totalCustomers: 0, pendingOrders: 0,
    deliveredOrders: 0, cancelledOrders: 0, returnRequested: 0, lowStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [orderStatusBreakdown, setOrderStatusBreakdown] = useState<{ status: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const adminName = user?.name || 'Admin';

  // Live visitor state
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [livePages, setLivePages] = useState<{ page: string; count: number }[]>([]);
  const [liveHistory, setLiveHistory] = useState<number[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLiveVisitors = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/live-visitors');
      setLiveCount(data.total ?? 0);
      setLivePages(data.topPages || []);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveHistory(prev => {
        const next = [...prev, data.total ?? 0].slice(-20);
        return next;
      });
    } catch (err: any) {
      console.warn('Live visitors fetch failed:', err?.response?.status, err?.message);
      // Show 0 so the widget isn't stuck loading
      setLiveCount(prev => prev ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchLiveVisitors();
    liveIntervalRef.current = setInterval(fetchLiveVisitors, 10_000);
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, [fetchLiveVisitors]);

  const fetchDashboard = useCallback(async () => {
    try {
      // Use the efficient dashboard API that does DB-side aggregations
      const [dashRes, usersRes, productsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/products?limit=100').catch(() => ({ data: { products: [] } })),
      ]);

      const dash = dashRes.data;
      const allUsers: any[] = Array.isArray(usersRes.data) ? usersRes.data : [];
      const allProducts: any[] = Array.isArray(productsRes.data?.data)
        ? productsRes.data.data
        : (Array.isArray(productsRes.data) ? productsRes.data : []);

      // Stats from dashboard endpoint
      setStats({
        totalSales: Number(dash.stats?.totalRevenue) || 0,
        totalOrders: dash.stats?.totalOrders || 0,
        totalCustomers: dash.stats?.totalUsers || 0,
        pendingOrders: dash.stats?.pendingOrders || 0,
        deliveredOrders: dash.stats?.deliveredOrders || 0,
        cancelledOrders: dash.stats?.cancelledOrders || 0,
        returnRequested: dash.stats?.returnRequested || 0,
        lowStock: dash.stats?.lowStock || 0,
      });

      // Chart data from dashboard endpoint (7-day revenue)
      const chartFromApi = dash.chartData ?? [];
      setChartData(chartFromApi.map((d: any) => ({ label: d.label, value: d.revenue || 0 })));

      // Status breakdown from dashboard endpoint
      setOrderStatusBreakdown(
        (dash.statusBreakdown ?? []).map((s: any) => ({
          status: s.status,
          count: Number(s.count),
        }))
      );

      // Recent orders from dashboard endpoint
      setRecentOrders(dash.recentOrders ?? []);

      // Top products
      const sorted = [...allProducts].sort((a: any, b: any) => (b.totalSold || 0) - (a.totalSold || 0));
      setTopProducts(sorted.slice(0, 5));

    } catch (e) {
      console.error('Dashboard load failed', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRefresh = () => { setRefreshing(true); fetchDashboard(); };

  const handleDownloadCSV = () => {
    const rows = [['Order #', 'Customer', 'Amount', 'Status', 'Date']];
    recentOrders.forEach(o => rows.push([
      o.orderNumber, o.user?.name || 'Guest',
      String(o.totalAmount), o.status,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
    ]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { name: 'Total Revenue', value: formatPrice(stats.totalSales), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', link: '/admin/orders' },
    { name: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/orders' },
    { name: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', link: '/admin/customers' },
    { name: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', link: '/admin/orders?status=PENDING' },
    { name: 'Delivered', value: stats.deliveredOrders, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/admin/orders?status=DELIVERED' },
    { name: 'Cancelled', value: stats.cancelledOrders, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', link: '/admin/orders?status=CANCELLED' },
    { name: 'Return Requests', value: stats.returnRequested, icon: RotateCcw, color: 'text-yellow-600', bg: 'bg-yellow-50', link: '/admin/orders?status=RETURN_REQUESTED' },
    { name: 'Low Stock Items', value: stats.lowStock, icon: Package, color: 'text-rose-600', bg: 'bg-rose-50', link: '/admin/products' },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Welcome back, {adminName} 👋</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with Anjali Alankaram today.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <a href="/" target="_blank"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Eye className="w-4 h-4" /> View Store
          </a>
        </div>
      </div>

      {/* ── Live Visitor Counter ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center gap-6">

          {/* Main count */}
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Radio className="w-8 h-8 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-primary animate-pulse" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Live Visitors Right Now</p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black font-outfit leading-none">
                  {liveCount === null ? (
                    <span className="inline-block w-16 h-12 bg-white/20 animate-pulse rounded-lg" />
                  ) : liveCount}
                </span>
                {liveCount !== null && (
                  <span className="text-white/60 text-sm mb-1">
                    {liveCount === 1 ? 'person' : 'people'} browsing
                  </span>
                )}
              </div>
              {lastUpdated && (
                <p className="text-white/50 text-[10px] mt-1">Updated {lastUpdated} • refreshes every 10s</p>
              )}
            </div>
          </div>

          {/* Sparkline */}
          {liveHistory.length > 1 && (
            <div className="flex-1 hidden md:block">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">Last {liveHistory.length} readings</p>
              <div className="flex items-end gap-1 h-10">
                {liveHistory.map((v, i) => {
                  const max = Math.max(...liveHistory, 1);
                  const pct = Math.max((v / max) * 100, 4);
                  const isLast = i === liveHistory.length - 1;
                  return (
                    <div
                      key={i}
                      title={`${v} visitors`}
                      style={{ height: `${pct}%` }}
                      className={`flex-1 rounded-sm transition-all duration-500 ${
                        isLast ? 'bg-green-400' : 'bg-white/30'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Top pages */}
          {livePages.length > 0 && (
            <div className="flex-shrink-0 min-w-[200px]">
              <p className="text-white/50 text-[10px] uppercase tracking-wider mb-2">Active Pages</p>
              <div className="space-y-1.5">
                {livePages.slice(0, 5).map(({ page, count }) => (
                  <div key={page} className="flex items-center justify-between gap-3">
                    <span className="text-white/80 text-xs truncate max-w-[140px] font-mono">
                      {page === '/' ? 'Homepage' : page}
                    </span>
                    <span className="text-white text-xs font-bold bg-white/15 px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {livePages.length === 0 && liveCount === 0 && (
            <p className="text-white/50 text-sm">No visitors currently on the site.</p>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(card => {
            const Icon = card.icon;
            return (
              <Link key={card.name} href={card.link}
                className="bg-white p-5 rounded-2xl border shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">{card.name}</p>
                <h3 className="text-xl font-outfit font-bold mt-0.5">{card.value}</h3>
              </Link>
            );
          })}
        </div>
      )}

      {/* Charts + Status row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-outfit font-bold text-lg">Revenue — Last 7 Days</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Daily revenue from completed orders</p>
            </div>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <BarChart data={chartData} />
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="font-outfit font-bold text-lg mb-4">Order Status</h2>
          <div className="space-y-2.5">
            {orderStatusBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm">No orders yet</p>
            ) : (
              orderStatusBreakdown.sort((a, b) => b.count - a.count).map(({ status, count }) => {
                const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
                const pct = Math.round((count / stats.totalOrders) * 100);
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs font-bold">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Orders */}
        <div className="lg:col-span-3 bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-outfit font-bold text-lg">Recent Orders</h2>
            <Link href="/admin/orders" className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y">
            {isLoading ? (
              [...Array(5)].map((_, i) => <div key={i} className="h-14 mx-5 my-2 bg-muted/20 rounded-lg animate-pulse" />)
            ) : recentOrders.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No orders yet</p>
              </div>
            ) : (
              recentOrders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={order.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.user?.name || 'Guest'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold text-sm">{formatPrice(order.totalAmount)}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions + Top Products */}
        <div className="lg:col-span-2 space-y-5">

          {/* Quick Actions */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <h2 className="font-outfit font-bold text-base mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/admin/products/new', icon: Package, label: 'Add Product', color: 'bg-primary/10 text-primary hover:bg-primary hover:text-white' },
                { href: '/admin/orders', icon: ShoppingBag, label: 'Manage Orders', color: 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white' },
                { href: '/admin/customers', icon: Users, label: 'Customers', color: 'bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white' },
                { href: '/admin/settings', icon: Star, label: 'Settings', color: 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' },
              ].map(q => {
                const Icon = q.icon;
                return (
                  <Link key={q.href} href={q.href}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all group ${q.color}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold text-center">{q.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-outfit font-bold text-base">Top Products</h2>
              <Link href="/admin/products" className="text-xs text-primary font-bold hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet</p>
              ) : topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} className="w-8 h-9 object-cover rounded border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.totalSold || 0} sold</p>
                  </div>
                  <p className="text-xs font-bold text-primary shrink-0">{formatPrice(p.salePrice || p.basePrice)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
