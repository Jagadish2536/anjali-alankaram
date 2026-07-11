'use client';
import { useEffect, useState } from 'react';
import { Search, Mail, Phone, Calendar, X, Plus, Edit2, Trash2, Loader2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
  });
  
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'CUSTOMER',
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/users');
      setCustomers(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setAddForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'CUSTOMER',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    // Strip prefix +91 for cleaner editing if it exists
    let displayPhone = user.phone || '';
    if (displayPhone.startsWith('+91')) {
      displayPhone = displayPhone.slice(3);
    }
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: displayPhone,
      password: '', // leave empty to keep current
      role: user.role || 'CUSTOMER',
    });
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email && !addForm.phone) {
      alert('Please provide either an email address or a phone number.');
      return;
    }
    if (addForm.password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: addForm.name,
        password: addForm.password,
        role: addForm.role,
      };
      if (addForm.email) payload.email = addForm.email;
      if (addForm.phone) payload.phone = addForm.phone;

      const { data } = await api.post('/users', payload);
      setCustomers([data, ...customers]);
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert('Failed to add customer: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editForm.email && !editForm.phone) {
      alert('Please provide either an email address or a phone number.');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: editForm.name,
        role: editForm.role,
        email: editForm.email || null,
        phone: editForm.phone || null,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const { data } = await api.put(`/users/${editingUser.id}`, payload);
      setCustomers(customers.map(c => c.id === editingUser.id ? data : c));
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert('Failed to save changes: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete customer "${userName || 'Unnamed User'}"?`)) return;

    try {
      await api.delete(`/users/${userId}`);
      setCustomers(customers.filter(c => c.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 sm:py-10 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground">Customer Directory</h1>
          <p className="text-muted-foreground mt-1">Manage and view your registered store users.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm"
        >
          <UserPlus className="w-5 h-5" /> Add Customer
        </button>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search customers by name, email, or phone..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted/20 border-transparent rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/5 text-muted-foreground font-medium border-b">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 hidden md:table-cell">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={4} className="p-10 text-center animate-pulse">Loading customers...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No customers found.</td></tr>
              ) : (
                filteredCustomers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{user.name || 'Unnamed User'}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-100' 
                              : user.role === 'ORDER_MANAGER'
                              ? 'bg-orange-50 text-orange-700 border-orange-100'
                              : user.role === 'STOCK_MANAGER'
                              ? 'bg-teal-50 text-teal-700 border-teal-100'
                              : 'bg-gray-50 text-gray-700 border-gray-100'
                          }`}>
                            {user.role === 'STOCK_MANAGER' ? 'PRODUCT_MANAGER' : user.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" /> {user.email || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" /> {user.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Add New Customer
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name</label>
                <input required type="text" placeholder="John Doe" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
                <input type="email" placeholder="john@example.com" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone Number (10-digit)</label>
                <input type="text" placeholder="9876543210" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
                <input required type="password" placeholder="••••••" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Role</label>
                <select className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })}>
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ORDER_MANAGER">Order Manager</option>
                  <option value="STOCK_MANAGER">Product Manager</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium hover:bg-muted text-sm transition-all">Cancel</button>
                <button disabled={isSaving} type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold font-outfit text-foreground flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" /> Edit Customer Details
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name</label>
                <input required type="text" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
                <input type="email" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone Number (10-digit)</label>
                <input type="text" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Password (Leave blank to keep current)</label>
                <input type="password" placeholder="••••••" className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Role</label>
                <select className="w-full px-4 py-2.5 bg-muted/20 border-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm transition-all" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="ORDER_MANAGER">Order Manager</option>
                  <option value="STOCK_MANAGER">Product Manager</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium hover:bg-muted text-sm transition-all">Cancel</button>
                <button disabled={isSaving} type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
