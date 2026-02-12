/**
 * Offline Bridge
 *
 * Connects the Zustand offlineSlice to:
 * 1. Browser online/offline events
 * 2. IndexedDB persistence (via offlineStorage service)
 *
 * Call `initOfflineBridge(store)` once at app startup.
 */

import { offlineStorage } from './offlineStorage';
import type { FluxStore } from '@/store';

type Store = {
  getState: () => FluxStore;
  subscribe: (listener: (state: FluxStore, prevState: FluxStore) => void) => () => void;
};

let initialized = false;

export function initOfflineBridge(store: Store) {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const { offline } = store.getState();

  // 1. Set initial network status
  offline.setNetworkStatus(navigator.onLine ? 'online' : 'offline');

  // 2. Listen for online/offline events
  window.addEventListener('online', () => {
    store.getState().offline.setNetworkStatus('online');
  });

  window.addEventListener('offline', () => {
    store.getState().offline.setNetworkStatus('offline');
  });

  // 3. Hydrate pending actions from IndexedDB
  offlineStorage.pendingActions.getAll().then((persisted) => {
    if (persisted.length === 0) return;

    const { queueAction, sync } = store.getState().offline;
    const existing = store.getState().offline.pendingActions;

    for (const action of persisted) {
      if (!existing.some((a) => a.id === action.id)) {
        queueAction({
          type: action.type,
          payload: action.payload,
          endpoint: action.endpoint,
          method: action.method,
          maxRetries: action.maxRetries,
        });
      }
    }

    if (navigator.onLine) {
      sync();
    }
  });

  // 4. Subscribe to pending actions changes → persist to IndexedDB
  store.subscribe((state, prevState) => {
    const curr = state.offline.pendingActions;
    const prev = prevState.offline.pendingActions;
    if (curr !== prev) {
      syncActionsToIDB(curr);
    }
  });
}

async function syncActionsToIDB(actions: FluxStore['offline']['pendingActions']) {
  try {
    // Clear and re-write (simple approach; fine for small queues)
    await offlineStorage.pendingActions.clear();
    for (const action of actions) {
      await offlineStorage.pendingActions.add({
        type: action.type,
        endpoint: action.endpoint ?? '',
        method: action.method ?? 'POST',
        payload: action.payload,
        maxRetries: action.maxRetries,
        priority: 'normal',
      });
    }
  } catch {
    // IndexedDB may be unavailable (private browsing, etc.)
  }
}
