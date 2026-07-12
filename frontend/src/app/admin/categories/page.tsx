'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Edit2, Loader2, Save, X, ImageIcon, AlertTriangle, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { api } from '@/lib/api';

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

interface SizeRow {
  size: string;
  bust: string;
  waist: string;
  hips: string;
  length: string;
}

interface CategoryForm {
  name: string;
  description: string;
  image: string;
  sizeGuide: SizeRow[];
}

const emptyForm: CategoryForm = { name: '', description: '', image: '', sizeGuide: [] };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryForm>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.slug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error('Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData(prev => ({ ...prev, image: data.url }));
    } catch (err: any) {
      alert('Image upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      image: cat.image || '',
      sizeGuide: cat.sizeGuide || [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-');
      const payload = { ...formData, slug };

      if (editingId) {
        const { data } = await api.put(`/categories/${editingId}`, payload);
        setCategories(cats => cats.map(c => c.id === editingId ? { ...c, ...data } : c));
        showFeedback('success', 'Category updated successfully!');
      } else {
        const { data } = await api.post('/categories', payload);
        setCategories(prev => [...prev, data]);
        showFeedback('success', 'Category created successfully!');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (e: any) {
      showFeedback('error', 'Failed to save category: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.delete(`/categories/${id}`);
      setCategories(cats => cats.filter(c => c.id !== id));
      setConfirmDelete(null);
      showFeedback('success', 'Category deleted successfully!');
    } catch (e: any) {
      showFeedback('error', 'Failed to delete category: ' + (e.response?.data?.message || e.message));
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  return (
    <div className="container py-6 sm:py-10 space-y-6 sm:space-y-8">
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
          message="This will permanently delete the category. Products in this category may be affected."
          onConfirm={() => deleteCategory(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Category Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage your store's departments.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => fetchCategories()}
            className="px-4 py-2.5 rounded-lg border font-medium hover:bg-muted transition-colors"
          >
            Refresh
          </button>
          {!showForm && (
            <button
              onClick={openCreate}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" /> Add Category
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold font-outfit">{editingId ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Sarees"
                    className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Elegant ethnic wear"
                    className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Category Image</label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div 
                    className={`w-24 h-24 rounded-xl overflow-hidden bg-muted/30 border shrink-0 flex items-center justify-center ${formData.image ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    onClick={() => formData.image && setSelectedFullImage(formData.image)}
                    title={formData.image ? 'Click to view full image' : undefined}
                  >
                    {formData.image ? (
                      <img src={formData.image} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      placeholder="Paste image URL, or upload below"
                      className="w-full px-4 py-2 bg-muted/20 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                      value={formData.image}
                      onChange={e => setFormData({ ...formData, image: e.target.value })}
                    />
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-muted hover:bg-muted/80 px-4 py-2 rounded-lg text-xs font-bold transition-all">
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {isUploading ? 'Uploading...' : formData.image ? 'Change Image' : 'Upload from Device'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Default Size Guide ── */}
              <div className="border rounded-2xl p-6 bg-muted/5 space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">📏 Default Category Size Guide</h3>
                    <p className="text-[10px] text-muted-foreground">Products created in this category will default to these sizes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      sizeGuide: [...prev.sizeGuide, { size: '', bust: '', waist: '', hips: '', length: '' }]
                    }))}
                    className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>
                {formData.sizeGuide.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    No default size guide defined. Products will start with an empty size chart.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {['Size', 'Bust (in)', 'Waist (in)', 'Hips (in)', 'Length (in)', ''].map(h => (
                            <th key={h} className="pb-2 pr-2 text-left font-bold text-muted-foreground uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {formData.sizeGuide.map((row, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {(['size', 'bust', 'waist', 'hips', 'length'] as const).map(field => (
                              <td key={field} className="py-1.5 pr-2">
                                <input
                                  type="text" placeholder={field === 'size' ? 'S, M, L' : '0'}
                                  className="w-full px-2 py-1 bg-white border rounded text-xs outline-none focus:ring-1 focus:ring-primary"
                                  value={row[field]}
                                  onChange={e => {
                                    const updated = [...formData.sizeGuide];
                                    const val = field === 'size' ? e.target.value.toUpperCase() : e.target.value;
                                    updated[i] = { ...updated[i], [field]: val };
                                    setFormData({ ...formData, sizeGuide: updated });
                                  }}
                                />
                              </td>
                            ))}
                            <td className="py-1.5">
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({
                                  ...prev,
                                  sizeGuide: prev.sizeGuide.filter((_, idx) => idx !== i)
                                }))}
                                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 rounded-lg font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving}
                  type="submit"
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {editingId ? 'Update Category' : 'Save Category'}</>}
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
              placeholder="Search categories..."
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
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Default Sizes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={4} className="p-10 text-center animate-pulse">Loading categories...</td></tr>
              ) : filteredCategories.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No categories found.</td></tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div 
                        className={`w-12 h-16 rounded overflow-hidden bg-accent/20 border shrink-0 flex items-center justify-center ${cat.image ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        onClick={() => cat.image && setSelectedFullImage(cat.image)}
                        title={cat.image ? 'Click to view full image' : undefined}
                      >
                        {cat.image ? (
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium max-w-[200px] truncate" title={cat.name}>{cat.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-[250px]">{cat.description || 'No description'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      /{cat.slug}
                    </td>
                    <td className="px-6 py-4">
                      {cat.sizeGuide && Array.isArray(cat.sizeGuide) && cat.sizeGuide.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full w-fit border border-green-100">
                          {cat.sizeGuide.length} sizes
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-full w-fit">
                          None
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: cat.id, name: cat.name })}
                          className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
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

      {/* Full Image Preview Modal */}
      {selectedFullImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedFullImage(null)} />
          <div className="relative max-w-4xl max-h-[85vh] bg-transparent rounded-2xl overflow-hidden animate-in zoom-in-95 shrink-0 flex items-center justify-center">
            <button 
              onClick={() => setSelectedFullImage(null)} 
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={selectedFullImage} alt="Full preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

    </div>
  );
}
