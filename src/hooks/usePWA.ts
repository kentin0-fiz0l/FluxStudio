/**
 * PWA Hook - FluxStudio
 *
 * Provides PWA-related functionality including:
 * - Network status (online/offline)
 * - Install prompt handling
 * - Service worker registration status
 * - Offline data sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initDB,
  processPendingSync,
  getCacheStats,
  hasOfflineData
} from '../utils/offlineStorage';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../utils/apiHelpers';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAState {
  isOnline: boolean;
  isOfflineReady: boolean;
  canInstall: boolean;
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  pendingSyncCount: number;
  lastSyncTime: number | null;
}

export interface UsePWAReturn extends PWAState {
  installApp: () => Promise<boolean>;
  updateApp: () => void;
  syncOfflineData: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
}

export function usePWA(): UsePWAReturn {
  const { token } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Sync offline data - defined before the effect that uses it
  const syncOfflineData = useCallback(async () => {
    if (!token || !isOnline) return;

    try {
      const apiBaseUrl = getApiUrl('');
      const result = await processPendingSync(token, apiBaseUrl);

      // Log sync results for debugging
      if (result.failed > 0) {
        console.warn(`Sync complete: ${result.success} succeeded, ${result.failed} failed`);
      }

      // Update stats
      const stats = await getCacheStats();
      setPendingSyncCount(stats.pendingSyncCount);
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }, [token, isOnline]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when back online
      if (token) {
        syncOfflineData();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token, syncOfflineData]);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed - use media query listener pattern
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleStandaloneChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    handleStandaloneChange(standaloneQuery);
    standaloneQuery.addEventListener('change', handleStandaloneChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', handleStandaloneChange);
    };
  }, []);

  // Initialize IndexedDB and check offline readiness
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        const hasData = await hasOfflineData();
        setIsOfflineReady(hasData);

        const stats = await getCacheStats();
        setPendingSyncCount(stats.pendingSyncCount);
        setLastSyncTime(stats.lastSync);
      } catch (error) {
        console.error('Failed to initialize offline storage:', error);
      }
    };

    init();
  }, []);

  // Register service worker and handle updates
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        swRegistrationRef.current = registration;

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
              }
            });
          }
        });
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload to use new service worker
        window.location.reload();
      });
    }
  }, []);

  // Install the app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPromptRef.current) {
      return false;
    }

    try {
      await deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
        deferredPromptRef.current = null;
        return true;
      }
    } catch (error) {
      console.error('Failed to install app:', error);
    }

    return false;
  }, []);

  // Update the app (skip waiting)
  const updateApp = useCallback(() => {
    if (swRegistrationRef.current?.waiting) {
      swRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    if (swRegistrationRef.current) {
      try {
        await swRegistrationRef.current.update();
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    }
  }, []);

  return {
    isOnline,
    isOfflineReady,
    canInstall,
    isInstalled,
    isUpdateAvailable,
    pendingSyncCount,
    lastSyncTime,
    installApp,
    updateApp,
    syncOfflineData,
    checkForUpdates
  };
}

export default usePWA;
