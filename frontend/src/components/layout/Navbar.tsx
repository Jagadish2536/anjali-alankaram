'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, User, Heart, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [storeName, setStoreName] = useState('Anjali Alankaram');

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      if (data.storeName) setStoreName(data.storeName);
    } catch (e) {
      console.error('Failed to fetch settings');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-outfit text-2xl font-bold tracking-tight text-primary">
              {storeName}
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/products" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              New Arrivals
            </Link>
            <Link href="/products?category=sarees" className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Sarees
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          
          <Link href="/cart" className="text-muted-foreground hover:text-foreground transition-colors relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="sr-only">Cart</span>
          </Link>

          {mounted && isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="hidden sm:inline">{user?.name}</span>
              </Link>
              <button 
                onClick={() => logout()}
                className="text-muted-foreground hover:text-red-500 transition-colors"
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
    </header>
  );
}
