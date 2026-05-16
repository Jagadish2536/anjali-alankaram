'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { User, MapPin, Package, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'details' | 'orders' | 'addresses'>('details');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login'); // Assuming /login exists, otherwise we'd need to handle auth here
      return;
    }

    if (activeTab === 'orders') {
      api.get('/orders').then(res => setOrders(res.data)).catch(console.error);
    } else if (activeTab === 'addresses') {
      api.get('/users/addresses').then(res => setAddresses(res.data)).catch(console.error);
    }
  }, [activeTab, isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-outfit font-bold mb-8">My Account</h1>
      
      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          <button 
            onClick={() => setActiveTab('details')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'details' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
          >
            <User className="w-5 h-5" /> Account Details
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'orders' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
          >
            <Package className="w-5 h-5" /> My Orders
          </button>
          <button 
            onClick={() => setActiveTab('addresses')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'addresses' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
          >
            <MapPin className="w-5 h-5" /> Saved Addresses
          </button>
          <button 
            onClick={() => { logout(); router.push('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-500 hover:bg-red-50 transition-colors mt-8"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border rounded-2xl p-6 md:p-8">
          {activeTab === 'details' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Account Details</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
                  <p className="font-medium p-3 bg-muted/30 rounded-lg">{user?.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                  <p className="font-medium p-3 bg-muted/30 rounded-lg">{user?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Phone Number</label>
                  <p className="font-medium p-3 bg-muted/30 rounded-lg">{user?.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h2 className="text-xl font-bold mb-6">Order History</h2>
              {orders.length === 0 ? (
                <p className="text-muted-foreground">You haven't placed any orders yet.</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <Link href={`/orders/${order.id}`} key={order.id} className="border rounded-xl p-4 flex justify-between items-center hover:border-primary/50 hover:bg-muted/10 transition-all cursor-pointer group">
                      <div>
                        <p className="font-medium group-hover:text-primary transition-colors">Order #{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">₹{order.totalAmount}</p>
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold mt-1 uppercase tracking-wider
                            ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-muted-foreground group-hover:text-primary transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Saved Addresses</h2>
                <button className="text-sm text-primary font-medium hover:underline">+ Add New</button>
              </div>
              {addresses.length === 0 ? (
                <p className="text-muted-foreground">No saved addresses found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr: any) => (
                    <div key={addr.id} className="border rounded-xl p-4 relative">
                      {addr.isDefault && (
                        <span className="absolute top-4 right-4 bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded">
                          DEFAULT
                        </span>
                      )}
                      <p className="font-medium">{addr.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{addr.line1}, {addr.line2}</p>
                      <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-sm font-medium mt-2">{addr.phone}</p>
                      <div className="flex gap-3 mt-4 pt-4 border-t">
                        <button className="text-sm text-primary hover:underline">Edit</button>
                        <button className="text-sm text-red-500 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
