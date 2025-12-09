'use client';

import { useSession } from 'next-auth/react';
import { useState, useCallback } from 'react';
import { useMetMapStore } from '@/stores/useMetMapStore';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncResult {
  success: boolean;
  message?: string;
  syncedAt?: string;
}

/**
 * Hook for syncing localStorage data with the server
 */
export function useSync() {
  const { data: session, status: authStatus } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const songs = useMetMapStore((state) => state.songs);
  const sessions = useMetMapStore((state) => state.sessions);

  const isAuthenticated = authStatus === 'authenticated' && !!session?.user;

  /**
   * Sync local data to the server
   */
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        message: 'You must be signed in to sync',
      };
    }

    setSyncStatus('syncing');
    setError(null);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songs,
          sessions,
          lastSyncedAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Sync failed');
      }

      const result = await response.json();

      setSyncStatus('success');
      setLastSyncedAt(result.syncedAt);

      // Update the local store with the synced data
      // This merges server data back into localStorage
      const store = useMetMapStore.getState();

      // Replace local data with server data
      // The server has the authoritative merged version
      if (result.data?.songs) {
        // Clear and replace songs
        store.clearAllData();
        for (const song of result.data.songs) {
          store.importSong(song);
        }
      }

      return {
        success: true,
        syncedAt: result.syncedAt,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSyncStatus('error');
      setError(message);
      return {
        success: false,
        message,
      };
    }
  }, [isAuthenticated, songs, sessions, lastSyncedAt]);

  /**
   * Pull data from server (download only, no upload)
   */
  const pull = useCallback(async (): Promise<SyncResult> => {
    if (!isAuthenticated) {
      return {
        success: false,
        message: 'You must be signed in to sync',
      };
    }

    setSyncStatus('syncing');
    setError(null);

    try {
      const response = await fetch('/api/sync');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch data');
      }

      const result = await response.json();

      // Update the local store with server data
      const store = useMetMapStore.getState();

      if (result.data?.songs) {
        store.clearAllData();
        for (const song of result.data.songs) {
          store.importSong(song);
        }
      }

      setSyncStatus('success');
      setLastSyncedAt(new Date().toISOString());

      return {
        success: true,
        syncedAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSyncStatus('error');
      setError(message);
      return {
        success: false,
        message,
      };
    }
  }, [isAuthenticated]);

  return {
    sync,
    pull,
    syncStatus,
    lastSyncedAt,
    error,
    isAuthenticated,
    isLoading: authStatus === 'loading',
  };
}
