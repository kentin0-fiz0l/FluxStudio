/**
 * useMetMapCollaboration — React hook for Yjs-based collaborative editing.
 *
 * Creates a Y.Doc, connects via YSocketIOProvider, and provides bidirectional
 * sync between the Yjs CRDT document and MetMap's React state.
 *
 * Sprint 30: Basic 2-user sync.
 * Sprint 31: Expose doc + awareness for presence and Y.UndoManager.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { io, type Socket } from 'socket.io-client';
import { YSocketIOProvider, type ProviderStatus } from '../../services/ySocketIOProvider';
import {
  createMetMapCollaboration,
  type MetMapCollaborationAPI,
  type CollaborationStatus,
} from '../../services/metmapCollaboration';
import type { Section } from '../../contexts/metmap/types';
import { useAuth } from '@/store/slices/authSlice';
import { getWebSocketUrl } from '../../utils/apiHelpers';
import { tempoEventBus } from '../../services/formation/tempoEventBus';

// ==================== Types ====================

interface UseMetMapCollaborationOptions {
  /** Enable collaboration (default: true when songId is provided) */
  enabled?: boolean;
  /** Debounce time in ms for remote → React state sync (default: 100) */
  debounceMs?: number;
  /** Optional branch ID — routes to a branch room instead of main */
  branchId?: string | null;
}

interface UseMetMapCollaborationReturn {
  /** Current collaboration status */
  status: CollaborationStatus;
  /** Whether the Yjs document is fully synced */
  synced: boolean;
  /** Number of connected peers (including self) */
  peerCount: number;
  /** The Y.Doc instance (for Y.UndoManager binding) */
  doc: Y.Doc | null;
  /** The Awareness instance (for presence) */
  awareness: Awareness | null;
  /** Number of reconnect attempts (for connection quality UI) */
  reconnectAttempts: number;
  /** Y.UndoManager for MetMap sections (for unified undo) */
  undoManager: Y.UndoManager | null;
  /** Undo last MetMap change */
  yUndo: () => void;
  /** Redo last undone MetMap change */
  yRedo: () => void;
  /** Push local section changes to the Yjs document */
  pushSections: (sections: Section[]) => void;
  /** Push a single section update */
  pushSectionUpdate: (index: number, section: Section) => void;
  /** Push section addition */
  pushSectionAdd: (section: Section) => void;
  /** Push section removal */
  pushSectionRemove: (index: number) => void;
  /** Force reconnect (for manual retry) */
  forceReconnect: () => void;
}

// ==================== Hook ====================

export function useMetMapCollaboration(
  songId: string | undefined,
  onRemoteSectionsChange: (sections: Section[]) => void,
  options: UseMetMapCollaborationOptions = {}
): UseMetMapCollaborationReturn {
  const { enabled = true, debounceMs = 100, branchId = null } = options;
  const { token } = useAuth();

  const [status, setStatus] = useState<CollaborationStatus>('disconnected');
  const [synced, setSynced] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  const [undoMgr, setUndoMgr] = useState<Y.UndoManager | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const providerRef = useRef<YSocketIOProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const collabRef = useRef<MetMapCollaborationAPI | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect and set up collaboration
  useEffect(() => {
    if (!songId || !token || !enabled) {
      setStatus('disconnected');
      setSynced(false);
      setPeerCount(1);
      setDoc(null);
      setAwareness(null);
      setReconnectAttempts(0);
      return;
    }

    // Create Y.Doc
    const ydoc = new Y.Doc();
    docRef.current = ydoc;
    setDoc(ydoc);

    // Create Socket.IO connection to /metmap-collab namespace
    const wsUrl = getWebSocketUrl('');
    const socket = io(`${wsUrl}/metmap-collab`, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Create Yjs provider — branch rooms route separately
    const roomName = branchId ? `song:${songId}:branch:${branchId}` : `song:${songId}`;
    const provider = new YSocketIOProvider(socket, roomName, ydoc);
    providerRef.current = provider;
    setAwareness(provider.awareness);

    // Create collaboration binding
    const collab = createMetMapCollaboration(ydoc);
    collabRef.current = collab;

    // Create Y.UndoManager for the sections array
    const sectionsArray = ydoc.getArray('sections');
    const um = new Y.UndoManager([sectionsArray], {
      trackedOrigins: new Set([null, undefined]),
    });
    undoManagerRef.current = um;
    setUndoMgr(um);

    // Listen for status changes
    provider.on('status', ((providerStatus: ProviderStatus) => {
      if (providerStatus === 'synced') {
        setStatus('synced');
        setReconnectAttempts(0);
      } else if (providerStatus === 'connecting') {
        setStatus('connecting');
      } else {
        setStatus('disconnected');
      }
    }) as (...args: unknown[]) => void);

    provider.on('sync', ((isSynced: boolean) => {
      setSynced(isSynced);
    }) as (...args: unknown[]) => void);

    provider.on('connection-error', ((attempts: number) => {
      setReconnectAttempts(attempts);
    }) as (...args: unknown[]) => void);

    // Listen for peer count
    socket.on('yjs:peer-count', (data: { count: number }) => {
      setPeerCount(data.count);
    });

    // Subscribe to remote section changes (debounced)
    const unsub = collab.onSectionsChange((sections) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        onRemoteSectionsChange(sections);

        // Publish cross-tool events for Drill Writer sync
        const now = Date.now();
        sections.forEach((section, index) => {
          tempoEventBus.publish('tempo-change', {
            sectionIndex: index,
            bpm: section.tempoStart,
            sectionName: section.name,
            timestamp: now,
          });
        });

        tempoEventBus.publish('section-boundary-change', {
          boundaries: sections.map((s) => ({
            startMs: s.startBar,
            endMs: s.startBar + s.bars,
            sectionName: s.name,
          })),
          timestamp: now,
        });
      }, debounceMs);
    });
    unsubRef.current = unsub;

    setStatus('connecting');

    // Cleanup
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      um.destroy();
      unsub();
      collab.destroy();
      provider.destroy();
      socket.disconnect();
      ydoc.destroy();

      docRef.current = null;
      socketRef.current = null;
      providerRef.current = null;
      collabRef.current = null;
      unsubRef.current = null;
      undoManagerRef.current = null;

      setStatus('disconnected');
      setSynced(false);
      setPeerCount(1);
      setDoc(null);
      setAwareness(null);
      setUndoMgr(null);
      setReconnectAttempts(0);
    };
  }, [songId, token, enabled, debounceMs, branchId, onRemoteSectionsChange]);

  // Push all sections to Yjs doc
  const pushSections = useCallback((sections: Section[]) => {
    collabRef.current?.setSections(sections);
  }, []);

  // Push single section update
  const pushSectionUpdate = useCallback((index: number, section: Section) => {
    collabRef.current?.updateSection(index, section);
  }, []);

  // Push section addition
  const pushSectionAdd = useCallback((section: Section) => {
    collabRef.current?.addSection(section);
  }, []);

  // Push section removal
  const pushSectionRemove = useCallback((index: number) => {
    collabRef.current?.removeSection(index);
  }, []);

  // Force reconnect
  const forceReconnect = useCallback(() => {
    providerRef.current?.forceReconnect();
  }, []);

  // Y.UndoManager undo/redo
  const yUndo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, []);

  const yRedo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, []);

  return {
    status,
    synced,
    peerCount,
    doc,
    awareness,
    reconnectAttempts,
    undoManager: undoMgr,
    yUndo,
    yRedo,
    pushSections,
    pushSectionUpdate,
    pushSectionAdd,
    pushSectionRemove,
    forceReconnect,
  };
}
