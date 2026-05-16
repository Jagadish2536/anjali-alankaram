'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/useCartStore';
import { Star, Minus, Plus, ShoppingBag } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const { addItem, isLoading: isCartLoading } = useCartStore();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data } = await api.get(`/products/${params.slug}`);
        setProduct(data);
        if (data.variants?.length > 0) {
          setSelectedVariant(data.variants[0]);
        }
      } catch (error) {
        console.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }
    if (params.slug) fetchProduct();
  }, [params.slug]);

  if (isLoading) return <div className="container py-20 text-center animate-pulse">Loading...</div>;
  if (!product) return <div className="container py-20 text-center">Product not found</div>;

  const currentPrice = Number(product.salePrice || product.basePrice) + Number(selectedVariant?.extraPrice || 0);
  const originalPrice = Number(product.basePrice) + Number(selectedVariant?.extraPrice || 0);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    try {
      await addItem(selectedVariant.id, quantity);
      alert('Added to cart!');
    } catch (e) {
      alert('Failed to add to cart. Please try again.');
    }
  };

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-accent/20">
            {product.images?.[0] && (
              <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
            )}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images?.slice(1, 5).map((img: string, i: number) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-accent/20 cursor-pointer border-2 border-transparent hover:border-primary">
                <Image src={img} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-outfit font-bold text-foreground mb-2">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-yellow-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="ml-1 text-sm font-medium text-foreground">{product.avgRating}</span>
            </div>
            <span className="text-sm text-muted-foreground underline cursor-pointer">{product.reviewCount} Reviews</span>
          </div>

          <div className="flex items-end gap-3 mb-8">
            <span className="text-3xl font-bold">{formatPrice(currentPrice)}</span>
            {currentPrice < originalPrice && (
              <>
                <span className="text-lg text-muted-foreground line-through mb-1">{formatPrice(originalPrice)}</span>
                <span className="text-sm font-bold text-green-600 mb-2">
                  {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="mb-8 space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Select Size</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      disabled={v.stock === 0}
                      className={`h-12 px-6 rounded-full border flex items-center justify-center transition-all
                        ${selectedVariant?.id === v.id 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-input hover:border-primary'}
                        ${v.stock === 0 ? 'opacity-50 cursor-not-allowed bg-muted' : ''}
                      `}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Add to Cart */}
          <div className="flex gap-4 mb-10">
            <div className="flex items-center border rounded-full h-14 w-32 justify-between px-4">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-muted-foreground hover:text-foreground">
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-medium">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="text-muted-foreground hover:text-foreground" disabled={selectedVariant?.stock <= quantity}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={handleAddToCart}
              disabled={isCartLoading || !selectedVariant || selectedVariant.stock === 0}
              className="flex-1 bg-primary text-primary-foreground h-14 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <ShoppingBag className="w-5 h-5" />
              {selectedVariant?.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none text-muted-foreground border-t pt-8">
            <h3 className="text-lg font-medium text-foreground mb-4">Product Details</h3>
            <p className="whitespace-pre-wrap">{product.description}</p>
            
            {product.material && (
              <div className="mt-4">
                <strong>Material:</strong> {product.material}
              </div>
            )}
            {product.careInstructions && (
              <div className="mt-2">
                <strong>Care:</strong> {product.careInstructions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
