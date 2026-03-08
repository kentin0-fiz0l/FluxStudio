/**
 * useMessagingYjs Hook
 *
 * Provides real-time collaborative messaging using Yjs CRDTs.
 * Handles WebSocket connection, message synchronization, and typing indicators.
 *
 * Gated behind 'yjs-messaging' feature flag - returns null when disabled
 * to allow fallback to Socket.IO-based messaging.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useAuth } from '@/store/slices/authSlice';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { getUserColor } from '@/services/formation/yjs/formationYjsTypes';
import type { ConversationMessage } from '@/services/messagingSocketService';

// ============================================================================
// Types
// ============================================================================

/** Yjs shared type names for messaging */
const MESSAGING_YJS_TYPES = {
  MESSAGES: 'messaging:messages',
  META: 'messaging:meta',
} as const;

/** Awareness state for messaging presence */
export interface MessagingAwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
  };
  isTyping: boolean;
  isActive: boolean;
  lastActivity: number;
}

export interface UseMessagingYjsOptions {
  conversationId: string;
  enabled?: boolean;
}

export interface UseMessagingYjsResult {
  messages: ConversationMessage[];
  sendMessage: (text: string, options?: { replyToMessageId?: string; assetId?: string }) => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;
  isConnected: boolean;
  awarenessStates: MessagingAwarenessState[];
}

// ============================================================================
// Helpers
// ============================================================================

function getMessagingRoomName(conversationId: string): string {
  return `messaging-${conversationId}`;
}

function yMapToMessage(yMap: Y.Map<unknown>): ConversationMessage {
  return {
    id: yMap.get('id') as string,
    conversationId: yMap.get('conversationId') as string,
    authorId: yMap.get('authorId') as string | undefined,
    userId: yMap.get('userId') as string | undefined,
    content: yMap.get('content') as string | undefined,
    text: yMap.get('text') as string | undefined,
    replyToMessageId: yMap.get('replyToMessageId') as string | undefined,
    assetId: yMap.get('assetId') as string | undefined,
    isSystemMessage: (yMap.get('isSystemMessage') as boolean) ?? false,
    createdAt: yMap.get('createdAt') as string,
    updatedAt: yMap.get('updatedAt') as string | undefined,
    editedAt: yMap.get('editedAt') as string | undefined,
    userName: yMap.get('userName') as string | undefined,
    userAvatar: yMap.get('userAvatar') as string | undefined,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMessagingYjs({
  conversationId,
  enabled = true,
}: UseMessagingYjsOptions): UseMessagingYjsResult | null {
  const isFeatureEnabled = useFeatureFlag('yjs-messaging');
  const { user } = useAuth();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [awarenessStates, setAwarenessStates] = useState<MessagingAwarenessState[]>([]);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  // Sync Y.Array to React state
  const syncMessagesToReact = useCallback((ydoc: Y.Doc) => {
    const messagesArray = ydoc.getArray(MESSAGING_YJS_TYPES.MESSAGES);
    const msgs: ConversationMessage[] = [];
    messagesArray.forEach((yMsg) => {
      msgs.push(yMapToMessage(yMsg as Y.Map<unknown>));
    });
    // Sort by createdAt
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    setMessages(msgs);
  }, []);

  useEffect(() => {
    if (!isFeatureEnabled || !enabled || !conversationId) return;

    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    const roomName = getMessagingRoomName(conversationId);

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

    // Track sync completion
    wsProvider.on('sync', (synced: boolean) => {
      if (synced) {
        syncMessagesToReact(ydoc);
      }
    });

    // Also sync when IndexedDB is loaded (offline support)
    persistence.on('synced', () => {
      syncMessagesToReact(ydoc);
    });

    // Set initial awareness state
    if (user) {
      wsProvider.awareness.setLocalState({
        user: {
          id: user.id,
          name: user.name || user.email,
          color: getUserColor(user.id),
          avatar: user.avatar,
        },
        isTyping: false,
        isActive: true,
        lastActivity: Date.now(),
      });
    }

    // Heartbeat for presence (5s interval)
    const heartbeatInterval = setInterval(() => {
      if (user && wsProvider.awareness && !document.hidden) {
        wsProvider.awareness.setLocalStateField('lastActivity', Date.now());
      }
    }, 5000);

    // Handle visibility changes
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

    // Track other users' awareness
    wsProvider.awareness.on('change', () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      const others = states
        .filter(([clientId]) => clientId !== wsProvider.awareness.clientID)
        .map(([, state]) => state as MessagingAwarenessState)
        .filter((state) => state.user && state.isActive);
      setAwarenessStates(others);
    });

    // Observe Y.Array changes
    const messagesArray = ydoc.getArray(MESSAGING_YJS_TYPES.MESSAGES);
    const observer = () => {
      syncMessagesToReact(ydoc);
    };
    messagesArray.observeDeep(observer);

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      messagesArray.unobserveDeep(observer);
      wsProvider.destroy();
      persistence.destroy();
      ydoc.destroy();
      docRef.current = null;
      providerRef.current = null;
      persistenceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFeatureEnabled, enabled, conversationId, user]);

  // ============================================================================
  // Mutation Functions
  // ============================================================================

  const sendMessage = useCallback((
    text: string,
    options?: { replyToMessageId?: string; assetId?: string },
  ) => {
    const ydoc = docRef.current;
    if (!ydoc || !user) return;

    const messagesArray = ydoc.getArray(MESSAGING_YJS_TYPES.MESSAGES);
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    ydoc.transact(() => {
      const yMsg = new Y.Map();
      yMsg.set('id', messageId);
      yMsg.set('conversationId', conversationId);
      yMsg.set('authorId', user.id);
      yMsg.set('userId', user.id);
      yMsg.set('content', text);
      yMsg.set('text', text);
      yMsg.set('isSystemMessage', false);
      yMsg.set('createdAt', new Date().toISOString());
      yMsg.set('userName', user.name || user.email);
      yMsg.set('userAvatar', user.avatar || '');
      if (options?.replyToMessageId) {
        yMsg.set('replyToMessageId', options.replyToMessageId);
      }
      if (options?.assetId) {
        yMsg.set('assetId', options.assetId);
      }
      messagesArray.push([yMsg]);
    });
  }, [conversationId, user]);

  const editMessage = useCallback((messageId: string, newContent: string) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const messagesArray = ydoc.getArray(MESSAGING_YJS_TYPES.MESSAGES);

    ydoc.transact(() => {
      for (let i = 0; i < messagesArray.length; i++) {
        const yMsg = messagesArray.get(i) as Y.Map<unknown>;
        if (yMsg.get('id') === messageId) {
          yMsg.set('content', newContent);
          yMsg.set('text', newContent);
          yMsg.set('editedAt', new Date().toISOString());
          yMsg.set('updatedAt', new Date().toISOString());
          break;
        }
      }
    });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    const ydoc = docRef.current;
    if (!ydoc) return;

    const messagesArray = ydoc.getArray(MESSAGING_YJS_TYPES.MESSAGES);

    ydoc.transact(() => {
      for (let i = 0; i < messagesArray.length; i++) {
        const yMsg = messagesArray.get(i) as Y.Map<unknown>;
        if (yMsg.get('id') === messageId) {
          messagesArray.delete(i, 1);
          break;
        }
      }
    });
  }, []);

  // Gate: return null when feature flag is disabled
  if (!isFeatureEnabled) {
    return null;
  }

  return {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    isConnected,
    awarenessStates,
  };
}

export default useMessagingYjs;
