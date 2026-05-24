'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Settings,
  Bell,
  Shield,
  CreditCard,
  Globe,
  User,
  Save,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Info,
  Tag,
  Gift,
  Plus,
  Trash2,
  Pencil,
  X,
  Check
} from 'lucide-react';

// ── Reusable field components ─────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-shadow"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Toggle({ checked, onChange, label, desc, color = 'bg-primary' }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; color?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/5 transition-colors cursor-pointer" onClick={() => onChange(!checked)}>
      <div>
        <p className="text-sm font-bold">{label}</p>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? color : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  );
}

// ── Coupon Management Component ───────────────────────────────────────────────
const EMPTY_COUPON = {
  code: '', description: '', type: 'FIXED' as 'FIXED' | 'PERCENTAGE' | 'FREE_SHIPPING',
  value: 0, minOrderValue: '', maxDiscount: '', usageLimit: '',
  perUserLimit: '', expiresAt: '', isActive: true,
};

function CouponManagement() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_COUPON });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    try {
      const { data } = await api.get('/coupons');
      setCoupons(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY_COUPON }); setEditId(null); setShowForm(true); };
  const openEdit = (c: any) => {
    setForm({
      code: c.code, description: c.description || '', type: c.type,
      value: Number(c.value), minOrderValue: c.minOrderValue ? String(c.minOrderValue) : '',
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      perUserLimit: c.perUserLimit ? String(c.perUserLimit) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', isActive: c.isActive,
    });
    setEditId(c.id); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.value) return setMsg({ type: 'err', text: 'Code and value are required.' });
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.toUpperCase().trim(), description: form.description,
        type: form.type, value: Number(form.value), isActive: form.isActive,
        ...(form.minOrderValue && { minOrderValue: Number(form.minOrderValue) }),
        ...(form.maxDiscount && { maxDiscount: Number(form.maxDiscount) }),
        ...(form.usageLimit && { usageLimit: Number(form.usageLimit) }),
        ...(form.perUserLimit && { perUserLimit: Number(form.perUserLimit) }),
        ...(form.expiresAt && { expiresAt: new Date(form.expiresAt).toISOString() }),
      };
      if (editId) { await api.put(`/coupons/${editId}`, payload); }
      else { await api.post('/coupons', payload); }
      setMsg({ type: 'ok', text: `Coupon ${editId ? 'updated' : 'created'}!` });
      setShowForm(false); load();
    } catch (e: any) {
      setMsg({ type: 'err', text: e.response?.data?.message || 'Failed to save coupon.' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/coupons/${id}`);
      setDeleteId(null); load();
    } catch { setMsg({ type: 'err', text: 'Failed to delete coupon.' }); }
  };

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Coupon Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage discount coupons for customers.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Create Coupon
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg.type === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base">{editId ? 'Edit Coupon' : 'New Coupon'}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Coupon Code *</label>
              <input type="text" placeholder="e.g. SAVE100" value={form.code} onChange={f('code')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary uppercase" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Discount Type *</label>
                <select value={form.type} onChange={f('type')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary">
                <option value="FIXED">Fixed Amount (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FREE_SHIPPING">Free Shipping</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Discount Value * {form.type === 'PERCENTAGE' ? '(%)' : '(₹)'}
              </label>
              <input type="number" min={0} placeholder={form.type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 100'}
                value={form.value} onChange={f('value')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Min Order Value (₹)</label>
              <input type="number" min={0} placeholder="e.g. 500 (optional)"
                value={form.minOrderValue} onChange={f('minOrderValue')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {form.type === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Max Discount Cap (₹)</label>
                <input type="number" min={0} placeholder="e.g. 300 (optional)"
                  value={form.maxDiscount} onChange={f('maxDiscount')}
                  className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">Usage Limit</label>
              <input type="number" min={1} placeholder="e.g. 100 (optional)"
                value={form.usageLimit} onChange={f('usageLimit')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Per-User Limit</label>
              <input type="number" min={1} placeholder="e.g. 1 (optional)"
                value={form.perUserLimit} onChange={f('perUserLimit')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiresAt} onChange={f('expiresAt')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <input type="text" placeholder="Internal note (optional)" value={form.description} onChange={f('description')}
                className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex items-center gap-2 flex-1">
              <div onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative ${form.isActive ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm font-medium">{form.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Coupon List */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl text-muted-foreground">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No coupons yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/10 border-b">
              <tr>
                {['Code', 'Type', 'Value', 'Min Order', 'Used', 'Expires', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-muted/5 transition-colors">
                  <td className="px-4 py-3 font-bold font-mono text-primary">{c.code}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'PERCENTAGE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {c.type === 'PERCENTAGE' ? `${c.value}%` : `₹${c.value}`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.minOrderValue ? `₹${c.minOrderValue}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.usageCount}/{c.usageLimit ?? '∞'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(null)} className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteId(c.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
      )}
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { updateSettings } = useSettingsStore();
  const { user, setUser } = useAuthStore();
  const [activeSection, setActiveSection] = useState('General');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── General / Security / Notifications / Regional form state ──────────────
  const [formData, setFormData] = useState({
    storeName: 'Anjali Alankaram',
    supportEmail: 'support@anjalialankaram.com',
    supportPhone: '+91 9876543210',
    whatsappNumber: '+91 9876543210',
    instagramUrl: 'https://instagram.com/anjalialankaram',
    maintenanceMode: false,
    require2FA: false,
    notifyNewOrder: true,
    notifyLowStock: true,
    notifyCustomerSignup: true,
    // Regional
    currency: 'INR',
    currencySymbol: '₹',
    gstEnabled: true,
    gstRate: 18,
    freeShippingThreshold: 499,
    shippingCharge: 49,
    codEnabled: true,
    codCharges: 0,
    // Platform Fee
    platformFeeEnabled: false,
    platformFeeAmount: 0,
    // Coupons & Gift
    couponsEnabled: true,
    giftEnabled: true,
    giftAmount: 35,
    // Footer / Store Info
    storeDescription: '',
    contactEmail: '',
    contactPhone: '',
    returnPolicyDays: 7,
    footerCategories: '[]',
    marqueeText: 'Free Delivery',
  });

  // ── Payment form state ────────────────────────────────────────────────────
  const [paymentData, setPaymentData] = useState({
    razorpayKeyId: '',
    razorpayKeySecret: '',
    razorpayWebhookSecret: '',
    razorpayEnabled: false,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // ── Profile form state ────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    fetchSettings();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone?.replace('+91', '') || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (activeSection === 'Payments' && !paymentData.razorpayKeyId) {
      fetchPaymentConfig();
    }
  }, [activeSection]);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      if (data) {
        setFormData(prev => ({
          ...prev,
          ...data,
          // Serialize JSON field for textarea editing
          footerCategories: data.footerCategories
            ? (typeof data.footerCategories === 'string' ? data.footerCategories : JSON.stringify(data.footerCategories))
            : '[]',
        }));
      }
    } catch (e) {
      console.error('Failed to fetch settings');
    }
  };

  const fetchPaymentConfig = async () => {
    setPaymentLoading(true);
    try {
      const { data } = await api.get('/settings/payment');
      if (data) setPaymentData(data);
    } catch (e) {
      console.error('Failed to fetch payment config');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!isHydrated) return null;

  // ── Save handlers ─────────────────────────────────────────────────────────

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setSaveMsg({ type, text });
    setTimeout(() => setSaveMsg(null), 4000);
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      // Parse footerCategories from JSON string back to array
      let payload: any = { ...formData };
      try {
        payload.footerCategories = JSON.parse(formData.footerCategories || '[]');
      } catch { payload.footerCategories = []; }

      await api.post('/settings', payload);
      updateSettings(payload);
      showFeedback('success', 'Settings saved successfully!');
    } catch {
      showFeedback('error', 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayment = async () => {
    setIsSaving(true);
    try {
      const { data } = await api.post('/settings/payment', {
        razorpayKeyId: paymentData.razorpayKeyId,
        razorpayKeySecret: paymentData.razorpayKeySecret,
        razorpayWebhookSecret: paymentData.razorpayWebhookSecret,
      });
      showFeedback('success', data.message || 'Payment config saved!');
    } catch {
      showFeedback('error', 'Failed to save payment config.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      showFeedback('error', 'New passwords do not match.');
      return;
    }
    setProfileLoading(true);
    try {
      const payload: any = {
        name: profileData.name,
        email: profileData.email || undefined,
        phone: profileData.phone || undefined,
      };
      if (profileData.newPassword) {
        payload.password = profileData.newPassword;
      }
      const { data } = await api.put(`/users/${user.id}`, payload);
      setUser({ ...user, ...data });
      setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      showFeedback('success', 'Profile updated successfully!');
    } catch (e: any) {
      showFeedback('error', e?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSave = () => {
    if (activeSection === 'Payments') return handleSavePayment();
    if (activeSection === 'Profile') return handleSaveProfile();
    return handleSaveGeneral();
  };

  // ── Sidebar sections ──────────────────────────────────────────────────────

  const sections = [
    { name: 'General', icon: Settings, desc: 'Store details and contact info.' },
    { name: 'Security', icon: Shield, desc: 'Admin roles and permissions.' },
    { name: 'Notifications', icon: Bell, desc: 'Email and SMS alerts.' },
    { name: 'Payments', icon: CreditCard, desc: 'Razorpay integration.' },
    { name: 'Regional', icon: Globe, desc: 'Tax and shipping settings.' },
    { name: 'Coupons', icon: Tag, desc: 'Create and manage coupon codes.' },
    { name: 'Profile', icon: User, desc: 'Your account settings.' },
  ];

  const set = (key: string) => (val: any) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your store configuration and preferences.</p>
        </div>
        {saveMsg && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm animate-in fade-in slide-in-from-right-4 ${
            saveMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {saveMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {saveMsg.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.name;
            return (
              <button
                key={section.name}
                id={`settings-tab-${section.name.toLowerCase()}`}
                onClick={() => setActiveSection(section.name)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                  isActive ? 'bg-white border-primary shadow-md ring-1 ring-primary' : 'bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">{section.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{section.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div className="lg:col-span-2 bg-white border rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-8 border-b pb-4 flex items-center gap-2">
            {sections.find(s => s.name === activeSection)?.icon && (() => {
              const Icon = sections.find(s => s.name === activeSection)!.icon;
              return <Icon className="w-5 h-5 text-primary" />;
            })()}
            {activeSection} Settings
          </h2>

          {/* ── GENERAL ─────────────────────────────────────────────── */}
          {activeSection === 'General' && (
            <div className="space-y-6">
              <Field label="Store Name">
                <TextInput value={formData.storeName} onChange={set('storeName')} placeholder="Your store name" />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Support Email">
                  <TextInput value={formData.supportEmail} onChange={set('supportEmail')} type="email" />
                </Field>
                <Field label="Support Phone">
                  <TextInput value={formData.supportPhone} onChange={set('supportPhone')} />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="WhatsApp Number">
                  <TextInput value={formData.whatsappNumber} onChange={set('whatsappNumber')} />
                </Field>
                <Field label="Instagram URL">
                  <TextInput value={formData.instagramUrl} onChange={set('instagramUrl')} />
                </Field>
              </div>
              <div className="pt-4 border-t mt-2">
                <Toggle
                  checked={formData.maintenanceMode}
                  onChange={set('maintenanceMode')}
                  label="Maintenance Mode"
                  desc="Disable store access for customers while you make updates."
                  color="bg-orange-500"
                />
              </div>
              <div className="border-t pt-4">
                <Field label="Marquee Banner Text" hint="This scrolling text appears between sections on the homepage (e.g. 'Free Delivery on orders above ₹499').">
                  <TextInput value={formData.marqueeText || 'Free Delivery'} onChange={set('marqueeText')} placeholder="Free Delivery" />
                </Field>
              </div>
            </div>
          )}

          {/* ── SECURITY ─────────────────────────────────────────────── */}
          {activeSection === 'Security' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-bold mb-1">Admin Access</h3>
                <p className="text-sm text-muted-foreground mb-4">Manage who has access to this dashboard.</p>
                <div className="bg-muted/10 border rounded-xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {user?.name?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground">{user?.role}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">ACTIVE</span>
                </div>
              </div>
              <div className="pt-4 border-t space-y-3">
                <h3 className="text-base font-bold mb-3">Security Settings</h3>
                <Toggle
                  checked={formData.require2FA}
                  onChange={set('require2FA')}
                  label="Require 2FA for all admins"
                  desc="All admin accounts must set up two-factor authentication."
                  color="bg-primary"
                />
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ─────────────────────────────────────────── */}
          {activeSection === 'Notifications' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">Control which events trigger in-app admin notifications.</p>
              {[
                { key: 'notifyNewOrder', label: 'New Order Alert', desc: 'Notify admins when a customer places an order.' },
                { key: 'notifyLowStock', label: 'Low Stock Warning', desc: 'Alert when a product variant has ≤ 5 items remaining.' },
                { key: 'notifyCustomerSignup', label: 'Customer Signup', desc: 'Alert when a new user registers on the store.' },
              ].map(item => (
                <Toggle
                  key={item.key}
                  checked={formData[item.key as keyof typeof formData] as boolean}
                  onChange={set(item.key)}
                  label={item.label}
                  desc={item.desc}
                  color="bg-primary"
                />
              ))}
            </div>
          )}

          {/* ── PAYMENTS ─────────────────────────────────────────────── */}
          {activeSection === 'Payments' && (
            <div className="space-y-6">
              {paymentLoading ? (
                <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary/60" />
                  <p className="text-sm">Loading payment configuration…</p>
                </div>
              ) : (
                <>
                  {/* Status banner */}
                  <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                    paymentData.razorpayEnabled
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-orange-50 border-orange-200 text-orange-800'
                  }`}>
                    {paymentData.razorpayEnabled
                      ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                      : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <div>
                      <p className="font-bold text-sm">
                        Razorpay is currently {paymentData.razorpayEnabled ? 'active ✓' : 'not configured'}
                      </p>
                      <p className="text-xs mt-0.5">
                        {paymentData.razorpayEnabled
                          ? 'Online payments are enabled for your store.'
                          : 'Enter your Razorpay API keys below to enable online payments.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3">
                    <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-800">Where to get Razorpay keys?</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Go to{' '}
                        <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                          Razorpay Dashboard → Settings → API Keys
                        </a>
                        {' '}to generate your Test/Live keys. Changes take effect after restarting the server.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <Field label="Razorpay Key ID" hint="Starts with rzp_test_ (test) or rzp_live_ (production)">
                      <TextInput
                        value={paymentData.razorpayKeyId}
                        onChange={v => setPaymentData(prev => ({ ...prev, razorpayKeyId: v }))}
                        placeholder="rzp_test_xxxxxxxxxxxxxxxx"
                      />
                    </Field>

                    <Field label="Razorpay Key Secret" hint="Keep this secret — never share it publicly.">
                      <div className="relative">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          className="w-full px-4 py-2.5 pr-12 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-shadow"
                          value={paymentData.razorpayKeySecret}
                          onChange={e => setPaymentData(prev => ({ ...prev, razorpayKeySecret: e.target.value }))}
                          placeholder="Leave blank to keep existing secret"
                        />
                        <button type="button" onClick={() => setShowSecret(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>

                    <Field label="Razorpay Webhook Secret" hint="Set this in your Razorpay Webhook settings to verify incoming events.">
                      <div className="relative">
                        <input
                          type={showWebhook ? 'text' : 'password'}
                          className="w-full px-4 py-2.5 pr-12 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-shadow"
                          value={paymentData.razorpayWebhookSecret}
                          onChange={e => setPaymentData(prev => ({ ...prev, razorpayWebhookSecret: e.target.value }))}
                          placeholder="Leave blank to keep existing secret"
                        />
                        <button type="button" onClick={() => setShowWebhook(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground flex gap-2 items-start">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      Keys are stored in the server's <code className="font-mono bg-muted/30 px-1 rounded">.env</code> file.
                      A server restart is required for key changes to take effect.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── REGIONAL ─────────────────────────────────────────────── */}
          {activeSection === 'Regional' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold mb-4">Currency</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Currency Code" hint="e.g. INR, USD, EUR">
                    <select
                      className="w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      value={formData.currency}
                      onChange={e => {
                        const codes: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };
                        setFormData(prev => ({ ...prev, currency: e.target.value, currencySymbol: codes[e.target.value] || prev.currencySymbol }));
                      }}
                    >
                      {[['INR', 'INR — Indian Rupee (₹)'], ['USD', 'USD — US Dollar ($)'], ['EUR', 'EUR — Euro (€)'], ['GBP', 'GBP — British Pound (£)'], ['AED', 'AED — UAE Dirham (د.إ)']].map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Currency Symbol">
                    <TextInput value={formData.currencySymbol} onChange={set('currencySymbol')} placeholder="₹" />
                  </Field>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-bold mb-4">Tax Settings</h3>
                <div className="space-y-3">
                  <Toggle
                    checked={formData.gstEnabled}
                    onChange={set('gstEnabled')}
                    label="Enable GST on orders"
                    desc="Apply Goods and Services Tax to all products."
                    color="bg-primary"
                  />
                  {formData.gstEnabled && (
                    <Field label="GST Rate (%)" hint="Applied on product prices at checkout.">
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          className="w-full px-4 py-2.5 pr-10 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          value={formData.gstRate}
                          onChange={e => setFormData(prev => ({ ...prev, gstRate: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
                      </div>
                    </Field>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-bold mb-4">Shipping Settings</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Free Shipping Threshold (₹)" hint="Orders above this amount get free shipping. Set to 0 to always charge.">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{formData.currencySymbol}</span>
                        <input
                          type="number"
                          min={0}
                          className="w-full pl-8 pr-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          value={formData.freeShippingThreshold}
                          onChange={e => setFormData(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </Field>
                    <Field label="Standard Shipping Charge (₹)" hint="Charged for orders below the threshold. Set to 0 for free shipping always.">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{formData.currencySymbol}</span>
                        <input
                          type="number"
                          min={0}
                          className="w-full pl-8 pr-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          value={formData.shippingCharge}
                          onChange={e => setFormData(prev => ({ ...prev, shippingCharge: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </Field>
                  </div>
                  {Number(formData.shippingCharge) === 0 && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <Info className="w-4 h-4 text-green-600 shrink-0" />
                      <p className="text-xs text-green-800">Shipping charge is ₹0 — all orders will have free delivery.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-bold mb-4">Cash on Delivery</h3>
                <div className="space-y-4">
                  <Toggle
                    checked={formData.codEnabled}
                    onChange={set('codEnabled')}
                    label="Enable Cash on Delivery"
                    desc="Allow customers to pay in cash at delivery."
                    color="bg-primary"
                  />
                  {formData.codEnabled && (
                    <Field label="COD Extra Charges (₹)" hint="Additional fee charged for COD orders (0 = free).">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">{formData.currencySymbol}</span>
                        <input
                          type="number"
                          min={0}
                          className="w-full pl-8 pr-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          value={formData.codCharges}
                          onChange={e => setFormData(prev => ({ ...prev, codCharges: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </Field>
                  )}
                </div>
              </div>

              {/* Platform Fee */}
              <div className="border-t pt-6">
                <h3 className="text-base font-bold mb-4">Platform Fee</h3>
                <div className="space-y-4">
                  <Toggle
                    checked={formData.platformFeeEnabled}
                    onChange={set('platformFeeEnabled')}
                    label="Enable Platform Fee"
                    desc="Charge a fixed platform / convenience fee on every order."
                    color="bg-primary"
                  />
                  {formData.platformFeeEnabled && (
                    <Field label="Platform Fee Amount" hint="Fixed fee (in rupees) added to every order at checkout.">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-base">&#8377;</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="w-full pl-8 pr-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          value={formData.platformFeeAmount}
                          onChange={e => setFormData(prev => ({ ...prev, platformFeeAmount: parseFloat(e.target.value) || 0 }))}
                          placeholder="e.g. 29"
                        />
                      </div>
                    </Field>
                  )}
                  {formData.platformFeeEnabled && formData.platformFeeAmount > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        A convenience fee of <strong>&#8377;{formData.platformFeeAmount}</strong> will be added to every customer order at checkout.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Coupons Toggle ── */}
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <h3 className="font-bold text-base flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Coupons</h3>
                <Toggle
                  label="Enable Coupons"
                  desc="Allow customers to apply coupon codes at checkout."
                  checked={formData.couponsEnabled}
                  onChange={v => setFormData(prev => ({ ...prev, couponsEnabled: v }))}
                />
              </div>

              {/* ── Gift Packaging Toggle ── */}
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <h3 className="font-bold text-base flex items-center gap-2"><Gift className="w-4 h-4 text-primary" /> Gift Packaging</h3>
                <Toggle
                  label="Enable Gift Packaging"
                  desc="Show gift packaging add-on option at checkout."
                  checked={formData.giftEnabled}
                  onChange={v => setFormData(prev => ({ ...prev, giftEnabled: v }))}
                />
                {formData.giftEnabled && (
                  <Field label="Gift Packaging Amount" hint="Amount charged for gift packaging (in rupees).">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">&#8377;</span>
                      <input
                        type="number" min={0} step={1}
                        className="w-full pl-8 pr-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        value={formData.giftAmount}
                        onChange={e => setFormData(prev => ({ ...prev, giftAmount: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g. 35"
                      />
                    </div>
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* ── STORE INFO / FOOTER ───────────────────────────────────── */}
          {activeSection === 'Regional' && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-bold text-base mb-1">Store Info &amp; Footer</h3>
              <p className="text-sm text-muted-foreground mb-4">This information appears in the website footer.</p>
              <div className="space-y-4">
                <Field label="Store Description (Footer tagline)">
                  <textarea rows={2} value={formData.storeDescription}
                    onChange={e => setFormData(prev => ({ ...prev, storeDescription: e.target.value }))}
                    placeholder="Premium women's fashion celebrating Indian aesthetics..."
                    className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary resize-none" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Contact Email">
                    <input type="email" value={formData.contactEmail}
                      onChange={e => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="support@yourstore.com"
                      className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                  </Field>
                  <Field label="Contact Phone">
                    <input type="tel" value={formData.contactPhone}
                      onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="+91 9876543210"
                      className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                  </Field>
                </div>
                <Field label="Return Policy Window (days)" hint="Customers see this in the footer and on product pages">
                  <input type="number" min={1} max={90} value={formData.returnPolicyDays}
                    onChange={e => setFormData(prev => ({ ...prev, returnPolicyDays: parseInt(e.target.value) || 7 }))}
                    className="w-32 px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                </Field>
                <Field label="Footer Category Links (JSON)" hint='e.g. [{"name":"Sarees","slug":"sarees"},{"name":"New","slug":"new"}]'>
                  <textarea rows={3} value={formData.footerCategories}
                    onChange={e => setFormData(prev => ({ ...prev, footerCategories: e.target.value }))}
                    placeholder='[{"name":"New Arrivals","slug":"new"},{"name":"Sarees","slug":"sarees"}]'
                    className="w-full px-4 py-2.5 border rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-primary resize-none" />
                </Field>
              </div>
            </div>
          )}

          {/* ── COUPONS ───────────────────────────────────────────────── */}
          {activeSection === 'Coupons' && <CouponManagement />}

          {/* ── PROFILE ──────────────────────────────────────────────── */}
          {activeSection === 'Profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-muted/10 rounded-xl border">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                  {profileData.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-bold">{user?.name || 'Admin User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || user?.phone}</p>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1 inline-block">{user?.role}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <Field label="Full Name">
                    <TextInput value={profileData.name} onChange={v => setProfileData(prev => ({ ...prev, name: v }))} placeholder="Your name" />
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Field label="Email Address">
                      <TextInput value={profileData.email} onChange={v => setProfileData(prev => ({ ...prev, email: v }))} type="email" placeholder="admin@example.com" />
                    </Field>
                    <Field label="Phone Number" hint="Without country code (e.g. 9876543210)">
                      <div className="flex gap-2">
                        <span className="px-3 py-2.5 bg-muted/30 border rounded-xl text-sm font-medium text-muted-foreground">+91</span>
                        <input
                          type="tel"
                          className="flex-1 px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                          value={profileData.phone}
                          onChange={e => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="9876543210"
                          maxLength={10}
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-bold mb-1">Change Password</h3>
                <p className="text-sm text-muted-foreground mb-4">Leave blank if you don't want to change your password.</p>
                <div className="space-y-4">
                  <Field label="New Password" hint="Minimum 8 characters recommended.">
                    <div className="relative">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        className="w-full px-4 py-2.5 pr-12 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        value={profileData.newPassword}
                        onChange={e => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                      />
                      <button type="button" onClick={() => setShowNewPwd(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm New Password">
                    <input
                      type="password"
                      className={`w-full px-4 py-2.5 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary ${
                        profileData.confirmPassword && profileData.newPassword !== profileData.confirmPassword
                          ? 'border-red-400 focus:ring-red-400'
                          : ''
                      }`}
                      value={profileData.confirmPassword}
                      onChange={e => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Re-enter new password"
                    />
                    {profileData.confirmPassword && profileData.newPassword !== profileData.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Passwords do not match</p>
                    )}
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-10 flex justify-end border-t pt-6">
            <button
              id="settings-save-btn"
              onClick={handleSave}
              disabled={isSaving || profileLoading}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {(isSaving || profileLoading)
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving…</>
                : <><Save className="w-5 h-5" /> Save Changes</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
