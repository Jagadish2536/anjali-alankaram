'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Heart, ShoppingBag, User, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const NAV_ITEMS = [
  { label: 'Home',     href: '/',         icon: Home },
  { label: 'Wishlist', href: '/wishlist',  icon: Heart },
  { label: 'Shop',     href: '/products',  icon: ShoppingBag },
  { label: 'Account',  href: '/profile',   icon: User },
  { label: 'Help',     href: '/contact',   icon: HelpCircle },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Populated from the value Flutter injects via runJavaScript after each page load.
  // This gives the exact Android system navigation bar height in CSS pixels.
  const [androidInset, setAndroidInset] = useState(0);

  useEffect(() => {
    const isAndroidApp =
      typeof navigator !== 'undefined' &&
      navigator.userAgent.includes('AnjaliAlankaramAndroidApp');

    if (!isAndroidApp) return;

    const readInset = () => {
      // Flutter injects `window.__androidNavBarHeight = N` (CSS px) via
      // runJavaScript in onPageFinished. Read it for pixel-perfect padding.
      const injected = (window as unknown as Record<string, unknown>).__androidNavBarHeight;
      if (typeof injected === 'number' && injected > 0 && injected < 200) {
        setAndroidInset(injected);
        return;
      }
      // Fallback: read the CSS variable Flutter also sets on <html>
      const cssVal = getComputedStyle(document.documentElement)
        .getPropertyValue('--android-nav-inset')
        .trim();
      const parsed = parseFloat(cssVal);
      if (!isNaN(parsed) && parsed > 0 && parsed < 200) {
        setAndroidInset(parsed);
      }
    };

    // Read immediately (value may already exist on client-side nav)
    readInset();
    // Flutter's onPageFinished fires slightly after React hydration — retry once
    const timer = setTimeout(readInset, 400);
    return () => clearTimeout(timer);
  }, [pathname]); // re-run on every route change

  const isHiddenPage =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/orders');

  if (isHiddenPage) {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FDF5EC] border-t border-primary/10 shadow-[0_-2px_12px_rgba(139,0,48,0.08)]"
      style={{
        // Android app: exact system nav bar height injected by Flutter
        // iOS / browser: standard safe-area env() for home indicator / notch
        paddingBottom: androidInset > 0
          ? `${androidInset}px`
          : 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[60px]">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const handleClick = () => {
            if (label === 'Account' && !isAuthenticated) {
              router.push('/login');
            } else {
              router.push(href);
            }
          };
          return (
            <button
              key={label}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
              aria-label={label}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
