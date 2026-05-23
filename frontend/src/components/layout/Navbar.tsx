'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Search, User, Heart, LogOut, ShieldAlert, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { api } from '@/lib/api';

export default function Navbar() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, [fetchSettings]);

  // Fetch wishlist count whenever auth changes
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/wishlist')
        .then(({ data }) => setWishlistCount(data?.items?.length || 0))
        .catch(() => setWishlistCount(0));
    } else {
      setWishlistCount(0);
    }
  }, [isAuthenticated]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchOpen(false);
    setSearchQuery('');
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">

          {/* Left: Logo + Nav */}
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="inline-block font-outfit text-2xl font-bold tracking-tight text-primary">
                {settings.storeName}
              </span>
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link href="/products?filter=new" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                New Arrivals
              </Link>
              <Link href="/products?category=sarees" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Sarees
              </Link>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">

            {/* Search button */}
            <button
              onClick={() => setSearchOpen(o => !o)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Search"
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            {/* Cart */}
            <Link href="/cart" className="text-muted-foreground hover:text-foreground transition-colors relative p-1" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
            </Link>

            {/* Wishlist — always visible, shows count badge when logged in */}
            <Link
              href="/wishlist"
              className="text-muted-foreground hover:text-primary transition-colors relative p-1"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {mounted && isAuthenticated && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {mounted && isAuthenticated ? (
              <div className="flex items-center gap-3">
                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100/50 transition-colors"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline">{user?.name}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>

        {/* Slide-down search bar */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out border-t ${searchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 border-t-0'}`}>
          <form onSubmit={handleSearch} className="container flex items-center gap-3 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search sarees, lehengas, kurtis..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 text-foreground"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-lg disabled:opacity-40 transition-opacity"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Backdrop to close search on outside click */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
          onClick={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
