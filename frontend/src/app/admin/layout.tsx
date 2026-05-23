'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  Loader2,
  Bell,
  Warehouse,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

const sidebarItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { name: 'Catalogue', icon: Package, href: '/admin/products' },
  { name: 'Categories', icon: ShoppingBag, href: '/admin/categories' },
  { name: 'Orders', icon: ShoppingBag, href: '/admin/orders' },
  { name: 'Warehouse', icon: Warehouse, href: '/admin/warehouse' },
  { name: 'Customers', icon: Users, href: '/admin/customers' },
  { name: 'Notifications', icon: Bell, href: '/admin/notifications' },
  { name: 'Settings', icon: Settings, href: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      const notifications = res.data || [];
      const unread = notifications.filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications unread count', err);
    }
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 15000); // 15s polling

      const handleUpdate = () => {
        fetchUnreadCount();
      };
      window.addEventListener('notifications-updated', handleUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('notifications-updated', handleUpdate);
      };
    }
  }, [isHydrated, isAuthenticated, user]);

  // Security Check
  useEffect(() => {
    if (!isHydrated) return;
    
    if (!isAuthenticated) {
      router.push('/login?returnUrl=' + pathname);
    } else if (!['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF'].includes(user?.role || '')) {
      router.push('/');
    }
  }, [isHydrated, isAuthenticated, user, router, pathname]);

  if (!isHydrated || !isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r bg-white hidden lg:flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!isCollapsed && (
            <span className="font-outfit font-bold text-xl text-primary truncate">Admin Panel</span>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 shrink-0" />
                  {item.name === 'Notifications' && unreadCount > 0 && isCollapsed && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
                {!isCollapsed && <span className="font-medium">{item.name}</span>}
                {!isCollapsed && item.name === 'Notifications' && unreadCount > 0 && (
                  <span className={`ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold text-white transition-colors duration-200 ${
                    isActive ? 'bg-white text-primary' : 'bg-red-500'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button 
            onClick={() => { logout(); router.push('/'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-red-500 rounded-xl hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center justify-between px-4">
        <span className="font-outfit font-bold text-lg text-primary">Anjali Admin</span>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-muted"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
             <nav className="flex-1 py-20 px-3 space-y-2">
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {item.name === 'Notifications' && unreadCount > 0 && (
                        <span className={`flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold text-white ${
                          isActive ? 'bg-white text-primary' : 'bg-red-500'
                        }`}>
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
             </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pt-16 lg:pt-0`}>
        <div className="p-4 md:p-10 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
