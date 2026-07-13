import { create } from 'zustand';
import { api } from '../lib/api';

interface WishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    basePrice: number;
    salePrice: number;
    variants: any[];
    avgRating?: number | string;
    reviewCount?: number;
  };
}

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchWishlist: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/wishlist');
      set({ items: data?.items || [] });
    } catch (error) {
      console.error('Failed to fetch wishlist', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post(`/wishlist/${productId}`);
      set({ items: data?.items || [] });
    } catch (error) {
      console.error('Failed to add to wishlist', error);
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (productId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.delete(`/wishlist/${productId}`);
      set({ items: data?.items || [] });
    } catch (error) {
      console.error('Failed to remove from wishlist', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearWishlist: () => {
    set({ items: [] });
  },
}));
