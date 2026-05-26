'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

// Generates or retrieves a persistent anonymous visitor ID stored in localStorage.
function getOrCreateVisitorId(): string {
  try {
    const key = 'aa_visitor_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const newId = `v_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem(key, newId);
    return newId;
  } catch {
    return `v_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * VisitorTracker
 * Silently pings POST /settings/visitor-ping every 30 seconds with the
 * visitor's anonymous ID and current page path. Placed in the public layout
 * so it runs on every page of the storefront.
 */
export default function VisitorTracker() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const visitorIdRef = useRef<string>('');

  // Keep pathname ref in sync
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();

    const ping = () => {
      api.post('/settings/visitor-ping', {
        visitorId: visitorIdRef.current,
        page: pathnameRef.current,
      }).catch(() => {}); // fire-and-forget, never throw
    };

    // Ping immediately on mount
    ping();

    // Ping every 30 seconds to keep the visitor "live"
    const interval = setInterval(ping, 30_000);

    // Cleanup: stop pinging when unmounted (tab closed / navigated away from SPA)
    return () => clearInterval(interval);
  }, []); // only run once — pathname is tracked via ref

  return null; // renders nothing
}
