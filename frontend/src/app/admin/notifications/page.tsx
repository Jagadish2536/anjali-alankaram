'use client';
import { useEffect, useState } from 'react';
import { 
  Bell, 
  BellOff, 
  ShoppingBag, 
  AlertTriangle, 
  UserPlus, 
  Check, 
  CheckSquare, 
  Loader2,
  Trash2,
  Search,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: any;
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      const res = await api.get(`/notifications?t=${Date.now()}`);
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const triggerSidebarUpdate = () => {
    // Notify sidebar layout to update the badge immediately
    window.dispatchEvent(new Event('notifications-updated'));
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      // Update local state instantly
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      triggerSidebarUpdate();
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      // Update local state instantly
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      triggerSidebarUpdate();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (n: Notification) => {
    // Check type of notification, or details inside data
    const data = n.data || {};
    const typeStr = n.type;
    
    // Determine icon based on message title, data type, or type field
    if (n.title.toLowerCase().includes('order') || data.orderId) {
      return {
        icon: ShoppingBag,
        bg: 'bg-blue-50 text-blue-600 border-blue-100',
      };
    }
    if (n.title.toLowerCase().includes('stock') || data.variantId) {
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-50 text-amber-600 border-amber-100',
      };
    }
    if (n.title.toLowerCase().includes('customer') || n.title.toLowerCase().includes('register') || data.customerId) {
      return {
        icon: UserPlus,
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      };
    }
    return {
      icon: Bell,
      bg: 'bg-gray-50 text-gray-600 border-gray-100',
    };
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const tabNotifications = activeTab === 'all' ? notifications : unreadNotifications;
  const displayedNotifications = tabNotifications.filter(n =>
    (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.body || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 sm:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Manage system alerts and administrative logs.</p>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            activeTab === 'all' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All
          <span className="ml-1.5 px-2 py-0.5 bg-muted text-[11px] font-bold rounded-full">
            {notifications.length}
          </span>
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`pb-3 text-sm font-semibold relative transition-colors ${
            activeTab === 'unread' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Unread
          {unreadNotifications.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-red-500 text-[11px] font-bold text-white rounded-full">
              {unreadNotifications.length}
            </span>
          )}
          {activeTab === 'unread' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in" />
          )}
        </button>
      </div>

      {/* List Container with Search and Refresh Header */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/10 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchNotifications(true)}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-lg border font-medium bg-white hover:bg-muted text-sm flex items-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {unreadNotifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm active:scale-95"
              >
                <CheckSquare className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 bg-muted/30 rounded-full text-muted-foreground mb-4">
                <BellOff className="w-8 h-8" />
              </div>
              <h3 className="font-outfit font-bold text-lg text-foreground">No alerts found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {searchQuery 
                  ? "We couldn't find any notifications matching your search." 
                  : activeTab === 'all' 
                  ? "You don't have any notifications right now." 
                  : "You don't have any unread notifications."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayedNotifications.map((n) => {
                const iconConfig = getNotificationIcon(n);
                const Icon = iconConfig.icon;
                
                return (
                  <div 
                    key={n.id} 
                    className={`flex items-start gap-4 p-5 bg-white border rounded-2xl transition-all shadow-sm hover:shadow-md group relative overflow-hidden ${
                      !n.isRead ? 'border-primary/20 bg-primary/[0.01]' : 'border-muted'
                    }`}
                  >
                    {/* Left Icon */}
                    <div className={`p-3 rounded-xl border shrink-0 ${iconConfig.bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Body Content */}
                    <div className="flex-1 min-w-0 pr-10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <h4 className="font-bold text-foreground text-sm sm:text-base leading-tight truncate">
                          {n.title}
                        </h4>
                        <span 
                          className="text-xs text-muted-foreground shrink-0"
                          title={new Date(n.createdAt).toLocaleString()}
                        >
                          {formatTimeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed break-words">
                        {n.body}
                      </p>
                    </div>

                    {/* Action Button */}
                    {!n.isRead && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="p-2 bg-primary text-white rounded-lg hover:bg-primary/95 transition-colors shadow-sm"
                          title="Mark as Read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
