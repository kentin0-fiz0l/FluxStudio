/**
 * Service Worker - Advanced Caching Strategies
 * Implements cache-first, network-first, and stale-while-revalidate patterns
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `flux-static-${CACHE_VERSION}`,
  dynamic: `flux-dynamic-${CACHE_VERSION}`,
  images: `flux-images-${CACHE_VERSION}`,
  api: `flux-api-${CACHE_VERSION}`,
};

const CACHE_DURATIONS = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  dynamic: 7 * 24 * 60 * 60 * 1000, // 7 days
  images: 14 * 24 * 60 * 60 * 1000, // 14 days
  api: 5 * 60 * 1000, // 5 minutes
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/index.css',
  '/assets/index.js',
];

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting(); // Activate immediately
    })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete caches that don't match current version
            return Object.values(CACHE_NAMES).indexOf(cacheName) === -1;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim(); // Take control immediately
    })
  );
});

/**
 * Determine cache strategy based on request
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);

  // API requests - Network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    return {
      strategy: 'network-first',
      cacheName: CACHE_NAMES.api,
      maxAge: CACHE_DURATIONS.api,
    };
  }

  // Images - Cache first with network fallback
  if (request.destination === 'image') {
    return {
      strategy: 'cache-first',
      cacheName: CACHE_NAMES.images,
      maxAge: CACHE_DURATIONS.images,
    };
  }

  // Static assets (JS, CSS) - Cache first
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    return {
      strategy: 'cache-first',
      cacheName: CACHE_NAMES.static,
      maxAge: CACHE_DURATIONS.static,
    };
  }

  // HTML pages - Stale while revalidate
  if (request.destination === 'document') {
    return {
      strategy: 'stale-while-revalidate',
      cacheName: CACHE_NAMES.dynamic,
      maxAge: CACHE_DURATIONS.dynamic,
    };
  }

  // Default - Network first
  return {
    strategy: 'network-first',
    cacheName: CACHE_NAMES.dynamic,
    maxAge: CACHE_DURATIONS.dynamic,
  };
}

/**
 * Check if cached response is still valid
 */
function isCacheValid(response, maxAge) {
  if (!response) return false;

  const cachedDate = response.headers.get('sw-cached-date');
  if (!cachedDate) return true; // No date = assume valid

  const age = Date.now() - parseInt(cachedDate, 10);
  return age < maxAge;
}

/**
 * Add timestamp header to cached responses
 */
function addCacheHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-date', Date.now().toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached && isCacheValid(cached, maxAge)) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, addCacheHeaders(response.clone()));
    }
    return response;
  } catch (error) {
    // Return stale cache if network fails
    if (cached) return cached;
    throw error;
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, addCacheHeaders(response.clone()));
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Network failed, serving from cache:', request.url);
      return cached;
    }
    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, addCacheHeaders(response.clone()));
    }
    return response;
  });

  // Return cached immediately if available
  if (cached && isCacheValid(cached, maxAge)) {
    return cached;
  }

  // Otherwise wait for network
  return fetchPromise;
}

/**
 * Fetch event - Apply caching strategy
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome extensions and other protocols
  if (!event.request.url.startsWith('http')) return;

  const { strategy, cacheName, maxAge } = getCacheStrategy(event.request);

  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'cache-first':
            return await cacheFirst(event.request, cacheName, maxAge);

          case 'network-first':
            return await networkFirst(event.request, cacheName, maxAge);

          case 'stale-while-revalidate':
            return await staleWhileRevalidate(event.request, cacheName, maxAge);

          default:
            return await fetch(event.request);
        }
      } catch (error) {
        console.error('[SW] Fetch failed:', error);

        // Return offline page for navigation requests
        if (event.request.destination === 'document') {
          const offlineCache = await caches.open(CACHE_NAMES.static);
          const offlinePage = await offlineCache.match('/offline.html');
          if (offlinePage) return offlinePage;
        }

        throw error;
      }
    })()
  );
});

/**
 * Message event - Handle cache management commands
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        let totalSize = 0;

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();

          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }

        event.ports[0].postMessage({
          type: 'CACHE_SIZE',
          size: totalSize,
        });
      })()
    );
  }
});

/**
 * Background sync for offline requests
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(
      // Implement offline request queue sync
      console.log('[SW] Syncing offline requests...')
    );
  }
});

console.log('[SW] Service worker script loaded');
