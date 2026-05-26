'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';

// Generates or retrieves a persistent anonymous visitor ID.
// Uses localStorage with sessionStorage fallback for mobile browsers.
function getOrCreateVisitorId(): string {
  const key = 'aa_visitor_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const newId = `v_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem(key, newId);
    return newId;
  } catch {
    // localStorage blocked (e.g. private browsing) — fall back to sessionStorage
    try {
      const existing = sessionStorage.getItem(key);
      if (existing) return existing;
      const newId = `v_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      sessionStorage.setItem(key, newId);
      return newId;
    } catch {
      // Both blocked — generate a per-session ID in memory
      return `v_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    }
  }
}

/**
 * VisitorTracker
 * Silently pings POST /settings/visitor-ping every 30 seconds with the
 * visitor's anonymous ID and current page path.
 * Also re-pings immediately when the user navigates to a different page.
 * Placed in the root layout so it runs on every page of the storefront.
 */
export default function VisitorTracker() {
  const pathname = usePathname();
  const visitorIdRef = useRef<string>('');
  const pathnameRef = useRef(pathname);

  // Keep the pathname ref in sync (avoids stale closures inside the interval)
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Initialise visitorId once on mount
  useEffect(() => {
    visitorIdRef.current = getOrCreateVisitorId();
  }, []);

  // Re-ping immediately whenever the user navigates to a new page
  useEffect(() => {
    if (!visitorIdRef.current) return;
    api.post('/settings/visitor-ping', {
      visitorId: visitorIdRef.current,
      page: pathname,
    }).catch(() => {});
  }, [pathname]);

  // Continuous keep-alive ping every 30 seconds
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

    // Cleanup: stop pinging when unmounted
    return () => clearInterval(interval);
  }, []); // only once

  return null; // renders nothing
}
