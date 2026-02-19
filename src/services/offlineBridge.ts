/**
 * Offline Bridge
 *
 * Connects the Zustand offlineSlice to:
 * 1. Browser online/offline events
 * 2. IndexedDB persistence (via Dexie)
 *
 * Call `initOfflineBridge(store)` once at app startup.
 */

import { db, generateId, deleteLegacyDB } from './db';
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

  // 3. Hydrate pending actions from Dexie
  db.pendingMutations.toArray().then((persisted) => {
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
  }).catch(() => {
    // Dexie may be unavailable (private browsing, etc.)
  });

  // 4. Subscribe to pending actions changes → persist to Dexie
  store.subscribe((state, prevState) => {
    const curr = state.offline.pendingActions;
    const prev = prevState.offline.pendingActions;
    if (curr !== prev) {
      syncActionsToDexie(curr);
    }
  });

  // 5. Clean up legacy IndexedDB database (one-time)
  deleteLegacyDB().catch(() => {});
}

async function syncActionsToDexie(actions: FluxStore['offline']['pendingActions']) {
  try {
    await db.pendingMutations.clear();
    const records = actions.map((action) => ({
      id: action.id || generateId('action'),
      type: action.type,
      endpoint: action.endpoint ?? '',
      method: (action.method ?? 'POST') as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      payload: action.payload,
      timestamp: action.timestamp,
      retryCount: action.retryCount,
      maxRetries: action.maxRetries,
      priority: 'normal' as const,
    }));
    await db.pendingMutations.bulkPut(records);
  } catch {
    // Dexie may be unavailable (private browsing, etc.)
  }
}
