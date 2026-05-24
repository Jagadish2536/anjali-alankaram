'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, ShoppingBag, X, Menu, ChevronRight, LogOut, ShieldAlert, Heart, User,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';

const STATIC_NAV_CATEGORIES = [
  { name: 'Sarees', slug: 'sarees' },
  { name: 'Kurti Sets', slug: 'kurti-sets' },
  { name: 'Gowns', slug: 'gowns' },
  { name: 'Lehengas', slug: 'lehengas' },
  { name: 'Stretchable Blouses', slug: 'stretchable-blouses' },
  { name: 'Kids', slug: 'kids' },
  { name: 'Jewellery', slug: 'jewellery' },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { items: cartItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [navCategories, setNavCategories] = useState(STATIC_NAV_CATEGORIES);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      const list: any[] = Array.isArray(data) ? data : data?.data || [];
      if (list.length > 0) {
        setNavCategories(list.map((c: any) => ({ name: c.name, slug: c.slug })));
      }
    }).catch(() => {});
  }, []);

  // Close drawer on outside click
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchQuery('');
    setShowSearch(false);
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  if (pathname.startsWith('/admin')) {
    return null;
  }

  const storeName = settings.storeName || 'Anjali Alankaram';
  const marqueeText = (settings as any).marqueeText || 'Free Delivery on all Orders';
  const cartCount = mounted ? cartItems?.length ?? 0 : 0;

  return (
    <>
      {/* ── Announcement Bar ─────────────────────────────────────────── */}
      {announcementVisible && (
        <div className="w-full bg-primary text-primary-foreground text-xs font-medium py-2 px-4 flex items-center justify-center relative">
          <span>{marqueeText}</span>
          <button
            onClick={() => setAnnouncementVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center hover:opacity-70"
            aria-label="Close announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-[#FDF5EC] shadow-sm">

        {/* ── Search overlay on mobile ── */}
        {showSearch && (
          <div className="absolute inset-0 z-20 bg-[#FDF5EC] flex items-center gap-3 px-4 h-14">
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
              />
            </form>
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          {/* Left: hamburger (mobile) / search (desktop) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden text-foreground p-1"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            {/* Desktop search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 w-56">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
              />
            </form>
          </div>

          {/* Center: Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center group">
            <span className="font-cormorant text-2xl md:text-3xl font-bold text-primary tracking-wide leading-none group-hover:opacity-80 transition-opacity">
              {storeName}
            </span>
            <span className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase font-outfit">EST. 2024</span>
          </Link>

          {/* Right: icons */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile search icon */}
            <button onClick={() => setShowSearch(true)} className="md:hidden text-foreground p-1" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>

            {/* Admin badge desktop only */}
            {mounted && isAuthenticated && ['ADMIN','SUPER_ADMIN','WAREHOUSE_STAFF','ORDER_MANAGER','STOCK_MANAGER'].includes(user?.role || '') && (
              <Link href="/admin" className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100/50 transition-colors">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Admin</span>
              </Link>
            )}

            {/* Cart */}
            <Link href="/cart" className="relative text-foreground p-1" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Desktop: Wishlist */}
            <Link href="/wishlist" className="hidden md:flex text-foreground hover:text-primary transition-colors p-1" title="Wishlist">
              <Heart className="h-5 w-5" />
            </Link>

            {/* Desktop: Profile */}
            <Link href={mounted && isAuthenticated ? "/profile" : "/login"} className="hidden md:flex text-foreground hover:text-primary transition-colors p-1" title="Profile">
              <User className="h-5 w-5" />
            </Link>

            {/* Desktop: logout */}
            {mounted && isAuthenticated && (
              <button onClick={() => logout()} className="hidden md:flex text-muted-foreground hover:text-red-500 transition-colors p-1" title="Logout">
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Desktop Category Nav ─────────────────────────────────────── */}
        <nav className="hidden md:block w-full bg-primary overflow-x-auto">
          <div className="flex items-center h-11 container justify-center gap-0">
            <Link href="/" className="px-4 h-full flex items-center text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              Home
            </Link>
            <Link href="/products" className="px-4 h-full flex items-center text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap">
              Shop All
            </Link>
            {navCategories.map(cat => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="px-4 h-full flex items-center text-sm font-medium text-primary-foreground/90 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Mobile Slide-over Drawer ─────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed top-0 left-0 bottom-0 z-[70] w-[85vw] max-w-sm bg-[#FDF5EC] md:hidden flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-primary/10 shrink-0">
              <button onClick={() => setMobileOpen(false)} className="p-1 text-foreground">
                <X className="w-5 h-5" />
              </button>
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex flex-col items-center">
                <span className="font-cormorant text-xl font-bold text-primary tracking-wide">{storeName}</span>
                <span className="text-[9px] tracking-[0.15em] text-muted-foreground uppercase font-outfit">EST. 2024</span>
              </Link>
              <div className="flex items-center gap-2">
                <button onClick={() => { setMobileOpen(false); setShowSearch(true); }} className="p-1 text-foreground" aria-label="Search">
                  <Search className="w-5 h-5" />
                </button>
                <Link href="/cart" onClick={() => setMobileOpen(false)} className="relative p-1 text-foreground" aria-label="Cart">
                  <ShoppingBag className="w-5 h-5" />
                  {mounted && cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Nav items */}
            <div className="flex-1 py-2">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center justify-between px-6 py-4 text-base text-foreground border-b border-primary/10 hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/products" onClick={() => setMobileOpen(false)} className="flex items-center justify-between px-6 py-4 text-base text-foreground border-b border-primary/10 hover:text-primary transition-colors">
                Shop
              </Link>
              {navCategories.map(cat => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${cat.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-6 py-4 text-base text-foreground border-b border-primary/10 hover:text-primary transition-colors"
                >
                  {cat.name}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>

            {/* My Account section */}
            <div className="border-t border-primary/10 p-6 space-y-3 shrink-0 pb-24">
              <p className="text-sm font-bold text-foreground mb-4">My Account</p>
              {mounted && isAuthenticated ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                  >
                    My Profile
                  </Link>
                  {['ADMIN','SUPER_ADMIN','WAREHOUSE_STAFF','ORDER_MANAGER','STOCK_MANAGER'].includes(user?.role || '') && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center w-full py-3 rounded-xl border-2 border-rose-200 text-rose-600 font-semibold text-sm"
                    >
                      ⚙ Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="flex items-center justify-center w-full py-3 rounded-xl border-2 border-border text-foreground font-semibold text-sm"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
