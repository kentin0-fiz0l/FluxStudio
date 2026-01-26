/**
 * PWA Service Management
 * @file src/services/pwaService.ts
 *
 * Handles service worker registration, updates, and PWA functionality
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstallPrompt: InstallPromptEvent | null = null;

/**
 * Register service worker
 */
export async function registerServiceWorker(
  swPath: string = '/sw.js',
  options: {
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath, {
      scope: '/',
    });

    console.log('[PWA] Service worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New content available; please refresh.');
            options.onUpdate?.(registration);
          }
        });
      }
    });

    // Initial success callback
    if (registration.active) {
      options.onSuccess?.(registration);
    } else {
      registration.addEventListener('activate', () => {
        options.onSuccess?.(registration);
      });
    }

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    options.onError?.(error as Error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('[PWA] Service worker unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Error unregistering service worker:', error);
    return false;
  }
}

/**
 * Get current service worker status
 */
export async function getServiceWorkerStatus(): Promise<ServiceWorkerStatus> {
  const isSupported = 'serviceWorker' in navigator;

  if (!isSupported) {
    return {
      isSupported: false,
      isRegistered: false,
      isActive: false,
      hasUpdate: false,
      registration: null,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    return {
      isSupported: true,
      isRegistered: !!registration,
      isActive: !!registration?.active,
      hasUpdate: !!registration?.waiting,
      registration: registration || null,
    };
  } catch {
    return {
      isSupported: true,
      isRegistered: false,
      isActive: false,
      hasUpdate: false,
      registration: null,
    };
  }
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      return !!registration.waiting;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Error checking for updates:', error);
    return false;
  }
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Send message to service worker
 */
export async function postMessageToSW<T = unknown>(
  message: unknown
): Promise<T | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data as T);
    };

    navigator.serviceWorker.controller?.postMessage(message, [messageChannel.port2]);

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

/**
 * Cache specific URLs
 */
export async function cacheUrls(urls: string[]): Promise<void> {
  await postMessageToSW({
    type: 'CACHE_URLS',
    urls,
  });
}

/**
 * Clear all caches
 */
export async function clearCache(): Promise<void> {
  await postMessageToSW({ type: 'CLEAR_CACHE' });
}

/**
 * Get total cache size
 */
export async function getCacheSize(): Promise<number> {
  const result = await postMessageToSW<{ size: number }>({
    type: 'GET_CACHE_SIZE',
  });
  return result?.size || 0;
}

/**
 * Trigger background sync
 */
export async function triggerSync(tag: string = 'sync-pending-actions'): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('sync' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      // @ts-expect-error - Background Sync API
      await registration.sync.register(tag);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Error triggering sync:', error);
    return false;
  }
}

/**
 * Setup install prompt listener
 */
export function setupInstallPrompt(
  onPromptReady?: (event: InstallPromptEvent) => void
): () => void {
  const handler = (event: Event) => {
    event.preventDefault();
    deferredInstallPrompt = event as InstallPromptEvent;
    console.log('[PWA] Install prompt ready');
    onPromptReady?.(deferredInstallPrompt);
  };

  window.addEventListener('beforeinstallprompt', handler);

  return () => {
    window.removeEventListener('beforeinstallprompt', handler);
  };
}

/**
 * Show install prompt
 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) {
    console.log('[PWA] Install prompt not available');
    return 'unavailable';
  }

  try {
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);

    // Clear the deferred prompt
    deferredInstallPrompt = null;

    return outcome;
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error);
    return 'unavailable';
  }
}

/**
 * Check if app is installed
 */
export function isAppInstalled(): boolean {
  // Check standalone display mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check fullscreen display mode
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }

  // Check iOS Safari standalone mode
  // @ts-expect-error - iOS Safari specific
  if (window.navigator.standalone === true) {
    return true;
  }

  return false;
}

/**
 * Check if install prompt is available
 */
export function isInstallPromptAvailable(): boolean {
  return deferredInstallPrompt !== null;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  publicKey: string
): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[PWA] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('[PWA] No service worker registration found');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    console.log('[PWA] Push subscription created:', subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error('[PWA] Error subscribing to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    const result = await subscription.unsubscribe();
    console.log('[PWA] Push unsubscription result:', result);
    return result;
  } catch (error) {
    console.error('[PWA] Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;

    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return await Notification.requestPermission();
}

/**
 * Show local notification
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options,
    });

    return true;
  } catch (error) {
    console.error('[PWA] Error showing notification:', error);
    return false;
  }
}

/**
 * Helper: Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Listen for service worker messages
 */
export function onServiceWorkerMessage(
  callback: (event: MessageEvent) => void
): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  navigator.serviceWorker.addEventListener('message', callback);

  return () => {
    navigator.serviceWorker.removeEventListener('message', callback);
  };
}

/**
 * Format cache size for display
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  getServiceWorkerStatus,
  checkForUpdates,
  skipWaiting,
  postMessageToSW,
  cacheUrls,
  clearCache,
  getCacheSize,
  triggerSync,
  setupInstallPrompt,
  showInstallPrompt,
  isAppInstalled,
  isInstallPromptAvailable,
  subscribeToPush,
  unsubscribeFromPush,
  getPushSubscription,
  requestNotificationPermission,
  showNotification,
  onServiceWorkerMessage,
  formatCacheSize,
};
