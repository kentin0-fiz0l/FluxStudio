/**
 * useOfflineSync Hook
 *
 * Integrates Zustand offline store with IndexedDB storage and service worker.
 * Provides a unified API for offline-first data operations.
 */

import * as React from 'react';
import { useStore } from '@/store';
import { offlineStorage, PendingAction } from '@/services/offlineStorage';

interface UseOfflineSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

interface QueueActionOptions {
  type: string;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: unknown;
  priority?: 'high' | 'normal' | 'low';
  maxRetries?: number;
}

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  syncError: string | null;
  queueAction: (options: QueueActionOptions) => Promise<string>;
  sync: () => Promise<void>;
  clearPending: () => Promise<void>;
  getPendingActions: () => Promise<PendingAction[]>;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const { autoSync = true, syncInterval = 30000 } = options;

  const offline = useStore((state) => state.offline);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Initialize network status listeners
  React.useEffect(() => {
    const handleOnline = () => {
      offline.setNetworkStatus('online');

      // Trigger sync when coming back online
      if (autoSync) {
        syncPendingActions();
      }

      // Notify service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({ type: 'TRIGGER_SYNC' });
        });
      }
    };

    const handleOffline = () => {
      offline.setNetworkStatus('offline');
    };

    // Check connection quality
    const checkConnectionQuality = () => {
      if ('connection' in navigator) {
        const connection = (navigator as Navigator & { connection: NetworkInformation }).connection;
        if (connection) {
          const isSlowConnection =
            connection.effectiveType === 'slow-2g' ||
            connection.effectiveType === '2g' ||
            (connection.downlink !== undefined && connection.downlink < 1);

          if (isSlowConnection && offline.networkStatus !== 'offline') {
            offline.setNetworkStatus('slow');
          }
        }
      }
    };

    // Set initial status
    if (typeof window !== 'undefined') {
      offline.setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection quality
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & { connection: NetworkInformation }).connection;
      connection?.addEventListener('change', checkConnectionQuality);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if ('connection' in navigator) {
        const connection = (navigator as Navigator & { connection: NetworkInformation }).connection;
        connection?.removeEventListener('change', checkConnectionQuality);
      }
    };
  }, [offline, autoSync]);

  // Periodic sync when online
  React.useEffect(() => {
    if (!autoSync || !navigator.onLine) return;

    const intervalId = setInterval(() => {
      if (navigator.onLine && offline.pendingActions.length > 0) {
        syncPendingActions();
      }
    }, syncInterval);

    return () => clearInterval(intervalId);
  }, [autoSync, syncInterval, offline.pendingActions.length]);

  // Listen for service worker sync messages
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        // Refresh pending actions from store
        refreshPendingFromIndexedDB();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  // Load pending actions from IndexedDB on mount
  React.useEffect(() => {
    refreshPendingFromIndexedDB();
  }, []);

  const refreshPendingFromIndexedDB = async () => {
    try {
      const actions = await offlineStorage.pendingActions.getAll();
      // Sync count with store (IndexedDB is source of truth)
      if (actions.length !== offline.pendingActions.length) {
        offline.setSyncStatus(actions.length > 0 ? 'pending' : 'synced');
      }
    } catch (e) {
      console.error('[useOfflineSync] Failed to refresh pending actions:', e);
    }
  };

  const queueAction = async (actionOptions: QueueActionOptions): Promise<string> => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');

    const action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'> = {
      type: actionOptions.type,
      endpoint: actionOptions.endpoint,
      method: actionOptions.method || 'POST',
      payload: actionOptions.payload,
      token: token || undefined,
      priority: actionOptions.priority || 'normal',
      maxRetries: actionOptions.maxRetries ?? 3,
    };

    // Save to IndexedDB
    const id = await offlineStorage.pendingActions.add(action);

    // Update store
    offline.queueAction({
      type: action.type,
      payload: action.payload,
      endpoint: action.endpoint,
      method: action.method,
      maxRetries: action.maxRetries,
    });

    // Try immediate sync if online
    if (navigator.onLine) {
      syncPendingActions();
    }

    return id;
  };

  const syncPendingActions = async () => {
    if (isSyncing || !navigator.onLine) return;

    setIsSyncing(true);
    offline.setSyncStatus('syncing');

    try {
      const actions = await offlineStorage.pendingActions.getAll();

      for (const action of actions) {
        try {
          const response = await fetch(action.endpoint, {
            method: action.method || 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(action.token && { Authorization: `Bearer ${action.token}` }),
            },
            body: JSON.stringify(action.payload),
          });

          if (response.ok) {
            await offlineStorage.pendingActions.remove(action.id);
            offline.removeAction(action.id);
          } else if (response.status >= 400 && response.status < 500) {
            // Client error - don't retry
            await offlineStorage.pendingActions.remove(action.id);
            offline.removeAction(action.id);
            console.warn(`[useOfflineSync] Removing action ${action.id} due to client error:`, response.status);
          } else {
            // Server error - increment retry
            const canRetry = await offlineStorage.pendingActions.incrementRetry(action.id);
            if (!canRetry) {
              await offlineStorage.pendingActions.remove(action.id);
              offline.removeAction(action.id);
            }
          }
        } catch (error) {
          console.error(`[useOfflineSync] Failed to sync action ${action.id}:`, error);

          // Network error - keep in queue for retry
          const canRetry = await offlineStorage.pendingActions.incrementRetry(action.id);
          if (!canRetry) {
            await offlineStorage.pendingActions.remove(action.id);
            offline.removeAction(action.id);
          }
        }
      }

      // Check remaining actions
      const remaining = await offlineStorage.pendingActions.count();
      offline.setSyncStatus(remaining > 0 ? 'pending' : 'synced');
    } catch (error) {
      console.error('[useOfflineSync] Sync failed:', error);
      offline.setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const clearPending = async () => {
    await offlineStorage.pendingActions.clear();
    offline.clearPending();
  };

  const getPendingActions = async () => {
    return offlineStorage.pendingActions.getAll();
  };

  return {
    isOnline: offline.networkStatus === 'online',
    isSyncing,
    pendingCount: offline.pendingActions.length,
    lastSyncedAt: offline.lastSyncedAt,
    syncError: offline.syncError,
    queueAction,
    sync: syncPendingActions,
    clearPending,
    getPendingActions,
  };
}

// Type for Network Information API
interface NetworkInformation {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export default useOfflineSync;
