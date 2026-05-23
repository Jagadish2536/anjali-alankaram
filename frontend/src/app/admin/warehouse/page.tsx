'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import {
  Warehouse, Package, CheckCircle2, Loader2, Plus, Search,
  Box, Truck, RefreshCw, BarChart3, AlertCircle, Check,
  ChevronDown, Edit3, MapPin, Phone, Mail, X
} from 'lucide-react';

// ─── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color] || 'bg-gray-50 text-gray-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-black">{value ?? 0}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Create Warehouse Modal ─────────────────────────────────────────
function CreateWarehouseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', isDefault: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/warehouse', form);
      onCreated();
      onClose();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create warehouse');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-black text-lg">Add Warehouse</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">Name *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Main Warehouse" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Code *</label>
              <input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono" placeholder="WH-BLR-01" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block">Address *</label>
            <input required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">City *</label>
              <input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Bangalore" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">State *</label>
              <input required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Karnataka" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Pincode *</label>
              <input required value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="560001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="wh@anjalialankaram.com" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-medium">Set as default warehouse</span>
          </label>
          <button type="submit" disabled={loading}
            className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Create Warehouse
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function AdminWarehousePage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWh, setSelectedWh] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [pickList, setPickList] = useState<any[]>([]);
  const [packingQueue, setPackingQueue] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'picklist' | 'packing' | 'inventory'>('overview');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF'].includes(user?.role)) {
      router.push('/admin');
    }
  }, [isAuthenticated, user, router]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const { data } = await api.get('/warehouse');
      setWarehouses(data);
      if (!selectedWh && data.length) {
        setSelectedWh(data[0]);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [selectedWh]);

  const fetchWarehouseData = useCallback(async (whId: string) => {
    const [statsRes, pickRes, packRes, invRes] = await Promise.allSettled([
      api.get(`/warehouse/${whId}/stats`),
      api.get(`/warehouse/${whId}/picklist`),
      api.get(`/warehouse/${whId}/packing-queue`),
      api.get(`/warehouse/${whId}/inventory?search=${inventorySearch}`),
    ]);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    if (pickRes.status === 'fulfilled') setPickList(pickRes.value.data);
    if (packRes.status === 'fulfilled') setPackingQueue(packRes.value.data);
    if (invRes.status === 'fulfilled') setInventory(invRes.value.data);
  }, [inventorySearch]);

  useEffect(() => { fetchWarehouses(); }, []);

  useEffect(() => {
    if (selectedWh?.id) fetchWarehouseData(selectedWh.id);
  }, [selectedWh?.id, fetchWarehouseData]);

  const handleMarkPicked = async (itemId: string, isPicked: boolean) => {
    setActionLoading(itemId);
    try {
      await api.put(`/warehouse/items/${itemId}/pick`, { isPicked });
      await fetchWarehouseData(selectedWh.id);
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleMarkPacked = async (itemId: string, isPacked: boolean) => {
    setActionLoading(itemId);
    try {
      await api.put(`/warehouse/items/${itemId}/pack`, { isPacked });
      await fetchWarehouseData(selectedWh.id);
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-outfit font-black flex items-center gap-2">
              <Warehouse className="w-6 h-6 text-primary" /> Warehouse Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage inventory, pick lists, and packing queues</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => selectedWh && fetchWarehouseData(selectedWh.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm border rounded-xl hover:bg-white transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 font-medium">
              <Plus className="w-4 h-4" /> Add Warehouse
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Warehouse Selector Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Warehouses ({warehouses.length})</p>
              </div>
              <div className="divide-y">
                {warehouses.map(wh => (
                  <button key={wh.id} onClick={() => setSelectedWh(wh)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors ${selectedWh?.id === wh.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">{wh.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{wh.code}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{wh.city}, {wh.state}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${wh.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {wh.status}
                        </span>
                        {wh.isDefault && <p className="text-[10px] text-primary font-bold mt-0.5">Default</p>}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{wh.activeOrders} active orders</span>
                      <span>·</span>
                      <span>{wh.totalStock} units</span>
                    </div>
                  </button>
                ))}
                {warehouses.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No warehouses yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-3 space-y-5">
            {selectedWh ? (
              <>
                {/* Warehouse Info */}
                <div className="bg-white border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-black">{selectedWh.name}</h2>
                      <p className="font-mono text-xs text-muted-foreground">{selectedWh.code}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedWh.address}, {selectedWh.city}</span>
                        {selectedWh.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selectedWh.phone}</span>}
                        {selectedWh.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selectedWh.email}</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${selectedWh.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {selectedWh.status}
                    </span>
                  </div>
                </div>

                {/* Stats Row */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard label="Pending Pick" value={stats.pendingPick} icon={Package} color="orange" />
                    <StatCard label="In Picking" value={stats.inPicking} icon={Box} color="blue" />
                    <StatCard label="Packed" value={stats.packed} icon={CheckCircle2} color="teal" />
                    <StatCard label="Ready to Ship" value={stats.readyForShipment} icon={Truck} color="purple" />
                    <StatCard label="Shipped Today" value={stats.shipped} icon={Truck} color="green" />
                    <StatCard label="Low Stock SKUs" value={stats.lowStockCount} icon={AlertCircle} color="red" />
                  </div>
                )}

                {/* Tabs */}
                <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex border-b overflow-x-auto">
                    {[
                      { key: 'overview', label: 'Overview' },
                      { key: 'picklist', label: `Pick List (${pickList.length})` },
                      { key: 'packing', label: `Packing Queue (${packingQueue.length})` },
                      { key: 'inventory', label: `Inventory (${inventory.length})` },
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                        className={`px-5 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                          activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}>{tab.label}</button>
                    ))}
                  </div>

                  <div className="p-5">
                    {/* ── OVERVIEW ── */}
                    {activeTab === 'overview' && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Select a tab to manage picking, packing, or inventory for <strong>{selectedWh.name}</strong>.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setActiveTab('picklist')}
                            className="flex items-center gap-3 p-4 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-left">
                            <Package className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-bold text-sm">Pick List</p>
                              <p className="text-xs text-muted-foreground">{pickList.length} orders to pick</p>
                            </div>
                          </button>
                          <button onClick={() => setActiveTab('packing')}
                            className="flex items-center gap-3 p-4 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-left">
                            <Box className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-bold text-sm">Packing Queue</p>
                              <p className="text-xs text-muted-foreground">{packingQueue.length} orders to pack</p>
                            </div>
                          </button>
                          <button onClick={() => setActiveTab('inventory')}
                            className="flex items-center gap-3 p-4 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-left">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-bold text-sm">Inventory</p>
                              <p className="text-xs text-muted-foreground">{inventory.length} SKUs tracked</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── PICK LIST ── */}
                    {activeTab === 'picklist' && (
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">Orders waiting to be picked from shelves. Check off each item as you pick it.</p>
                        {pickList.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">All caught up! No orders to pick.</p>
                          </div>
                        ) : pickList.map((order: any) => (
                          <div key={order.orderId} className="border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                              <div>
                                <p className="font-bold text-sm">#{order.orderNumber}</p>
                                <p className="text-xs text-muted-foreground">{order.customerName} · {order.city} {order.pincode}</p>
                              </div>
                              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                                order.status === 'PICKING' ? 'bg-amber-50 text-amber-700' : 'bg-orange-50 text-orange-700'
                              }`}>{order.status?.replace(/_/g,' ')}</span>
                            </div>
                            <div className="divide-y">
                              {order.items?.map((item: any) => (
                                <div key={item.itemId} className="flex items-center gap-3 px-4 py-3">
                                  <button
                                    onClick={() => handleMarkPicked(item.itemId, !item.isPicked)}
                                    disabled={actionLoading === item.itemId}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                                      item.isPicked ? 'bg-primary border-primary text-white' : 'border-gray-300 hover:border-primary'
                                    }`}>
                                    {actionLoading === item.itemId ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                      item.isPicked ? <Check className="w-3 h-3" /> : null}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${item.isPicked ? 'line-through text-muted-foreground' : ''}`}>
                                      {item.productName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.sku && <span className="font-mono">{item.sku} · </span>}
                                      Size: {item.size} {item.color && `· ${item.color}`} · Qty: {item.quantity}
                                    </p>
                                  </div>
                                  {item.imageUrl && (
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted/20 shrink-0">
                                      <Image src={item.imageUrl} alt="" fill className="object-cover" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── PACKING QUEUE ── */}
                    {activeTab === 'packing' && (
                      <div className="space-y-4">
                        <p className="text-xs text-muted-foreground">Orders that have been fully picked and are ready for packing.</p>
                        {packingQueue.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">No orders in packing queue.</p>
                          </div>
                        ) : packingQueue.map((order: any) => (
                          <div key={order.orderId} className="border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                              <div>
                                <p className="font-bold text-sm">#{order.orderNumber}</p>
                                <p className="text-xs text-muted-foreground">{order.customerName} · {order.city}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{order.pickedCount}/{order.totalItems} picked</span>
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${(order.pickedCount/order.totalItems)*100}%` }} />
                                </div>
                              </div>
                            </div>
                            <div className="divide-y">
                              {order.items?.map((item: any) => (
                                <div key={item.itemId} className="flex items-center gap-3 px-4 py-3">
                                  <button
                                    onClick={() => handleMarkPacked(item.itemId, !item.isPacked)}
                                    disabled={actionLoading === item.itemId}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                                      item.isPacked ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300 hover:border-teal-600'
                                    }`}>
                                    {actionLoading === item.itemId ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                      item.isPacked ? <Check className="w-3 h-3" /> : null}
                                  </button>
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${item.isPacked ? 'line-through text-muted-foreground' : ''}`}>{item.productName}</p>
                                    <p className="text-xs text-muted-foreground">Size: {item.size} · Qty: {item.quantity}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── INVENTORY ── */}
                    {activeTab === 'inventory' && (
                      <div>
                        <div className="relative mb-4">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input value={inventorySearch} onChange={e => setInventorySearch(e.target.value)}
                            placeholder="Search by product name or SKU..."
                            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary bg-gray-50" />
                        </div>
                        <div className="overflow-x-auto rounded-xl border">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase">Product / SKU</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Size</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">WH Stock</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Reserved</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Global Stock</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-muted-foreground uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {inventory.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3">
                                    <p className="font-medium leading-snug">{inv.productName}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground">{inv.sku}</p>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="font-mono text-xs">{inv.size}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center font-bold">{inv.quantity}</td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">{inv.reserved}</td>
                                  <td className="px-4 py-3 text-center text-muted-foreground">{inv.globalStock}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      inv.quantity <= 5 ? 'bg-red-50 text-red-600' :
                                      inv.quantity <= 15 ? 'bg-amber-50 text-amber-600' :
                                      'bg-green-50 text-green-600'
                                    }`}>
                                      {inv.quantity <= 5 ? 'Low' : inv.quantity <= 15 ? 'Medium' : 'Good'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {inventory.length === 0 && (
                                <tr><td colSpan={6} className="py-10 text-center text-muted-foreground text-sm">No inventory found</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
                <Warehouse className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-bold text-muted-foreground">No warehouse selected</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Add a warehouse to start managing fulfillment</p>
                <button onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90">
                  <Plus className="w-4 h-4" /> Add First Warehouse
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateWarehouseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { fetchWarehouses(); setShowCreateModal(false); }}
        />
      )}
    </div>
  );
}
