'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [androidInset, setAndroidInset] = useState(0);

  useEffect(() => {
    // Detect Android WebView by custom user agent suffix
    const isAndroidApp =
      typeof navigator !== 'undefined' &&
      navigator.userAgent.includes('AnjaliAlankaramAndroidApp');

    if (!isAndroidApp) return;

    const computeInset = () => {
      // visualViewport.height = visible area (excludes system UI like nav bar)
      // window.innerHeight in a full-screen WebView = full screen height
      // So the difference is the height of the Android system navigation bar
      const vvHeight = window.visualViewport?.height ?? window.innerHeight;
      const inset = window.innerHeight - vvHeight;
      // Clamp to a sensible range (Android nav bars are 24–80 px)
      setAndroidInset(inset > 0 && inset < 200 ? inset : 0);
    };

    computeInset();
    window.visualViewport?.addEventListener('resize', computeInset);
    window.addEventListener('resize', computeInset);
    return () => {
      window.visualViewport?.removeEventListener('resize', computeInset);
      window.removeEventListener('resize', computeInset);
    };
  }, []);

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
