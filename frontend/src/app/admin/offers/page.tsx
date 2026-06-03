'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  Save,
  X,
  Check,
  Percent,
  Tag,
  Search,
} from 'lucide-react';

const EMPTY_OFFER = {
  title: '',
  buyQuantity: 1,
  getQuantity: 1,
  minProductPrice: '',
  maxProductPrice: '',
  isActive: true,
  productIds: [] as string[],
};

export default function AdminOffersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [offers, setOffers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offersEnabled, setOffersEnabled] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_OFFER });
  const [productSearch, setProductSearch] = useState('');

  // Notifications
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login?returnUrl=/admin/offers');
    const allowed = ['ADMIN', 'SUPER_ADMIN'];
    if (!allowed.includes(user?.role || '')) return router.push('/profile');

    loadData();
  }, [isAuthenticated, user, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Offers
      const { data: offersData } = await api.get('/offers');
      setOffers(offersData);

      // 2. Fetch Products for selection
      const { data: productsData } = await api.get('/products?limit=1000&status=ACTIVE');
      setProducts(productsData.data || []);

      // 3. Fetch Settings
      const { data: settingsData } = await api.get('/settings');
      setSettings(settingsData);
      setOffersEnabled(settingsData?.offersEnabled !== false);
    } catch (e: any) {
      console.error('Failed to load offers page data', e);
      setMsg({ type: 'err', text: 'Failed to load page data. Please refresh.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = async (val: boolean) => {
    setOffersEnabled(val);
    try {
      await api.post('/settings', {
        ...settings,
        offersEnabled: val,
      });
      setMsg({ type: 'ok', text: `Offers feature turned ${val ? 'ON' : 'OFF'} globally!` });
      // Update local settings state
      setSettings((prev: any) => ({ ...prev, offersEnabled: val }));
    } catch (e: any) {
      setMsg({ type: 'err', text: 'Failed to update global settings.' });
      setOffersEnabled(!val);
    }
  };

  const handleToggleOfferActive = async (offer: any) => {
    try {
      const newVal = !offer.isActive;
      await api.put(`/offers/${offer.id}`, {
        ...offer,
        isActive: newVal,
      });
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, isActive: newVal } : o));
      setMsg({ type: 'ok', text: `Offer "${offer.title}" ${newVal ? 'activated' : 'deactivated'}.` });
    } catch {
      setMsg({ type: 'err', text: 'Failed to toggle offer status.' });
    }
  };

  const openCreate = () => {
    setForm({ ...EMPTY_OFFER });
    setEditId(null);
    setProductSearch('');
    setShowForm(true);
  };

  const openEdit = (o: any) => {
    setForm({
      title: o.title,
      buyQuantity: o.buyQuantity,
      getQuantity: o.getQuantity,
      minProductPrice: o.minProductPrice ? String(o.minProductPrice) : '',
      maxProductPrice: o.maxProductPrice ? String(o.maxProductPrice) : '',
      isActive: o.isActive,
      productIds: o.productIds || [],
    });
    setEditId(o.id);
    setProductSearch('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return setMsg({ type: 'err', text: 'Offer title is required.' });
    if (form.buyQuantity < 1 || form.getQuantity < 1) {
      return setMsg({ type: 'err', text: 'Quantities must be at least 1.' });
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        buyQuantity: Number(form.buyQuantity),
        getQuantity: Number(form.getQuantity),
        minProductPrice: form.minProductPrice ? Number(form.minProductPrice) : null,
        maxProductPrice: form.maxProductPrice ? Number(form.maxProductPrice) : null,
        isActive: form.isActive,
        productIds: form.productIds,
      };

      if (editId) {
        await api.put(`/offers/${editId}`, payload);
      } else {
        await api.post('/offers', payload);
      }

      setMsg({ type: 'ok', text: `Offer ${editId ? 'updated' : 'created'} successfully!` });
      setShowForm(false);
      // Reload offers
      const { data: offersData } = await api.get('/offers');
      setOffers(offersData);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Failed to save offer.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/offers/${id}`);
      setOffers(prev => prev.filter(o => o.id !== id));
      setDeleteId(null);
      setMsg({ type: 'ok', text: 'Offer deleted successfully.' });
    } catch {
      setMsg({ type: 'err', text: 'Failed to delete offer.' });
    }
  };

  const handleProductSelectToggle = (productId: string) => {
    setForm(prev => {
      const exists = prev.productIds.includes(productId);
      const updated = exists
        ? prev.productIds.filter(id => id !== productId)
        : [...prev.productIds, productId];
      return { ...prev, productIds: updated };
    });
  };

  const filteredProductsForSelect = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Offers Management</h1>
          <p className="text-muted-foreground mt-1">Configure automated Buy X Get Y discounts with constraints.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Offer
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium animate-in fade-in ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Global Toggle Card */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Global Offers System</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Turn ON or OFF the auto-applied offers functionality at checkout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${offersEnabled ? 'text-primary' : 'text-gray-400'}`}>
            {offersEnabled ? 'ON / ACTIVE' : 'OFF / DISABLED'}
          </span>
          <button
            type="button"
            onClick={() => handleGlobalToggle(!offersEnabled)}
            className={`relative w-14 h-7 rounded-full transition-colors outline-none ${offersEnabled ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${offersEnabled ? 'translate-x-7' : ''}`} />
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b shrink-0">
              <h3 className="font-bold text-lg">{editId ? 'Edit Offer' : 'Create Offer'}</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1.5">Offer Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Buy 2 Get 1 Free on Kurtas"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Buy Quantity (X) *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.buyQuantity}
                    onChange={e => setForm(p => ({ ...p, buyQuantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Get Free Quantity (Y) *</label>
                  <input
                    type="number"
                    min={1}
                    value={form.getQuantity}
                    onChange={e => setForm(p => ({ ...p, getQuantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-bold text-sm mb-3">Product Price Constraint (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Min Product Price (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={form.minProductPrice}
                      onChange={e => setForm(p => ({ ...p, minProductPrice: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Max Product Price (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={form.maxProductPrice}
                      onChange={e => setForm(p => ({ ...p, maxProductPrice: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-sm">Select Applicable Products (Optional)</h4>
                  {form.productIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, productIds: [] }))}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      Clear Selection ({form.productIds.length})
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground -mt-2 mb-3">
                  Leave empty to apply this offer to all products in the selected price range.
                </p>

                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search products by name..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="border rounded-xl max-h-48 overflow-y-auto divide-y">
                  {filteredProductsForSelect.map(p => {
                    const isSelected = form.productIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleProductSelectToggle(p.id)}
                        className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span>{p.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatPrice(Number(p.salePrice || p.basePrice))}</span>
                      </div>
                    );
                  })}
                  {filteredProductsForSelect.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No active products match search.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between bg-gray-50">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  className={`relative w-10 h-5 rounded-full transition-colors outline-none ${form.isActive ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm font-semibold">{form.isActive ? 'Offer Active' : 'Offer Inactive'}</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offers List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl text-muted-foreground">
          <Percent className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
          <p className="font-bold text-base">No offers created yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create one above to offer Buy X Get Y discounts to customers.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/10 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Offer Title</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Formula</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Price Constraints</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Filter</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {offers.map(o => (
                  <tr key={o.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary">{o.title}</td>
                    <td className="px-6 py-4 font-semibold text-gray-700">
                      Buy {o.buyQuantity} Get {o.getQuantity} Free
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {o.minProductPrice || o.maxProductPrice ? (
                        <>
                          {o.minProductPrice ? `₹${o.minProductPrice}` : '0'}
                          {' - '}
                          {o.maxProductPrice ? `₹${o.maxProductPrice}` : '∞'}
                        </>
                      ) : (
                        'No price constraints'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {o.productIds && o.productIds.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 font-bold px-2.5 py-0.5 rounded-full border border-purple-100">
                          <Tag className="w-3 h-3" /> {o.productIds.length} Selected
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">All Products</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleOfferActive(o)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${o.isActive ? 'bg-primary' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${o.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(o)}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {deleteId === o.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <button
                              onClick={() => handleDelete(o.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(null)}
                              className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(o.id)}
                            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
