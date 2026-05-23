'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
}

function MaintenancePage({ settings }: MaintenancePageProps) {
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

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const { settings, fetchSettings, isFetched } = useSettingsStore();
  const { user } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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

  // Bypass maintenance mode check for:
  // 1. Admin/dashboard pages
  // 2. Login/auth pages
  // 3. Logged-in admin users (so they can preview the live site)
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/login');
  const isAdminUser = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  if (settings.maintenanceMode && !isAdminRoute && !isAdminUser) {
    return <MaintenancePage settings={settings} />;
  }

  return <>{children}</>;
}
