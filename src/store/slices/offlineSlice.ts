/**
 * Offline Slice - Offline-first state management
 *
 * Handles:
 * - Network status tracking
 * - Pending action queue
 * - Sync status
 * - Conflict resolution
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';
import { apiService } from '../../services/apiService';
import { db } from '../../services/db';

// ============================================================================
// Types
// ============================================================================

export type NetworkStatus = 'online' | 'offline' | 'slow';
export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error';

export interface PendingAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

export interface SyncConflict {
  id: string;
  localData: unknown;
  serverData: unknown;
  timestamp: number;
  resolved: boolean;
}

export interface OfflineState {
  networkStatus: NetworkStatus;
  syncStatus: SyncStatus;
  pendingActions: PendingAction[];
  conflicts: SyncConflict[];
  lastSyncedAt: string | null;
  syncError: string | null;
}

export interface OfflineActions {
  setNetworkStatus: (status: NetworkStatus) => void;
  setSyncStatus: (status: SyncStatus) => void;
  queueAction: (action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeAction: (id: string) => void;
  retryAction: (id: string) => void;
  addConflict: (conflict: Omit<SyncConflict, 'id' | 'timestamp' | 'resolved'>) => void;
  resolveConflict: (id: string, resolution: 'local' | 'server') => void;
  sync: () => Promise<void>;
  clearPending: () => void;
}

export interface OfflineSlice {
  offline: OfflineState & OfflineActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: OfflineState = {
  networkStatus: 'online',
  syncStatus: 'synced',
  pendingActions: [],
  conflicts: [],
  lastSyncedAt: null,
  syncError: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createOfflineSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  OfflineSlice
> = (set, get) => ({
  offline: {
    ...initialState,

    setNetworkStatus: (status) => {
      set((state) => {
        state.offline.networkStatus = status;
      });

      // Auto-sync when coming back online
      if (status === 'online' && get().offline.pendingActions.length > 0) {
        get().offline.sync();
      }
    },

    setSyncStatus: (status) => {
      set((state) => {
        state.offline.syncStatus = status;
      });
    },

    queueAction: (action) => {
      const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => {
        state.offline.pendingActions.push({
          ...action,
          id,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: action.maxRetries ?? 3,
        });
        state.offline.syncStatus = 'pending';
      });

      // Try to sync immediately if online
      if (get().offline.networkStatus === 'online') {
        get().offline.sync();
      }
    },

    removeAction: (id) => {
      set((state) => {
        state.offline.pendingActions = state.offline.pendingActions.filter((a) => a.id !== id);
        if (state.offline.pendingActions.length === 0) {
          state.offline.syncStatus = 'synced';
        }
      });
    },

    retryAction: (id) => {
      set((state) => {
        const action = state.offline.pendingActions.find((a) => a.id === id);
        if (action && action.retryCount < action.maxRetries) {
          action.retryCount++;
        }
      });
    },

    addConflict: (conflict) => {
      const id = `conflict-${Date.now()}`;
      set((state) => {
        state.offline.conflicts.push({
          ...conflict,
          id,
          timestamp: Date.now(),
          resolved: false,
        });
      });
    },

    resolveConflict: (id, resolution) => {
      const conflict = get().offline.conflicts.find((c) => c.id === id);
      if (!conflict) return;

      set((state) => {
        const c = state.offline.conflicts.find((c) => c.id === id);
        if (c) {
          c.resolved = true;
        }
      });

      // Apply the resolution
      const dataToSync = resolution === 'local' ? conflict.localData : conflict.serverData;

      // Queue a sync action with the resolved data
      if (conflict.localData && typeof conflict.localData === 'object') {
        const entityData = conflict.localData as Record<string, unknown>;
        const entityType = (entityData as { _entityType?: string })._entityType;
        const entityId = (entityData as { _entityId?: string })._entityId;

        if (entityType && entityId) {
          get().offline.queueAction({
            type: `resolve_conflict_${entityType}`,
            payload: dataToSync,
            endpoint: `/api/${entityType}s/${entityId}`,
            method: 'PUT',
            maxRetries: 3,
          });
        }
      }

      // Remove from Dexie conflicts
      db.conflicts.delete(id).catch(() => {});
    },

    sync: async () => {
      const { pendingActions, networkStatus } = get().offline;

      if (networkStatus === 'offline' || pendingActions.length === 0) {
        return;
      }

      set((state) => {
        state.offline.syncStatus = 'syncing';
        state.offline.syncError = null;
      });

      for (const action of [...pendingActions]) {
        try {
          if (action.endpoint) {
            const method = action.method || 'POST';
            const body = method === 'DELETE' ? undefined : action.payload;
            await apiService.makeRequest(action.endpoint, {
              method,
              body: body ? JSON.stringify(body) : undefined,
            });
          }

          get().offline.removeAction(action.id);
          // Also remove from Dexie persistence
          db.pendingMutations.delete(action.id).catch(() => {});
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);

          const statusCode = (error as { status?: number })?.status;

          if (statusCode === 409) {
            // Conflict detected - extract server data from error response
            const serverData = (error as { data?: unknown })?.data;
            get().offline.addConflict({
              localData: {
                ...(action.payload as Record<string, unknown>),
                _entityType: action.type,
                _entityId: action.id,
              },
              serverData: serverData ?? null,
            });
            get().offline.removeAction(action.id);
          } else if (action.retryCount < action.maxRetries) {
            get().offline.retryAction(action.id);
          } else {
            set((state) => {
              state.offline.syncStatus = 'error';
              state.offline.syncError = `Action ${action.type} failed after ${action.maxRetries} retries`;
            });
          }
        }
      }

      const remaining = get().offline.pendingActions.length;
      set((state) => {
        state.offline.syncStatus = remaining === 0 ? 'synced' : 'pending';
        state.offline.lastSyncedAt = new Date().toISOString();
      });
    },

    clearPending: () => {
      set((state) => {
        state.offline.pendingActions = [];
        state.offline.syncStatus = 'synced';
      });
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useOffline = () => {
  return useStore((state) => state.offline);
};

export const useSyncStatus = () => {
  const syncStatus = useStore((state) => state.offline.syncStatus);
  const networkStatus = useStore((state) => state.offline.networkStatus);
  const pendingCount = useStore((state) => state.offline.pendingActions.length);
  const lastSyncedAt = useStore((state) => state.offline.lastSyncedAt);
  const sync = useStore((state) => state.offline.sync);

  return {
    syncStatus,
    networkStatus,
    pendingCount,
    lastSyncedAt,
    isOnline: networkStatus === 'online',
    isSynced: syncStatus === 'synced',
    sync,
  };
};
