'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  ChevronRight, Package, MapPin, Tag, Trash2, LogOut,
  User, CheckCircle2, Loader2, Plus, Pencil, X, Check,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'profile' | 'orders' | 'addresses' | 'coupons';

interface Address {
  id: string; name: string; phone: string; line1: string; line2?: string;
  city: string; state: string; pincode: string; isDefault: boolean;
}

// ── FloatLabel Input ──────────────────────────────────────────────────────────
function FloatInput({ label, value, onChange, type = 'text', readOnly = false, disabled = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; readOnly?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = !!value;
  return (
    <div className="relative border border-gray-300 rounded-sm bg-white">
      <label className={`absolute left-3 transition-all text-gray-500 pointer-events-none ${
        (focused || hasValue) ? 'top-1.5 text-[10px]' : 'top-4 text-sm'
      }`}>{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange?.(e.target.value)}
        className={`w-full pt-6 pb-2 px-3 text-sm bg-transparent outline-none ${readOnly || disabled ? 'text-gray-500' : 'text-gray-900'}`}
      />
    </div>
  );
}

// ── New Address Modal (reused from checkout) ──────────────────────────────────
function AddressModal({ onClose, onSave, initial }: {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Address | null;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '', phone: initial?.phone || '',
    pincode: initial?.pincode || '', line1: initial?.line1 || '',
    line2: initial?.line2 || '', city: initial?.city || '',
    state: initial?.state || '', isDefault: initial?.isDefault || false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.pincode || !form.line1 || !form.city) {
      alert('Please fill all required fields'); return;
    }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b shrink-0">
          <h2 className="text-base font-black tracking-widest uppercase">
            {initial ? 'Edit Address' : 'Add New Address'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <p className="text-xs font-black tracking-widest text-gray-500 uppercase">Contact Details</p>
          <FloatInput label="Name*" value={form.name} onChange={set('name')} />
          <FloatInput label="Mobile No*" value={form.phone} onChange={set('phone')} type="tel" />

          <p className="text-xs font-black tracking-widest text-gray-500 uppercase pt-2">Address</p>
          <FloatInput label="Pin Code*" value={form.pincode} onChange={set('pincode')} />
          <div>
            <FloatInput label="House Number/Tower/Block*" value={form.line1} onChange={set('line1')} />
            <p className="text-[11px] text-amber-600 mt-1 ml-1">*House Number will allow a doorstep delivery</p>
          </div>
          <div>
            <FloatInput label="Address (locality, building, street)" value={form.line2} onChange={set('line2')} />
            <p className="text-[11px] text-amber-600 mt-1 ml-1">*Please update society/apartment details</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FloatInput label="City / District*" value={form.city} onChange={set('city')} />
            <FloatInput label="State*" value={form.state} onChange={set('state')} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(p => ({ ...p, isDefault: !p.isDefault }))}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.isDefault ? 'bg-primary border-primary' : 'border-gray-300'}`}>
              {form.isDefault && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-medium text-gray-700">Make this as my default address</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 h-12 rounded-full border-2 border-gray-300 font-bold text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, setUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile form
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
  });
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [editAddr, setEditAddr] = useState<Address | null>(null);

  // My Coupons (admin-created, active coupons for awareness)
  const [availCoupons, setAvailCoupons] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login?returnUrl=/profile'); return; }
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone?.replace('+91', '') || '',
    });
    setIsEditingPhone(false);
    setIsEditingEmail(false);
    setIsEditingPassword(false);
    setPasswordForm({ password: '', confirmPassword: '' });
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    else if (tab === 'addresses') loadAddresses();
    else if (tab === 'coupons') loadCoupons();
  }, [tab]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try { const { data } = await api.get('/orders'); setOrders(data); }
    catch { /* ignore */ } finally { setOrdersLoading(false); }
  };

  const loadAddresses = async () => {
    setAddrLoading(true);
    try { const { data } = await api.get('/users/addresses'); setAddresses(data); }
    catch { /* ignore */ } finally { setAddrLoading(false); }
  };

  const loadCoupons = async () => {
    try { const { data } = await api.get('/coupons'); setAvailCoupons(data.filter((c: any) => c.isActive)); }
    catch { /* ignore */ }
  };

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const payload: any = {
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
      };

      if (isEditingPassword) {
        if (!passwordForm.password) {
          throw new Error('Please enter a password');
        }
        if (passwordForm.password !== passwordForm.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        payload.password = passwordForm.password;
      }

      const { data } = await api.put('/users/profile', payload);
      setUser({ ...user!, ...data });
      setSaveMsg({ ok: true, text: 'Details saved successfully!' });
      setIsEditingPhone(false);
      setIsEditingEmail(false);
      setIsEditingPassword(false);
      setPasswordForm({ password: '', confirmPassword: '' });
    } catch (e: any) {
      setSaveMsg({ ok: false, text: e.message || e.response?.data?.message || 'Failed to save.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  };

  const handleSaveAddress = async (formData: any) => {
    if (editAddr) {
      await api.put(`/users/addresses/${editAddr.id}`, formData);
    } else {
      await api.post('/users/addresses', formData);
    }
    setShowAddrModal(false); setEditAddr(null);
    loadAddresses();
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await api.delete(`/users/addresses/${id}`);
    loadAddresses();
  };

  const handleLogout = () => { logout(); router.push('/'); };

  if (!isAuthenticated) return null;

  // ── Sidebar Items ────────────────────────────────────────────────────────
  const navGroups = [
    {
      label: null,
      items: [{ id: 'overview' as Tab, label: 'Overview' }],
    },
    {
      label: 'ORDERS',
      items: [{ id: 'orders' as Tab, label: 'Orders & Returns' }],
    },
    {
      label: 'CREDITS',
      items: [{ id: 'coupons' as Tab, label: 'Coupons' }],
    },
    {
      label: 'ACCOUNT',
      items: [
        { id: 'profile' as Tab, label: 'Profile' },
        { id: 'addresses' as Tab, label: 'Addresses' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Top header */}
        <div className="mb-6">
          <h1 className="text-xl font-black">Account</h1>
          <p className="text-sm text-primary font-semibold mt-0.5">{user?.name || user?.email}</p>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── Sidebar ── */}
          <div className="w-48 shrink-0">
            {navGroups.map((group, gi) => (
              <div key={gi} className="mb-4">
                {group.label && (
                  <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2 px-1">{group.label}</p>
                )}
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`block w-full text-left px-1 py-1.5 text-sm transition-colors ${
                      tab === item.id
                        ? 'text-primary font-bold'
                        : 'text-gray-600 hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                {gi < navGroups.length - 1 && <hr className="mt-3 border-gray-200" />}
              </div>
            ))}

            <hr className="border-gray-200 mb-3" />
            <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2 px-1">LEGAL</p>
            <Link href="/terms" className="block px-1 py-1.5 text-sm text-gray-600 hover:text-primary">Terms of Use</Link>
            <Link href="/privacy" className="block px-1 py-1.5 text-sm text-gray-600 hover:text-primary">Privacy Center</Link>

            <hr className="border-gray-200 my-3" />
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-1 py-1.5 text-sm text-red-500 hover:text-red-600 font-medium w-full">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 bg-white border border-gray-200 rounded-sm min-h-[500px]">

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="p-8">
                <h2 className="text-lg font-black mb-6">Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Profile', sub: 'Edit your details', id: 'profile' as Tab, icon: User },
                    { label: 'Orders & Returns', sub: 'Track your orders', id: 'orders' as Tab, icon: Package },
                    { label: 'Addresses', sub: 'Manage delivery addresses', id: 'addresses' as Tab, icon: MapPin },
                    { label: 'Coupons', sub: 'View available coupons', id: 'coupons' as Tab, icon: Tag },
                  ].map(card => (
                    <button key={card.id} onClick={() => setTab(card.id)}
                      className="border border-gray-200 rounded-sm p-5 text-left hover:border-primary hover:shadow-sm transition-all group">
                      <card.icon className="w-6 h-6 text-gray-400 group-hover:text-primary mb-3 transition-colors" />
                      <p className="font-bold text-sm group-hover:text-primary transition-colors">{card.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROFILE */}
            {tab === 'profile' && (
              <div className="p-8">
                <h2 className="text-lg font-black mb-6 pb-4 border-b">Edit Details</h2>

                {saveMsg && (
                  <div className={`flex items-center gap-2 mb-5 px-4 py-3 rounded text-sm font-medium ${saveMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {saveMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {saveMsg.text}
                  </div>
                )}

                {/* Mobile */}
                <div className="border border-gray-200 rounded-sm p-4 flex items-center justify-between mb-4">
                  {isEditingPhone ? (
                    <div className="flex-1 mr-4">
                      <FloatInput label="Mobile Number" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">Mobile Number*</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{form.phone ? `+91 ${form.phone}` : 'Not set'}</span>
                        {user?.phone && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isEditingPhone) {
                        setForm(p => ({ ...p, phone: user?.phone?.replace('+91', '') || '' }));
                      }
                      setIsEditingPhone(!isEditingPhone);
                    }}
                    type="button"
                    className="border border-gray-300 px-6 py-2 text-xs font-black tracking-widest hover:border-gray-500 transition-colors shrink-0">
                    {isEditingPhone ? 'CANCEL' : 'CHANGE'}
                  </button>
                </div>

                {/* Email */}
                <div className="border border-gray-200 rounded-sm p-4 flex items-center justify-between mb-4">
                  {isEditingEmail ? (
                    <div className="flex-1 mr-4">
                      <FloatInput label="Email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} />
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">Email</p>
                      <span className="text-sm font-semibold">{form.email || 'Not set'}</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (isEditingEmail) {
                        setForm(p => ({ ...p, email: user?.email || '' }));
                      }
                      setIsEditingEmail(!isEditingEmail);
                    }}
                    type="button"
                    className="border border-gray-300 px-6 py-2 text-xs font-black tracking-widest hover:border-gray-500 transition-colors shrink-0">
                    {isEditingEmail ? 'CANCEL' : 'CHANGE'}
                  </button>
                </div>

                {/* Full Name */}
                <div className="mb-4">
                  <FloatInput label="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
                </div>

                {/* Password Section */}
                {user?.hasPassword ? (
                  <div className="border border-gray-200 rounded-sm p-4 flex items-center justify-between mb-6">
                    {isEditingPassword ? (
                      <div className="flex-1 mr-4 space-y-3">
                        <FloatInput
                          label="New Password"
                          type="password"
                          value={passwordForm.password}
                          onChange={v => setPasswordForm(p => ({ ...p, password: v }))}
                        />
                        <FloatInput
                          label="Confirm New Password"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={v => setPasswordForm(p => ({ ...p, confirmPassword: v }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Password</p>
                        <span className="text-sm font-semibold">••••••••</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setIsEditingPassword(!isEditingPassword);
                        setPasswordForm({ password: '', confirmPassword: '' });
                      }}
                      type="button"
                      className="border border-gray-300 px-6 py-2 text-xs font-black tracking-widest hover:border-gray-500 transition-colors shrink-0">
                      {isEditingPassword ? 'CANCEL' : 'CHANGE'}
                    </button>
                  </div>
                ) : (
                  <div className="border border-amber-200 rounded-sm p-4 flex items-center justify-between mb-6 bg-amber-50/20">
                    {isEditingPassword ? (
                      <div className="flex-1 mr-4 space-y-3">
                        <p className="text-xs text-amber-700 font-medium">Set a password to also log in with your email or phone number.</p>
                        <FloatInput
                          label="Set Password"
                          type="password"
                          value={passwordForm.password}
                          onChange={v => setPasswordForm(p => ({ ...p, password: v }))}
                        />
                        <FloatInput
                          label="Confirm Password"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={v => setPasswordForm(p => ({ ...p, confirmPassword: v }))}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] text-amber-600 mb-0.5">Password</p>
                        <span className="text-sm font-medium text-gray-500">Not set (Google SSO / OTP login)</span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setIsEditingPassword(!isEditingPassword);
                        setPasswordForm({ password: '', confirmPassword: '' });
                      }}
                      type="button"
                      className="border border-amber-300 text-amber-800 bg-amber-50 px-6 py-2 text-xs font-black tracking-widest hover:bg-amber-100 transition-colors shrink-0">
                      {isEditingPassword ? 'CANCEL' : 'SET PASSWORD'}
                    </button>
                  </div>
                )}

                {/* Save */}
                <button onClick={handleSave} disabled={saving}
                  className="w-full h-12 bg-primary text-primary-foreground font-black text-sm tracking-widest hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 rounded-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  SAVE DETAILS
                </button>
              </div>
            )}

            {/* ORDERS */}
            {tab === 'orders' && (
              <div className="p-8">
                <h2 className="text-lg font-black mb-6 pb-4 border-b">Orders & Returns</h2>
                {ordersLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                    <p className="font-bold text-gray-500">No orders yet</p>
                    <p className="text-sm text-gray-400 mt-1">Start shopping to see your orders here</p>
                    <Link href="/products" className="inline-block mt-4 text-primary font-bold text-sm hover:underline">Explore Products →</Link>
                  </div>
                ) : (
                  <div className="divide-y">
                    {orders.map((order: any) => (
                      <Link href={`/orders/${order.id}`} key={order.id}
                        className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-4 px-4 transition-colors group">
                        <div className="flex items-center gap-4">
                          {order.items?.[0]?.product?.images?.[0] ? (
                            <img src={order.items[0].product.images[0]} alt="" className="w-14 h-16 object-cover rounded border" />
                          ) : (
                            <div className="w-14 h-16 bg-gray-100 rounded border flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">
                              Order #{order.orderNumber}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · ₹{order.totalAmount}
                            </p>
                            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            <span className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                              order.status === 'DELIVERED' ? 'bg-green-50 text-green-700' :
                              order.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                              'bg-blue-50 text-blue-700'
                            }`}>{order.status?.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES */}
            {tab === 'addresses' && (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <h2 className="text-lg font-black">Saved Addresses</h2>
                  <button onClick={() => { setEditAddr(null); setShowAddrModal(true); }}
                    className="flex items-center gap-1.5 text-primary font-bold text-sm hover:underline">
                    <Plus className="w-4 h-4" /> Add New
                  </button>
                </div>
                {addrLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-16">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                    <p className="font-bold text-gray-500">No addresses saved</p>
                    <button onClick={() => { setEditAddr(null); setShowAddrModal(true); }}
                      className="mt-4 text-primary font-bold text-sm hover:underline">+ Add your first address</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr.id} className="border border-gray-200 rounded-sm p-4 relative">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-sm">{addr.name}</p>
                              {addr.isDefault && (
                                <span className="text-[10px] font-black px-2 py-0.5 border border-green-500 text-green-600 rounded-full">DEFAULT</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                            <p className="text-sm text-gray-500">{addr.city}, {addr.state} - {addr.pincode}</p>
                            <p className="text-sm font-medium mt-1">{addr.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                          <button onClick={() => { setEditAddr(addr); setShowAddrModal(true); }}
                            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                            <Pencil className="w-3 h-3" /> EDIT
                          </button>
                          <button onClick={() => handleDeleteAddress(addr.id)}
                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:underline">
                            <Trash2 className="w-3 h-3" /> REMOVE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COUPONS */}
            {tab === 'coupons' && (
              <div className="p-8">
                <h2 className="text-lg font-black mb-6 pb-4 border-b">Coupons</h2>
                {availCoupons.length === 0 ? (
                  <div className="text-center py-16">
                    <Tag className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                    <p className="font-bold text-gray-500">No coupons available</p>
                    <p className="text-sm text-gray-400 mt-1">Check back later for exciting offers</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availCoupons.map((c: any) => (
                      <div key={c.id} className="border border-dashed border-primary/40 rounded-xl p-4 flex items-center gap-4 bg-primary/[0.02]">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                          <Tag className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black font-mono text-primary text-base tracking-widest">{c.code}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'PERCENTAGE' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                              {c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {c.minOrderValue ? `Min. order ₹${c.minOrderValue}` : 'No min. order'}
                            {c.maxDiscount ? ` · Max discount ₹${c.maxDiscount}` : ''}
                          </p>
                          {c.expiresAt && (
                            <p className="text-[11px] text-amber-600 mt-0.5">
                              Expires {new Date(c.expiresAt).toLocaleDateString('en-IN')}
                            </p>
                          )}
                          {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(c.code); }}
                          className="text-xs font-black text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors shrink-0">
                          COPY
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddrModal && (
        <AddressModal
          onClose={() => { setShowAddrModal(false); setEditAddr(null); }}
          onSave={handleSaveAddress}
          initial={editAddr}
        />
      )}
    </div>
  );
}
