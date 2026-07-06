'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Register after page load so it doesn't compete with critical resources
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[SW] Registered, scope:', registration.scope);

          // Check for updates on each page load
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.error('[SW] Registration failed:', err);
        });
    });
  }, []);

  return null; // No UI — this is a background component
}
