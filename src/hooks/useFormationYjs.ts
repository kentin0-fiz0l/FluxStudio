/**
 * useFormationYjs Hook
 *
 * Provides real-time collaborative editing for formations using Yjs CRDTs.
 * Handles WebSocket connection, state synchronization, and mutation functions.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useAuth } from '@/contexts/AuthContext';
import {
  Formation,
  Performer,
  Keyframe,
  Position,
  AudioTrack,
  TransitionType,
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
  performerToYMapEntries,
  keyframeToYMapEntries,
  YjsPosition,
} from '@/services/formation/yjs/formationYjsTypes';

// ============================================================================
// Types
// ============================================================================

export interface UseFormationYjsOptions {
  /** Project ID containing the formation */
  projectId: string;
  /** Formation ID to collaborate on */
  formationId: string;
  /** Enable collaborative editing */
  enabled?: boolean;
  /** Initial formation data (for new formations) */
  initialData?: Formation;
  /** Callback when formation changes */
  onUpdate?: (formation: Formation) => void;
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void;
}

export interface UseFormationYjsResult {
  /** Current formation state */
  formation: Formation | null;
  /** Is connected to collaboration server */
  isConnected: boolean;
  /** Is syncing initial state */
  isSyncing: boolean;
  /** Connection error if any */
  error: string | null;
  /** Other collaborators in the session */
  collaborators: FormationAwarenessState[];
  /** Has pending local changes waiting to sync */
  hasPendingChanges: boolean;
  /** Timestamp of last successful sync (null if never synced) */
  lastSyncedAt: number | null;
  /** Yjs document instance */
  doc: Y.Doc | null;
  /** WebSocket provider */
  provider: WebsocketProvider | null;

  // Mutation functions
  /** Update formation metadata */
  updateMeta: (updates: Partial<Pick<Formation, 'name' | 'description' | 'stageWidth' | 'stageHeight' | 'gridSize'>>) => void;
  /** Add a new performer */
  addPerformer: (performer: Omit<Performer, 'id'>, initialPosition?: Position) => Performer;
  /** Update performer properties */
  updatePerformer: (performerId: string, updates: Partial<Omit<Performer, 'id'>>) => void;
  /** Remove a performer */
  removePerformer: (performerId: string) => void;
  /** Add a new keyframe */
  addKeyframe: (timestamp: number, positions?: Map<string, Position>) => Keyframe;
  /** Update keyframe properties */
  updateKeyframe: (keyframeId: string, updates: Partial<Omit<Keyframe, 'id' | 'positions'>>) => void;
  /** Remove a keyframe */
  removeKeyframe: (keyframeId: string) => void;
  /** Update a position in a keyframe */
  updatePosition: (keyframeId: string, performerId: string, position: Position) => void;
  /** Update multiple positions at once (batched) */
  updatePositions: (keyframeId: string, positions: Map<string, Position>) => void;
  /** Set audio track */
  setAudioTrack: (audioTrack: AudioTrack | null) => void;

  // Awareness functions
  /** Update local cursor position */
  updateCursor: (x: number, y: number) => void;
  /** Clear local cursor */
  clearCursor: () => void;
  /** Update selected performers */
  setSelectedPerformers: (performerIds: string[]) => void;
  /** Set performer being dragged */
  setDraggingPerformer: (performerId: string | null) => void;
  /** Check if another user is dragging a performer */
  isPerformerBeingDragged: (performerId: string) => { dragging: boolean; by?: FormationAwarenessState };

  // Y.UndoManager (per-user undo/redo in collaborative mode)
  /** Undo last local change */
  yUndo: () => void;
  /** Redo last undone local change */
  yRedo: () => void;
  /** Whether collaborative undo is available */
  canYUndo: boolean;
  /** Whether collaborative redo is available */
  canYRedo: boolean;
}

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

  // Refs for Yjs instances
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  // Ref to track syncing state (avoids stale closure in persistence callback)
  const isSyncingRef = useRef(true);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const [canYUndo, setCanYUndo] = useState(false);
  const [canYRedo, setCanYRedo] = useState(false);

  // User awareness state
  const userColor = useMemo(() => getUserColor(user?.id || 'anonymous'), [user?.id]);

  // ============================================================================
  // Initialize Yjs Document
  // ============================================================================

  useEffect(() => {
    if (!enabled || !formationId || !projectId) return;

    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    // Get room name
    const roomName = getFormationRoomName(projectId, formationId);

    // Setup WebSocket provider
    const wsUrl = import.meta.env.VITE_COLLAB_URL || 'ws://localhost:4000';
    const token = localStorage.getItem('auth_token') || '';

    const wsProvider = new WebsocketProvider(wsUrl, roomName, ydoc, {
      params: { token },
    });
    providerRef.current = wsProvider;

    // Setup IndexedDB persistence for offline support
    const persistence = new IndexeddbPersistence(roomName, ydoc);
    persistenceRef.current = persistence;

    // Track connection status
    wsProvider.on('status', ({ status }: { status: string }) => {
      const connected = status === 'connected';
      setIsConnected(connected);
      onConnectionChange?.(connected);

      if (connected) {
        setError(null);
      }
    });

    // Track sync completion
    wsProvider.on('sync', (synced: boolean) => {
      if (synced) {
        isSyncingRef.current = false; // Update ref for persistence callback
        setIsSyncing(false);
        setHasPendingChanges(false);
        setLastSyncedAt(Date.now());
        // Sync initial state to React
        syncYjsToReact(ydoc);
      }
    });

    // Track local document updates for pending changes indicator
    const updateTracker = (_update: Uint8Array, origin: unknown) => {
      // If the update originated locally (not from remote), mark as pending
      if (origin === null || origin === undefined || origin === 'local') {
        setHasPendingChanges(true);
      } else {
        // Remote update received and applied means we're synced
        // Use providerRef to check connection status (avoids stale closure)
        if (providerRef.current?.wsconnected) {
          setHasPendingChanges(false);
          setLastSyncedAt(Date.now());
        }
      }
    };
    ydoc.on('update', updateTracker);

    // Also sync when IndexedDB is loaded (for offline support)
    persistence.on('synced', () => {
      // If WebSocket hasn't synced yet, use local data
      // Use ref to avoid stale closure issue
      if (isSyncingRef.current) {
        syncYjsToReact(ydoc);
      }
    });

    // Handle errors
    wsProvider.on('connection-error', (event: Event) => {
      console.error('Formation collaboration connection error:', event);
      setError('Failed to connect to collaboration server');
    });

    // Set initial awareness state with ALL fields to ensure proper sync
    if (user) {
      // Use setLocalState to set all fields atomically for proper broadcast
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

    // Periodic heartbeat to prevent cursor staleness while user is active
    // Refreshes lastActivity every 5 seconds to keep presence visible
    const heartbeatInterval = setInterval(() => {
      if (user && wsProvider.awareness && !document.hidden) {
        const currentState = wsProvider.awareness.getLocalState();
        if (currentState && currentState.isActive) {
          // Only refresh if there's a cursor (user is actively viewing)
          if (currentState.cursor) {
            wsProvider.awareness.setLocalStateField('cursor', {
              ...currentState.cursor,
              timestamp: Date.now(),
            });
          }
          wsProvider.awareness.setLocalStateField('lastActivity', Date.now());
        }
      }
    }, 5000); // 5 second heartbeat

    // Handle visibility change to manage presence when user switches tabs
    const handleVisibilityChange = () => {
      if (!wsProvider.awareness) return;

      const currentState = wsProvider.awareness.getLocalState() || {};
      if (document.hidden) {
        // User switched away - mark as inactive but keep cursor
        wsProvider.awareness.setLocalState({
          ...currentState,
          isActive: false,
        });
      } else {
        // User returned - mark as active and refresh timestamp
        wsProvider.awareness.setLocalState({
          ...currentState,
          isActive: true,
          lastActivity: Date.now(),
          cursor: currentState.cursor ? {
            ...currentState.cursor,
            timestamp: Date.now(),
          } : null,
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track other collaborators
    wsProvider.awareness.on('change', () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const others = states
        .filter(([clientId]) => clientId !== wsProvider.awareness.clientID)
        .map(([, state]) => state as FormationAwarenessState)
        .filter((state) => state.user && state.isActive);
      setCollaborators(others);
    });

    // Initialize document with initial data if provided and document is empty
    if (initialData) {
      initializeYjsFromFormation(ydoc, initialData);
    }

    // Observe Yjs changes and sync to React state
    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);
    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    const observer = () => {
      syncYjsToReact(ydoc);
    };

    meta.observeDeep(observer);
    performers.observeDeep(observer);
    keyframes.observeDeep(observer);

    // Setup Y.UndoManager for per-user undo/redo
    const undoManager = new Y.UndoManager([performers, keyframes], {
      trackedOrigins: new Set([null, undefined]),
    });
    undoManagerRef.current = undoManager;
    const updateUndoState = () => {
      setCanYUndo(undoManager.undoStack.length > 0);
      setCanYRedo(undoManager.redoStack.length > 0);
    };
    undoManager.on('stack-item-added', updateUndoState);
    undoManager.on('stack-item-popped', updateUndoState);

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      undoManager.destroy();
      undoManagerRef.current = null;

      ydoc.off('update', updateTracker);
      meta.unobserveDeep(observer);
      performers.unobserveDeep(observer);
      keyframes.unobserveDeep(observer);

      wsProvider.destroy();
      persistence.destroy();
      ydoc.destroy();

      docRef.current = null;
      providerRef.current = null;
      persistenceRef.current = null;
    };
  }, [enabled, projectId, formationId, user, userColor, onConnectionChange]);

  // ============================================================================
  // Sync Yjs to React State
  // ============================================================================

  const syncYjsToReact = useCallback((ydoc: Y.Doc) => {
    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);
    const performersMap = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframesArray = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    // Check if document has data
    if (!meta.get('id')) return;

    // Convert performers
    const performers: Performer[] = [];
    performersMap.forEach((yPerformer) => {
      performers.push(yMapToPerformer(yPerformer as Y.Map<unknown>));
    });

    // Convert keyframes
    const keyframes: Keyframe[] = [];
    keyframesArray.forEach((yKeyframe) => {
      keyframes.push(yMapToKeyframe(yKeyframe as Y.Map<unknown>));
    });

    // Sort keyframes by timestamp
    keyframes.sort((a, b) => a.timestamp - b.timestamp);

    // Build formation object
    const formationMeta = yMapToFormationMeta(meta);
    const audioTrackMap = meta.get(FORMATION_YJS_TYPES.AUDIO) as Y.Map<unknown> | undefined;

    const newFormation: Formation = {
      ...formationMeta,
      performers,
      keyframes,
      audioTrack: yMapToAudioTrack(audioTrackMap),
      // Provide defaults for required fields
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

      // Only initialize if empty
      if (meta.get('id')) return;

      // Set metadata
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

      // Set audio track
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

      // Add performers
      data.performers.forEach((performer) => {
        const yPerformer = new Y.Map();
        performerToYMapEntries(performer).forEach(([key, value]) => {
          yPerformer.set(key, value);
        });
        performers.set(performer.id, yPerformer);
      });

      // Add keyframes
      data.keyframes.forEach((keyframe) => {
        const yKeyframe = new Y.Map();
        keyframeToYMapEntries(keyframe).forEach(([key, value]) => {
          yKeyframe.set(key, value);
        });

        // Add positions as nested Y.Map
        const yPositions = new Y.Map();
        keyframe.positions.forEach((pos, performerId) => {
          yPositions.set(performerId, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
        });
        yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);

        keyframes.push([yKeyframe]);
      });
    });
  }, []);

  // ============================================================================
  // Mutation Functions
  // ============================================================================

  const updateMeta = useCallback((updates: Partial<Pick<Formation, 'name' | 'description' | 'stageWidth' | 'stageHeight' | 'gridSize'>>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);

    ydoc.transact(() => {
      if (updates.name !== undefined) meta.set('name', updates.name);
      if (updates.description !== undefined) meta.set('description', updates.description);
      if (updates.stageWidth !== undefined) meta.set('stageWidth', updates.stageWidth);
      if (updates.stageHeight !== undefined) meta.set('stageHeight', updates.stageHeight);
      if (updates.gridSize !== undefined) meta.set('gridSize', updates.gridSize);
      meta.set('updatedAt', new Date().toISOString());
    });
  }, []);

  const addPerformer = useCallback((performerData: Omit<Performer, 'id'>, initialPosition?: Position): Performer => {
    const ydoc = docRef.current;
    if (!ydoc) throw new Error('Yjs document not initialized');

    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    const performer: Performer = {
      ...performerData,
      id: `performer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    ydoc.transact(() => {
      // Add performer
      const yPerformer = new Y.Map();
      performerToYMapEntries(performer).forEach(([key, value]) => {
        yPerformer.set(key, value);
      });
      performers.set(performer.id, yPerformer);

      // Add initial position to first keyframe (or all keyframes)
      if (initialPosition && keyframes.length > 0) {
        const yKeyframe = keyframes.get(0) as Y.Map<unknown>;
        const positions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
        if (positions) {
          positions.set(performer.id, {
            x: initialPosition.x,
            y: initialPosition.y,
            rotation: initialPosition.rotation ?? 0,
          });
        }
      }
    });

    return performer;
  }, []);

  const updatePerformer = useCallback((performerId: string, updates: Partial<Omit<Performer, 'id'>>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const yPerformer = performers.get(performerId) as Y.Map<unknown> | undefined;
    if (!yPerformer) return;

    ydoc.transact(() => {
      if (updates.name !== undefined) yPerformer.set('name', updates.name);
      if (updates.label !== undefined) yPerformer.set('label', updates.label);
      if (updates.color !== undefined) yPerformer.set('color', updates.color);
      if (updates.group !== undefined) yPerformer.set('group', updates.group);
    });
  }, []);

  const removePerformer = useCallback((performerId: string) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);
    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      // Remove performer
      performers.delete(performerId);

      // Remove from all keyframe positions
      keyframes.forEach((yKeyframe) => {
        const positions = (yKeyframe as Y.Map<unknown>).get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
        if (positions) {
          positions.delete(performerId);
        }
      });
    });
  }, []);

  const addKeyframe = useCallback((timestamp: number, positions?: Map<string, Position>): Keyframe => {
    const ydoc = docRef.current;
    if (!ydoc) throw new Error('Yjs document not initialized');

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
    const performers = ydoc.getMap(FORMATION_YJS_TYPES.PERFORMERS);

    const keyframe: Keyframe = {
      id: `keyframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      transition: 'linear' as TransitionType,
      duration: 500,
      positions: positions || new Map(),
    };

    ydoc.transact(() => {
      const yKeyframe = new Y.Map();
      keyframeToYMapEntries(keyframe).forEach(([key, value]) => {
        yKeyframe.set(key, value);
      });

      // Create positions map
      const yPositions = new Y.Map();

      if (positions) {
        // Use provided positions
        positions.forEach((pos, performerId) => {
          yPositions.set(performerId, { x: pos.x, y: pos.y, rotation: pos.rotation ?? 0 });
        });
      } else {
        // Initialize all performers at center
        performers.forEach((_, performerId) => {
          yPositions.set(performerId as string, { x: 50, y: 50, rotation: 0 });
        });
      }

      yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);

      // Insert at correct position based on timestamp
      let insertIndex = keyframes.length;
      for (let i = 0; i < keyframes.length; i++) {
        const kf = keyframes.get(i) as Y.Map<unknown>;
        if ((kf.get('timestamp') as number) > timestamp) {
          insertIndex = i;
          break;
        }
      }

      keyframes.insert(insertIndex, [yKeyframe]);
    });

    return keyframe;
  }, []);

  const updateKeyframe = useCallback((keyframeId: string, updates: Partial<Omit<Keyframe, 'id' | 'positions'>>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          if (updates.timestamp !== undefined) yKeyframe.set('timestamp', updates.timestamp);
          if (updates.transition !== undefined) yKeyframe.set('transition', updates.transition);
          if (updates.duration !== undefined) yKeyframe.set('duration', updates.duration);
          break;
        }
      }
    });
  }, []);

  const removeKeyframe = useCallback((keyframeId: string) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          keyframes.delete(i, 1);
          break;
        }
      }
    });
  }, []);

  const updatePosition = useCallback((keyframeId: string, performerId: string, position: Position) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    // Wrap in transaction for consistency with updatePositions
    ydoc.transact(() => {
      // Find the keyframe
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          const positions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
          if (positions) {
            positions.set(performerId, {
              x: position.x,
              y: position.y,
              rotation: position.rotation ?? 0,
            });
          }
          break;
        }
      }
    });
  }, []);

  const updatePositions = useCallback((keyframeId: string, positions: Map<string, Position>) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const keyframes = ydoc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    ydoc.transact(() => {
      for (let i = 0; i < keyframes.length; i++) {
        const yKeyframe = keyframes.get(i) as Y.Map<unknown>;
        if (yKeyframe.get('id') === keyframeId) {
          const yPositions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS) as Y.Map<YjsPosition>;
          if (yPositions) {
            positions.forEach((pos, performerId) => {
              yPositions.set(performerId, {
                x: pos.x,
                y: pos.y,
                rotation: pos.rotation ?? 0,
              });
            });
          }
          break;
        }
      }
    });
  }, []);

  const setAudioTrack = useCallback((audioTrack: AudioTrack | null) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const meta = ydoc.getMap(FORMATION_YJS_TYPES.META);

    ydoc.transact(() => {
      if (audioTrack) {
        const audioMap = new Y.Map();
        audioMap.set('id', audioTrack.id);
        audioMap.set('url', audioTrack.url);
        audioMap.set('filename', audioTrack.filename);
        audioMap.set('duration', audioTrack.duration);
        if (audioTrack.waveformData) {
          audioMap.set('waveformData', audioTrack.waveformData);
        }
        meta.set(FORMATION_YJS_TYPES.AUDIO, audioMap);
      } else {
        meta.delete(FORMATION_YJS_TYPES.AUDIO);
      }
      meta.set('updatedAt', new Date().toISOString());
    });
  }, []);

  // ============================================================================
  // Awareness Functions
  // ============================================================================

  // Refs for cursor throttling (50ms interval per UX spec)
  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  // Cleanup cursor throttle timer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current !== null) {
        clearTimeout(cursorThrottleRef.current);
        cursorThrottleRef.current = null;
      }
    };
  }, []);

  const updateCursor = useCallback((x: number, y: number) => {
    const provider = providerRef.current;
    if (!provider) return;

    // Store pending position
    pendingCursorRef.current = { x, y };

    // If throttle timer is active, let it handle the update
    if (cursorThrottleRef.current !== null) return;

    // Send immediately for first update
    provider.awareness.setLocalStateField('cursor', {
      x,
      y,
      timestamp: Date.now(),
    });
    provider.awareness.setLocalStateField('lastActivity', Date.now());

    // Set up throttle for subsequent updates (50ms)
    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
      if (pendingCursorRef.current) {
        const pending = pendingCursorRef.current;
        provider.awareness.setLocalStateField('cursor', {
          x: pending.x,
          y: pending.y,
          timestamp: Date.now(),
        });
      }
    }, 50);
  }, []);

  const clearCursor = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('cursor', null);
  }, []);

  const setSelectedPerformers = useCallback((performerIds: string[]) => {
    const provider = providerRef.current;
    if (!provider) return;

    // Get current state and update atomically to ensure proper broadcast
    const currentState = provider.awareness.getLocalState() || {};
    provider.awareness.setLocalState({
      ...currentState,
      selectedPerformerIds: performerIds,
      lastActivity: Date.now(),
    });
  }, []);

  const setDraggingPerformer = useCallback((performerId: string | null) => {
    const provider = providerRef.current;
    if (!provider) return;

    // Use atomic state update for proper broadcast
    const currentState = provider.awareness.getLocalState() || {};
    provider.awareness.setLocalState({
      ...currentState,
      draggingPerformerId: performerId,
      lastActivity: Date.now(),
    });
  }, []);

  const isPerformerBeingDragged = useCallback((performerId: string): { dragging: boolean; by?: FormationAwarenessState } => {
    const other = collaborators.find((c) => c.draggingPerformerId === performerId);
    return {
      dragging: !!other,
      by: other,
    };
  }, [collaborators]);

  // ============================================================================
  // Y.UndoManager Functions
  // ============================================================================

  const yUndo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, []);

  const yRedo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, []);

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

    // Mutations
    updateMeta,
    addPerformer,
    updatePerformer,
    removePerformer,
    addKeyframe,
    updateKeyframe,
    removeKeyframe,
    updatePosition,
    updatePositions,
    setAudioTrack,

    // Awareness
    updateCursor,
    clearCursor,
    setSelectedPerformers,
    setDraggingPerformer,
    isPerformerBeingDragged,

    // Y.UndoManager
    yUndo,
    yRedo,
    canYUndo,
    canYRedo,
  };
}

export default useFormationYjs;
