/**
 * Service Worker Registration
 *
 * Handles SW registration via workbox-window and provides
 * an "update available" callback for the UI to prompt users.
 * Also cleans up stale service workers and old caches on startup.
 */

import { Workbox } from 'workbox-window';

let wb: Workbox | null = null;

export interface SWUpdateCallback {
  (): void;
}

let onUpdateAvailable: SWUpdateCallback | null = null;

export function setOnUpdateAvailable(cb: SWUpdateCallback) {
  onUpdateAvailable = cb;
}

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  // Clean up stale caches from older SW versions
  cleanupStaleCaches();

  try {
    wb = new Workbox('/sw-custom.js');

    wb.addEventListener('waiting', () => {
      onUpdateAvailable?.();
    });

    wb.register().catch(() => {
      // SW registration can fail (stale SW, IndexedDB issues) — non-critical, skip silently
    });

    // When a new SW activates via skipWaiting(), reload so the browser
    // fetches fresh assets from the new precache.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  } catch {
    // Workbox constructor or event binding failed — non-critical
  }
}

export function applyUpdate() {
  if (!wb) return;
  wb.messageSkipWaiting();
  window.location.reload();
}

/**
 * Remove old cache buckets left behind by previous SW versions.
 * The new Workbox-managed SW uses: workbox-precache, api-cache, image-cache, font-cache.
 * Delete any legacy v3/v4 manual caches.
 */
function cleanupStaleCaches() {
  if (!('caches' in window)) return;

  const KNOWN_CACHES = [
    'workbox-precache',
    'api-cache',
    'image-cache',
    'font-cache',
    'fluxstudio-runtime',
  ];

  caches.keys().then((names) => {
    for (const name of names) {
      // Keep Workbox-managed caches and known runtime caches
      const isKnown = KNOWN_CACHES.some(prefix => name.startsWith(prefix));
      if (!isKnown) {
        caches.delete(name).catch(() => {});
      }
    }
  }).catch(() => {
    // caches API may be unavailable
  });
}
