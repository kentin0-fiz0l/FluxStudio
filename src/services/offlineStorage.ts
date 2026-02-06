/**
 * Offline Storage Service
 *
 * IndexedDB-based storage for offline-first functionality.
 * Provides:
 * - Persistent data storage
 * - Pending action queue
 * - Cached API responses
 * - Conflict tracking
 */

// Type declarations for Background Sync API
interface SyncManager {
  register(tag: string): Promise<void>;
}

const DB_NAME = 'fluxstudio-offline';
const DB_VERSION = 2;

// Store names
const STORES = {
  PENDING_ACTIONS: 'pendingActions',
  CACHED_DATA: 'cachedData',
  CONFLICTS: 'conflicts',
  USER_DATA: 'userData',
  PROJECTS: 'projects',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface PendingAction {
  id: string;
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: unknown;
  token?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
}

export interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
  etag?: string;
}

export interface Conflict {
  id: string;
  entityType: string;
  entityId: string;
  localData: unknown;
  serverData: unknown;
  timestamp: number;
  resolved: boolean;
}

// ============================================================================
// Database Connection
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineStorage] Failed to open database:', request.error);
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onerror = (event) => {
        console.error('[OfflineStorage] Database error:', event);
      };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Pending actions store
      if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
        const store = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('priority', 'priority');
        store.createIndex('type', 'type');
      }

      // Cached data store
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        const store = db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('expiresAt', 'expiresAt');
      }

      // Conflicts store
      if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
        const store = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id' });
        store.createIndex('entityType', 'entityType');
        store.createIndex('resolved', 'resolved');
      }

      // User data store
      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        db.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
      }

      // Projects store for offline access
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const store = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }

      // Conversations store for offline access
      if (!db.objectStoreNames.contains(STORES.CONVERSATIONS)) {
        const store = db.createObjectStore(STORES.CONVERSATIONS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }

      // Messages store for offline access
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        const store = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
        store.createIndex('conversationId', 'conversationId');
        store.createIndex('createdAt', 'createdAt');
      }
    };
  });

  return dbPromise;
}

// ============================================================================
// Generic Store Operations
// ============================================================================

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly') {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, value: T): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clear(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function count(storeName: string): Promise<number> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Pending Actions API
// ============================================================================

export const pendingActions = {
  async add(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pendingAction: PendingAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries ?? 3,
      priority: action.priority ?? 'normal',
    };

    await put(STORES.PENDING_ACTIONS, pendingAction);
    console.log('[OfflineStorage] Added pending action:', id);

    // Request background sync if available
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      try {
        // Cast to include sync property (Background Sync API)
        const syncManager = (registration as ServiceWorkerRegistration & { sync: SyncManager }).sync;
        await syncManager.register('sync-pending-actions');
      } catch (_e) {
        console.log('[OfflineStorage] Background sync not available');
      }
    }

    return id;
  },

  async getAll(): Promise<PendingAction[]> {
    const actions = await getAll<PendingAction>(STORES.PENDING_ACTIONS);
    // Sort by priority and timestamp
    return actions.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });
  },

  async get(id: string): Promise<PendingAction | undefined> {
    return get(STORES.PENDING_ACTIONS, id);
  },

  async remove(id: string): Promise<void> {
    await remove(STORES.PENDING_ACTIONS, id);
    console.log('[OfflineStorage] Removed pending action:', id);
  },

  async incrementRetry(id: string): Promise<boolean> {
    const action = await this.get(id);
    if (!action) return false;

    if (action.retryCount >= action.maxRetries) {
      return false;
    }

    action.retryCount++;
    await put(STORES.PENDING_ACTIONS, action);
    return true;
  },

  async count(): Promise<number> {
    return count(STORES.PENDING_ACTIONS);
  },

  async clear(): Promise<void> {
    await clear(STORES.PENDING_ACTIONS);
  },
};

// ============================================================================
// Cached Data API
// ============================================================================

export const cachedData = {
  async set(key: string, data: unknown, ttlMs?: number): Promise<void> {
    const cached: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
    };
    await put(STORES.CACHED_DATA, cached);
  },

  async get<T>(key: string): Promise<T | null> {
    const cached = await get<CachedData>(STORES.CACHED_DATA, key);
    if (!cached) return null;

    // Check expiration
    if (cached.expiresAt && cached.expiresAt < Date.now()) {
      await this.remove(key);
      return null;
    }

    return cached.data as T;
  },

  async remove(key: string): Promise<void> {
    await remove(STORES.CACHED_DATA, key);
  },

  async clear(): Promise<void> {
    await clear(STORES.CACHED_DATA);
  },

  async cleanup(): Promise<number> {
    const db = await openDatabase();
    const tx = db.transaction(STORES.CACHED_DATA, 'readwrite');
    const store = tx.objectStore(STORES.CACHED_DATA);
    const index = store.index('expiresAt');
    const now = Date.now();

    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  },
};

// ============================================================================
// Conflicts API
// ============================================================================

export const conflicts = {
  async add(conflict: Omit<Conflict, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const id = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newConflict: Conflict = {
      ...conflict,
      id,
      timestamp: Date.now(),
      resolved: false,
    };
    await put(STORES.CONFLICTS, newConflict);
    return id;
  },

  async getAll(): Promise<Conflict[]> {
    return getAll(STORES.CONFLICTS);
  },

  async getUnresolved(): Promise<Conflict[]> {
    const allConflicts = await this.getAll();
    return allConflicts.filter((c) => !c.resolved);
  },

  async resolve(id: string, useLocal: boolean): Promise<void> {
    const conflict = await get<Conflict>(STORES.CONFLICTS, id);
    if (!conflict) return;

    conflict.resolved = true;
    await put(STORES.CONFLICTS, conflict);

    // Return the data that should be used
    console.log(`[OfflineStorage] Resolved conflict ${id} with ${useLocal ? 'local' : 'server'} data`);
  },

  async remove(id: string): Promise<void> {
    await remove(STORES.CONFLICTS, id);
  },

  async clearResolved(): Promise<void> {
    const allConflicts = await this.getAll();
    for (const conflict of allConflicts) {
      if (conflict.resolved) {
        await this.remove(conflict.id);
      }
    }
  },
};

// ============================================================================
// Entity Storage APIs
// ============================================================================

export const projects = {
  async save(project: { id: string; [key: string]: unknown }): Promise<void> {
    await put(STORES.PROJECTS, { ...project, _cachedAt: Date.now() });
  },

  async get(id: string): Promise<unknown> {
    return get(STORES.PROJECTS, id);
  },

  async getAll(): Promise<unknown[]> {
    return getAll(STORES.PROJECTS);
  },

  async remove(id: string): Promise<void> {
    await remove(STORES.PROJECTS, id);
  },

  async clear(): Promise<void> {
    await clear(STORES.PROJECTS);
  },
};

export const conversations = {
  async save(conversation: { id: string; [key: string]: unknown }): Promise<void> {
    await put(STORES.CONVERSATIONS, { ...conversation, _cachedAt: Date.now() });
  },

  async get(id: string): Promise<unknown> {
    return get(STORES.CONVERSATIONS, id);
  },

  async getAll(): Promise<unknown[]> {
    return getAll(STORES.CONVERSATIONS);
  },

  async remove(id: string): Promise<void> {
    await remove(STORES.CONVERSATIONS, id);
  },

  async clear(): Promise<void> {
    await clear(STORES.CONVERSATIONS);
  },
};

export const messages = {
  async save(message: { id: string; conversationId: string; [key: string]: unknown }): Promise<void> {
    await put(STORES.MESSAGES, { ...message, _cachedAt: Date.now() });
  },

  async get(id: string): Promise<unknown> {
    return get(STORES.MESSAGES, id);
  },

  async getByConversation(conversationId: string): Promise<unknown[]> {
    const db = await openDatabase();
    const tx = db.transaction(STORES.MESSAGES, 'readonly');
    const store = tx.objectStore(STORES.MESSAGES);
    const index = store.index('conversationId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(conversationId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async remove(id: string): Promise<void> {
    await remove(STORES.MESSAGES, id);
  },

  async clear(): Promise<void> {
    await clear(STORES.MESSAGES);
  },
};

// ============================================================================
// Storage Management
// ============================================================================

export const storage = {
  async getEstimatedSize(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  },

  async requestPersistence(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return navigator.storage.persist();
    }
    return false;
  },

  async isPersisted(): Promise<boolean> {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      return navigator.storage.persisted();
    }
    return false;
  },

  async clearAll(): Promise<void> {
    await Promise.all([
      clear(STORES.PENDING_ACTIONS),
      clear(STORES.CACHED_DATA),
      clear(STORES.CONFLICTS),
      clear(STORES.USER_DATA),
      clear(STORES.PROJECTS),
      clear(STORES.CONVERSATIONS),
      clear(STORES.MESSAGES),
    ]);
  },
};

// ============================================================================
// Offline Storage Service (unified export)
// ============================================================================

export const offlineStorage = {
  pendingActions,
  cachedData,
  conflicts,
  projects,
  conversations,
  messages,
  storage,
};

export default offlineStorage;
