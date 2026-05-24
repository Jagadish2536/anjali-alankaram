'use client';
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

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FDF5EC] border-t border-primary/10 shadow-[0_-2px_12px_rgba(139,0,48,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
