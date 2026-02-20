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
import { YSocketIOProvider, type ProviderStatus } from '../services/ySocketIOProvider';
import {
  createMetMapCollaboration,
  type MetMapCollaborationAPI,
  type CollaborationStatus,
} from '../services/metmapCollaboration';
import type { Section } from '../contexts/metmap/types';
import { useAuth } from '../contexts/AuthContext';
import { getWebSocketUrl } from '../utils/apiHelpers';

// ==================== Types ====================

interface UseMetMapCollaborationOptions {
  /** Enable collaboration (default: true when songId is provided) */
  enabled?: boolean;
  /** Debounce time in ms for remote → React state sync (default: 100) */
  debounceMs?: number;
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
  const { enabled = true, debounceMs = 100 } = options;
  const { token } = useAuth();

  const [status, setStatus] = useState<CollaborationStatus>('disconnected');
  const [synced, setSynced] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const providerRef = useRef<YSocketIOProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const collabRef = useRef<MetMapCollaborationAPI | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
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

    // Create Yjs provider
    const roomName = `song:${songId}`;
    const provider = new YSocketIOProvider(socket, roomName, ydoc);
    providerRef.current = provider;
    setAwareness(provider.awareness);

    // Create collaboration binding
    const collab = createMetMapCollaboration(ydoc);
    collabRef.current = collab;

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
      }, debounceMs);
    });
    unsubRef.current = unsub;

    setStatus('connecting');

    // Cleanup
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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

      setStatus('disconnected');
      setSynced(false);
      setPeerCount(1);
      setDoc(null);
      setAwareness(null);
      setReconnectAttempts(0);
    };
  }, [songId, token, enabled, debounceMs, onRemoteSectionsChange]);

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

  return {
    status,
    synced,
    peerCount,
    doc,
    awareness,
    reconnectAttempts,
    pushSections,
    pushSectionUpdate,
    pushSectionAdd,
    pushSectionRemove,
    forceReconnect,
  };
}
