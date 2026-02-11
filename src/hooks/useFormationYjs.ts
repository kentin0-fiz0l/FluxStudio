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

  // Refs for Yjs instances
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  // User awareness state
  const userColor = useMemo(() => getUserColor(user?.id || 'anonymous'), [user?.id]);

  // ============================================================================
  // Initialize Yjs Document
  // ============================================================================

  useEffect(() => {
    console.log('[useFormationYjs] Hook called with:', {
      enabled,
      formationId,
      projectId,
      hasUser: !!user,
    });

    if (!enabled || !formationId || !projectId) {
      console.log('[useFormationYjs] Skipping - missing required params:', {
        enabled,
        hasFormationId: !!formationId,
        hasProjectId: !!projectId,
      });
      return;
    }

    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    // Get room name
    const roomName = getFormationRoomName(projectId, formationId);
    console.log('[useFormationYjs] Room name:', roomName);

    // Setup WebSocket provider
    const wsUrl = import.meta.env.VITE_COLLAB_URL || 'ws://localhost:4000';
    const token = localStorage.getItem('auth_token') || '';
    console.log('[useFormationYjs] Connecting to:', wsUrl, 'with token length:', token.length);

    const wsProvider = new WebsocketProvider(wsUrl, roomName, ydoc, {
      params: { token },
    });
    providerRef.current = wsProvider;

    // Setup IndexedDB persistence for offline support
    const persistence = new IndexeddbPersistence(roomName, ydoc);
    persistenceRef.current = persistence;

    // Track connection status
    wsProvider.on('status', ({ status }: { status: string }) => {
      console.log('[useFormationYjs] WebSocket status:', status);
      const connected = status === 'connected';
      setIsConnected(connected);
      onConnectionChange?.(connected);

      if (connected) {
        setError(null);
      }
    });

    // Track sync completion
    wsProvider.on('sync', (synced: boolean) => {
      console.log('[useFormationYjs] Sync event:', synced);
      if (synced) {
        setIsSyncing(false);
        // Sync initial state to React
        console.log('[useFormationYjs] Calling syncYjsToReact after sync');
        syncYjsToReact(ydoc);
      }
    });

    // Also sync when IndexedDB is loaded (for offline support)
    persistence.on('synced', () => {
      // If WebSocket hasn't synced yet, use local data
      if (isSyncing) {
        syncYjsToReact(ydoc);
      }
    });

    // Handle errors
    wsProvider.on('connection-error', (event: Event) => {
      console.error('[useFormationYjs] Connection error:', event);
      setError('Failed to connect to collaboration server');
    });

    wsProvider.on('connection-close', (event: CloseEvent) => {
      console.error('[useFormationYjs] Connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    });

    // Set initial awareness state
    if (user) {
      wsProvider.awareness.setLocalStateField('user', {
        id: user.id,
        name: user.name,
        color: userColor,
        avatar: user.avatar,
      });
      wsProvider.awareness.setLocalStateField('isActive', true);
      wsProvider.awareness.setLocalStateField('lastActivity', Date.now());
    }

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

    // Cleanup
    return () => {
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

    console.log('[useFormationYjs] syncYjsToReact called:', {
      metaSize: meta.size,
      metaId: meta.get('id'),
      performersSize: performersMap.size,
      keyframesLength: keyframesArray.length,
    });

    // Check if document has data
    if (!meta.get('id')) {
      console.log('[useFormationYjs] No meta.id, skipping sync');
      return;
    }

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

  const updateCursor = useCallback((x: number, y: number) => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('cursor', {
      x,
      y,
      timestamp: Date.now(),
    });
    provider.awareness.setLocalStateField('lastActivity', Date.now());
  }, []);

  const clearCursor = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('cursor', null);
  }, []);

  const setSelectedPerformers = useCallback((performerIds: string[]) => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('selectedPerformerIds', performerIds);
    provider.awareness.setLocalStateField('lastActivity', Date.now());
  }, []);

  const setDraggingPerformer = useCallback((performerId: string | null) => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('draggingPerformerId', performerId);
    provider.awareness.setLocalStateField('lastActivity', Date.now());
  }, []);

  const isPerformerBeingDragged = useCallback((performerId: string): { dragging: boolean; by?: FormationAwarenessState } => {
    const other = collaborators.find((c) => c.draggingPerformerId === performerId);
    return {
      dragging: !!other,
      by: other,
    };
  }, [collaborators]);

  // ============================================================================
  // Return Hook Result
  // ============================================================================

  return {
    formation,
    isConnected,
    isSyncing,
    error,
    collaborators,
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
  };
}

export default useFormationYjs;
