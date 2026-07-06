// ── Anjali Alankaram Service Worker ──────────────────────────────────────
// Version: bump this string to force clients to pick up new assets on deploy
const CACHE_VERSION = 'aa-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets to pre-cache on install (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
];

// ── Install: pre-cache shell assets ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete stale caches from previous versions ─────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Claim all open clients immediately
  self.clients.claim();
});

// ── Fetch: Network-first for API/navigation, Cache-first for static ───────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept: non-GET, external (CDN/API), browser extensions
  if (
    request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // API calls → always network, no caching
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation (HTML page requests) → Network-first, fallback to offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of the page
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match('/offline.html').then(
            (cached) => cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
          )
        )
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) → Cache-first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Only cache successful, non-opaque responses
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/offline.html'));
    })
  );
});
