import { create } from 'zustand';
import { api } from '@/lib/api';

// ─── Full settings shape matching the DB schema ────────────────────────────
interface StoreSettings {
  // Store Info
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  instagramUrl: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  // Security / Notifications
  maintenanceMode: boolean;
  require2FA: boolean;
  notifyNewOrder: boolean;
  notifyLowStock: boolean;
  notifyCustomerSignup: boolean;
  // Regional
  currency: string;
  currencySymbol: string;
  gstEnabled: boolean;
  gstRate: number;
  freeShippingThreshold: number;
  shippingCharge: number;
  codEnabled: boolean;
  codCharges: number;
  // Features
  couponsEnabled: boolean;
  giftEnabled: boolean;
  giftAmount: number;
  platformFeeEnabled: boolean;
  platformFeeAmount: number;
  // Inventory / Policy
  lowStockThreshold: number;
  reservationTimeoutMins: number;
  returnPolicyDays: number;
  footerCategories: any;
  marqueeText: string;
  heroImageUrl: string;
  heroLeftImageUrl: string;
  heroTitle: string;
  heroSubtitle: string;
}

interface SettingsStore {
  settings: StoreSettings;
  isFetched: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<StoreSettings>) => void;
}

const DEFAULT_SETTINGS: StoreSettings = {
  // Store Info
  storeName: 'Anjali Alankaram',
  supportEmail: 'support@anjalialankaram.com',
  supportPhone: '+91 9876543210',
  whatsappNumber: '+91 9876543210',
  instagramUrl: 'https://instagram.com/anjalialankaram',
  storeDescription: '',
  contactEmail: '',
  contactPhone: '',
  // Security / Notifications
  maintenanceMode: false,
  require2FA: false,
  notifyNewOrder: true,
  notifyLowStock: true,
  notifyCustomerSignup: true,
  // Regional
  currency: 'INR',
  currencySymbol: '₹',
  gstEnabled: false,
  gstRate: 18,
  freeShippingThreshold: 499,
  shippingCharge: 49,
  codEnabled: true,
  codCharges: 0,
  // Features
  couponsEnabled: true,
  giftEnabled: false,
  giftAmount: 35,
  platformFeeEnabled: false,
  platformFeeAmount: 0,
  // Inventory / Policy
  lowStockThreshold: 5,
  reservationTimeoutMins: 15,
  returnPolicyDays: 7,
  footerCategories: [],
  marqueeText: 'Free Delivery on All Orders',
  heroImageUrl: '',
  heroLeftImageUrl: '',
  heroTitle: 'Make Every Occasion Special',
  heroSubtitle: 'Designer Lehengas & Elegant Gowns for Festive Looks',
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isFetched: false,

  fetchSettings: async () => {
    // Always re-fetch to pick up latest admin changes (don't cache indefinitely)
    try {
      const { data } = await api.get('/settings');
      if (data) {
        set({
          settings: {
            ...DEFAULT_SETTINGS,
            ...data,
            // Ensure numeric fields are proper numbers
            gstRate: Number(data.gstRate ?? DEFAULT_SETTINGS.gstRate),
            freeShippingThreshold: Number(data.freeShippingThreshold ?? DEFAULT_SETTINGS.freeShippingThreshold),
            shippingCharge: Number(data.shippingCharge ?? DEFAULT_SETTINGS.shippingCharge),
            codCharges: Number(data.codCharges ?? DEFAULT_SETTINGS.codCharges),
            giftAmount: Number(data.giftAmount ?? DEFAULT_SETTINGS.giftAmount),
            platformFeeAmount: Number(data.platformFeeAmount ?? DEFAULT_SETTINGS.platformFeeAmount),
            returnPolicyDays: Number(data.returnPolicyDays ?? DEFAULT_SETTINGS.returnPolicyDays),
            lowStockThreshold: Number(data.lowStockThreshold ?? DEFAULT_SETTINGS.lowStockThreshold),
          },
          isFetched: true,
        });
      }
    } catch (e) {
      console.error('Failed to fetch settings');
      set({ isFetched: true });
    }
  },

  updateSettings: (data) => {
    set(state => ({ settings: { ...state.settings, ...data } }));
  },
}));
