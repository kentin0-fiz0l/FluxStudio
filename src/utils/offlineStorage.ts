/**
 * Offline Storage Utilities - FluxStudio
 *
 * IndexedDB-based storage for offline data persistence.
 * Provides caching for critical app data that should be available offline.
 *
 * Features:
 * - IndexedDB wrapper with Promise API
 * - Automatic data sync when back online
 * - Type-safe storage operations
 * - Expiration support
 */

const DB_NAME = 'fluxstudio-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  SONGS: 'songs',
  SECTIONS: 'sections',
  PROJECTS: 'projects',
  USER_DATA: 'userData',
  PENDING_SYNC: 'pendingSync',
  NOTIFICATIONS: 'notifications',
  CACHE_META: 'cacheMeta'
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

interface CacheEntry<T> {
  id: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}

interface PendingSyncItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  endpoint: string;
  method: string;
  body?: unknown;
  timestamp: number;
  retryCount: number;
}

let db: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Songs store
      if (!database.objectStoreNames.contains(STORES.SONGS)) {
        const songsStore = database.createObjectStore(STORES.SONGS, { keyPath: 'id' });
        songsStore.createIndex('userId', 'data.userId', { unique: false });
        songsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Sections store
      if (!database.objectStoreNames.contains(STORES.SECTIONS)) {
        const sectionsStore = database.createObjectStore(STORES.SECTIONS, { keyPath: 'id' });
        sectionsStore.createIndex('songId', 'data.songId', { unique: false });
      }

      // Projects store
      if (!database.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectsStore = database.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        projectsStore.createIndex('userId', 'data.userId', { unique: false });
      }

      // User data store
      if (!database.objectStoreNames.contains(STORES.USER_DATA)) {
        database.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
      }

      // Pending sync store
      if (!database.objectStoreNames.contains(STORES.PENDING_SYNC)) {
        const syncStore = database.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Notifications store
      if (!database.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = database.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
        notifStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Cache metadata store
      if (!database.objectStoreNames.contains(STORES.CACHE_META)) {
        database.createObjectStore(STORES.CACHE_META, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

/**
 * Get an item from a store
 */
export async function getItem<T>(storeName: StoreName, id: string): Promise<T | null> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => {
      const entry = request.result as CacheEntry<T> | undefined;
      if (!entry) {
        resolve(null);
        return;
      }

      // Check expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        // Delete expired entry
        deleteItem(storeName, id).catch(console.error);
        resolve(null);
        return;
      }

      resolve(entry.data);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Set an item in a store
 */
export async function setItem<T>(
  storeName: StoreName,
  id: string,
  data: T,
  ttlMs?: number
): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    const entry: CacheEntry<T> = {
      id,
      data,
      timestamp: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined
    };

    const request = store.put(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an item from a store
 */
export async function deleteItem(storeName: StoreName, id: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all items from a store
 */
export async function getAllItems<T>(storeName: StoreName): Promise<T[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      const entries = request.result as CacheEntry<T>[];
      const now = Date.now();

      // Filter out expired entries and return data
      const validEntries = entries
        .filter(entry => !entry.expiresAt || entry.expiresAt > now)
        .map(entry => entry.data);

      resolve(validEntries);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all items from a store
 */
export async function clearStore(storeName: StoreName): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add an item to the pending sync queue
 */
export async function addToPendingSync(
  action: PendingSyncItem['action'],
  endpoint: string,
  method: string,
  body?: unknown
): Promise<string> {
  const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const item: PendingSyncItem = {
    id,
    action,
    endpoint,
    method,
    body,
    timestamp: Date.now(),
    retryCount: 0
  };

  await setItem(STORES.PENDING_SYNC, id, item);
  return id;
}

/**
 * Get all pending sync items
 */
export async function getPendingSyncItems(): Promise<PendingSyncItem[]> {
  return getAllItems<PendingSyncItem>(STORES.PENDING_SYNC);
}

/**
 * Remove a pending sync item
 */
export async function removePendingSyncItem(id: string): Promise<void> {
  return deleteItem(STORES.PENDING_SYNC, id);
}

/**
 * Process pending sync queue
 */
export async function processPendingSync(
  token: string,
  apiBaseUrl: string
): Promise<{ success: number; failed: number }> {
  const items = await getPendingSyncItems();
  let success = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const response = await fetch(`${apiBaseUrl}${item.endpoint}`, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: item.body ? JSON.stringify(item.body) : undefined
      });

      if (response.ok) {
        await removePendingSyncItem(item.id);
        success++;
      } else {
        // Update retry count
        item.retryCount++;
        if (item.retryCount >= 3) {
          // Too many retries, remove from queue
          await removePendingSyncItem(item.id);
          failed++;
        } else {
          await setItem(STORES.PENDING_SYNC, item.id, item);
          failed++;
        }
      }
    } catch {
      // Network error, keep in queue
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Cache songs for offline access
 */
export async function cacheSongs(songs: Array<{ id: string; [key: string]: unknown }>): Promise<void> {
  const TTL = 24 * 60 * 60 * 1000; // 24 hours

  for (const song of songs) {
    await setItem(STORES.SONGS, song.id, song, TTL);
  }

  // Update cache metadata
  await setItem(STORES.CACHE_META, 'songs_last_sync', {
    timestamp: Date.now(),
    count: songs.length
  });
}

/**
 * Get cached songs
 */
export async function getCachedSongs(): Promise<unknown[]> {
  return getAllItems(STORES.SONGS);
}

/**
 * Cache a single song with sections
 */
export async function cacheSongWithSections(song: { id: string; sections?: Array<{ id: string; [key: string]: unknown }>; [key: string]: unknown }): Promise<void> {
  const TTL = 24 * 60 * 60 * 1000; // 24 hours

  await setItem(STORES.SONGS, song.id, song, TTL);

  if (song.sections) {
    for (const section of song.sections) {
      await setItem(STORES.SECTIONS, section.id, section, TTL);
    }
  }
}

/**
 * Get cached song by ID
 */
export async function getCachedSong(songId: string): Promise<unknown | null> {
  return getItem(STORES.SONGS, songId);
}

/**
 * Check if offline data is available
 */
export async function hasOfflineData(): Promise<boolean> {
  try {
    const songs = await getCachedSongs();
    return songs.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  songsCount: number;
  pendingSyncCount: number;
  lastSync: number | null;
}> {
  try {
    const songs = await getCachedSongs();
    const pendingSync = await getPendingSyncItems();
    const meta = await getItem<{ timestamp: number }>(STORES.CACHE_META, 'songs_last_sync');

    return {
      songsCount: songs.length,
      pendingSyncCount: pendingSync.length,
      lastSync: meta?.timestamp || null
    };
  } catch {
    return {
      songsCount: 0,
      pendingSyncCount: 0,
      lastSync: null
    };
  }
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    clearStore(STORES.SONGS),
    clearStore(STORES.SECTIONS),
    clearStore(STORES.PROJECTS),
    clearStore(STORES.NOTIFICATIONS),
    clearStore(STORES.CACHE_META)
  ]);
}

export default {
  initDB,
  getItem,
  setItem,
  deleteItem,
  getAllItems,
  clearStore,
  addToPendingSync,
  getPendingSyncItems,
  removePendingSyncItem,
  processPendingSync,
  cacheSongs,
  getCachedSongs,
  cacheSongWithSections,
  getCachedSong,
  hasOfflineData,
  getCacheStats,
  clearAllOfflineData,
  STORES
};
