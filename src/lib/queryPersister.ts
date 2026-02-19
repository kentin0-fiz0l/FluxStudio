/**
 * TanStack Query Persister — Dexie-backed
 *
 * Persists TanStack Query cache to IndexedDB via Dexie.
 * This allows cached query data to survive page reloads,
 * so the app can render immediately with stale data while
 * fresh data loads in the background.
 */

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { db } from '../services/db';

export const queryPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => {
      try {
        const row = await db.cache.get(key);
        return row ? JSON.stringify(row.data) : null;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await db.cache.put({
          key,
          data: JSON.parse(value),
          timestamp: Date.now(),
        });
      } catch {
        // IndexedDB may be unavailable
      }
    },
    removeItem: async (key: string) => {
      try {
        await db.cache.delete(key);
      } catch {
        // IndexedDB may be unavailable
      }
    },
  },
  key: 'fluxstudio-query-cache',
});
