'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Save, 
  Loader2,
  X,
  PlusCircle
} from 'lucide-react';
import { api } from '@/lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '', // Starts empty, must select one
    basePrice: '',
    salePrice: '',
    images: [''],
    tags: ['New Arrival'],
    variants: [{ size: 'S', stock: 10, sku: '' }]
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      const list = Array.isArray(data) ? data : data.data || [];
      setCategories(list);
      if (list.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: list[0].id }));
      }
    } catch (e) {
      console.error('Failed to fetch categories');
    }
  };

  const handleAddImage = () => {
    setFormData({ ...formData, images: [...formData.images, ''] });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleAddVariant = () => {
    setFormData({ 
      ...formData, 
      variants: [...formData.variants, { size: '', stock: 0, sku: '' }] 
    });
  };

  const handleRemoveVariant = (index: number) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Basic validation
      if (!formData.name || !formData.basePrice) {
        throw new Error('Name and Base Price are required');
      }

      const cleanVariants = formData.variants
        .filter(v => v.size.trim() !== '')
        .map(v => ({
          size: v.size,
          stock: Number(v.stock),
          sku: v.sku || `${formData.name.substring(0, 3)}-${v.size}-${Date.now()}`.toUpperCase()
        }));

      const payload = {
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId,
        basePrice: Number(formData.basePrice),
        salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
        images: formData.images.filter(img => img.trim() !== ''),
        tags: formData.tags,
        variants: cleanVariants
      };

      if (payload.variants.length === 0) {
        throw new Error('Please add at least one size/variant');
      }

      await api.post('/products', payload);
      setSuccess(true);
      setTimeout(() => router.push('/admin/products'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const [isUploading, setIsUploading] = useState<number | null>(null);

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(index);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const { data } = await api.post('/uploads', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newImages = [...formData.images];
      newImages[index] = data.url;
      setFormData({ ...formData, images: newImages });
    } catch (err: any) {
      console.error('Upload Error:', err);
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      alert(`Error: ${msg}. Please try another image file.`);
    } finally {
      setIsUploading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Catalogue
      </button>

      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Add New Dress</h1>
          <p className="text-muted-foreground mt-2">Create a new listing for your store catalog.</p>
        </div>
        <div className="flex gap-4">
           {success && (
             <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-green-200">
               Product Created Successfully!
             </div>
           )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 border border-red-100 flex items-center gap-2">
          <X className="w-5 h-5" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
          <h2 className="text-xl font-bold font-outfit border-b pb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Product Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Pure Silk Banarasi Saree"
                className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea 
                required
                rows={4}
                placeholder="Describe the material, design, and work..."
                className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select 
                  required
                  className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={formData.categoryId}
                  onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  {categories.length === 0 ? (
                    <option value="">No categories found. Create one first!</option>
                  ) : (
                    categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))
                  )}
                </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Base Price</label>
                    <input 
                      required
                      type="number" 
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      value={formData.basePrice}
                      onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sale Price (Optional)</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-primary"
                      value={formData.salePrice}
                      onChange={e => setFormData({ ...formData, salePrice: e.target.value })}
                    />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-bold font-outfit">Product Images</h2>
            <button 
              type="button" 
              onClick={handleAddImage}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <PlusCircle className="w-4 h-4" /> Add More
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {formData.images.map((url, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 relative">
                  <ImageIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="url" 
                    placeholder="Image URL (or upload below)"
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    value={url}
                    onChange={e => {
                      const newImages = [...formData.images];
                      newImages[i] = e.target.value;
                      setFormData({ ...formData, images: newImages });
                    }}
                  />
                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-muted hover:bg-muted/80 px-4 py-2 rounded-lg text-xs font-bold transition-all">
                      {isUploading === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {isUploading === i ? 'Uploading...' : url ? 'Change Photo' : 'Upload from Device'}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => handleFileUpload(i, e)}
                      />
                    </label>
                  </div>
                </div>
                {formData.images.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveImage(i)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors h-fit"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Variants / Inventory */}
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-bold font-outfit">Inventory & Sizes</h2>
            <button 
              type="button" 
              onClick={handleAddVariant}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <PlusCircle className="w-4 h-4" /> Add Size
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 px-4 text-xs font-bold text-muted-foreground uppercase">
              <div className="col-span-2">Size / Variant Name</div>
              <div>Stock Quantity</div>
              <div className="text-right">Action</div>
            </div>
            
            {formData.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 items-center">
                <div className="col-span-2">
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Medium (M)"
                    className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none"
                    value={v.size}
                    onChange={e => {
                      const newVariants = [...formData.variants];
                      newVariants[i].size = e.target.value;
                      setFormData({ ...formData, variants: newVariants });
                    }}
                  />
                </div>
                <div>
                  <input 
                    required
                    type="number" 
                    placeholder="0"
                    className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none"
                    value={v.stock}
                    onChange={e => {
                      const newVariants = [...formData.variants];
                      newVariants[i].stock = Number(e.target.value);
                      setFormData({ ...formData, variants: newVariants });
                    }}
                  />
                </div>
                <div className="flex justify-end">
                   {formData.variants.length > 1 && (
                     <button 
                       type="button" 
                       onClick={() => handleRemoveVariant(i)}
                       className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-6">
          <button 
            type="button" 
            onClick={() => router.back()}
            className="px-8 py-3 rounded-xl font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button 
            disabled={isLoading}
            type="submit"
            className="bg-primary text-primary-foreground px-10 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Create Listing</>}
          </button>
        </div>
      </form>
    </div>
  );
}
