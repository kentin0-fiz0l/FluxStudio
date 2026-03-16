/**
 * useCollaborativeDocument Hook
 *
 * Provides Tiptap + Yjs collaborative rich text editing.
 * Creates a Y.Doc with Y.XmlFragment for rich text content,
 * and returns Tiptap extensions for Collaboration and CollaborationCursor.
 *
 * Gated behind 'yjs-documents' feature flag.
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { FEATURE_FLAGS } from '@/constants/featureFlags';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type { Extension } from '@tiptap/react';
import { useAuth } from '@/store/slices/authSlice';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { getUserColor } from '@/services/formation/yjs/formationYjsTypes';

// ============================================================================
// Types
// ============================================================================

export interface CollaborativeDocumentUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface UseCollaborativeDocumentOptions {
  /** Unique document ID */
  documentId: string;
  /** Project ID for room naming and auth */
  projectId: string;
  /** Enable collaborative editing */
  enabled?: boolean;
  /** Fragment name within the Y.Doc (default: 'content') */
  fragmentName?: string;
}

export interface UseCollaborativeDocumentResult {
  ydoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  extensions: Extension[];
  isConnected: boolean;
  activeUsers: CollaborativeDocumentUser[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCollaborativeDocument({
  documentId,
  projectId,
  enabled = true,
  fragmentName = 'content',
}: UseCollaborativeDocumentOptions): UseCollaborativeDocumentResult | null {
  const isFeatureEnabled = useFeatureFlag(FEATURE_FLAGS.YJS_DOCUMENTS);
  const { user } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<CollaborativeDocumentUser[]>([]);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  const userColor = useMemo(() => getUserColor(user?.id || 'anonymous'), [user?.id]);

  useEffect(() => {
    if (!isFeatureEnabled || !enabled || !documentId || !projectId) return;

    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    const roomName = `project-${projectId}-doc-${documentId}`;

    // Setup WebSocket provider
    const wsUrl = import.meta.env.VITE_COLLAB_URL ||
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
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
      setIsConnected(status === 'connected');
    });

    // Set awareness state
    if (user) {
      wsProvider.awareness.setLocalState({
        user: {
          id: user.id,
          name: user.name || user.email || 'Anonymous',
          color: userColor,
          avatar: user.avatar,
        },
        isActive: true,
        lastActivity: Date.now(),
      });
    }

    // Track active users
    wsProvider.awareness.on('change', () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const users: CollaborativeDocumentUser[] = states
        .filter(([clientId]) => clientId !== wsProvider.awareness.clientID)
        .map(([, state]) => {
          const s = state as { user?: CollaborativeDocumentUser };
          return s.user as CollaborativeDocumentUser;
        })
        .filter(Boolean);
      setActiveUsers(users);
    });

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (user && wsProvider.awareness && !document.hidden) {
        wsProvider.awareness.setLocalStateField('lastActivity', Date.now());
      }
    }, 5000);

    // Visibility change
    const handleVisibilityChange = () => {
      if (!wsProvider.awareness) return;
      const currentState = wsProvider.awareness.getLocalState() || {};
      wsProvider.awareness.setLocalState({
        ...currentState,
        isActive: !document.hidden,
        lastActivity: Date.now(),
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wsProvider.destroy();
      persistence.destroy();
      ydoc.destroy();
      docRef.current = null;
      providerRef.current = null;
      persistenceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFeatureEnabled, enabled, documentId, projectId, user, userColor]);

  // Build Tiptap extensions
  const extensions = useMemo((): Extension[] => {
    const ydoc = docRef.current;
    const provider = providerRef.current;
    if (!ydoc || !provider || !isFeatureEnabled) return [];

    return [
      Collaboration.configure({
        document: ydoc,
        field: fragmentName,
      }) as Extension,
      CollaborationCursor.configure({
        provider,
        user: {
          name: user?.name || user?.email || 'Anonymous',
          color: userColor,
        },
      }) as Extension,
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRef.current, providerRef.current, isFeatureEnabled, fragmentName, user, userColor]);

  if (!isFeatureEnabled) {
    return null;
  }

  return {
    ydoc: docRef.current,
    provider: providerRef.current,
    extensions,
    isConnected,
    activeUsers,
  };
}

export default useCollaborativeDocument;
