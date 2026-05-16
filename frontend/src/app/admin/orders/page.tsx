'use client';
import { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  MoreVertical,
  Download
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders?limit=50');
      setOrders(data.data || []);
    } catch (e) {
      console.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Orders Management</h1>
          <p className="text-muted-foreground mt-1">Track, update, and manage customer shipments.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by Order ID or Customer..." 
              className="w-full pl-10 pr-4 py-2 bg-muted/20 border-transparent rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-muted/20 rounded-lg text-sm font-medium hover:bg-muted/30">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/5 text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-6 py-4">Order Details</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="p-10 text-center animate-pulse">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No orders found.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold">#{order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{order.user?.name || 'Guest'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{order.user?.phone}</div>
                    </td>
                    <td className="px-6 py-4 font-bold">{formatPrice(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer ${
                          order.status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-200' :
                          order.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-primary/5 text-primary border-primary/20'
                        }`}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                         <ExternalLink className="w-4 h-4 text-muted-foreground" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
