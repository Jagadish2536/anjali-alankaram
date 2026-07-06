'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Loader2, AlertTriangle, CheckCircle2, AlertCircle, Star, Search, RefreshCw, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';

// ── Confirm Delete Dialog ───────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, isDeleting }: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="font-bold text-base text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-xl border-2 border-border text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin Reviews Page ───────────────────────────────────────────────────
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/reviews/admin/all');
      setReviews(Array.isArray(data) ? data : data.data || []);
    } catch (e: any) {
      showFeedback('error', 'Failed to fetch reviews: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/reviews/${confirmDelete.id}`);
      setReviews(prev => prev.filter(r => r.id !== confirmDelete.id));
      showFeedback('success', 'Review deleted successfully!');
      setConfirmDelete(null);
    } catch (e: any) {
      showFeedback('error', 'Failed to delete review: ' + (e.response?.data?.message || e.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter reviews based on search query and rating selection
  const filteredReviews = reviews.filter((r) => {
    const userName = (r.user?.name || '').toLowerCase();
    const userEmail = (r.user?.email || '').toLowerCase();
    const userPhone = (r.user?.phone || '').toLowerCase();
    const productName = (r.product?.name || '').toLowerCase();
    const comment = (r.comment || '').toLowerCase();
    const title = (r.title || '').toLowerCase();
    const search = searchQuery.toLowerCase();

    const matchesSearch = 
      userName.includes(search) ||
      userEmail.includes(search) ||
      userPhone.includes(search) ||
      productName.includes(search) ||
      comment.includes(search) ||
      title.includes(search);

    const matchesRating = ratingFilter === 'ALL' || r.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

  return (
    <div className="space-y-6 sm:space-y-8 p-6">
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
          title="Delete Review?"
          message={`Are you sure you want to delete this review by ${confirmDelete.user?.name || 'Customer'}? This will delete the review permanently and update the product average rating.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground">Review Management</h1>
          <p className="text-muted-foreground mt-1">Monitor, inspect, and delete product reviews left by customers.</p>
        </div>
        <button
          onClick={fetchReviews}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-muted font-medium text-sm transition-colors w-fit shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer name, product, or review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
          />
        </div>

        {/* Rating Filter Selector */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filter Rating:</span>
          <select
            value={ratingFilter}
            onChange={(e) => {
              const val = e.target.value;
              setRatingFilter(val === 'ALL' ? 'ALL' : Number(val));
            }}
            className="w-full md:w-36 px-3 py-2 bg-muted/20 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-all"
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/10 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Review Title / Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-sm">Loading reviews...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <MessageSquare className="w-12 h-12 opacity-25" />
                      <div>
                        <p className="font-semibold text-foreground">No reviews found</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Try widening your search or filter settings.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const productImg = review.product?.images?.[0] || '/placeholder.png';
                  const dateStr = review.createdAt 
                    ? new Date(review.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={review.id} className="hover:bg-muted/5 transition-colors">
                      {/* Product details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-16 bg-muted border rounded-lg overflow-hidden shrink-0">
                            <Image
                              src={productImg}
                              alt={review.product?.name || 'Product'}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="max-w-xs truncate">
                            <p className="font-bold text-foreground truncate">{review.product?.name || 'Unknown Product'}</p>
                            {review.product?.slug && (
                              <Link 
                                href={`/products/${review.product.slug}`} 
                                target="_blank"
                                className="text-xs text-primary hover:underline font-medium block mt-0.5"
                              >
                                View Product
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Customer details */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-foreground">{review.user?.name || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{review.user?.email || 'No email'}</p>
                          {review.user?.phone && (
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{review.user.phone}</p>
                          )}
                        </div>
                      </td>

                      {/* Rating details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3.5 h-3.5 ${
                                star <= review.rating 
                                  ? 'fill-amber-400 stroke-amber-400' 
                                  : 'fill-none stroke-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      </td>

                      {/* Review details */}
                      <td className="px-6 py-4">
                        <div className="max-w-md whitespace-normal break-words">
                          {review.title && (
                            <p className="font-semibold text-foreground text-sm line-clamp-1">{review.title}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            &ldquo;{review.comment || 'No comment text provided.'}&rdquo;
                          </p>
                        </div>
                      </td>

                      {/* Purchase verification status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          review.isVerified 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {review.isVerified ? 'Verified Buyer' : 'Organic'}
                        </span>
                      </td>

                      {/* Date details */}
                      <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                        {dateStr}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setConfirmDelete(review)}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl transition-all inline-flex items-center justify-center"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
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
