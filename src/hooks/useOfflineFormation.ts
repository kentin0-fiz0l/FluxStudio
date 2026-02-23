/**
 * useOfflineFormation — Cache & sync formations via IndexedDB
 *
 * Sprint 49 T1: Offline-capable PWA
 *
 * - Saves formation data to IndexedDB on every change
 * - Loads cached formation when offline or for instant display
 * - Queues API saves as pending mutations when offline
 * - Syncs dirty formations when connection is restored
 */

import { useCallback, useEffect, useRef } from 'react';
import { db } from '@/services/db';
import { useSyncStatus } from '@/store/slices/offlineSlice';

interface FormationData {
  id: string;
  projectId: string;
  [key: string]: unknown;
}

interface OfflineFormationOptions {
  formationId: string;
  projectId: string;
  /** If true, don't sync to server (sandbox/try mode) */
  sandboxMode?: boolean;
}

export function useOfflineFormation({ formationId, projectId, sandboxMode }: OfflineFormationOptions) {
  const { isOnline } = useSyncStatus();
  const savePendingRef = useRef(false);

  /** Cache formation data to IndexedDB */
  const cacheFormation = useCallback(
    async (data: FormationData, positions: unknown) => {
      try {
        await db.formations.put({
          id: formationId,
          projectId,
          data,
          positions,
          updatedAt: Date.now(),
          dirty: isOnline || sandboxMode ? 0 : 1,
        });
      } catch {
        // IndexedDB may be unavailable (private browsing)
      }
    },
    [formationId, projectId, isOnline, sandboxMode],
  );

  /** Load cached formation from IndexedDB */
  const loadCachedFormation = useCallback(async () => {
    try {
      return await db.formations.get(formationId);
    } catch {
      return null;
    }
  }, [formationId]);

  /** Mark a formation as dirty (needs server sync) */
  const markDirty = useCallback(async () => {
    if (sandboxMode) return;
    try {
      await db.formations.update(formationId, { dirty: 1, updatedAt: Date.now() });
    } catch {
      // noop
    }
  }, [formationId, sandboxMode]);

  /** Mark a formation as synced */
  const markSynced = useCallback(async () => {
    try {
      await db.formations.update(formationId, { dirty: 0 });
    } catch {
      // noop
    }
  }, [formationId]);

  /** Sync all dirty formations for this project */
  const syncDirtyFormations = useCallback(async () => {
    if (sandboxMode || !isOnline) return;
    try {
      const dirty = await db.formations.where('dirty').equals(1).toArray();
      for (const f of dirty) {
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) break;

          const apiUrl = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${apiUrl}/api/formations/${f.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(f.data),
          });

          if (res.ok) {
            await db.formations.update(f.id, { dirty: 0 });
          }
        } catch {
          // Will retry on next sync
        }
      }
    } catch {
      // IndexedDB error
    }
  }, [sandboxMode, isOnline]);

  // Auto-sync dirty formations when coming back online
  useEffect(() => {
    if (isOnline && !savePendingRef.current) {
      savePendingRef.current = true;
      syncDirtyFormations().finally(() => {
        savePendingRef.current = false;
      });
    }
  }, [isOnline, syncDirtyFormations]);

  return {
    cacheFormation,
    loadCachedFormation,
    markDirty,
    markSynced,
    syncDirtyFormations,
    isOnline,
  };
}
