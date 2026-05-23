'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Edit2, Loader2, Save, X, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';

interface CategoryForm {
  name: string;
  description: string;
  image: string;
}

const emptyForm: CategoryForm = { name: '', description: '', image: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryForm>(emptyForm);

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
    setFormData({ name: cat.name, description: cat.description || '', image: cat.image || '' });
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
      } else {
        const { data } = await api.post('/categories', payload);
        setCategories(prev => [...prev, data]);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (e: any) {
      alert('Failed to save category: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure? This might affect products in this category.')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(cats => cats.filter(c => c.id !== id));
    } catch (e: any) {
      alert('Failed to delete category: ' + (e.response?.data?.message || e.message));
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Category Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage your store's departments.</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{editingId ? 'Edit Category' : 'New Category'}</h2>
            <button onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
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
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted/30 border shrink-0 flex items-center justify-center">
                  {formData.image ? (
                    <Image src={formData.image} alt="preview" width={96} height={96} className="w-full h-full object-cover" />
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
      )}

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/5 text-muted-foreground font-medium border-b">
            <tr>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="p-10 text-center animate-pulse">Loading categories...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No categories created yet.</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted/30 border flex items-center justify-center">
                      {cat.image ? (
                        <Image src={cat.image} alt={cat.name} width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold capitalize">{cat.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">/{cat.slug}</td>
                  <td className="px-6 py-4 text-muted-foreground">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
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
  );
}
