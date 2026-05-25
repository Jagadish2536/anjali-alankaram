'use client';
import { useState, useEffect, useCallback } from 'react';
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
  Tag,
  CreditCard,
  Globe,
  Warehouse,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

// All possible nav items
const ALL_NAV_ITEMS = [
  { name: 'Dashboard',     icon: LayoutDashboard, href: '/admin',                roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Catalogue',     icon: Package,          href: '/admin/products',       roles: ['ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER'] },
  { name: 'Categories',    icon: Tag,              href: '/admin/categories',     roles: ['ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER'] },
  { name: 'Warehouse',     icon: Warehouse,        href: '/admin/warehouse',      roles: ['ADMIN', 'SUPER_ADMIN', 'STOCK_MANAGER', 'WAREHOUSE_STAFF'] },
  { name: 'Orders',        icon: ShoppingBag,      href: '/admin/orders',         roles: ['ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER'] },
  { name: 'Customers',     icon: Users,             href: '/admin/customers',      roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Notifications', icon: Bell,              href: '/admin/notifications',  roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'AWS Billing',   icon: CreditCard,        href: '/admin/billing',        roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Settings',      icon: Settings,          href: '/admin/settings',       roles: ['ADMIN', 'SUPER_ADMIN'] },
];

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'ORDER_MANAGER', 'STOCK_MANAGER'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const userRole = user?.role || '';
  const sidebarItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const isPathAuthorized = useCallback(() => {
    if (pathname === '/admin' || pathname === '/admin/') {
      return ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
    }
    const navItem = [...ALL_NAV_ITEMS].reverse().find(item => item.href !== '/admin' && pathname.startsWith(item.href));
    if (navItem) {
      return navItem.roles.includes(userRole);
    }
    if (pathname.startsWith('/admin/warehouse')) {
      return ['ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF', 'STOCK_MANAGER'].includes(userRole);
    }
    return true;
  }, [pathname, userRole]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      const notifications = res.data || [];
      setUnreadCount(notifications.filter((n: any) => !n.isRead).length);
    } catch { /* ignore */ }
  };

  useEffect(() => { setIsHydrated(true); }, []);

  useEffect(() => {
    if (isHydrated && isAuthenticated && ['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 15000);
      const handleUpdate = () => fetchUnreadCount();
      window.addEventListener('notifications-updated', handleUpdate);
      return () => { clearInterval(interval); window.removeEventListener('notifications-updated', handleUpdate); };
    }
  }, [isHydrated, isAuthenticated, userRole]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      router.push('/login?returnUrl=' + pathname);
      return;
    }
    if (!ALLOWED_ROLES.includes(userRole)) {
      router.push('/');
      return;
    }

    // Role-based route guard
    // 1. Root redirect based on role
    if (pathname === '/admin' || pathname === '/admin/') {
      if (userRole === 'ORDER_MANAGER') {
        router.replace('/admin/orders');
        return;
      }
      if (userRole === 'STOCK_MANAGER') {
        router.replace('/admin/products');
        return;
      }
      if (userRole === 'WAREHOUSE_STAFF') {
        router.replace('/admin/warehouse');
        return;
      }
    }

    // 2. Prevent accessing unauthorized pages directly via URL
    if (!isPathAuthorized()) {
      if (userRole === 'ORDER_MANAGER') {
        router.replace('/admin/orders');
      } else if (userRole === 'STOCK_MANAGER') {
        router.replace('/admin/products');
      } else if (userRole === 'WAREHOUSE_STAFF') {
        router.replace('/admin/warehouse');
      } else {
        router.replace('/');
      }
    }
  }, [isHydrated, isAuthenticated, userRole, router, pathname, isPathAuthorized]);

  const authorized = isHydrated && isAuthenticated && ALLOWED_ROLES.includes(userRole) && isPathAuthorized();

  if (!authorized) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleBadge = {
    SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
    ADMIN: { label: 'Admin', color: 'bg-primary/10 text-primary' },
    WAREHOUSE_STAFF: { label: 'Warehouse', color: 'bg-blue-100 text-blue-700' },
    ORDER_MANAGER: { label: 'Order Manager', color: 'bg-orange-100 text-orange-700' },
    STOCK_MANAGER: { label: 'Stock Manager', color: 'bg-teal-100 text-teal-700' },
  }[userRole] || { label: userRole, color: 'bg-gray-100 text-gray-600' };

  const NavItems = ({ collapsed = false }: { collapsed?: boolean }) => (
    <nav className="flex-1 py-4 px-2 space-y-1">
      <Link
        href="/"
        onClick={() => setIsMobileMenuOpen(false)}
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 mb-2"
      >
        <Globe className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="font-bold text-sm">View Store</span>}
      </Link>
      <div className="border-b border-gray-100 my-2 mx-2" />
      {sidebarItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <div className="relative shrink-0">
              <Icon className="w-5 h-5" />
              {item.name === 'Notifications' && unreadCount > 0 && collapsed && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="font-medium text-sm">{item.name}</span>
                {item.name === 'Notifications' && unreadCount > 0 && (
                  <span className={`ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r bg-white hidden lg:flex flex-col ${
        isCollapsed ? 'w-[72px]' : 'w-60'
      }`}>
        {/* Brand */}
        <div className="flex items-center justify-between h-14 px-3 border-b">
          {!isCollapsed && (
            <span className="font-outfit font-black text-base text-primary truncate">Anjali Admin</span>
          )}
          <button onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-auto">
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User info */}
        {!isCollapsed && (
          <div className="px-3 py-3 border-b bg-muted/30">
            <p className="text-xs font-bold text-foreground truncate">{user?.name || 'Admin'}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
          </div>
        )}

        <NavItems collapsed={isCollapsed} />

        <div className="p-3 border-t">
          <button
            onClick={() => { logout(); router.push('/'); }}
            className={`flex items-center gap-3 w-full px-3 py-2.5 text-red-500 rounded-xl hover:bg-red-50 transition-all ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 flex items-center justify-between px-4 shadow-sm">
        <div>
          <span className="font-outfit font-black text-base text-primary">Anjali Admin</span>
          <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-lg hover:bg-muted">
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="w-64 h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-4 border-b bg-muted/30 mt-14">
              <p className="text-sm font-bold">{user?.name || 'Admin'}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
            <NavItems collapsed={false} />
            <div className="p-4 border-t">
              <button onClick={() => { logout(); router.push('/'); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-red-500 rounded-xl hover:bg-red-50 transition-all">
                <LogOut className="w-5 h-5" />
                <span className="font-medium text-sm">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-60'} pt-14 lg:pt-0 min-h-screen overflow-x-hidden`}>
        {children}
      </main>
    </div>
  );
}
