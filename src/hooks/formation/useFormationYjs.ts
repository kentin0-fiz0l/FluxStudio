/**
 * useFormationYjs Hook
 *
 * Provides real-time collaborative editing for formations using Yjs CRDTs.
 * Handles WebSocket connection, state synchronization, and mutation functions.
 *
 * Mutations are split into sub-hooks for maintainability:
 * - useYjsMutations: performer, keyframe, position, meta, audio, pathCurve
 * - useYjsSetMutations: drill set CRUD and reordering
 * - useYjsAwareness: cursor, selection, dragging, undo/redo
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useAuth } from '@/store/slices/authSlice';
import {
  Formation,
  Performer,
  Keyframe,
  DrillSet,
} from '@/services/formationService';
import {
  FormationAwarenessState,
  FORMATION_YJS_TYPES,
  getFormationRoomName,
  getUserColor,
  yMapToPerformer,
  yMapToKeyframe,
  yMapToFormationMeta,
  yMapToAudioTrack,
  yMapToDrillSet,
  performerToYMapEntries,
  keyframeToYMapEntries,
  drillSetToYMapEntries,
} from '@/services/formation/yjs/formationYjsTypes';
import { createBatchingManager, type BatchingManager } from '@/services/formation/yjs/batchingManager';
import { useYjsMutations } from './useYjsMutations';
import { useYjsSetMutations } from './useYjsSetMutations';
import { useYjsAwareness } from './useYjsAwareness';

// ============================================================================
// Types (re-exported from useFormationYjsTypes for backward compatibility)
// ============================================================================

export type { ConflictType, ConflictEvent, UseFormationYjsOptions, UseFormationYjsResult } from './useFormationYjsTypes';
import type { ConflictType, ConflictEvent, UseFormationYjsOptions, UseFormationYjsResult } from './useFormationYjsTypes';

/** Duration in ms before a conflict auto-clears */
const CONFLICT_AUTO_CLEAR_MS = 3000;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFormationYjs({
  projectId,
  formationId,
  enabled = true,
  initialData,
  onUpdate,
  onConnectionChange,
}: UseFormationYjsOptions): UseFormationYjsResult {
  const { user } = useAuth();

  // State
  const [formation, setFormation] = useState<Formation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<FormationAwarenessState[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Document size tracking (for >5MB warning in StatusIndicator)
  const [documentSize, setDocumentSize] = useState(0);
  const documentSizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Conflict tracking state
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const conflictTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const localDraggingRef = useRef<string | null>(null);
  const localActiveKeyframeRef = useRef<string | null>(null);

  // Refs for Yjs instances
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const isSyncingRef = useRef(true);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const batcherRef = useRef<BatchingManager | null>(null);
  const [canYUndo, setCanYUndo] = useState(false);
  const [canYRedo, setCanYRedo] = useState(false);

  // User awareness state
  const userColor = useMemo(() => getUserColor(user?.id || 'anonymous'), [user?.id]);

  // ============================================================================
  // Compose Sub-Hooks
  // ============================================================================

  const mutations = useYjsMutations({ docRef, batcherRef });
  const setMutations = useYjsSetMutations({ docRef });
  const awareness = useYjsAwareness(
    { providerRef, undoManagerRef, localDraggingRef, localActiveKeyframeRef },
    collaborators,
  );

  // ============================================================================
  // Conflict Management Helpers
  // ============================================================================

  const addConflict = useCallback((entityId: string, type: ConflictType, remoteUserId?: string) => {
    const conflict: ConflictEvent = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      entityId,
      type,
      timestamp: Date.now(),
      remoteUserId,
    };

    setConflicts((prev) => [...prev, conflict]);

    const timer = setTimeout(() => {
      setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
      conflictTimersRef.current.delete(conflict.id);
    }, CONFLICT_AUTO_CLEAR_MS);

    conflictTimersRef.current.set(conflict.id, timer);

    return conflict;
  }, []);

  const clearConflict = useCallback((conflictId: string) => {
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    const timer = conflictTimersRef.current.get(conflictId);
    if (timer) {
      clearTimeout(timer);
      conflictTimersRef.current.delete(conflictId);
    }
  }, []);

  // Cleanup all conflict timers on unmount
  useEffect(() => {
    const timers = conflictTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // ============================================================================
  // Sync Yjs to React State
  // ============================================================================

  const syncYjsToReact = useCallback((ydoc: Y.Doc) => {
    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);
    const performersMap = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframesArray = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
    const setsArray = ydoc.getArray(FORMATION_YJS_TYPES.SETS);

    if (!meta.get('id')) return;

    const performers: Performer[] = [];
    performersMap.forEach((yPerformer) => {
      performers.push(yMapToPerformer(yPerformer as Y.Map<unknown>));
    });

    const keyframes: Keyframe[] = [];
    keyframesArray.forEach((yKeyframe) => {
      keyframes.push(yMapToKeyframe(yKeyframe as Y.Map<unknown>));
    });
    keyframes.sort((a, b) => a.timestamp - b.timestamp);

    const sets: DrillSet[] = [];
    setsArray.forEach((ySet) => {
      sets.push(yMapToDrillSet(ySet as Y.Map<unknown>));
    });
    sets.sort((a, b) => a.sortOrder - b.sortOrder);

    const formationMeta = yMapToFormationMeta(meta);
    const audioTrackMap = meta.get(FORMATION_YJS_TYPES.AUDIO) as Y.Map<unknown> | undefined;

    const newFormation: Formation = {
      ...formationMeta,
      performers,
      keyframes,
      sets,
      audioTrack: yMapToAudioTrack(audioTrackMap),
      createdAt: formationMeta.createdAt || new Date().toISOString(),
      updatedAt: formationMeta.updatedAt || new Date().toISOString(),
      createdBy: formationMeta.createdBy || '',
    };

    setFormation(newFormation);
    onUpdate?.(newFormation);
  }, [onUpdate]);

  // ============================================================================
  // Initialize Yjs from Formation Data
  // ============================================================================

  const initializeYjsFromFormation = useCallback((ydoc: Y.Doc, data: Formation) => {
    ydoc.transact(() => {
      const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);
      const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
      const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
      const sets = ydoc.getArray(FORMATION_YJS_TYPES.SETS);

      if (meta.get('id')) return;

      meta.set('id', data.id);
      meta.set('name', data.name);
      meta.set('projectId', data.projectId);
      meta.set('description', data.description || '');
      meta.set('stageWidth', data.stageWidth);
      meta.set('stageHeight', data.stageHeight);
      meta.set('gridSize', data.gridSize);
      meta.set('createdBy', data.createdBy);
      meta.set('createdAt', data.createdAt);
      meta.set('updatedAt', data.updatedAt);

      if (data.audioTrack) {
        const audioMap = new Y.Map();
        audioMap.set('id', data.audioTrack.id);
        audioMap.set('url', data.audioTrack.url);
        audioMap.set('filename', data.audioTrack.filename);
        audioMap.set('duration', data.audioTrack.duration);
        if (data.audioTrack.waveformData) {
          audioMap.set('waveformData', data.audioTrack.waveformData);
        }
        meta.set(FORMATION_YJS_TYPES.AUDIO, audioMap);
      }

      data.performers.forEach((performer) => {
        const yPerformer = new Y.Map();
        performerToYMapEntries(performer).forEach(([key, value]) => {
          yPerformer.set(key, value);
        });
        performers.set(performer.id, yPerformer);
      });

      data.keyframes.forEach((keyframe) => {
        const yKeyframe = new Y.Map();
        keyframeToYMapEntries(keyframe).forEach(([key, value]) => {
          yKeyframe.set(key, value);
        });

        const yPositions = new Y.Map();
        keyframe.positions.forEach((pos, performerId) => {
          yPositions.set(performerId, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
        });
        yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);

        keyframes.push([yKeyframe]);
      });

      if (data.sets) {
        data.sets.forEach((drillSet) => {
          const ySet = new Y.Map();
          drillSetToYMapEntries(drillSet).forEach(([key, value]) => {
            ySet.set(key, value);
          });
          sets.push([ySet]);
        });
      }
    });
  }, []);

  // ============================================================================
  // Initialize Yjs Document
  // ============================================================================

  useEffect(() => {
    if (!enabled || !formationId || !projectId) return;

    const ydoc = new Y.Doc({ gc: true });
    docRef.current = ydoc;

    const roomName = getFormationRoomName(projectId, formationId);

    const wsUrl = import.meta.env.VITE_COLLAB_URL ||
              `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const token = localStorage.getItem('auth_token') || '';

    const wsProvider = new WebsocketProvider(wsUrl, roomName, ydoc, {
      params: { token },
    });
    providerRef.current = wsProvider;

    const persistence = new IndexeddbPersistence(roomName, ydoc);
    persistenceRef.current = persistence;

    wsProvider.on('status', ({ status }: { status: string }) => {
      const connected = status === 'connected';
      setIsConnected(connected);
      onConnectionChange?.(connected);
      if (connected) setError(null);
    });

    wsProvider.on('sync', (synced: boolean) => {
      if (synced) {
        isSyncingRef.current = false;
        setIsSyncing(false);
        setHasPendingChanges(false);
        setLastSyncedAt(Date.now());
        syncYjsToReact(ydoc);
      }
    });

    const updateTracker = (_update: Uint8Array, origin: unknown) => {
      if (origin === null || origin === undefined || origin === 'local') {
        setHasPendingChanges(true);
      } else {
        if (providerRef.current?.wsconnected) {
          setHasPendingChanges(false);
          setLastSyncedAt(Date.now());
        }
      }
    };
    ydoc.on('update', updateTracker);

    persistence.on('synced', () => {
      if (isSyncingRef.current) {
        syncYjsToReact(ydoc);
      }
    });

    wsProvider.on('connection-error', (event: Event) => {
      console.error('Formation collaboration connection error:', event);
      setError('Failed to connect to collaboration server');
    });

    if (user) {
      wsProvider.awareness.setLocalState({
        user: {
          id: user.id,
          name: user.name,
          color: userColor,
          avatar: user.avatar,
        },
        isActive: true,
        lastActivity: Date.now(),
        cursor: null,
        selectedPerformerIds: [],
        draggingPerformerId: null,
        activeKeyframeId: null,
      });
    }

    const heartbeatInterval = setInterval(() => {
      if (user && wsProvider.awareness && !document.hidden) {
        const currentState = wsProvider.awareness.getLocalState();
        if (currentState && currentState.isActive) {
          if (currentState.cursor) {
            wsProvider.awareness.setLocalStateField('cursor', {
              ...currentState.cursor,
              timestamp: Date.now(),
            });
          }
          wsProvider.awareness.setLocalStateField('lastActivity', Date.now());
        }
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (!wsProvider.awareness) return;
      const currentState = wsProvider.awareness.getLocalState() || {};
      if (document.hidden) {
        wsProvider.awareness.setLocalState({ ...currentState, isActive: false });
      } else {
        wsProvider.awareness.setLocalState({
          ...currentState,
          isActive: true,
          lastActivity: Date.now(),
          cursor: currentState.cursor ? { ...currentState.cursor, timestamp: Date.now() } : null,
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    wsProvider.awareness.on('change', () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const others = states
        .filter(([clientId]) => clientId !== wsProvider.awareness.clientID)
        .map(([, state]) => state as FormationAwarenessState)
        .filter((state) => state.user && state.isActive);
      setCollaborators(others);
    });

    if (initialData) {
      initializeYjsFromFormation(ydoc, initialData);
    }

    // Observe Yjs changes and sync to React state
    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);
    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
    const sets = ydoc.getArray(FORMATION_YJS_TYPES.SETS);

    const observer = () => {
      syncYjsToReact(ydoc);
      if (!documentSizeTimerRef.current) {
        documentSizeTimerRef.current = setTimeout(() => {
          documentSizeTimerRef.current = null;
          try {
            const update = Y.encodeStateAsUpdate(ydoc);
            setDocumentSize(update.byteLength);
          } catch {
            // Ignore encoding errors on destroyed docs
          }
        }, 5000);
      }
    };

    meta.observeDeep(observer);
    performers.observeDeep(observer);
    keyframes.observeDeep(observer);
    sets.observeDeep(observer);

    // Conflict detection via snapshots
    const snapshotPerformerIds = (): Set<string> => {
      const ids = new Set<string>();
      performers.forEach((_, key) => ids.add(key as string));
      return ids;
    };
    const snapshotKeyframeIds = (): Set<string> => {
      const ids = new Set<string>();
      for (let i = 0; i < keyframes.length; i++) {
        const kf = keyframes.get(i) as Y.Map<unknown>;
        const id = kf.get('id') as string;
        if (id) ids.add(id);
      }
      return ids;
    };

    let prevPerformerIds = snapshotPerformerIds();
    let prevKeyframeIds = snapshotKeyframeIds();

    const conflictCheckObserver = () => {
      const dragging = localDraggingRef.current;
      const activeKeyframe = localActiveKeyframeRef.current;

      if (!dragging && !activeKeyframe) {
        prevPerformerIds = snapshotPerformerIds();
        prevKeyframeIds = snapshotKeyframeIds();
        return;
      }

      const currentPerformerIds = snapshotPerformerIds();
      const currentKeyframeIds = snapshotKeyframeIds();

      if (dragging && prevPerformerIds.has(dragging) && !currentPerformerIds.has(dragging)) {
        addConflict(dragging, 'performer-deleted');
        localDraggingRef.current = null;
        const cs = wsProvider.awareness.getLocalState() || {};
        wsProvider.awareness.setLocalState({ ...cs, draggingPerformerId: null, lastActivity: Date.now() });
      }

      if (activeKeyframe && prevKeyframeIds.has(activeKeyframe) && !currentKeyframeIds.has(activeKeyframe)) {
        addConflict(activeKeyframe, 'keyframe-deleted');
        localActiveKeyframeRef.current = null;
        const cs = wsProvider.awareness.getLocalState() || {};
        wsProvider.awareness.setLocalState({ ...cs, activeKeyframeId: null, lastActivity: Date.now() });
      }

      prevPerformerIds = currentPerformerIds;
      prevKeyframeIds = currentKeyframeIds;
    };
    performers.observeDeep(conflictCheckObserver);
    keyframes.observeDeep(conflictCheckObserver);

    const simultaneousMoveTracker = (_update: Uint8Array, origin: unknown) => {
      const dragging = localDraggingRef.current;
      if (!dragging) return;
      const isLocal = origin === null || origin === undefined || origin === 'local';
      if (isLocal) return;
      const states = wsProvider.awareness.getStates();
      states.forEach((state, clientId) => {
        if (clientId === wsProvider.awareness.clientID) return;
        const awarenessState = state as FormationAwarenessState;
        if (awarenessState.draggingPerformerId === dragging) {
          addConflict(dragging, 'simultaneous-move', awarenessState.user?.id);
        }
      });
    };
    ydoc.on('update', simultaneousMoveTracker);

    const batcher = createBatchingManager(ydoc);
    batcherRef.current = batcher;

    const undoManager = new Y.UndoManager([performers, keyframes, sets], {
      trackedOrigins: new Set([null, undefined]),
    });
    undoManagerRef.current = undoManager;
    const updateUndoState = () => {
      setCanYUndo(undoManager.undoStack.length > 0);
      setCanYRedo(undoManager.redoStack.length > 0);
    };
    undoManager.on('stack-item-added', updateUndoState);
    undoManager.on('stack-item-popped', updateUndoState);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (documentSizeTimerRef.current) {
        clearTimeout(documentSizeTimerRef.current);
        documentSizeTimerRef.current = null;
      }

      batcher.destroy();
      batcherRef.current = null;
      undoManager.destroy();
      undoManagerRef.current = null;

      ydoc.off('update', updateTracker);
      ydoc.off('update', simultaneousMoveTracker);
      meta.unobserveDeep(observer);
      performers.unobserveDeep(observer);
      keyframes.unobserveDeep(observer);
      sets.unobserveDeep(observer);
      performers.unobserveDeep(conflictCheckObserver);
      keyframes.unobserveDeep(conflictCheckObserver);

      wsProvider.destroy();
      persistence.destroy();
      ydoc.destroy();

      docRef.current = null;
      providerRef.current = null;
      persistenceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initialData, initializeYjsFromFormation, and syncYjsToReact are stable and intentionally excluded to avoid re-connecting WebSocket on every render
  }, [enabled, projectId, formationId, user, userColor, onConnectionChange]);

  // Keep batcher collaborator count in sync for dynamic batch window
  useEffect(() => {
    batcherRef.current?.setCollaboratorCount(collaborators.length);
  }, [collaborators.length]);

  // ============================================================================
  // Return Hook Result
  // ============================================================================

  return {
    formation,
    isConnected,
    isSyncing,
    error,
    collaborators,
    hasPendingChanges,
    lastSyncedAt,
    doc: docRef.current,
    provider: providerRef.current,

    // Mutations (from useYjsMutations)
    ...mutations,
    // Set mutations (from useYjsSetMutations)
    ...setMutations,
    // Awareness (from useYjsAwareness)
    ...awareness,

    // Y.UndoManager
    undoManager: undoManagerRef.current,
    canYUndo,
    canYRedo,

    // Document size
    documentSize,

    // Conflict tracking
    conflicts,
    clearConflict,
  };
}

export default useFormationYjs;
