'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Search, ChevronDown, Check, RefreshCcw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  PACKED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800 border-orange-200',
  RETURNED: 'bg-gray-100 text-gray-800 border-gray-200',
  REFUNDED: 'bg-slate-100 text-slate-800 border-slate-200',
};

const ALL_STATUSES = Object.keys(STATUS_COLORS);

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login?returnUrl=/admin/orders');
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') return router.push('/profile');
    fetchOrders();
  }, [isAuthenticated, user, router]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/orders/admin/all');
      setOrders(data);
    } catch (e) {
      console.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/admin/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (e) {
      alert('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground">Order Management</h1>
          <p className="text-muted-foreground mt-1">Track shipments, update statuses, and process returns.</p>
        </div>
        <button onClick={fetchOrders} className="bg-white border text-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-muted transition-colors">
          <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-4 border-b bg-muted/10">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by Order ID, Customer, or Status..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/5 text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-6 py-4">Order Details</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && orders.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center animate-pulse">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No orders found.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-primary">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                      <p className="text-xs mt-2"><span className="font-medium">Payment:</span> {order.paymentStatus}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{order.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{order.user?.email}</p>
                      <p className="text-xs text-muted-foreground">{order.user?.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{order.items?.length || 0} items</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {order.items?.map((i: any) => i.product.name).join(', ')}
                      </p>
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {formatPrice(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 w-48">
                        <span className={`inline-block px-3 py-1.5 rounded-md text-xs font-bold border ${STATUS_COLORS[order.status] || STATUS_COLORS.PENDING}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        
                        <div className="relative group/dropdown">
                          <button className="w-full flex items-center justify-between px-3 py-1.5 bg-white border rounded text-xs font-medium hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            Update Status <ChevronDown className="w-3 h-3" />
                          </button>
                          
                          <div className="absolute right-0 top-full mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden z-10 hidden group-hover/dropdown:block group-focus-within/dropdown:block">
                            {ALL_STATUSES.map(s => (
                              <button 
                                key={s}
                                onClick={() => updateStatus(order.id, s)}
                                disabled={updatingId === order.id}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center justify-between
                                  ${order.status === s ? 'font-bold bg-muted/20' : ''}`}
                              >
                                {s.replace('_', ' ')}
                                {order.status === s && <Check className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
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
