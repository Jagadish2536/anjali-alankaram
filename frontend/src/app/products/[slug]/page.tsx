'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Star, Minus, Plus, ShoppingBag, Heart, Zap,
  Instagram, ExternalLink, Truck, ShieldCheck,
  RefreshCw, CheckCircle2, MapPin, Package, Loader2,
  X, Ruler, Send, Trash2, ThumbsUp, ChevronRight, Eye, ChevronDown
} from 'lucide-react';

// ── Lotus marquee ──────────────────────────────────────────────────────────────
const LotusSVG = () => (
  <svg viewBox="0 0 60 48" className="w-7 h-5 text-primary-foreground/70 shrink-0 mx-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M30 44C30 44 10 32 10 20C10 14 18 8 30 8C42 8 50 14 50 20C50 32 30 44 30 44Z"/>
    <path d="M30 44C30 44 16 30 16 18C16 12 22 6 30 6C38 6 44 12 44 18C44 30 30 44 30 44Z"/>
    <path d="M30 8C30 8 15 14 12 24" strokeLinecap="round"/>
    <path d="M30 8C30 8 45 14 48 24" strokeLinecap="round"/>
  </svg>
);

const MARQUEE_ITEMS = [
  'Free Delivery', 'Premium Quality',
  'Exchange is allowed only for damaged, defective, or wrong products',
  'Free Delivery', 'Premium Quality',
  'Exchange is allowed only for damaged, defective, or wrong products',
];

function LotusPolicyMarquee() {
  const items = MARQUEE_ITEMS.flatMap((t, i) => [{ type: 'text', val: t, key: `t${i}` }, { type: 'lotus', key: `l${i}` }]);
  return (
    <div className="w-full bg-primary overflow-hidden py-2" aria-hidden="true">
      <div className="flex animate-marquee" style={{ width: 'max-content' }}>
        {[...items, ...items].map((item, idx) =>
          item.type === 'lotus'
            ? <LotusSVG key={`${item.key}-${idx}`} />
            : <span key={`${item.key}-${idx}`} className="text-primary-foreground/80 text-xs font-medium tracking-wide shrink-0 mx-2">{item.val}</span>
        )}
      </div>
    </div>
  );
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'How long does shipping take?', a: 'Orders are typically delivered within 5–8 business days across India. Express delivery options are available at checkout.' },
  { q: 'What is your return policy?', a: 'Exchange is allowed only for damaged, defective, or wrong products. Please raise a request within 48 hours of delivery with photos.' },
  { q: 'Do you offer international shipping?', a: 'Currently we ship within India only. We are working on expanding to international shipping soon.' },
];

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-0 border-t">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border-b">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between py-4 text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
          >
            {item.q}
            <ChevronDown className={`w-4 h-4 shrink-0 ml-4 transition-transform duration-200 ${open === i ? 'rotate-180 text-primary' : 'text-muted-foreground'}`} />
          </button>
          {open === i && (
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Image Lightbox Modal ──────────────────────────────────────────────────
function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center" onClick={onClose}>
      {/* Close button */}
      <button className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" onClick={onClose}>
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
        {current + 1} / {images.length}
      </div>

      {/* Main image */}
      <div className="relative w-full max-w-3xl max-h-[80vh] flex items-center justify-center px-16" onClick={e => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            className="absolute left-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
            onClick={() => setCurrent(c => (c - 1 + images.length) % images.length)}
          >
            <span className="text-white text-xl">‹</span>
          </button>
        )}
        <div className="relative w-full" style={{ aspectRatio: '3/4', maxHeight: '80vh' }}>
          <Image src={images[current]} alt={`Image ${current + 1}`} fill className="object-contain" priority />
        </div>
        {images.length > 1 && (
          <button
            className="absolute right-2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
            onClick={() => setCurrent(c => (c + 1) % images.length)}
          >
            <span className="text-white text-xl">›</span>
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-4 px-4 overflow-x-auto" onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                current === i ? 'border-white scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              <Image src={img} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Size Guide Modal ────────────────────────────────────────────────────────
function SizeGuideModal({ sizeGuide, onClose }: { sizeGuide: any[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold font-outfit">Size Guide</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, hsl(340,60%,52%), hsl(340,60%,40%))' }}>
                  {['Size', 'Bust (in)', 'Waist (in)', 'Hips (in)', 'Length (in)'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-white font-semibold text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeGuide.map((row: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                    <td className="px-5 py-3 font-bold text-primary">{row.size}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.bust || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.waist || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.hips || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.length || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-bold text-blue-800 mb-1">How to measure</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li><strong>Bust:</strong> Measure around the fullest part of your chest</li>
              <li><strong>Waist:</strong> Measure around your natural waistline</li>
              <li><strong>Hips:</strong> Measure around the fullest part of your hips</li>
              <li><strong>Length:</strong> From shoulder to hemline</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Star Rater ──────────────────────────────────────────────────────────────
function StarRater({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="text-2xl transition-transform hover:scale-125"
        >
          <Star className={`w-7 h-7 transition-colors ${s <= (hover || value) ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground'}`} />
        </button>
      ))}
    </div>
  );
}

// ── Review Card ─────────────────────────────────────────────────────────────
function ReviewCard({ review, onDelete, currentUserId }: { review: any; onDelete: () => void; currentUserId?: string }) {
  return (
    <div className="border rounded-2xl p-5 space-y-3 hover:border-primary/20 transition-colors bg-white">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
            {review.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-bold">{review.user?.name || 'Customer'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground'}`} />
                ))}
              </div>
              {review.isVerified && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Verified Purchase
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {review.userId === currentUserId && (
            <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {review.title && <p className="text-sm font-bold">{review.title}</p>}
      {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [viewerCount] = useState(() => Math.floor(Math.random() * 25) + 8);
  const [activeDetailTab, setActiveDetailTab] = useState<'description' | 'shipping'>('description');

  // Wishlist
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Buy Now
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  // Delivery / pincode
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Cart feedback
  const [addedToCart, setAddedToCart] = useState(false);

  // Size guide modal
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submitingReview, setSubmitingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  const { addItem, isLoading: isCartLoading } = useCartStore();

  // ── Fetch product ───────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data } = await api.get(`/products/${params.slug}`);
        setProduct(data);
        if (data.variants?.length > 0) setSelectedVariant(data.variants[0]);
      } catch {
        console.error('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }
    if (params.slug) fetchProduct();
  }, [params.slug]);

  // ── Fetch wishlist status ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !product) return;
    api.get('/wishlist').then(({ data }) => {
      const ids = data.items?.map((i: any) => i.productId) || [];
      setIsWishlisted(ids.includes(product.id));
    }).catch(() => {});
  }, [isAuthenticated, product]);

  // ── Fetch reviews ───────────────────────────────────────────────────────
  const fetchReviews = async (productId: string) => {
    setReviewsLoading(true);
    try {
      const { data } = await api.get(`/reviews/product/${productId}`);
      setReviews(Array.isArray(data) ? data : []);
    } catch { setReviews([]); }
    finally { setReviewsLoading(false); }
  };

  useEffect(() => {
    if (product?.id) fetchReviews(product.id);
  }, [product?.id]);

  // ── Fetch related products ──────────────────────────────────────────────
  useEffect(() => {
    if (!product?.category?.slug) return;
    api.get('/products', { params: { categorySlug: product.category.slug, limit: 6, t: Date.now() } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setRelatedProducts(list.filter((p: any) => p.id !== product.id).slice(0, 5));
      }).catch(() => {});
  }, [product?.category?.slug, product?.id]);

  if (isLoading) return (
    <div className="container py-20 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
      <p className="text-muted-foreground">Loading product…</p>
    </div>
  );
  if (!product) return <div className="container py-20 text-center text-muted-foreground">Product not found</div>;

  const currentPrice = Number(product.salePrice || product.basePrice) + Number(selectedVariant?.extraPrice || 0);
  const originalPrice = Number(product.basePrice) + Number(selectedVariant?.extraPrice || 0);
  const discountPct = currentPrice < originalPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const allImages = product.images || [];
  const sizeGuide: any[] = Array.isArray(product.sizeGuide) ? product.sizeGuide : [];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    try {
      await addItem(selectedVariant.id, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch { alert('Failed to add to cart. Please try again.'); }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant) return;
    if (!isAuthenticated) { router.push('/login?returnUrl=' + window.location.pathname); return; }
    setIsBuyingNow(true);
    try {
      await addItem(selectedVariant.id, quantity);
      router.push('/checkout');
    } catch { alert('Failed. Please try again.'); }
    finally { setIsBuyingNow(false); }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await api.delete(`/wishlist/${product.id}`);
        setIsWishlisted(false);
      } else {
        await api.post(`/wishlist/${product.id}`, {});
        setIsWishlisted(true);
      }
    } catch { alert('Could not update wishlist'); }
    finally { setWishlistLoading(false); }
  };

  const checkPincode = async () => {
    if (pincode.length !== 6) { setPincodeStatus({ ok: false, msg: 'Please enter a valid 6-digit pincode.' }); return; }
    setCheckingPin(true);
    setPincodeStatus(null);
    await new Promise(r => setTimeout(r, 800));
    const ok = parseInt(pincode[0]) <= 8;
    setPincodeStatus({ ok, msg: ok ? `Delivery available to ${pincode}. Estimated 3–5 business days.` : `Sorry, delivery is not available to pincode ${pincode} yet.` });
    setCheckingPin(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!reviewForm.comment.trim()) { setReviewError('Please write a review comment.'); return; }
    setSubmitingReview(true);
    setReviewError('');
    try {
      await api.post('/reviews', { productId: product.id, ...reviewForm });
      setReviewSuccess(true);
      setReviewForm({ rating: 5, title: '', comment: '' });
      await fetchReviews(product.id);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err: any) {
      setReviewError(err.response?.data?.message || 'Failed to submit review.');
    } finally { setSubmitingReview(false); }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Delete your review?')) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch { alert('Failed to delete review.'); }
  };

  const ratingBreakdown = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0
  }));

  return (
    <div>
      {showSizeGuide && sizeGuide.length > 0 && (
        <SizeGuideModal sizeGuide={sizeGuide} onClose={() => setShowSizeGuide(false)} />
      )}
      {lightboxOpen && allImages.length > 0 && (
        <ImageLightbox images={allImages} initialIndex={activeImage} onClose={() => setLightboxOpen(false)} />
      )}

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="container py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          {product.isBestseller
            ? <><Link href="/products?filter=bestseller" className="hover:text-primary transition-colors">Best Sellers</Link><ChevronRight className="w-3 h-3" /></>
            : product.category?.name
            ? <><Link href={`/products?category=${product.category.slug}`} className="hover:text-primary transition-colors">{product.category.name}</Link><ChevronRight className="w-3 h-3" /></>
            : null
          }
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="container py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* ── Images: vertical thumbnail strip + main ──────────────── */}
          <div className="flex gap-3 sticky top-4 self-start">
            {/* Vertical thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex flex-col gap-2 shrink-0">
                {allImages.slice(0, 6).map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === i ? 'border-primary shadow-md' : 'border-transparent hover:border-primary/40'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Main image */}
            <div
              className="relative flex-1 aspect-[3/4] overflow-hidden rounded-2xl bg-accent/20 group cursor-zoom-in"
              onClick={() => allImages.length > 0 && setLightboxOpen(true)}
              title="Click to view full image"
            >
              {allImages[activeImage] && (
                <Image src={allImages[activeImage]} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" priority />
              )}
              <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🔍 Zoom
              </div>
              {discountPct > 0 && (
                <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full shadow">{discountPct}% OFF</div>
              )}
              {/* Wishlist + Share row */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleWishlist(); }}
                  disabled={wishlistLoading}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow transition-all backdrop-blur-sm ${
                    isWishlisted ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-600 hover:text-red-500'
                  }`}
                  aria-label="Wishlist"
                >
                  {wishlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />}
                </button>
              </div>
            </div>
          </div>

        {/* ── Details ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Name + social proof */}
          <div>
            <h1 className="font-outfit text-2xl md:text-3xl font-bold text-foreground leading-tight">{product.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(Number(product.avgRating)) ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground fill-none opacity-40'}`} />)}
              </div>
              <button onClick={() => { setActiveTab('reviews'); document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="text-xs text-muted-foreground hover:text-primary underline">{product.reviewCount} reviews</button>
              {product.isBestseller && <span className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">🔥 Bestseller</span>}
            </div>
          </div>

          {/* Price + stock + social proof */}
          <div className="space-y-1.5">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-outfit font-bold">₹ {Number(currentPrice).toLocaleString('en-IN')}</span>
              {discountPct > 0 && (
                <>
                  <span className="text-lg text-muted-foreground line-through mb-0.5">{formatPrice(originalPrice)}</span>
                  <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full mb-0.5">{discountPct}% OFF</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {selectedVariant ? `${selectedVariant.stock > 0 ? selectedVariant.stock : 0} In Stock` : '100 In Stock'}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              {viewerCount} people are viewing this right now
            </p>
          </div>

          {/* Size + Colour Selector */}
          {product.variants?.length > 0 && (() => {
            // Extract unique colours (non-empty)
            const colouredVariants = product.variants.filter((v: any) => v.color && v.color.trim() !== '');
            const uniqueColours = colouredVariants.length > 0
              ? Array.from(new Map(colouredVariants.map((v: any) => [v.color, v])).values()) as any[]
              : [];
            const hasColour = uniqueColours.length > 0;

            return (
              <div className="space-y-4">
                {/* Colour swatches */}
                {hasColour && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-bold">Colour</h3>
                      {selectedVariant?.color && (
                        <span className="text-xs text-muted-foreground font-medium">
                          — {selectedVariant.color}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {uniqueColours.map((v: any) => {
                        // Is this colour hex or a name? Detect by leading '#'
                        const isHex = v.color?.startsWith('#');
                        const selectedColorGroup = selectedVariant?.color;
                        const isSelected = selectedColorGroup === v.color;
                        const outOfStock = product.variants
                          .filter((vv: any) => vv.color === v.color)
                          .every((vv: any) => vv.stock === 0);
                        return (
                          <button
                            key={v.id}
                            title={v.color}
                            disabled={outOfStock}
                            onClick={() => {
                              // Select first in-stock variant of this colour
                              const match = product.variants.find(
                                (vv: any) => vv.color === v.color && vv.stock > 0
                              ) || product.variants.find((vv: any) => vv.color === v.color);
                              if (match) setSelectedVariant(match);
                            }}
                            className={`relative w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:border-foreground/40'
                            } ${outOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {isHex ? (
                              <span
                                className="block w-7 h-7 rounded-full"
                                style={{ backgroundColor: v.color }}
                              />
                            ) : (
                              <span
                                className="block w-7 h-7 rounded-full border border-border"
                                style={{ backgroundColor: v.color }}
                              />
                            )}
                            {outOfStock && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="block w-8 h-0.5 bg-muted-foreground/60 rotate-45 rounded-full" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">Select Size</h3>
                    {sizeGuide.length > 0 && (
                      <button onClick={() => setShowSizeGuide(true)} className="text-xs text-primary flex items-center gap-1 hover:underline font-medium">
                        <Ruler className="w-3.5 h-3.5" /> Size Guide
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.variants.map((v: any) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        disabled={v.stock === 0}
                        className={`h-11 px-5 rounded-full border-2 text-sm font-semibold transition-all ${
                          selectedVariant?.id === v.id
                            ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : v.stock === 0 ? 'border-muted text-muted-foreground bg-muted/30 cursor-not-allowed line-through' : 'border-input hover:border-primary hover:text-primary'
                        }`}
                      >
                        {v.size}{v.color && hasColour && v.color !== selectedVariant?.color ? '' : ''}{v.stock === 0 && ' ✕'}
                      </button>
                    ))}
                  </div>
                  {selectedVariant && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedVariant.stock > 0 ? <><span className="text-green-600 font-bold">✓ In Stock</span> — {selectedVariant.stock} left</> : <span className="text-red-600 font-bold">Out of Stock</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Quantity */}
          <div>
            <p className="text-sm font-semibold mb-2">Quantity</p>
            <div className="flex items-center border border-border rounded-xl h-11 w-36 justify-between px-4 bg-white">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-muted-foreground hover:text-foreground"><Minus className="w-4 h-4" /></button>
              <span className="font-semibold text-sm">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} disabled={!selectedVariant || selectedVariant.stock <= quantity} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                id="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isCartLoading || !selectedVariant || selectedVariant?.stock === 0}
                className={`flex-1 h-12 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${addedToCart ? 'border-green-500 text-green-600 bg-green-50' : 'border-primary text-primary hover:bg-primary/5'}`}
              >
                {addedToCart ? <><CheckCircle2 className="w-4 h-4" />Added!</> : isCartLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to cart'}
              </button>
            </div>
            <button
              id="buy-now-btn"
              onClick={handleBuyNow}
              disabled={isBuyingNow || isCartLoading || !selectedVariant || selectedVariant?.stock === 0}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
            >
              {isBuyingNow ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : 'BUY NOW'}
            </button>
            <p className="text-xs text-muted-foreground text-center">📦 Estimated Delivery: 10 - 12 days</p>
          </div>

          {/* ── DELIVERY OPTIONS ─────────────────────────────────────── */}
          <div className="border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/10">
              <Truck className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold uppercase tracking-wide">Delivery Options</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="pincode-input"
                      type="tel" maxLength={6} placeholder="Enter pincode"
                      value={pincode}
                      onChange={e => { setPincode(e.target.value.replace(/\D/g, '')); setPincodeStatus(null); }}
                      onKeyDown={e => e.key === 'Enter' && checkPincode()}
                      className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary bg-muted/10"
                    />
                  </div>
                  <button onClick={checkPincode} disabled={checkingPin || pincode.length < 6} className="px-5 py-2.5 rounded-xl text-sm font-bold text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40">
                    {checkingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
                  </button>
                </div>
                {pincodeStatus ? (
                  <p className={`text-xs mt-2 flex items-center gap-1.5 font-medium ${pincodeStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {pincodeStatus.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : '⚠'} {pincodeStatus.msg}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">Please enter PIN code to check delivery time &amp; Pay on Delivery Availability</p>
                )}
              </div>
              <div className="space-y-2.5 pt-2 border-t">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center shrink-0"><ShieldCheck className="w-3.5 h-3.5 text-green-600" /></div>
                  <span className="text-sm text-muted-foreground">100% Original Products</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Package className="w-3.5 h-3.5 text-blue-600" /></div>
                  <span className="text-sm text-muted-foreground">
                    {product.codAvailable !== false ? 'Pay on delivery available' : 'Pay on delivery not available for this item'}
                  </span>
                </div>
                {/* Return badge — only show if returnEnabled */}
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${product.returnEnabled !== false ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    <RefreshCw className={`w-3.5 h-3.5 ${product.returnEnabled !== false ? 'text-purple-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.returnEnabled !== false && (product.returnDays ?? 14) > 0
                      ? <span className="font-medium text-purple-700">{product.returnDays || 14}-Day Easy Returns</span>
                      : <span className="line-through text-gray-400">No Returns Available</span>
                    }
                  </span>
                </div>

                {/* Replace badge — only show if replaceEnabled */}
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${product.replaceEnabled !== false ? 'bg-teal-50' : 'bg-gray-50'}`}>
                    <Package className={`w-3.5 h-3.5 ${product.replaceEnabled !== false ? 'text-teal-600' : 'text-gray-400'}`} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.replaceEnabled !== false
                      ? <span className="font-medium text-teal-700">Free Replacement Available</span>
                      : <span className="line-through text-gray-400">No Replacement Available</span>
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
      </div>

      {/* ── Lotus Policy Marquee ────────────────────────────────────────────── */}
      <LotusPolicyMarquee />

      {/* ── Product Description + Shipping Tabs ─────────────────────────────── */}
      <div className="container py-10">
        <div className="flex border-b border-border mb-8">
          {(['description', 'shipping'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveDetailTab(tab)}
              className={`px-6 py-3 text-sm font-medium capitalize border-b-2 transition-colors -mb-[2px] ${
                activeDetailTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'description' ? 'Product description' : 'Shipping & Refund'}
            </button>
          ))}
        </div>

        {activeDetailTab === 'description' && (
          <div className="max-w-3xl space-y-4 text-sm text-muted-foreground leading-relaxed">
            {product.description ? (
              <p className="whitespace-pre-wrap">{product.description}</p>
            ) : (
              <p className="text-muted-foreground/60">No description available.</p>
            )}
            {(product.material || product.careInstructions) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {product.material && (
                  <div className="p-4 bg-muted/20 rounded-xl border">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Material</p>
                    <p className="font-medium text-foreground">{product.material}</p>
                  </div>
                )}
                {product.careInstructions && (
                  <div className="p-4 bg-muted/20 rounded-xl border">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Care Instructions</p>
                    <p className="font-medium text-foreground">{product.careInstructions}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeDetailTab === 'shipping' && (
          <div className="max-w-3xl text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>📦 <strong>Delivery Time:</strong> Orders are delivered within 10–12 business days across India.</p>
            <p>🔄 <strong>Exchange Policy:</strong> Exchange is allowed only for damaged, defective, or wrong products. Contact us within 48 hours of delivery.</p>
            <p>💳 <strong>Payment:</strong> We accept UPI, Credit/Debit Cards, and Cash on Delivery.</p>
          </div>
        )}
      </div>

      {/* ── Reviews section ──────────────────────────────────────────────────── */}
      <div id="reviews-section" className="container pb-10 mt-4">
        <h2 className="font-outfit text-xl font-bold text-foreground mb-6">Customer Reviews</h2>

        {/* Description tab */}
        {activeTab === 'description' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-3">About this product</h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </div>
            {(product.material || product.careInstructions) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.material && (
                  <div className="p-4 bg-muted/10 rounded-xl border">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Material</p>
                    <p className="text-sm font-medium">{product.material}</p>
                  </div>
                )}
                {product.careInstructions && (
                  <div className="p-4 bg-muted/10 rounded-xl border">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Care Instructions</p>
                    <p className="text-sm font-medium">{product.careInstructions}</p>
                  </div>
                )}
              </div>
            )}
            {product.tags?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag: string) => (
                    <span key={tag} className="text-xs bg-muted/30 text-muted-foreground px-3 py-1 rounded-full border">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Summary panel */}
            <div className="space-y-6">
              <div className="p-6 border rounded-2xl text-center bg-white shadow-sm">
                <div className="text-6xl font-outfit font-bold text-foreground">{Number(product.avgRating).toFixed(1)}</div>
                <div className="flex justify-center gap-1 my-2">
                  {[1,2,3,4,5].map(s => <Star key={s} className={`w-5 h-5 ${s <= Math.round(Number(product.avgRating)) ? 'fill-yellow-400 stroke-yellow-400' : 'stroke-muted-foreground fill-none'}`} />)}
                </div>
                <p className="text-sm text-muted-foreground">{product.reviewCount} reviews</p>
              </div>
              <div className="space-y-2">
                {ratingBreakdown.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-4 text-right font-medium">{star}</span>
                    <Star className="w-3.5 h-3.5 fill-yellow-400 stroke-yellow-400 shrink-0" />
                    <div className="flex-1 bg-muted/20 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-5">{count}</span>
                  </div>
                ))}
              </div>

              {/* Write review form */}
              {isAuthenticated ? (
                <div className="border rounded-2xl p-5 bg-white shadow-sm">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-primary" /> Write a Review</h3>
                  {reviewSuccess && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Review submitted!
                    </div>
                  )}
                  {reviewError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
                      <X className="w-4 h-4" /> {reviewError}
                    </div>
                  )}
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wide">Your Rating</label>
                      <StarRater value={reviewForm.rating} onChange={v => setReviewForm(p => ({ ...p, rating: v }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-muted-foreground uppercase tracking-wide">Title (optional)</label>
                      <input
                        type="text"
                        placeholder="Summarise your experience"
                        className="w-full px-3 py-2 bg-muted/20 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        value={reviewForm.title}
                        onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-muted-foreground uppercase tracking-wide">Review *</label>
                      <textarea
                        required rows={4}
                        placeholder="Tell others what you think about this product..."
                        className="w-full px-3 py-2 bg-muted/20 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                        value={reviewForm.comment}
                        onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitingReview}
                      className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
                    >
                      {submitingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Submit Review</>}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-5 border rounded-2xl text-center bg-muted/5">
                  <p className="text-sm text-muted-foreground mb-3">Sign in to leave a review</p>
                  <button onClick={() => router.push('/login')} className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90">Sign In</button>
                </div>
              )}
            </div>

            {/* Review list */}
            <div className="lg:col-span-2 space-y-4">
              {reviewsLoading ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary/60 mx-auto" /></div>
              ) : reviews.length === 0 ? (
                <div className="py-16 text-center border rounded-2xl bg-muted/5">
                  <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No reviews yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Be the first to review this product!</p>
                </div>
              ) : (
                reviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    currentUserId={user?.id}
                    onDelete={() => handleDeleteReview(review.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Instagram Reel ─────────────────────────────────────────────── */}
      {product.instagramReelUrl && (() => {
        const match = product.instagramReelUrl.match(/instagram\.com\/(reel|p)\/([A-Za-z0-9_-]+)/);
        if (!match) return null;
        return (
          <div className="container mt-4 mb-8">
            <div className="rounded-2xl overflow-hidden border shadow">
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5 text-white" />
                  <span className="font-bold text-white">See it in action</span>
                </div>
                <a href={product.instagramReelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
                  View on Instagram <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-center py-6 bg-pink-50">
                <iframe src={`https://www.instagram.com/reel/${match[2]}/embed/`} width="360" height="480" frameBorder="0" scrolling="no" allowTransparency allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" className="rounded-xl shadow-xl max-w-full" title="Instagram Reel" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="container py-8">
        <h2 className="font-cormorant text-3xl font-bold text-center text-primary mb-8">Frequently Asked Questions</h2>
        <div className="max-w-2xl mx-auto">
          <FaqAccordion />
        </div>
      </div>

      {/* ── You Might Also Like ───────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="container py-8 pb-16">
          <h2 className="font-cormorant text-3xl font-bold text-center text-foreground mb-8">You Might Also Like</h2>
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
            {relatedProducts.map(rp => (
              <Link key={rp.id} href={`/products/${rp.slug}`} className="group shrink-0 w-44">
                <div className="relative w-44 aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-2">
                  {rp.images?.[0]
                    ? <Image src={rp.images[0]} alt={rp.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No Image</div>
                  }
                  <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{rp.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">₹ {Number(rp.salePrice || rp.basePrice).toLocaleString('en-IN')}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Sticky bottom buy bar ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-lg py-2.5 px-4 flex items-center gap-3">
        {allImages[0] && (
          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
            <Image src={allImages[0]} alt={product.name} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground line-clamp-1">{product.name}</p>
        </div>
        {/* Variant selector */}
        {product.variants?.length > 0 && selectedVariant && (
          <select
            value={selectedVariant.id}
            onChange={e => setSelectedVariant(product.variants.find((v: any) => v.id === e.target.value))}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary shrink-0 max-w-[140px]"
          >
            {product.variants.map((v: any) => (
              <option key={v.id} value={v.id} disabled={v.stock === 0}>
                {v.size || v.color || 'Default'} — ₹{Number(Number(product.salePrice || product.basePrice) + Number(v.extraPrice || 0)).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        )}
        {/* Quantity stepper */}
        <div className="flex items-center border border-border rounded-lg h-8 gap-0 shrink-0">
          <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-7 h-full flex items-center justify-center text-muted-foreground hover:text-foreground border-r border-border"><Minus className="w-3 h-3" /></button>
          <span className="w-7 text-center text-xs font-semibold">{quantity}</span>
          <button onClick={() => setQuantity(q => q + 1)} className="w-7 h-full flex items-center justify-center text-muted-foreground hover:text-foreground border-l border-border"><Plus className="w-3 h-3" /></button>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isCartLoading || !selectedVariant || selectedVariant?.stock === 0}
          className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
