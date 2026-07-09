// ── Anjali Alankaram Service Worker ──────────────────────────────────────
// Version: aa-v1.1.0 (PWA push notification & background sync support)
const CACHE_VERSION = 'aa-v1.1';
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
  self.clients.claim();
});

// ── Fetch: Network-first for HTML pages, Cache-first for static assets ────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
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

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
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

// ── Push Notifications: Listen for FCM background push notifications ──
self.addEventListener('push', (event) => {
  if (!event.data) return;

  this.logger = this.logger || console;
  let title = 'Anjali Alankaram';
  let options = {
    icon: '/logo.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {},
  };

  try {
    const payload = event.data.json();
    title = payload.notification?.title || title;
    options = {
      ...options,
      body: payload.notification?.body || '',
      data: payload.data || {},
    };
  } catch {
    options.body = event.data.text();
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click: Focus app window or navigate to specific path ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data?.orderId;
  const targetUrl = orderId ? `/orders/${orderId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Background Sync: Sync cart & offline wishlist actions when online ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-cart') {
    event.waitUntil(syncOfflineCart());
  }
});

// Sync offline cart helper
async function syncOfflineCart() {
  try {
    const db = await openIndexedDB();
    const actions = await db.getAll('cart-actions');
    if (actions.length === 0) return;

    for (const action of actions) {
      await fetch('/api/v1/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      });
      await db.delete('cart-actions', action.id);
    }
  } catch (err) {
    console.error('Failed to sync offline cart:', err);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('anjali-alankaram-pwa', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('cart-actions')) {
        db.createObjectStore('cart-actions', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      resolve({
        getAll: (storeName) => {
          return new Promise((res) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => res(req.result);
          });
        },
        delete: (storeName, id) => {
          return new Promise((res) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(id);
            req.onsuccess = () => res(true);
          });
        }
      });
    };
    request.onerror = (e) => reject(e);
  });
}
