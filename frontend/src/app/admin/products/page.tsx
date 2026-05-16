'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login?returnUrl=/admin/products');
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') return router.push('/profile');

    fetchProducts();
  }, [isAuthenticated, user, router]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Reusing the public product endpoint since it has pagination and filters
      // In a real app, an admin-specific endpoint might be preferred to show ARCHIVED products too
      const { data } = await api.get('/products?limit=100');
      setProducts(data.data);
    } catch (e) {
      console.error('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = async (productId: string, field: 'isNewArrival' | 'isFeatured' | 'isBestseller', currentValue: boolean) => {
    try {
      await api.put(`/products/${productId}`, { [field]: !currentValue });
      setProducts(products.map(p => p.id === productId ? { ...p, [field]: !currentValue } : p));
    } catch (e) {
      alert('Failed to update product');
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground">Catalogue Management</h1>
          <p className="text-muted-foreground mt-1">Manage inventory, mark new arrivals, and track out-of-stock items.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" /> Add New Product
        </button>
      </div>

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
                        {product.salePrice && product.salePrice < product.basePrice && (
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
                          <button className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
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
