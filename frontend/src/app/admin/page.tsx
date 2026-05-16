'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Users, Package, ShoppingBag, IndianRupee, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?returnUrl=/admin');
      return;
    }
    
    // Check if user is admin
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      setError('You do not have permission to access the admin dashboard.');
      setIsLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
      } catch (err: any) {
        setError('Failed to load dashboard stats. ' + (err.response?.data?.message || ''));
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [isAuthenticated, user, router]);

  if (isLoading) {
    return <div className="container py-20 text-center animate-pulse">Loading Admin Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="container py-20 max-w-2xl text-center">
        <div className="bg-red-50 text-red-600 p-8 rounded-2xl border border-red-100">
          <Activity className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-outfit font-bold mb-8 text-foreground">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Customers</p>
              <h3 className="text-2xl font-bold">{stats?.totalUsers || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold">{stats?.totalOrders || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold">{formatPrice(stats?.revenue || 0)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Products</p>
              <h3 className="text-2xl font-bold">{stats?.totalProducts || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex justify-between items-center bg-muted/20">
          <h2 className="text-xl font-bold">Recent Orders</h2>
          <button className="text-sm text-primary font-medium hover:underline">View All</button>
        </div>
        
        {stats?.recentOrders?.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/10 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats?.recentOrders?.map((order: any) => (
                  <tr key={order.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      {order.user?.name || 'Unknown'}<br/>
                      <span className="text-xs text-muted-foreground">{order.user?.email}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium 
                        ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
