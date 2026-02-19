/**
 * FluxStudio Dexie Database
 *
 * Single IndexedDB database for all offline-first storage.
 * Replaces the two conflicting raw IndexedDB implementations:
 *   - src/services/offlineStorage.ts (v2, 7 stores)
 *   - src/utils/offlineStorage.ts (v1, songs/sections — legacy)
 *
 * Uses a NEW database name ('fluxstudio-db') to avoid version conflicts
 * with the old 'fluxstudio-offline' database.
 */

import Dexie, { type Table } from 'dexie';

// ============================================================================
// Types
// ============================================================================

export interface CachedResponse {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
  etag?: string;
}

export interface PendingMutation {
  id: string;
  type: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
  queryKeysToInvalidate?: string[][];
}

export interface OfflineConflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: unknown;
  serverData: unknown;
  timestamp: number;
  resolved: boolean;
}

export interface CachedProject {
  id: string;
  data: unknown;
  updatedAt: number;
}

export interface CachedConversation {
  id: string;
  data: unknown;
  updatedAt: number;
}

export interface CachedMessage {
  id: string;
  conversationId: string;
  data: unknown;
  updatedAt: number;
}

// ============================================================================
// Database
// ============================================================================

export class FluxDB extends Dexie {
  cache!: Table<CachedResponse, string>;
  pendingMutations!: Table<PendingMutation, string>;
  conflicts!: Table<OfflineConflict, string>;
  projects!: Table<CachedProject, string>;
  conversations!: Table<CachedConversation, string>;
  messages!: Table<CachedMessage, string>;

  constructor() {
    super('fluxstudio-db');

    this.version(1).stores({
      cache: 'key, timestamp, expiresAt',
      pendingMutations: 'id, timestamp, type, priority',
      conflicts: 'id, entityType, entityId, timestamp',
      projects: 'id, updatedAt',
      conversations: 'id, updatedAt',
      messages: 'id, conversationId, updatedAt',
    });
  }
}

export const db = new FluxDB();

// ============================================================================
// Helpers
// ============================================================================

/** Generate a unique ID for pending mutations */
export function generateId(prefix = 'mut'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Clean up expired cache entries */
export async function cleanupExpiredCache(): Promise<number> {
  const now = Date.now();
  return db.cache
    .where('expiresAt')
    .below(now)
    .delete();
}

/** Delete the legacy 'fluxstudio-offline' database if it exists */
export async function deleteLegacyDB(): Promise<void> {
  try {
    const databases = await indexedDB.databases();
    if (databases.some((d) => d.name === 'fluxstudio-offline')) {
      await Dexie.delete('fluxstudio-offline');
    }
  } catch {
    // indexedDB.databases() not supported in all browsers — ignore
  }
}
