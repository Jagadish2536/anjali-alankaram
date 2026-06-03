import { create } from 'zustand';
import { api } from '../lib/api';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    basePrice: number;
    salePrice: number;
  };
  variant: {
    id: string;
    size: string;
    color: string;
    colorHex?: string;
    extraPrice: number;
    stock: number;
    images: string[];
  };
}

interface AppliedOffer {
  id: string;
  title: string;
  discount: number;
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  appliedOffer: AppliedOffer | null;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  itemCount: 0,
  appliedOffer: null,
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/cart');
      set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount, appliedOffer: data.appliedOffer });
    } catch (error) {
      console.error('Failed to fetch cart', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (variantId: string, quantity: number) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/cart/items', { variantId, quantity });
      set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount, appliedOffer: data.appliedOffer });
    } catch (error) {
      console.error('Failed to add item', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateItem: async (itemId: string, quantity: number) => {
    set({ isLoading: true });
    try {
      const { data } = await api.put(`/cart/items/${itemId}`, { quantity });
      set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount, appliedOffer: data.appliedOffer });
    } catch (error) {
      console.error('Failed to update item', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (itemId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.delete(`/cart/items/${itemId}`);
      set({ items: data.items, subtotal: data.subtotal, itemCount: data.itemCount, appliedOffer: data.appliedOffer });
    } catch (error) {
      console.error('Failed to remove item', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: () => {
    set({ items: [], subtotal: 0, itemCount: 0, appliedOffer: null });
  },
}));
