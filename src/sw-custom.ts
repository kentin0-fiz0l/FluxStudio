/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ============================================================
// Workbox precaching (injected by vite-plugin-pwa at build time)
// ============================================================

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Force new service worker to activate immediately on install.
// This ensures critical fixes (like auth redirects) reach users
// without waiting for them to click "Update now".
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ============================================================
// Runtime caching strategies
// ============================================================

// API: StaleWhileRevalidate for cacheable GET /api/ endpoints
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/auth') &&
    !url.pathname.includes('/upload'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

// Images: CacheFirst with 30-day expiration
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// Fonts: CacheFirst with 1-year expiration
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'font-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// ============================================================
// Background Sync handler (ported from public/sw.js)
// ============================================================

function openFluxDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('fluxstudio-db');
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB blocked'));
      request.onsuccess = () => resolve(request.result);
    } catch (err) {
      reject(err);
    }
  });
}

function getAllFromStore(store: IDBObjectStore): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function syncPendingMutations() {
  let database: IDBDatabase;
  try {
    database = await openFluxDatabase();
  } catch (err) {
    console.debug('[SW] IndexedDB unavailable for sync:', (err as Error).message);
    return;
  }

  try {
    const tx = database.transaction('pendingMutations', 'readonly');
    const store = tx.objectStore('pendingMutations');
    const actions = await getAllFromStore(store);

    console.log('[SW] Syncing', actions.length, 'pending mutations');
    let needsRetry = false;

    for (const action of actions) {
      const retryCount = action.retryCount || 0;
      const delay = Math.min(Math.pow(2, retryCount) * 1000 + Math.random() * 1000, 60000);

      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        const token = action.token || '';
        const response = await fetch(action.endpoint, {
          method: action.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: action.method === 'DELETE' ? undefined : JSON.stringify(action.payload),
        });

        if (response.ok) {
          const deleteTx = database.transaction('pendingMutations', 'readwrite');
          deleteTx.objectStore('pendingMutations').delete(action.id);
          console.log('[SW] Synced mutation:', action.id);
        } else if (response.status === 409) {
          const deleteTx = database.transaction('pendingMutations', 'readwrite');
          deleteTx.objectStore('pendingMutations').delete(action.id);
          console.log('[SW] Conflict for mutation:', action.id);
        } else {
          const newRetryCount = retryCount + 1;
          if (newRetryCount >= 5) {
            const deleteTx = database.transaction('pendingMutations', 'readwrite');
            deleteTx.objectStore('pendingMutations').delete(action.id);
            console.warn('[SW] Gave up on mutation after 5 retries:', action.id);
          } else {
            const updateTx = database.transaction('pendingMutations', 'readwrite');
            action.retryCount = newRetryCount;
            updateTx.objectStore('pendingMutations').put(action);
            needsRetry = true;
          }
        }
      } catch (error) {
        console.error('[SW] Failed to sync mutation:', action.id, error);
        const newRetryCount = (action.retryCount || 0) + 1;
        if (newRetryCount < 5) {
          const updateTx = database.transaction('pendingMutations', 'readwrite');
          action.retryCount = newRetryCount;
          updateTx.objectStore('pendingMutations').put(action);
          needsRetry = true;
        }
      }
    }

    if (needsRetry && 'sync' in self.registration) {
      (self.registration as any).sync.register('sync-pending-actions');
    }

    const allClients = await self.clients.matchAll();
    allClients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE', syncedCount: actions.length });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingMutations());
  }
});

// ============================================================
// Push notifications — type-aware with action buttons
// ============================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const type = data.type || 'general';

    const options: NotificationOptions & { data: any; actions: any[]; renotify?: boolean } = {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || `flux-${type}-${Date.now()}`,
      data: { url: data.url || '/', type },
      renotify: !!data.tag,
      actions: [],
    };

    switch (type) {
      case 'message':
        options.actions = [
          { action: 'reply', title: 'Reply' },
          { action: 'read', title: 'Mark Read' },
        ];
        break;
      case 'mention':
        options.actions = [{ action: 'view', title: 'View' }];
        break;
      case 'project_update':
        options.actions = [{ action: 'view', title: 'View Project' }];
        break;
      case 'team_invite':
        options.actions = [
          { action: 'accept', title: 'Accept' },
          { action: 'view', title: 'View' },
        ];
        break;
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'FluxStudio', options)
    );
  } catch (err) {
    console.error('[SW] Push parse error:', err);
  }
});

// Handle notification clicks — route to relevant page and forward action
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const action = event.action;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            (client as WindowClient).focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url,
              action,
              notificationType: event.notification.data?.type,
            });
            return;
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

// ============================================================
// Message handling for client communication
// ============================================================

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data?.type) return;

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_URLS':
      event.waitUntil(
        caches.open('fluxstudio-runtime').then(cache => cache.addAll(data.urls))
      );
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
      );
      break;

    case 'GET_CACHE_SIZE':
      event.waitUntil(
        (async () => {
          let totalSize = 0;
          const cacheNames = await caches.keys();
          for (const name of cacheNames) {
            const cache = await caches.open(name);
            const requests = await cache.keys();
            for (const request of requests) {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
              }
            }
          }
          event.ports[0]?.postMessage({ size: totalSize });
        })()
      );
      break;

    case 'TRIGGER_SYNC':
      if ('sync' in self.registration) {
        (self.registration as any).sync.register('sync-pending-actions');
      }
      break;
  }
});
