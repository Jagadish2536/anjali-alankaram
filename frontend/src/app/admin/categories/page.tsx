'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error('Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-');
      const { data } = await api.post('/categories', { ...formData, slug });
      setCategories([...categories, data]);
      setShowForm(false);
      setFormData({ name: '', description: '' });
    } catch (e) {
      alert('Failed to create category');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure? This might affect products in this category.')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
    } catch (e) {
      alert('Failed to delete category');
    }
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
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" /> Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">New Category</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category Name</label>
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
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button 
                disabled={isSaving}
                type="submit"
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary/90"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Category</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/5 text-muted-foreground font-medium border-b">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={4} className="p-10 text-center animate-pulse">Loading categories...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No categories created yet.</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/5 transition-colors">
                  <td className="px-6 py-4 font-bold">{cat.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">/{cat.slug}</td>
                  <td className="px-6 py-4">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-1.5 text-muted-foreground hover:text-blue-600 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 rounded"
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
