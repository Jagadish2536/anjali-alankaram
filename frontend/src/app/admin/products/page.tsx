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
  Loader2, Save, X, ImageIcon, PlusCircle, Instagram, ExternalLink, AlertTriangle,
  BarChart3, Printer, FileDown, RefreshCw, PackageCheck, PackageX
} from 'lucide-react';
import * as XLSX from 'xlsx';

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


// ── Color name ↔ hex lookup (bidirectional sync) ───────────────────────────
const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: '#ff0000', crimson: '#dc143c', maroon: '#800000', rose: '#ff007f',
  pink: '#ff69b4', 'hot pink': '#ff69b4', salmon: '#fa8072', coral: '#ff6b6b',
  orange: '#ff8c00', amber: '#ffbf00', yellow: '#ffff00', gold: '#ffd700',
  lime: '#32cd32', green: '#008000', olive: '#808000', teal: '#008080',
  cyan: '#00bcd4', 'sky blue': '#87ceeb', blue: '#0000ff', navy: '#000080',
  indigo: '#4b0082', violet: '#8b00ff', purple: '#800080', lavender: '#e6e6fa',
  magenta: '#ff00ff', fuchsia: '#ff00ff', white: '#ffffff', 'off white': '#faf9f6',
  cream: '#fffdd0', beige: '#f5f5dc', ivory: '#fffff0', silver: '#c0c0c0',
  grey: '#808080', gray: '#808080', charcoal: '#36454f', black: '#000000',
  brown: '#8b4513', chocolate: '#d2691e', tan: '#d2b48c', khaki: '#c3b091',
  'light blue': '#add8e6', 'dark blue': '#00008b', 'light green': '#90ee90',
  'dark green': '#006400', 'light pink': '#ffb6c1', 'dark red': '#8b0000',
  'rust': '#b7410e', 'mustard': '#ffdb58', 'mint': '#98ff98',
};
const HEX_TO_COLOR_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COLOR_NAME_TO_HEX).map(([name, hex]) => [hex.toLowerCase(), name])
);

interface SizeRow { size: string; bust: string; waist: string; hips: string; length: string; }

type ColorGroup = {
  color: string;
  colorHex: string;
  images: string[];
  sizes: {
    id?: string;
    size: string;
    stock: number;
    sku: string;
  }[];
};

function groupVariants(variants: any[]): ColorGroup[] {
  if (!variants || variants.length === 0) {
    return [{ color: '', colorHex: '#000000', images: [], sizes: [{ size: '', stock: 0, sku: '' }] }];
  }

  const groups: ColorGroup[] = [];

  variants.forEach(v => {
    const vColor = v.color || '';
    const vColorHex = v.colorHex || '#000000';
    
    let group = groups.find(g => g.color === vColor && g.colorHex === vColorHex);
    if (!group) {
      group = {
        color: vColor,
        colorHex: vColorHex,
        images: v.images || [],
        sizes: []
      };
      groups.push(group);
    }
    group.sizes.push({
      id: v.id,
      size: v.size,
      stock: v.stock || 0,
      sku: v.sku || ''
    });
  });

  return groups;
}

function flattenColorGroups(colorGroups: ColorGroup[], productName: string): any[] {
  const flat: any[] = [];
  colorGroups.forEach((g, groupIdx) => {
    g.sizes.forEach((s, szIdx) => {
      if (s.size.trim() !== '') {
        const defaultSku = `${productName.substring(0, 3).toUpperCase()}-${s.size.toUpperCase()}-${Date.now()}-${groupIdx}-${szIdx}`
          .replace(/\s+/g, '');
        flat.push({
          ...(s.id ? { id: s.id } : {}),
          size: s.size,
          color: g.color || '',
          colorHex: g.colorHex || '#000000',
          stock: Number(s.stock),
          sku: s.sku || defaultSku,
          images: g.images || [],
        });
      }
    });
  });
  return flat;
}

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
  videoUrl: string;
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
  const [editForm, setEditForm] = useState<EditFormData>({ name: '', description: '', material: '', careInstructions: '', basePrice: '', salePrice: '', status: 'ACTIVE', categoryId: '', images: [''], instagramReelUrl: '', videoUrl: '', codAvailable: true, returnEnabled: true, replaceEnabled: true, returnDays: '14', sizeGuide: [] });
  const [editVariants, setEditVariants] = useState<ColorGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // ── Inventory Report state ────────────────────────────────────────
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'mismatch' | 'match'>('all');

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

  // ── Inventory Report functions ────────────────────────────────────
  const fetchInventoryReport = async () => {
    setReportLoading(true);
    try {
      const { data } = await api.get('/admin/inventory-report');
      setReportData(data);
    } catch (e) {
      console.error('Failed to fetch inventory report');
    } finally {
      setReportLoading(false);
    }
  };

  const openReport = async () => {
    setShowReport(true);
    setReportSearch('');
    setReportFilter('all');
    if (!reportData) await fetchInventoryReport();
  };

  const downloadExcel = () => {
    if (!reportData) return;
    const rows = reportData.rows.map((r: any) => ({
      'Checked [  ]': '',
      'Product Name': r.productName,
      'Category': r.category,
      'SKU': r.sku,
      'Size': r.size,
      'Colour': r.color,
      'Online Stock': r.onlineStock,
      'Reserved Stock': r.reservedStock,
      'Available Stock': r.availableStock,
      'Warehouse Stock': r.warehouseStock,
      'Variance (WH - Online)': r.variance,
      'Status': r.isMatch ? 'MATCH ✓' : 'MISMATCH ⚠',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto column widths
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `inventory-report-${dateStr}.xlsx`);
  };

  const handlePrint = () => {
    const rows = reportData?.rows || [];
    const generatedAt = reportData?.generatedAt
      ? new Date(reportData.generatedAt).toLocaleString('en-IN')
      : '';
    const tableRows = rows
      .map((r: any) => `
        <tr class="${r.isMatch ? '' : 'mismatch'}">
          <td style="text-align: center; width: 40px;"><span style="display: inline-block; width: 12px; height: 12px; border: 1px solid #666; border-radius: 2px; margin-top: 2px;"></span></td>
          <td>${r.productName}</td>
          <td>${r.category}</td>
          <td>${r.sku}</td>
          <td>${r.size}${r.color ? ' / ' + r.color : ''}</td>
          <td>${r.onlineStock}</td>
          <td>${r.reservedStock}</td>
          <td>${r.availableStock}</td>
          <td>${r.warehouseStock}</td>
          <td class="${r.variance !== 0 ? (r.variance > 0 ? 'pos' : 'neg') : ''}">${r.variance > 0 ? '+' : ''}${r.variance}</td>
          <td class="status">${r.isMatch ? '✓ Match' : '⚠ Mismatch'}</td>
        </tr>`
      )
      .join('');

    const html = `<!DOCTYPE html><html><head><title>Inventory Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        p.meta { color: #666; font-size: 9px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a1a2e; color: white; padding: 6px 8px; text-align: left; font-size: 9px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
        tr.mismatch td { background: #fff7ed; }
        td.status { font-weight: bold; }
        tr:not(.mismatch) td.status { color: #16a34a; }
        tr.mismatch td.status { color: #d97706; }
        td.pos { color: #16a34a; font-weight: bold; }
        td.neg { color: #dc2626; font-weight: bold; }
        .summary { display: flex; gap: 24px; margin-bottom: 16px; }
        .card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 14px; min-width: 100px; }
        .card h3 { font-size: 18px; margin: 0; }
        .card p { font-size: 8px; color: #666; margin: 2px 0 0; }
      </style></head><body>
      <h1>📦 Inventory Report — Anjali Alankaram</h1>
      <p class="meta">Generated: ${generatedAt} &nbsp;|&nbsp; Total Variants: ${reportData?.summary?.totalVariants || 0} &nbsp;|&nbsp; Mismatches: ${reportData?.summary?.mismatches || 0}</p>
      <div class="summary">
        <div class="card"><h3>${reportData?.summary?.totalVariants || 0}</h3><p>Total Variants</p></div>
        <div class="card"><h3 style="color:#16a34a">${reportData?.summary?.matches || 0}</h3><p>Matched</p></div>
        <div class="card"><h3 style="color:#d97706">${reportData?.summary?.mismatches || 0}</h3><p>Mismatched</p></div>
        <div class="card"><h3>${reportData?.summary?.totalOnlineStock || 0}</h3><p>Total Online Stock</p></div>
        <div class="card"><h3>${reportData?.summary?.totalWarehouseStock || 0}</h3><p>Total Warehouse Stock</p></div>
      </div>
      <table><thead><tr>
        <th style="width: 40px; text-align: center;">Verified</th><th>Product</th><th>Category</th><th>SKU</th><th>Size / Colour</th>
        <th>Online Stock</th><th>Reserved</th><th>Available</th>
        <th>Warehouse Stock</th><th>Variance</th><th>Status</th>
      </tr></thead><tbody>${tableRows}</tbody></table>
      </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const toggleFeature = async (productId: string, field: 'isNewArrival' | 'isFeatured' | 'isBestseller', currentValue: boolean) => {
    try {
      await api.put(`/products/${productId}`, { [field]: !currentValue });
      setProducts(products.map(p => p.id === productId ? { ...p, [field]: !currentValue } : p));
      showFeedback('success', 'Product badge status updated!');
    } catch (e) {
      showFeedback('error', 'Failed to update product badge status.');
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
      videoUrl: product.videoUrl || '',
      codAvailable: product.codAvailable !== false,
      returnEnabled: product.returnEnabled !== false,
      replaceEnabled: product.replaceEnabled !== false,
      returnDays: String(product.returnDays ?? 0),
      sizeGuide: product.sizeGuide || [],
    });
    setEditVariants(groupVariants(product.variants));
  };

  const closeEdit = () => {
    setEditingProduct(null);
  };

  const handleAddEditVariantGroup = () => {
    setEditVariants([
      ...editVariants,
      { color: '', colorHex: '#000000', images: [], sizes: [{ size: '', stock: 0, sku: '' }] }
    ]);
  };

  const handleRemoveEditVariantGroup = (groupIndex: number) => {
    setEditVariants(editVariants.filter((_, idx) => idx !== groupIndex));
  };

  const handleAddEditSize = (groupIndex: number) => {
    const updated = [...editVariants];
    updated[groupIndex].sizes = [...updated[groupIndex].sizes, { size: '', stock: 0, sku: '' }];
    setEditVariants(updated);
  };

  const handleRemoveEditSize = (groupIndex: number, sizeIndex: number) => {
    const updated = [...editVariants];
    updated[groupIndex].sizes = updated[groupIndex].sizes.filter((_, idx) => idx !== sizeIndex);
    setEditVariants(updated);
  };

  const handleUpdateEditSize = (groupIndex: number, sizeIndex: number, field: string, value: any) => {
    const updated = [...editVariants];
    updated[groupIndex].sizes[sizeIndex] = { ...updated[groupIndex].sizes[sizeIndex], [field]: value };
    setEditVariants(updated);
  };

  const handleUpdateEditVariantGroup = (groupIndex: number, field: string, value: any) => {
    const updated = [...editVariants];
    updated[groupIndex] = { ...updated[groupIndex], [field]: value };
    setEditVariants(updated);
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
        videoUrl: editForm.videoUrl.trim() || null,
        codAvailable: editForm.codAvailable,
        returnEnabled: editForm.returnEnabled,
        replaceEnabled: editForm.replaceEnabled,
        returnDays: Number(editForm.returnDays) || 0,
        sizeGuide: editForm.sizeGuide.length > 0 ? editForm.sizeGuide : null,
        variants: flattenColorGroups(editVariants, editForm.name),
      };
      if (editForm.salePrice) payload.salePrice = Number(editForm.salePrice);

      const { data } = await api.put(`/products/${editingProduct.id}`, payload);
      setProducts(prods => prods.map(p => p.id === editingProduct.id ? { ...p, ...data } : p));
      closeEdit();
      showFeedback('success', 'Product updated successfully!');
    } catch (err: any) {
      showFeedback('error', 'Failed to save product: ' + (err.response?.data?.message || err.message));
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsVideoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditForm(prev => ({ ...prev, videoUrl: data.url }));
    } catch (err: any) {
      alert('Video upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsVideoUploading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await api.delete(`/products/${productId}`);
      setProducts(prods => prods.filter(p => p.id !== productId));
      setConfirmDelete(null);
      showFeedback('success', 'Product deleted successfully!');
    } catch (err: any) {
      showFeedback('error', 'Failed to delete product: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 sm:py-10">
      {feedback && (
        <div className={`fixed top-6 right-6 z-[100] shadow-lg flex items-center gap-2.5 px-4 py-3 rounded-2xl border font-semibold text-sm animate-in fade-in slide-in-from-top-3 ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200 shadow-green-100'
            : 'bg-red-50 text-red-700 border-red-200 shadow-red-100'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          {feedback.text}
        </div>
      )}
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
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => fetchProducts(true)}
            className="px-4 py-2.5 rounded-lg border font-medium hover:bg-muted transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            id="inventory-report-btn"
            onClick={openReport}
            className="px-5 py-2.5 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-800 font-bold flex items-center gap-2 hover:bg-amber-100 transition-colors"
          >
            <BarChart3 className="w-4 h-4" /> Inventory Report
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
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={editForm.basePrice}
                    onChange={e => setEditForm({ ...editForm, basePrice: e.target.value })}
                    onWheel={e => e.currentTarget.blur()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sale Price ₹</label>
                  <input
                    type="number"
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={editForm.salePrice}
                    onChange={e => setEditForm({ ...editForm, salePrice: e.target.value })}
                    onWheel={e => e.currentTarget.blur()}
                  />
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

              {/* Product Video (Local Upload) */}
              <div className="rounded-xl overflow-hidden border">
                <div
                  className="px-4 py-3 flex items-center gap-2 bg-primary text-primary-foreground"
                >
                  <PlusCircle className="w-4 h-4 text-white" />
                  <span className="text-sm font-bold text-white">Product Video (Local Upload)</span>
                  <span className="text-white/70 text-xs ml-1">(optional)</span>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Video URL (upload or paste direct MP4 link)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/uploads/products/video.mp4"
                      className="w-full px-3 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm transition-shadow"
                      value={editForm.videoUrl}
                      onChange={e => setEditForm({ ...editForm, videoUrl: e.target.value })}
                    />
                    <div className="mt-2.5 flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer bg-muted hover:bg-muted/80 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-border">
                        {isVideoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Plus className="w-3.5 h-3.5" />}
                        {isVideoUploading ? 'Uploading Video...' : editForm.videoUrl ? 'Change Local Video' : 'Upload MP4 from Device'}
                        <input type="file" accept="video/mp4,video/quicktime,video/*" className="hidden" onChange={handleVideoUpload} disabled={isVideoUploading} />
                      </label>
                      {editForm.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, videoUrl: '' })}
                          className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
                        >
                          Clear Video
                        </button>
                      )}
                    </div>
                  </div>

                  {editForm.videoUrl && (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 font-medium">
                        Video linked successfully ✓
                      </div>
                      <div className="flex justify-center bg-muted/20 rounded-xl py-3 border border-dashed">
                        <video
                          src={editForm.videoUrl}
                          controls
                          muted
                          className="rounded-lg max-w-full"
                          style={{ maxHeight: 240 }}
                        />
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground">Autoplay preview (always muted on loop)</p>
                    </div>
                  )}
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
                  <span className="text-sm font-bold text-green-800">📦 Sizes &amp; Stock by Color</span>
                  <button
                    type="button"
                    onClick={handleAddEditVariantGroup}
                    className="text-xs font-bold text-green-700 flex items-center gap-1 hover:underline"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Variant Color
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {editVariants.map((v, i) => (
                    <div key={i} className="border rounded-xl p-3 bg-muted/5 space-y-3 text-xs">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Color Variant {i + 1}</span>
                        {editVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditVariantGroup(i)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Colour Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Red"
                            className="w-full px-2 py-1 bg-white border rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                            value={v.color || ''}
                            onChange={e => {
                              const name = e.target.value;
                              // Auto-update swatch hex when a known color name is typed
                              const knownHex = COLOR_NAME_TO_HEX[name.toLowerCase().trim()];
                              const updated = [...editVariants];
                              updated[i] = { ...updated[i], color: name, ...(knownHex ? { colorHex: knownHex } : {}) };
                              setEditVariants(updated);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Colour Swatch</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              className="w-8 h-8 rounded border cursor-pointer shrink-0"
                              value={v.colorHex || '#000000'}
                              onChange={e => {
                                const hex = e.target.value;
                                // Auto-fill color name when picking from color picker
                                const knownName = HEX_TO_COLOR_NAME[hex.toLowerCase()];
                                const updated = [...editVariants];
                                updated[i] = { ...updated[i], colorHex: hex, ...(knownName ? { color: knownName } : {}) };
                                setEditVariants(updated);
                              }}
                            />
                            <span className="text-[10px] text-muted-foreground">{v.colorHex || '#000000'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Variant images uploader */}
                      <div className="border-b pb-2">
                        <label className="block text-[9px] font-bold text-muted-foreground uppercase mb-1">Variant Images</label>
                        <div className="flex flex-wrap gap-2">
                          {(v.images || []).map((imgUrl: string, imgIdx: number) => (
                            <div key={imgIdx} className="relative w-12 h-12 rounded overflow-hidden border bg-muted/10">
                              {imgUrl && <img src={imgUrl} alt="" className="w-full h-full object-cover" />}
                              <button type="button" onClick={() => {
                                const updated = [...editVariants];
                                updated[i].images = (updated[i].images || []).filter((_: any, ii: number) => ii !== imgIdx);
                                setEditVariants(updated);
                              }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                                <X className="w-2.5 h-2.5 text-white" />
                              </button>
                            </div>
                          ))}
                          <label className="w-12 h-12 rounded border border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                            {isUploading === (i + 100) ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Plus className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-[8px] text-muted-foreground mt-0.5">Add</span>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0]; if (!file) return;
                              setIsUploading(i + 100);
                              try {
                                const fd = new FormData(); fd.append('file', file);
                                const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                const updated = [...editVariants];
                                updated[i].images = [...(updated[i].images || []), data.url];
                                setEditVariants(updated);
                              } catch (err: any) { alert('Upload failed'); }
                              finally { setIsUploading(null); }
                            }} />
                          </label>
                        </div>
                      </div>

                      {/* Sub-table for Sizes & Stock */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Sizes &amp; Stock</span>
                          <button
                            type="button"
                            onClick={() => handleAddEditSize(i)}
                            className="text-primary text-[10px] font-bold flex items-center gap-0.5 hover:underline"
                          >
                            <Plus className="w-3 h-3" /> Add Size &amp; Stock
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {v.sizes.map((sz, szIdx) => (
                            <div key={szIdx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border">
                              <div className="col-span-4">
                                <label className="block text-[8px] font-semibold text-muted-foreground uppercase mb-0.5">Size *</label>
                                <input
                                  required
                                  type="text"
                                  placeholder="e.g. S, M, L"
                                  className="w-full px-2 py-1 bg-muted/10 border rounded text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                  value={sz.size}
                                  onChange={e => handleUpdateEditSize(i, szIdx, 'size', e.target.value)}
                                />
                              </div>
                              <div className="col-span-3">
                                <label className="block text-[8px] font-semibold text-muted-foreground uppercase mb-0.5">Stock</label>
                                <input
                                  required
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0"
                                  className="w-full px-2 py-1 bg-muted/10 border rounded text-[10px] outline-none focus:ring-1 focus:ring-primary"
                                  value={(sz as any)._stockStr !== undefined ? (sz as any)._stockStr : String(sz.stock)}
                                  onChange={e => {
                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                    handleUpdateEditSize(i, szIdx, 'stock', raw === '' ? 0 : parseInt(raw, 10));
                                    handleUpdateEditSize(i, szIdx, '_stockStr' as any, raw);
                                  }}
                                />
                              </div>
                              <div className="col-span-4">
                                <label className="block text-[8px] font-semibold text-muted-foreground uppercase mb-0.5">SKU (opt)</label>
                                <input
                                  type="text"
                                  placeholder="Auto"
                                  className="w-full px-2 py-1 bg-muted/10 border rounded text-[10px] outline-none focus:ring-1 focus:ring-primary font-mono"
                                  value={sz.sku}
                                  onChange={e => handleUpdateEditSize(i, szIdx, 'sku', e.target.value)}
                                />
                              </div>
                              <div className="col-span-1 text-center">
                                {v.sizes.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditSize(i, szIdx)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
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

      {/* ── Inventory Report Modal ──────────────────────────────── */}
      {showReport && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-6">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-lg font-outfit font-black">Inventory Report</h2>
                  <p className="text-xs text-muted-foreground">
                    {reportData ? `${reportData.summary.totalVariants} variants · Generated ${new Date(reportData.generatedAt).toLocaleString('en-IN')}` : 'Online Stock vs Warehouse Stock'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchInventoryReport}
                  disabled={reportLoading}
                  className="p-2 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
                  title="Refresh report"
                >
                  <RefreshCw className={`w-4 h-4 ${reportLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={downloadExcel}
                  disabled={!reportData}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-40"
                  id="download-excel-btn"
                >
                  <FileDown className="w-4 h-4" /> Excel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!reportData}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                  id="print-report-btn"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setShowReport(false)} className="p-2 rounded-lg hover:bg-muted transition-colors ml-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {reportData && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5 border-b bg-muted/5">
                {[
                  { label: 'Total Variants', value: reportData.summary.totalVariants, color: 'text-foreground' },
                  { label: 'Matched', value: reportData.summary.matches, color: 'text-green-600' },
                  { label: 'Mismatched', value: reportData.summary.mismatches, color: 'text-amber-600' },
                  { label: 'Online Stock Total', value: reportData.summary.totalOnlineStock, color: 'text-blue-600' },
                  { label: 'Warehouse Stock Total', value: reportData.summary.totalWarehouseStock, color: 'text-purple-600' },
                ].map(card => (
                  <div key={card.label} className="bg-white border rounded-xl p-4 text-center shadow-sm">
                    <p className={`text-2xl font-outfit font-black ${card.color}`}>{card.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">{card.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 p-5 border-b">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search SKU, product, size..."
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'match', 'mismatch'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setReportFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      reportFilter === f
                        ? f === 'mismatch' ? 'bg-amber-500 text-white border-amber-500'
                          : f === 'match' ? 'bg-green-500 text-white border-green-500'
                          : 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-border'
                    }`}
                  >
                    {f === 'all' ? 'All Variants' : f === 'match' ? '✓ Matched' : '⚠ Mismatched'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto" style={{ maxHeight: '50vh' }}>
              {reportLoading ? (
                <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
                  <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                  <p className="text-sm">Loading inventory data...</p>
                </div>
              ) : reportData && (() => {
                const filtered = reportData.rows.filter((r: any) => {
                  const q = reportSearch.toLowerCase();
                  const matchesSearch = !q || r.productName.toLowerCase().includes(q) ||
                    r.sku.toLowerCase().includes(q) || r.size.toLowerCase().includes(q) ||
                    (r.color || '').toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
                  const matchesFilter = reportFilter === 'all' ||
                    (reportFilter === 'match' && r.isMatch) ||
                    (reportFilter === 'mismatch' && !r.isMatch);
                  return matchesSearch && matchesFilter;
                });

                if (filtered.length === 0) return (
                  <div className="text-center py-16 text-muted-foreground text-sm">No variants found matching your filters.</div>
                );

                return (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-900 text-white">
                        {['Product', 'Category', 'SKU', 'Size / Colour', 'Online Stock', 'Reserved', 'Available', 'Warehouse Stock', 'Variance', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((r: any, i: number) => (
                        <tr key={i} className={`transition-colors ${
                          r.isMatch ? 'hover:bg-green-50/40' : 'bg-amber-50 hover:bg-amber-100/60'
                        }`}>
                          <td className="px-4 py-3 font-medium max-w-[180px] truncate" title={r.productName}>{r.productName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                          <td className="px-4 py-3 font-mono text-xs">{r.sku}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{r.size}</span>
                            {r.color && <span className="text-muted-foreground"> / {r.color}</span>}
                          </td>
                          <td className="px-4 py-3 font-bold text-center">{r.onlineStock}</td>
                          <td className="px-4 py-3 text-center text-orange-600">{r.reservedStock}</td>
                          <td className="px-4 py-3 text-center text-blue-600 font-medium">{r.availableStock}</td>
                          <td className="px-4 py-3 font-bold text-center">{r.warehouseStock}</td>
                          <td className={`px-4 py-3 text-center font-bold ${
                            r.variance === 0 ? 'text-muted-foreground'
                            : r.variance > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {r.variance > 0 ? '+' : ''}{r.variance}
                          </td>
                          <td className="px-4 py-3">
                            {r.isMatch ? (
                              <span className="flex items-center gap-1 text-green-700 font-bold">
                                <PackageCheck className="w-3.5 h-3.5" /> Match
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-700 font-bold">
                                <PackageX className="w-3.5 h-3.5" /> Mismatch
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="p-4 border-t text-xs text-muted-foreground text-right">
              Variance = Warehouse Stock − Online Stock &nbsp;·&nbsp; Positive variance means more stock in warehouse than online
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
