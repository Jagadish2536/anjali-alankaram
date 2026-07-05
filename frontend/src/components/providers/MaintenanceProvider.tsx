'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, Mail, Phone, MessageCircle, Instagram, Clock, AlertTriangle } from 'lucide-react';

interface MaintenancePageProps {
  settings: {
    storeName: string;
    supportEmail: string;
    supportPhone: string;
    whatsappNumber: string;
    instagramUrl: string;
  };
  user: any;
  isManagementUser: boolean;
}

function MaintenancePage({ settings, user, isManagementUser }: MaintenancePageProps) {
  // Format WhatsApp number link (remove all non-digit characters)
  const cleanWhatsApp = settings.whatsappNumber ? settings.whatsappNumber.replace(/\D/g, '') : '';
  const whatsappLink = cleanWhatsApp ? `https://wa.me/${cleanWhatsApp}` : null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-secondary/20 via-background to-accent/15 relative overflow-hidden">
      {/* Glow effects */}
      <div 
        className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-pulse" 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/30 rounded-full blur-3xl pointer-events-none animate-pulse" 
        style={{ animationDuration: '6s' }} 
      />

      <div className="w-full max-w-xl bg-card/75 backdrop-blur-md border border-border/80 rounded-3xl p-8 md:p-12 shadow-xl relative z-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo / Title Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
          <Clock 
            className="w-12 h-12 animate-spin absolute opacity-20" 
            style={{ animationDuration: '10s' }} 
          />
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-2xl font-bold font-outfit text-primary tracking-wider">AA</span>
          </div>
        </div>

        {/* Maintenance Message */}
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Scheduled Maintenance
          </span>
          <h1 className="text-3xl md:text-4xl font-outfit font-bold text-foreground tracking-tight">
            We'll Be Back Soon
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            Thank you for visiting <span className="font-semibold text-foreground">{settings.storeName}</span>. We are currently performing system maintenance to enhance your shopping experience with us.
          </p>
        </div>

        {/* Navigation Action Buttons under Maintenance */}
        <div className="bg-muted/10 p-5 rounded-2xl border border-dashed border-border/80 flex flex-col items-center gap-3">
          {user ? (
            <div className="w-full space-y-3">
              <p className="text-xs text-muted-foreground">
                Logged in as <span className="font-bold text-foreground">{user.name || user.email}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                <Link
                  href="/profile"
                  className="flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
                >
                  View Profile & Orders
                </Link>
                {isManagementUser && (
                  <Link
                    href="/admin"
                    className="flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-all shadow-sm"
                  >
                    Go to Admin Dashboard
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                Already have an account, or want to check order status?
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
              >
                Sign In / Register
              </Link>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-card text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
              Need Assistance?
            </span>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Email Support */}
          {settings.supportEmail && (
            <a
              href={`mailto:${settings.supportEmail}`}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/80 bg-white/40 hover:bg-white/80 hover:border-primary/50 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all mb-2">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Email Us</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-full">
                {settings.supportEmail}
              </span>
            </a>
          )}

          {/* Call Support */}
          {settings.supportPhone && (
            <a
              href={`tel:${settings.supportPhone}`}
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/80 bg-white/40 hover:bg-white/80 hover:border-primary/50 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all mb-2">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Call Us</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-full">
                {settings.supportPhone}
              </span>
            </a>
          )}

          {/* WhatsApp Support */}
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/80 bg-white/40 hover:bg-white/80 hover:border-primary/50 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all mb-2">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">WhatsApp</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-full">
                Chat Support
              </span>
            </a>
          )}

          {/* Instagram Link */}
          {settings.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border/80 bg-white/40 hover:bg-white/80 hover:border-primary/50 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all mb-2">
                <Instagram className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Instagram</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-full">
                Follow Updates
              </span>
            </a>
          )}
        </div>

        {/* Footer info */}
        <p className="text-xs text-muted-foreground pt-4">
          We appreciate your patience. We'll be back online as soon as possible.
        </p>
      </div>
    </div>
  );
}

// Helper to inject theme color configuration directly in the DOM
function updateThemeStyles(
  primaryColor: string,
  backgroundColor: string,
  headingFont: string,
  bodyFont: string,
  fontSizeScale: string
) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Convert Hex to HSL for theme bindings
  const hexToHsl = (hex: string) => {
    let r = 0, g = 0, b = 0;
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
      r = parseInt(clean.substring(0, 2), 16);
      g = parseInt(clean.substring(2, 4), 16);
      b = parseInt(clean.substring(4, 6), 16);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const primaryHsl = hexToHsl(primaryColor || '#2C5043');
  const bgHsl = hexToHsl(backgroundColor || '#FAF6F0');

  // Bind CSS custom variables to document element
  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--background', bgHsl);
  root.style.setProperty('--foreground', '20 20 20');
  root.style.setProperty('--secondary', '240 4.8% 95.9%');
  root.style.setProperty('--accent', primaryHsl);
  root.style.setProperty('--border', '240 5.9% 90%');
  root.style.setProperty('--ring', primaryHsl);

  root.style.setProperty('--crimson', hexToHsl('#8B2635'));
  root.style.setProperty('--cream', hexToHsl('#FDF5EC'));

  // Load custom google fonts
  const loadFont = (fontFamily: string) => {
    if (!fontFamily) return;
    const linkId = `theme-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
  };

  if (headingFont) loadFont(headingFont);
  if (bodyFont) loadFont(bodyFont);

  // Apply custom fonts to document body/headers
  root.style.setProperty('--font-heading', headingFont ? `'${headingFont}', sans-serif` : 'var(--font-cormorant)');
  root.style.setProperty('--font-body', bodyFont ? `'${bodyFont}', sans-serif` : 'var(--font-outfit)');

  // Apply scaling to root font-size (fully responsive scale modifier)
  let scale = '100%';
  if (fontSizeScale === 'Small') scale = '92.5%';
  else if (fontSizeScale === 'Large') scale = '107.5%';
  else if (fontSizeScale === 'Extra Large') scale = '115%';
  root.style.fontSize = scale;
}

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const { settings, fetchSettings, isFetched } = useSettingsStore();
  const { user } = useAuthStore();
  const pathname = usePathname();

  // Setup 5-second polling interval to enter maintenance mode quickly without manual refresh
  useEffect(() => {
    fetchSettings();
    const interval = setInterval(() => {
      fetchSettings();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  useEffect(() => {
    if (isFetched && settings) {
      updateThemeStyles(
        settings.themePrimaryColor,
        settings.themeBackgroundColor,
        settings.themeHeadingFont,
        settings.themeBodyFont,
        settings.themeFontSizeScale
      );
    }
  }, [isFetched, settings]);

  if (!isFetched) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Management users bypass maintenance completely so they can preview the site
  const isManagementUser = user && ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'ORDER_MANAGER', 'STOCK_MANAGER'].includes(user.role);

  // Allowed pages during maintenance mode
  const isBypassedRoute = pathname.startsWith('/admin') ||
                          pathname === '/login' || pathname.startsWith('/login/') ||
                          pathname === '/profile' || pathname.startsWith('/profile/') ||
                          pathname === '/orders' || pathname.startsWith('/orders/') ||
                          pathname === '/track-order' || pathname.startsWith('/track-order/');

  // Block anyone from accessing non-bypassed routes during maintenance
  if (settings.maintenanceMode && !isBypassedRoute) {
    return (
      <MaintenancePage 
        settings={settings} 
        user={user} 
        isManagementUser={!!isManagementUser} 
      />
    );
  }

  return <>{children}</>;
}
