/**
 * Service Worker Registration
 *
 * Handles SW registration via workbox-window and provides
 * an "update available" callback for the UI to prompt users.
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

  wb = new Workbox('/sw.js');

  wb.addEventListener('waiting', () => {
    onUpdateAvailable?.();
  });

  wb.register();
}

export function applyUpdate() {
  if (!wb) return;
  wb.messageSkipWaiting();
  window.location.reload();
}
