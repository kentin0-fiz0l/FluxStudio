/**
 * Push Notification Utilities - FluxStudio
 *
 * Handles push notification subscription, permission requests,
 * and communication with the backend for push delivery.
 *
 * Features:
 * - Permission request handling
 * - VAPID key-based subscription
 * - Subscription management (subscribe/unsubscribe)
 * - Backend registration
 */

import { getApiUrl } from './apiHelpers';

// VAPID public key (should match server's VAPID key pair)
// This is a placeholder - in production, fetch from server or config
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current permission state
 */
export async function getPermissionState(): Promise<PushPermissionState> {
  if (!isPushSupported()) {
    return {
      permission: 'denied',
      isSupported: false,
      isSubscribed: false
    };
  }

  const permission = Notification.permission;
  let isSubscribed = false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    isSubscribed = subscription !== null;
  } catch (error) {
    console.error('Error checking subscription:', error);
  }

  return {
    permission,
    isSupported: true,
    isSubscribed
  };
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(token: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }

  const permission = await requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Register subscription with backend
    await registerSubscriptionWithBackend(subscription, token);

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(token: string): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unregister from backend
      await unregisterSubscriptionFromBackend(subscription, token);

      // Unsubscribe locally
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

/**
 * Register subscription with backend
 */
async function registerSubscriptionWithBackend(
  subscription: PushSubscription,
  token: string
): Promise<void> {
  const subscriptionData = subscription.toJSON();

  const response = await fetch(getApiUrl('/api/push/subscribe'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      endpoint: subscriptionData.endpoint,
      keys: {
        p256dh: subscriptionData.keys?.p256dh,
        auth: subscriptionData.keys?.auth
      }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to register push subscription with backend');
  }
}

/**
 * Unregister subscription from backend
 */
async function unregisterSubscriptionFromBackend(
  subscription: PushSubscription,
  token: string
): Promise<void> {
  const subscriptionData = subscription.toJSON();

  try {
    await fetch(getApiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscriptionData.endpoint
      })
    });
  } catch (error) {
    console.warn('Failed to unregister push subscription from backend:', error);
  }
}

/**
 * Get current subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get current subscription:', error);
    return null;
  }
}

/**
 * Show a local notification (for testing or fallback)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) {
    console.warn('Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options
    });
  } catch (error) {
    // Fallback to native Notification API
    new Notification(title, options);
  }
}

export default {
  isPushSupported,
  getPermissionState,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  showLocalNotification
};
