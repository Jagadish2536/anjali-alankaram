'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Search, User, Heart, LogOut, ShieldAlert, X, Menu, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { api } from '@/lib/api';

// Static nav categories matching Vedhatrendz style — merged with DB categories
const STATIC_NAV_CATEGORIES = [
  { name: 'Sarees', slug: 'sarees', hasDropdown: false },
  { name: 'Kurti Sets', slug: 'kurti-sets', hasDropdown: false },
  { name: 'Gowns', slug: 'gowns', hasDropdown: false },
  { name: 'Lehengas', slug: 'lehengas', hasDropdown: false },
  { name: 'Stretchable Blouses', slug: 'stretchable-blouses', hasDropdown: false },
  { name: 'Kids', slug: 'kids', hasDropdown: false },
  { name: 'Jewellery', slug: 'jewellery', hasDropdown: false },
];

export default function Navbar() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navCategories, setNavCategories] = useState(STATIC_NAV_CATEGORIES);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, [fetchSettings]);

  // Fetch DB categories and merge with static list
  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      const list: any[] = Array.isArray(data) ? data : data?.data || [];
      if (list.length > 0) {
        const merged = list.map((c: any) => ({
          name: c.name,
          slug: c.slug,
          hasDropdown: false,
        }));
        setNavCategories(merged);
      }
    }).catch(() => {});
  }, []);

  // Fetch wishlist count
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/wishlist')
        .then(({ data }) => setWishlistCount(data?.items?.length || 0))
        .catch(() => setWishlistCount(0));
    } else {
      setWishlistCount(0);
    }
  }, [isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchQuery('');
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  const storeName = settings.storeName || 'Anjali Alankaram';

  return (
    <>
      {/* ── Top Bar: Search | Logo | Icons ─────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-[#FDF5EC] shadow-sm">
        <div className="container flex h-16 items-center justify-between gap-4">

          {/* Search input */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 w-48 md:w-64 shrink-0 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 text-foreground min-w-0"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Logo — center */}
          <Link href="/" className="flex flex-col items-center shrink-0 group">
            <span className="font-cormorant text-2xl md:text-3xl font-bold text-primary tracking-wide leading-none group-hover:opacity-80 transition-opacity">
              {storeName}
            </span>
            <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-outfit">EST. 2024</span>
          </Link>

          {/* Right icons */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Account */}
            {mounted && isAuthenticated ? (
              <div className="flex items-center gap-2">
                {(['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'ORDER_MANAGER', 'STOCK_MANAGER'].includes(user?.role || '')) && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100/50 transition-colors"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link href="/profile" className="text-foreground hover:text-primary transition-colors p-1" aria-label="Profile">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                </Link>
                <button onClick={() => logout()} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Logout">
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors p-1" aria-label="Account">
                <User className="h-5 w-5" />
              </Link>
            )}

            {/* Wishlist */}
            <Link href="/wishlist" className="relative text-muted-foreground hover:text-primary transition-colors p-1" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              {mounted && isAuthenticated && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="text-muted-foreground hover:text-primary transition-colors p-1" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden text-muted-foreground hover:text-primary transition-colors p-1"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Category Nav Bar: scrollable on mobile ────────── */}
        <nav className="w-full bg-primary overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex items-center h-11 px-2 md:px-0 md:container md:justify-center gap-0 min-w-max md:min-w-0">
            <Link
              href="/"
              className="px-4 h-full flex items-center text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Home
            </Link>
            <Link
              href="/products"
              className="px-4 h-full flex items-center text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Shop All
            </Link>
            {navCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="px-4 h-full flex items-center gap-1 text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                {cat.name}
                {cat.hasDropdown && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
              </Link>
            ))}
          </div>
        </nav>

        {/* ── Mobile Full-screen Drawer ─────────────────────── */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="fixed top-[calc(4rem+2.75rem)] left-0 right-0 z-50 bg-primary border-t border-primary-foreground/10 shadow-xl max-h-[70vh] overflow-y-auto">
              <div className="py-2 flex flex-col">
                <Link href="/" onClick={() => setMobileOpen(false)}
                  className="py-3 px-6 text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors border-b border-primary-foreground/10">
                  🏠 Home
                </Link>
                <Link href="/products" onClick={() => setMobileOpen(false)}
                  className="py-3 px-6 text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors border-b border-primary-foreground/10">
                  🛍 Shop All
                </Link>
                {navCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/products?category=${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 px-6 text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors border-b border-primary-foreground/10"
                  >
                    {cat.name}
                  </Link>
                ))}
                {mounted && isAuthenticated && (
                  <Link href="/profile" onClick={() => setMobileOpen(false)}
                    className="py-3 px-6 text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors border-b border-primary-foreground/10">
                    👤 My Account
                  </Link>
                )}
                {mounted && isAuthenticated && ['ADMIN','SUPER_ADMIN','WAREHOUSE_STAFF','ORDER_MANAGER','STOCK_MANAGER'].includes(user?.role || '') && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}
                    className="py-3 px-6 text-sm font-bold text-rose-200 hover:text-white hover:bg-white/10 transition-colors">
                    ⚙ Admin Panel
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
}
