'use client';
import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    salesGrowth: 12.5,
    orderGrowth: 8.2,
    customerGrowth: -2.4
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // In a real app, you'd have an /admin/stats endpoint
      // For now, we simulate or derive from public endpoints
      const [ordersRes, usersRes] = await Promise.all([
        api.get('/orders?limit=10'),
        api.get('/users?limit=1').catch(() => ({ data: { total: 0 } })) // Dummy or actual if exists
      ]);

      setRecentOrders(ordersRes.data.data || []);
      setStats({
        totalSales: ordersRes.data.data?.reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0) || 0,
        totalOrders: ordersRes.data.total || 0,
        totalCustomers: 42, // Mocked for now
        pendingOrders: ordersRes.data.data?.filter((o: any) => o.status === 'PENDING').length || 0,
        salesGrowth: 15.4,
        orderGrowth: 10.2,
        customerGrowth: 5.1
      });
    } catch (e) {
      console.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { name: 'Total Revenue', value: formatPrice(stats.totalSales), icon: TrendingUp, growth: stats.salesGrowth, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, growth: stats.orderGrowth, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Total Customers', value: stats.totalCustomers, icon: Users, growth: stats.customerGrowth, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Pending Orders', value: stats.pendingOrders, icon: Clock, growth: 0, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground">Welcome back, Admin</h1>
          <p className="text-muted-foreground mt-1">Here is what's happening with Anjali Alankaram today.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-muted transition-colors">Download Report</button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">View Store</button>
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {card.growth !== 0 && (
                  <span className={`flex items-center gap-1 text-xs font-bold ${card.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {card.growth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(card.growth)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-medium">{card.name}</p>
              <h3 className="text-2xl font-outfit font-bold mt-1">{card.value}</h3>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="font-outfit font-bold text-lg">Recent Orders</h2>
            <button className="text-primary text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/5 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                   <tr><td colSpan={4} className="p-8 text-center animate-pulse">Loading orders...</td></tr>
                ) : recentOrders.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No orders yet.</td></tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/5">
                      <td className="px-6 py-4 font-medium">#{order.orderNumber}</td>
                      <td className="px-6 py-4">{order.user?.name || 'Customer'}</td>
                      <td className="px-6 py-4 font-medium">{formatPrice(order.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          order.status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-100' :
                          order.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Activity */}
        <div className="space-y-6">
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="font-outfit font-bold text-lg mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-left group">
                <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Add Product</p>
                  <p className="text-xs text-muted-foreground">Upload new collection</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-xl border hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Manage Orders</p>
                  <p className="text-xs text-muted-foreground">Handle shipments</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-xl border hover:border-green-500 hover:bg-green-50 transition-all text-left group">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-all">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Bulk Update</p>
                  <p className="text-xs text-muted-foreground">Update inventory prices</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
