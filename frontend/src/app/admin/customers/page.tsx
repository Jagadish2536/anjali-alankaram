'use client';
import { useEffect, useState } from 'react';
import { Search, Mail, Phone, Calendar, MoreVertical } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data } = await api.get('/users');
      // Backend might return { data: [], total: 0 } or just []
      setCustomers(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    if (!confirm(`Are you sure you want to make this user a ${newRole}?`)) return;

    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setCustomers(customers.map(c => c.id === userId ? { ...c, role: newRole } : c));
    } catch (e) {
      alert('Failed to update user role');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-outfit font-bold">Customer Directory</h1>
        <p className="text-muted-foreground mt-1">Manage and view your registered store users.</p>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              className="w-full pl-10 pr-4 py-2 bg-muted/20 border-transparent rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/5 text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={4} className="p-10 text-center animate-pulse">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No customers found.</td></tr>
              ) : (
                customers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold">{user.name || 'Unnamed User'}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            user.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Mail className="w-3 h-3 text-muted-foreground" /> {user.email || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Phone className="w-3 h-3 text-muted-foreground" /> {user.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3 h-3" /> {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => toggleAdminRole(user.id, user.role)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-white'
                          }`}
                        >
                          {user.role === 'ADMIN' ? 'Revoke Admin' : 'Make Admin'}
                        </button>
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
