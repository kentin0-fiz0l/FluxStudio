/**
 * FluxStudio Service Worker
 * Version 4.0 - Mobile-First PWA with Accessibility Improvements
 * Updated: Touch-friendly UI, responsive layouts, improved UX
 */
const CACHE_NAME = 'fluxstudio-v4-0';
const STATIC_CACHE = 'fluxstudio-static-v4-0';
const API_CACHE_NAME = 'fluxstudio-api-v4-0';
const OFFLINE_URL = '/offline.html';

// Check if we're in development environment
const isDevelopment = self.location.hostname === 'localhost' ||
                     self.location.hostname.includes('figma') ||
                     self.location.hostname.includes('127.0.0.1');

// Essential assets to cache for offline functionality
const ESSENTIAL_ASSETS = [
  '/',
  // Add font files
  'https://fonts.googleapis.com/css2?family=Swanky+and+Moo+Moo&display=swap'
];

// Images and media that can be cached
const MEDIA_ASSETS = [
  // Add important images here when they're available
];

// API endpoints that should be cached
const API_ENDPOINTS = [
  // Add API endpoints here if needed
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  // Skip caching in development
  if (isDevelopment) {
    console.log('Development environment detected, skipping cache installation');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(ESSENTIAL_ASSETS).catch((error) => {
          console.warn('Failed to cache some assets:', error);
        });
      }),
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(MEDIA_ASSETS).catch((error) => {
          console.warn('Failed to cache media assets:', error);
        });
      })
    ])
  );
  
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches (v1, v2, v3-x caches)
          if (cacheName.includes('flux-studio-v1') ||
              cacheName.includes('fluxstudio-v3-0') ||
              cacheName.includes('fluxstudio-v3-1') ||
              cacheName.includes('fluxstudio-v3-2') ||
              cacheName.includes('fluxstudio-v3-3') ||
              cacheName.includes('fluxstudio-v3-4') ||
              cacheName.includes('fluxstudio-v3-5') ||
              (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE_NAME)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Force all clients to use the new service worker immediately
      console.log('Service Worker v4.0 activated - Mobile-First PWA ready');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Immediately skip non-HTTP requests
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  const { request } = event;

  // Skip fetch handling in development
  if (isDevelopment) {
    return;
  }

  // Additional safety check for URL schemes and create URL object
  let url;
  try {
    url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return;
    }
  } catch (e) {
    // Invalid URL, skip
    return;
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    // JavaScript files - ALWAYS network only, NO caching
    if (url.pathname.endsWith('.js')) {
      event.respondWith(fetch(request));
      return;
    }
    // CSS files - ALWAYS network only, NO caching
    if (url.pathname.endsWith('.css')) {
      event.respondWith(fetch(request));
      return;
    }
    // HTML pages - ALWAYS network only, NO caching to prevent blank pages
    if (isHTMLRequest(request)) {
      event.respondWith(fetch(request).catch(() => networkFirstOfflineFallback(request)));
      return;
    }
    // Images - cache first with fallback
    else if (isImageRequest(request)) {
      event.respondWith(imageCache(request));
    }
    // API requests - network first with cache fallback
    else if (isAPIRequest(url)) {
      event.respondWith(networkFirst(request));
    }
    // Default - network first
    else {
      event.respondWith(networkFirst(request));
    }
  }
});

// Cache strategies
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      // Only cache cacheable requests with supported schemes
      const url = new URL(request.url);
      if (url.protocol.startsWith('http') && request.method === 'GET') {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    console.log('Cache first failed:', error);
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function networkFirstOfflineFallback(request) {
  // Return offline page only (no cache fallback)
  if (isHTMLRequest(request)) {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Flux Studio - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Inter, sans-serif; 
              background: #0a0a0a; 
              color: #f8f8f8; 
              text-align: center; 
              padding: 2rem;
              margin: 0;
            }
            .container { 
              max-width: 400px; 
              margin: 0 auto; 
              padding-top: 2rem;
            }
            .logo { 
              font-size: 2rem; 
              font-weight: bold; 
              margin-bottom: 1rem;
              background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .message { 
              margin-bottom: 2rem; 
              opacity: 0.8;
            }
            .retry-btn {
              background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255,255,255,0.2);
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">FLUX STUDIO</div>
            <div class="message">
              <h2>You're currently offline</h2>
              <p>Some content may not be available while you're disconnected from the internet.</p>
            </div>
            <button class="retry-btn" onclick="window.location.reload()">
              Try Again
            </button>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
  }

  return new Response('Offline - Content not available', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Only cache cacheable requests with supported schemes
      const url = new URL(request.url);
      if (url.protocol.startsWith('http') && request.method === 'GET') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    console.log('Network first fallback to cache:', error);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

async function imageCache(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      // Only cache cacheable requests with supported schemes
      const url = new URL(request.url);
      if (url.protocol.startsWith('http') && request.method === 'GET') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
    }
    return response;
  } catch (error) {
    console.log('Image cache failed:', error);
    // Return placeholder image for failed image requests
    return new Response(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <text x="50%" y="50%" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">
          Image unavailable offline
        </text>
      </svg>
    `, {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(css|js|woff|woff2|ttf|eot)$/);
}

function isHTMLRequest(request) {
  return request.headers.get('Accept')?.includes('text/html');
}

function isImageRequest(request) {
  return request.headers.get('Accept')?.includes('image/') ||
         request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/);
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
}

// Background sync for form submissions when back online
self.addEventListener('sync', (event) => {
  if (event.tag === 'contact-form') {
    event.waitUntil(syncContactForm());
  }
});

async function syncContactForm() {
  // Handle cached form submissions when back online
  const cache = await caches.open('flux-forms');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const formData = await cache.match(request);
      if (formData) {
        await fetch('/api/contact', {
          method: 'POST',
          body: await formData.text()
        });
        await cache.delete(request);
      }
    } catch (error) {
      console.log('Form sync failed:', error);
    }
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'flux-studio-notification'
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});