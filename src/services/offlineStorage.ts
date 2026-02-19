/**
 * @deprecated Use src/services/db.ts (Dexie) instead.
 *
 * Sprint 25 consolidated all IndexedDB access into a single Dexie database.
 * This file is kept only as a type reference during migration.
 *
 * Import from '@/services/db' instead:
 *   import { db } from '@/services/db';
 */

import { db, generateId, type PendingMutation } from './db';

// Re-export a minimal compatibility shim for any missed consumers
export const offlineStorage = {
  pendingActions: {
    async getAll(): Promise<PendingMutation[]> {
      return db.pendingMutations.orderBy('timestamp').toArray();
    },
    async add(action: Omit<PendingMutation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
      const id = generateId('action');
      await db.pendingMutations.add({
        ...action,
        id,
        timestamp: Date.now(),
        retryCount: 0,
      });
      return id;
    },
    async remove(id: string): Promise<void> {
      await db.pendingMutations.delete(id);
    },
    async clear(): Promise<void> {
      await db.pendingMutations.clear();
    },
  },
};

export default offlineStorage;
