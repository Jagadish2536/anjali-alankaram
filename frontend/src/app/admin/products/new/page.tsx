'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, Image as ImageIcon, Save, Loader2,
  X, PlusCircle, Instagram, ExternalLink, Truck, Ruler
} from 'lucide-react';
import { api } from '@/lib/api';

const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: '#ff0000', crimson: '#dc143c', maroon: '#800000', rose: '#ff007f',
  pink: '#ff69b4', 'hot pink': '#ff69b4', salmon: '#fa8072', coral: '#ff6b6b',
  orange: '#ff8c00', amber: '#ffbf00', yellow: '#ffff00', gold: '#ffd700',
  lime: '#32cd32', green: '#008000', olive: '#808000', teal: '#008080',
  cyan: '#00bcd4', 'sky blue': '#87ceeb', blue: '#0000ff', navy: '#000080',
  indigo: '#4b0082', violet: '#8b00ff', purple: '#800080', lavender: '#e6e6fa',
  magenta: '#ff00ff', fuchsia: '#ff00ff', white: '#ffffff', cream: '#fffdd0',
  beige: '#f5f5dc', ivory: '#fffff0', silver: '#c0c0c0', grey: '#808080',
  gray: '#808080', charcoal: '#36454f', black: '#000000', brown: '#8b4513',
  chocolate: '#d2691e', tan: '#d2b48c', khaki: '#c3b091', rust: '#b7410e',
  mustard: '#ffdb58', mint: '#98ff98',
};
const HEX_TO_COLOR_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COLOR_NAME_TO_HEX).map(([name, hex]) => [hex.toLowerCase(), name])
);

type SizeRow = { size: string; bust: string; waist: string; hips: string; length: string };

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    material: '',
    careInstructions: '',
    categoryId: '',
    basePrice: '',
    salePrice: '',
    images: [''],
    tags: ['New Arrival'],
    variants: [
      {
        color: '',
        colorHex: '#000000',
        images: [] as string[],
        sizes: [{ size: 'S', stock: 10, sku: '' }]
      }
    ],
    instagramReelUrl: '',
    sizeGuide: [] as SizeRow[],
  });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      const list = Array.isArray(data) ? data : data.data || [];
      setCategories(list);
      if (list.length > 0) setFormData(prev => ({ ...prev, categoryId: list[0].id }));
    } catch {
      console.error('Failed to fetch categories');
    }
  };

  const handleAddImage = () => setFormData({ ...formData, images: [...formData.images, ''] });
  const handleRemoveImage = (i: number) => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) });
  const handleAddVariant = () => setFormData({
    ...formData,
    variants: [
      ...formData.variants,
      { color: '', colorHex: '#000000', images: [] as string[], sizes: [{ size: '', stock: 0, sku: '' }] }
    ]
  });
  const handleRemoveVariant = (i: number) => setFormData({ ...formData, variants: formData.variants.filter((_, idx) => idx !== i) });

  const handleAddSize = (variantIndex: number) => {
    const vs = [...formData.variants] as any[];
    vs[variantIndex].sizes = [...vs[variantIndex].sizes, { size: '', stock: 0, sku: '' }];
    setFormData({ ...formData, variants: vs });
  };

  const handleRemoveSize = (variantIndex: number, sizeIndex: number) => {
    const vs = [...formData.variants] as any[];
    vs[variantIndex].sizes = vs[variantIndex].sizes.filter((_: any, idx: number) => idx !== sizeIndex);
    setFormData({ ...formData, variants: vs });
  };

  const handleUpdateSize = (variantIndex: number, sizeIndex: number, field: string, value: any) => {
    const vs = [...formData.variants] as any[];
    vs[variantIndex].sizes[sizeIndex] = { ...vs[variantIndex].sizes[sizeIndex], [field]: value };
    setFormData({ ...formData, variants: vs });
  };

  const handleUpdateVariantGroup = (variantIndex: number, field: string, value: any) => {
    const vs = [...formData.variants] as any[];
    vs[variantIndex] = { ...vs[variantIndex], [field]: value };
    setFormData({ ...formData, variants: vs });
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(index);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const imgs = [...formData.images];
      imgs[index] = data.url;
      setFormData({ ...formData, images: imgs });
    } catch (err: any) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (!formData.name || !formData.basePrice) throw new Error('Name and Base Price are required');
      const cleanVariants: any[] = [];
      formData.variants.forEach((v: any, groupIdx: number) => {
        v.sizes.forEach((sz: any, szIdx: number) => {
          if (sz.size.trim() !== '') {
            const defaultSku = `${formData.name.substring(0, 3)}-${sz.size}-${Date.now()}-${groupIdx}-${szIdx}`
              .toUpperCase()
              .replace(/\s+/g, '');
            cleanVariants.push({
              size: sz.size,
              stock: Number(sz.stock),
              sku: sz.sku || defaultSku,
              ...(v.color && { color: v.color }),
              ...(v.colorHex && { colorHex: v.colorHex }),
              images: v.images || [],
            });
          }
        });
      });
      if (cleanVariants.length === 0) throw new Error('Please add at least one size/variant');
      const payload: any = {
        name: formData.name,
        description: formData.description,
        material: formData.material || undefined,
        careInstructions: formData.careInstructions || undefined,
        categoryId: formData.categoryId,
        basePrice: Number(formData.basePrice),
        images: formData.images.filter(img => img.trim() !== ''),
        tags: formData.tags,
        status: 'ACTIVE',
        variants: cleanVariants,
        instagramReelUrl: formData.instagramReelUrl.trim() || undefined,
        sizeGuide: formData.sizeGuide.length > 0 ? formData.sizeGuide : undefined,
      };
      if (formData.salePrice) payload.salePrice = Number(formData.salePrice);
      await api.post('/products', payload);
      setSuccess(true);
      setTimeout(() => router.push('/admin/products'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const reelMatch = formData.instagramReelUrl.match(/instagram\.com\/(reel|p)\/([A-Za-z0-9_-]+)/);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Catalogue
      </button>

      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-outfit font-bold">Add New Product</h1>
          <p className="text-muted-foreground mt-2">Create a new listing for your store catalog.</p>
        </div>
        {success && (
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-green-200">
            Product Created Successfully!
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 border border-red-100 flex items-center gap-2">
          <X className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Basic Information ── */}
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
          <h2 className="text-xl font-bold font-outfit border-b pb-4">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium mb-2">Product Name</label>
            <input
              required type="text" placeholder="e.g. Pure Silk Banarasi Saree"
              className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              required rows={4} placeholder="Describe the material, design, and work..."
              className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Material <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text" placeholder="e.g. Pure Silk, Cotton Blend"
                className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={formData.material} onChange={e => setFormData({ ...formData, material: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Care Instructions <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="text" placeholder="e.g. Dry clean only"
                className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={formData.careInstructions} onChange={e => setFormData({ ...formData, careInstructions: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                required
                className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
              >
                {categories.length === 0
                  ? <option value="">No categories found. Create one first!</option>
                  : categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)
                }
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Base Price</label>
                <input
                  required type="number" placeholder="0.00"
                  className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                  onWheel={e => e.currentTarget.blur()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sale Price <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="number" placeholder="0.00"
                  className="w-full px-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-primary"
                  value={formData.salePrice} onChange={e => setFormData({ ...formData, salePrice: e.target.value })}
                  onWheel={e => e.currentTarget.blur()}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Images ── */}
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-bold font-outfit">Product Images</h2>
            <button type="button" onClick={handleAddImage} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
              <PlusCircle className="w-4 h-4" /> Add More
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {formData.images.map((url, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 relative">
                  <ImageIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="url" placeholder="Image URL (or upload below)"
                    className="w-full pl-10 pr-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    value={url}
                    onChange={e => {
                      const imgs = [...formData.images]; imgs[i] = e.target.value;
                      setFormData({ ...formData, images: imgs });
                    }}
                  />
                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-muted hover:bg-muted/80 px-4 py-2 rounded-lg text-xs font-bold transition-all">
                      {isUploading === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {isUploading === i ? 'Uploading...' : url ? 'Change Photo' : 'Upload from Device'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(i, e)} />
                    </label>
                  </div>
                </div>
                {formData.images.length > 1 && (
                  <button type="button" onClick={() => handleRemoveImage(i)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors h-fit">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Instagram Reel ── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}>
            <Instagram className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold font-outfit text-white">Instagram Reel</h2>
              <p className="text-white/80 text-xs">Optional — paste a reel URL to show a video preview on the product page.</p>
            </div>
          </div>
          <div className="p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Instagram Reel URL <span className="text-muted-foreground font-normal">(optional)</span></label>
              <div className="relative">
                <Instagram className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" />
                <input
                  id="instagram-reel-url" type="url"
                  placeholder="https://www.instagram.com/reel/ABC123xYz/"
                  className="w-full pl-10 pr-4 py-3 bg-muted/20 border rounded-xl outline-none focus:ring-2 focus:ring-pink-400 transition-shadow"
                  value={formData.instagramReelUrl}
                  onChange={e => setFormData({ ...formData, instagramReelUrl: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Go to the reel on Instagram &rarr; tap &hellip; &rarr; <strong>Copy Link</strong> and paste it here.</p>
            </div>

            {formData.instagramReelUrl.trim() && (
              reelMatch ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium">
                    <Instagram className="w-4 h-4" /> Valid reel detected
                    <a href={formData.instagramReelUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs underline flex items-center gap-1 text-green-600">
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="rounded-2xl overflow-hidden border bg-black/5 flex justify-center">
                    <iframe
                      src={`https://www.instagram.com/reel/${reelMatch[2]}/embed/`}
                      width="320" height="440" frameBorder="0" scrolling="no"
                      allowTransparency allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      className="rounded-xl" title="Instagram Reel Preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <X className="w-4 h-4" /> URL does not look like a valid Instagram reel link.
                </div>
              )
            )}
          </div>
        </div>


        {/* ── Size Guide ── */}
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div className="flex items-center gap-3">
              <Ruler className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold font-outfit">Size Guide</h2>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, sizeGuide: [...formData.sizeGuide, { size: '', bust: '', waist: '', hips: '', length: '' }] })}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <PlusCircle className="w-4 h-4" /> Add Row
            </button>
          </div>
          {formData.sizeGuide.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ruler className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No size guide added yet. Click &quot;Add Row&quot; to build a size chart.</p>
              <p className="text-xs mt-1 opacity-70">This will show as a popup on the product page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {['Size', 'Bust (in)', 'Waist (in)', 'Hips (in)', 'Length (in)', ''].map(h => (
                      <th key={h} className="pb-3 pr-3 text-left text-xs font-bold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {formData.sizeGuide.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {(['size', 'bust', 'waist', 'hips', 'length'] as const).map(field => (
                        <td key={field} className="py-2 pr-3">
                          <input
                            type="text" placeholder={field === 'size' ? 'S, M, L' : '0'}
                            className="w-full px-3 py-2 bg-muted/20 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                            value={row[field]}
                            onChange={e => {
                              const updated = [...formData.sizeGuide];
                              updated[i] = { ...updated[i], [field]: e.target.value };
                              setFormData({ ...formData, sizeGuide: updated });
                            }}
                          />
                        </td>
                      ))}
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, sizeGuide: formData.sizeGuide.filter((_, idx) => idx !== i) })}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Inventory, Sizes & Colours ── */}
        <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <h2 className="text-xl font-bold font-outfit">Inventory, Sizes &amp; Colours</h2>
            <button type="button" onClick={handleAddVariant} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
              <PlusCircle className="w-4 h-4" /> Add Variant Color
            </button>
          </div>
          <p className="text-xs text-muted-foreground -mt-3">Add a colour + images per variant. Inside each variant, you can specify different sizes and stock.</p>
          <div className="space-y-6">
            {(formData.variants as any[]).map((v, i) => (
              <div key={i} className="border rounded-2xl p-4 space-y-4 bg-muted/5">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color Variant {i + 1}</span>
                  {formData.variants.length > 1 && (
                    <button type="button" onClick={() => handleRemoveVariant(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Colour Name</label>
                    <input
                      type="text" placeholder="e.g. Crimson Red"
                      className="w-full px-3 py-2 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                      value={v.color || ''}
                      onChange={e => {
                        const name = e.target.value;
                        const knownHex = COLOR_NAME_TO_HEX[name.toLowerCase().trim()];
                        const vs = [...formData.variants] as any[];
                        vs[i] = { ...vs[i], color: name, ...(knownHex ? { colorHex: knownHex } : {}) };
                        setFormData({ ...formData, variants: vs } as any);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Colour Swatch</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-10 h-10 rounded-lg border cursor-pointer"
                        value={v.colorHex || '#000000'}
                        onChange={e => {
                          const hex = e.target.value;
                          const knownName = HEX_TO_COLOR_NAME[hex.toLowerCase()];
                          const vs = [...formData.variants] as any[];
                          vs[i] = { ...vs[i], colorHex: hex, ...(knownName ? { color: knownName } : {}) };
                          setFormData({ ...formData, variants: vs } as any);
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{v.colorHex || '#000000'}</span>
                    </div>
                  </div>
                </div>

                {/* Per-colour image upload */}
                <div className="border-b pb-4">
                  <label className="block text-xs font-medium mb-2">Colour Images <span className="text-muted-foreground font-normal">(shown when this colour is selected)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {(v.images || []).map((imgUrl: string, imgIdx: number) => (
                      <div key={imgIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border bg-muted/10">
                        {imgUrl && <img src={imgUrl} alt="" className="w-full h-full object-cover" />}
                        <button type="button" onClick={() => {
                          const vs = [...formData.variants] as any[];
                          vs[i].images = (vs[i].images || []).filter((_: any, ii: number) => ii !== imgIdx);
                          setFormData({ ...formData, variants: vs } as any);
                        }} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      {isUploading === (i + 100) ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Plus className="w-5 h-5 text-muted-foreground" />}
                      <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setIsUploading(i + 100);
                        try {
                          const fd = new FormData(); fd.append('file', file);
                          const { data } = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                          const vs = [...formData.variants] as any[];
                          vs[i].images = [...(vs[i].images || []), data.url];
                          setFormData({ ...formData, variants: vs } as any);
                        } catch (err: any) { alert('Upload failed'); }
                        finally { setIsUploading(null); }
                      }} />
                    </label>
                  </div>
                </div>

                {/* Sub-table for Sizes & Stock */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sizes &amp; Stock</span>
                    <button
                      type="button"
                      onClick={() => handleAddSize(i)}
                      className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Size &amp; Stock
                    </button>
                  </div>

                  <div className="space-y-2">
                    {v.sizes.map((sz: any, szIdx: number) => (
                      <div key={szIdx} className="grid grid-cols-12 gap-3 items-end bg-white p-3 rounded-xl border shadow-sm">
                        <div className="col-span-4">
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Size *</label>
                          <input
                            required type="text" placeholder="e.g. S, M, L"
                            className="w-full px-3 py-2 bg-muted/5 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-xs"
                            value={sz.size}
                            onChange={e => handleUpdateSize(i, szIdx, 'size', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Stock</label>
                          <input
                            required type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0"
                            className="w-full px-3 py-2 bg-muted/5 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-xs"
                            value={sz._stockStr !== undefined ? sz._stockStr : String(sz.stock)}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^0-9]/g, '');
                              handleUpdateSize(i, szIdx, 'stock', raw === '' ? 0 : parseInt(raw, 10));
                              handleUpdateSize(i, szIdx, '_stockStr', raw);
                            }}
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">SKU (optional)</label>
                          <input
                            type="text" placeholder="Auto-generated"
                            className="w-full px-3 py-2 bg-muted/5 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-xs font-mono"
                            value={sz.sku}
                            onChange={e => handleUpdateSize(i, szIdx, 'sku', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1 flex justify-center pb-1">
                          {v.sizes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSize(i, szIdx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
            ))}
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="flex justify-end gap-4 pt-6">
          <button type="button" onClick={() => router.back()} className="px-8 py-3 rounded-xl font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            disabled={isLoading} type="submit"
            className="bg-primary text-primary-foreground px-10 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Create Listing</>}
          </button>
        </div>

      </form>
    </div>
  );
}
