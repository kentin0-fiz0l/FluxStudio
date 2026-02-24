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
    wb = new Workbox('/sw.js');

    wb.addEventListener('waiting', () => {
      onUpdateAvailable?.();
    });

    wb.register().catch(() => {
      // SW registration can fail (stale SW, IndexedDB issues) — non-critical, skip silently
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
 * The current SW uses v4-0 caches; anything else is stale.
 */
function cleanupStaleCaches() {
  if (!('caches' in window)) return;

  const CURRENT_PREFIXES = ['fluxstudio-v4-0', 'fluxstudio-static-v4-0', 'fluxstudio-api-v4-0'];

  caches.keys().then((names) => {
    for (const name of names) {
      if (!CURRENT_PREFIXES.includes(name)) {
        caches.delete(name).catch(() => {});
      }
    }
  }).catch(() => {
    // caches API may be unavailable
  });
}
