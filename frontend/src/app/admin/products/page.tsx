'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2,
  Loader2, Save, X, ImageIcon, PlusCircle, Instagram, ExternalLink, AlertTriangle
} from 'lucide-react';

// ── Confirm Dialog ───────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="font-black text-base">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl border-2 border-border text-sm font-bold hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}



interface SizeRow { size: string; bust: string; waist: string; hips: string; length: string; }
interface EditFormData {
  name: string;
  description: string;
  material: string;
  careInstructions: string;
  basePrice: string;
  salePrice: string;
  status: string;
  categoryId: string;
  images: string[];
  instagramReelUrl: string;
  codAvailable: boolean;
  returnEnabled: boolean;
  replaceEnabled: boolean;
  returnDays: string;
  sizeGuide: SizeRow[];
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ name: '', description: '', material: '', careInstructions: '', basePrice: '', salePrice: '', status: 'ACTIVE', categoryId: '', images: [''], instagramReelUrl: '', codAvailable: true, returnEnabled: true, replaceEnabled: true, returnDays: '14', sizeGuide: [] });
  const [editVariants, setEditVariants] = useState<{ id?: string; size: string; color: string; stock: number; sku: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login?returnUrl=/admin/products');
    const allowed = ['ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER'];
    if (!allowed.includes(user?.role || '')) return router.push('/profile');
    fetchProducts();
    fetchCategories();
  }, [isAuthenticated, user, router]);

  const fetchProducts = async (force = false) => {
    setIsLoading(true);
    try {
      const t = force ? `&t=${Date.now()}` : '';
      const { data } = await api.get(`/products?limit=100&status=ALL${t}`);
      setProducts(data.data);
    } catch (e) {
      console.error('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch (e) {}
  };

  const toggleFeature = async (productId: string, field: 'isNewArrival' | 'isFeatured' | 'isBestseller', currentValue: boolean) => {
    try {
      await api.put(`/products/${productId}`, { [field]: !currentValue });
      setProducts(products.map(p => p.id === productId ? { ...p, [field]: !currentValue } : p));
    } catch (e) {
      alert('Failed to update product');
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description || '',
      material: product.material || '',
      careInstructions: product.careInstructions || '',
      basePrice: String(product.basePrice || ''),
      salePrice: String(product.salePrice || ''),
      status: product.status || 'ACTIVE',
      categoryId: product.categoryId || '',
      images: product.images?.length > 0 ? product.images : [''],
      instagramReelUrl: product.instagramReelUrl || '',
      codAvailable: product.codAvailable !== false,
      returnEnabled: product.returnEnabled !== false,
      replaceEnabled: product.replaceEnabled !== false,
      returnDays: String(product.returnDays ?? 0),
      sizeGuide: product.sizeGuide || [],
    });
    setEditVariants(product.variants?.length > 0
      ? product.variants.map((v: any) => ({ id: v.id, size: v.size, color: v.color || '', stock: v.stock, sku: v.sku || '' }))
      : [{ size: '', color: '', stock: 0, sku: '' }]
    );
  };

  const closeEdit = () => {
    setEditingProduct(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      const payload: any = {
        name: editForm.name,
        description: editForm.description,
        material: editForm.material || null,
        careInstructions: editForm.careInstructions || null,
        basePrice: Number(editForm.basePrice),
        status: editForm.status,
        categoryId: editForm.categoryId,
        images: editForm.images.filter(img => img.trim() !== ''),
        instagramReelUrl: editForm.instagramReelUrl.trim() || null,
        codAvailable: editForm.codAvailable,
        returnEnabled: editForm.returnEnabled,
        replaceEnabled: editForm.replaceEnabled,
        returnDays: Number(editForm.returnDays) || 0,
        sizeGuide: editForm.sizeGuide.length > 0 ? editForm.sizeGuide : null,
        variants: editVariants.filter(v => v.size.trim() !== '').map(v => ({
          ...(v.id ? { id: v.id } : {}),
          size: v.size,
          color: v.color || null,
          stock: Number(v.stock),
          sku: v.sku || `${editForm.name.substring(0, 3).toUpperCase()}-${v.size}-${Date.now()}`,
        })),
      };
      if (editForm.salePrice) payload.salePrice = Number(editForm.salePrice);

      const { data } = await api.put(`/products/${editingProduct.id}`, payload);
      setProducts(prods => prods.map(p => p.id === editingProduct.id ? { ...p, ...data } : p));
      closeEdit();
    } catch (err: any) {
      alert('Failed to save: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(index);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newImages = [...editForm.images];
      newImages[index] = data.url;
      setEditForm({ ...editForm, images: newImages });
    } catch (err: any) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(null);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await api.delete(`/products/${productId}`);
      setProducts(prods => prods.filter(p => p.id !== productId));
      setConfirmDelete(null);
    } catch (err: any) {
      alert('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 sm:py-10">
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${confirmDelete.name}"?`}
          message="This action cannot be undone. The product will be permanently removed from your store."
          onConfirm={() => deleteProduct(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground">Catalogue Management</h1>
          <p className="text-muted-foreground mt-1">Manage inventory, mark new arrivals, and track out-of-stock items.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => fetchProducts(true)}
            className="px-4 py-2.5 rounded-lg border font-medium hover:bg-muted transition-colors"
          >
            Refresh
          </button>
          <Link href="/admin/products/new" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Plus className="w-5 h-5" /> Add New Product
          </Link>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold font-outfit">Edit Product</h2>
              <button onClick={closeEdit} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input required type="text" className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="DRAFT">Draft</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea rows={3} className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Material</label>
                  <input type="text" placeholder="e.g. Pure Silk, Cotton Blend" className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.material} onChange={e => setEditForm({ ...editForm, material: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Care Instructions</label>
                  <input type="text" placeholder="e.g. Dry clean only" className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.careInstructions} onChange={e => setEditForm({ ...editForm, careInstructions: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.categoryId} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })}>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Base Price ₹</label>
                  <input required type="number" className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.basePrice} onChange={e => setEditForm({ ...editForm, basePrice: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sale Price ₹</label>
                  <input type="number" placeholder="Optional" className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary" value={editForm.salePrice} onChange={e => setEditForm({ ...editForm, salePrice: e.target.value })} />
                </div>
              </div>

              {/* Images */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Images</label>
                  <button type="button" onClick={() => setEditForm({ ...editForm, images: [...editForm.images, ''] })} className="text-primary text-xs font-bold flex items-center gap-1 hover:underline">
                    <PlusCircle className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {editForm.images.map((url, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <div className="relative">
                          <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input type="url" placeholder="Image URL" className="w-full pl-9 pr-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm" value={url} onChange={e => { const imgs = [...editForm.images]; imgs[i] = e.target.value; setEditForm({ ...editForm, images: imgs }); }} />
                        </div>
                        <label className="inline-flex items-center gap-1 cursor-pointer bg-muted hover:bg-muted/80 px-3 py-1 rounded-lg text-xs font-bold mt-1 transition-all">
                          {isUploading === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          {isUploading === i ? 'Uploading...' : url ? 'Change' : 'Upload'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(i, e)} />
                        </label>
                      </div>
                      {editForm.images.length > 1 && (
                        <button type="button" onClick={() => setEditForm({ ...editForm, images: editForm.images.filter((_, idx) => idx !== i) })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instagram Reel */}
              <div className="rounded-xl overflow-hidden border">
                <div
                  className="px-4 py-3 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
                >
                  <Instagram className="w-4 h-4 text-white" />
                  <span className="text-sm font-bold text-white">Instagram Reel</span>
                  <span className="text-white/70 text-xs ml-1">(optional)</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="relative">
                    <Instagram className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" />
                    <input
                      id="edit-instagram-reel-url"
                      type="url"
                      placeholder="https://www.instagram.com/reel/ABC123xYz/"
                      className="w-full pl-9 pr-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-pink-400 text-sm transition-shadow"
                      value={editForm.instagramReelUrl}
                      onChange={e => setEditForm({ ...editForm, instagramReelUrl: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">On Instagram: open the reel → tap ⋯ → <strong>Copy Link</strong></p>

                  {editForm.instagramReelUrl.trim() && (() => {
                    const match = editForm.instagramReelUrl.match(/instagram\.com\/(reel|p)\/([A-Za-z0-9_-]+)/);
                    if (!match) return (
                      <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                        <X className="w-3.5 h-3.5 shrink-0" /> Not a valid Instagram reel URL
                      </div>
                    );
                    const shortcode = match[2];
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 font-medium">
                          <Instagram className="w-3.5 h-3.5" /> Reel detected ✓
                          <a href={editForm.instagramReelUrl} target="_blank" rel="noopener noreferrer"
                            className="ml-auto flex items-center gap-1 underline text-green-600">
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex justify-center bg-gradient-to-b from-pink-50 to-purple-50 rounded-xl py-4">
                          <iframe
                            src={`https://www.instagram.com/reel/${shortcode}/embed/`}
                            width="280"
                            height="380"
                            frameBorder="0"
                            scrolling="no"
                            allowTransparency
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                            className="rounded-xl"
                            title="Instagram Reel Preview"
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">Preview of how the reel will appear on the product page</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Delivery & Returns */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b flex items-center gap-2">
                  <span className="text-sm font-bold text-blue-800">🚚 Delivery & Returns</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Cash on Delivery (COD)</p>
                      <p className="text-xs text-muted-foreground">Allow customers to pay on delivery</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, codAvailable: !editForm.codAvailable })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${editForm.codAvailable ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.codAvailable ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Return Window (days)</label>
                    <input
                      type="number" min={0} max={90}
                      className="w-32 px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                      value={editForm.returnDays}
                      onChange={e => setEditForm({ ...editForm, returnDays: e.target.value })}
                    />
                    <span className="ml-2 text-sm text-muted-foreground">days (0 = no returns)</span>
                  </div>

                  {/* Return toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Return Available</p>
                      <p className="text-xs text-muted-foreground">Allow customers to return this product within the window</p>
                    </div>
                    <button type="button" onClick={() => setEditForm({ ...editForm, returnEnabled: !editForm.returnEnabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${editForm.returnEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.returnEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  {/* Replacement toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Replacement Available</p>
                      <p className="text-xs text-muted-foreground">Allow customers to request a size/product replacement</p>
                    </div>
                    <button type="button" onClick={() => setEditForm({ ...editForm, replaceEnabled: !editForm.replaceEnabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${editForm.replaceEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.replaceEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Size Guide */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-purple-50 border-b flex items-center justify-between">
                  <span className="text-sm font-bold text-purple-800">📏 Size Guide Table</span>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, sizeGuide: [...editForm.sizeGuide, { size: '', bust: '', waist: '', hips: '', length: '' }] })}
                    className="text-xs font-bold text-purple-700 flex items-center gap-1 hover:underline"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Row
                  </button>
                </div>
                <div className="p-4">
                  {editForm.sizeGuide.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No size guide added. Click "Add Row" to start building the size chart.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            {['Size', 'Bust (in)', 'Waist (in)', 'Hips (in)', 'Length (in)', ''].map(h => (
                              <th key={h} className="pb-2 pr-2 text-left font-semibold text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="space-y-1">
                          {editForm.sizeGuide.map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              {(['size', 'bust', 'waist', 'hips', 'length'] as const).map(field => (
                                <td key={field} className="py-1 pr-2">
                                  <input
                                    type="text"
                                    placeholder={field === 'size' ? 'e.g. S' : '0'}
                                    className="w-full px-2 py-1 border rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                                    value={row[field]}
                                    onChange={e => {
                                      const updated = [...editForm.sizeGuide];
                                      updated[i] = { ...updated[i], [field]: e.target.value };
                                      setEditForm({ ...editForm, sizeGuide: updated });
                                    }}
                                  />
                                </td>
                              ))}
                              <td className="py-1">
                                <button
                                  type="button"
                                  onClick={() => setEditForm({ ...editForm, sizeGuide: editForm.sizeGuide.filter((_, idx) => idx !== i) })}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Variants / Sizes & Stock */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-green-50 border-b flex items-center justify-between">
                  <span className="text-sm font-bold text-green-800">📦 Sizes & Stock</span>
                  <button
                    type="button"
                    onClick={() => setEditVariants([...editVariants, { size: '', color: '', stock: 0, sku: '' }])}
                    className="text-xs font-bold text-green-700 flex items-center gap-1 hover:underline"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Size
                  </button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground uppercase mb-2 px-1">
                    <div className="col-span-4">Size</div>
                    <div className="col-span-4">Colour</div>
                    <div className="col-span-3">Stock</div>
                    <div className="col-span-1"></div>
                  </div>
                  <div className="space-y-2">
                    {editVariants.map((v, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                          <input
                            type="text"
                            placeholder="e.g. S, M, L, XL"
                            className="w-full px-3 py-2 bg-muted/20 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                            value={v.size}
                            onChange={e => {
                              const updated = [...editVariants];
                              updated[i] = { ...updated[i], size: e.target.value };
                              setEditVariants(updated);
                            }}
                          />
                        </div>
                        <div className="col-span-4 flex items-center gap-2">
                          <input
                            type="color"
                            className="w-9 h-9 rounded-lg border cursor-pointer shrink-0"
                            value={v.color || '#8B0030'}
                            onChange={e => {
                              const updated = [...editVariants];
                              updated[i] = { ...updated[i], color: e.target.value };
                              setEditVariants(updated);
                            }}
                            title="Pick colour"
                          />
                          <input
                            type="text"
                            placeholder="e.g. Red"
                            className="w-full px-2 py-2 bg-muted/20 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                            value={v.color || ''}
                            onChange={e => {
                              const updated = [...editVariants];
                              updated[i] = { ...updated[i], color: e.target.value };
                              setEditVariants(updated);
                            }}
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number" min={0}
                            placeholder="0"
                            className="w-full px-3 py-2 bg-muted/20 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                            value={v.stock}
                            onChange={e => {
                              const updated = [...editVariants];
                              updated[i] = { ...updated[i], stock: Number(e.target.value) };
                              setEditVariants(updated);
                            }}
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {editVariants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEditVariants(editVariants.filter((_, idx) => idx !== i))}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button type="button" onClick={closeEdit} className="px-5 py-2 rounded-lg font-medium hover:bg-muted">Cancel</button>
                <button disabled={isSaving} type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/10 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
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
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock Status</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center animate-pulse">Loading catalogue...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No products found.</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const totalStock = product.variants?.reduce((sum: number, v: any) => sum + v.stock, 0) || 0;
                  const isOutOfStock = totalStock === 0;

                  return (
                    <tr key={product.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-4">
                        <div className="relative w-12 h-16 rounded overflow-hidden bg-accent/20 shrink-0">
                          {product.images?.[0] && <Image src={product.images[0]} alt={product.name} fill className="object-cover" />}
                        </div>
                        <div>
                          <p className="font-medium max-w-[200px] truncate" title={product.name}>{product.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{product.variants?.length || 0} variants</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{formatPrice(product.salePrice || product.basePrice)}</span>
                        {product.salePrice && Number(product.salePrice) < Number(product.basePrice) && (
                          <div className="text-xs text-muted-foreground line-through mt-0.5">{formatPrice(product.basePrice)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isOutOfStock ? (
                          <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-xs font-bold w-fit border border-red-100">
                            <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-1 rounded-full text-xs font-bold w-fit border border-green-100">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {totalStock} in stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleFeature(product.id, 'isNewArrival', product.isNewArrival)}
                            className={`text-[10px] px-2 py-1 rounded border font-bold transition-colors ${product.isNewArrival ? 'bg-primary/10 text-primary border-primary/20' : 'text-muted-foreground bg-muted/20 hover:bg-muted'}`}
                          >
                            NEW
                          </button>
                          <button
                            onClick={() => toggleFeature(product.id, 'isBestseller', product.isBestseller)}
                            className={`text-[10px] px-2 py-1 rounded border font-bold transition-colors ${product.isBestseller ? 'bg-orange-50 text-orange-600 border-orange-200' : 'text-muted-foreground bg-muted/20 hover:bg-muted'}`}
                          >
                            BESTSELLER
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: product.id, name: product.name })}
                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
