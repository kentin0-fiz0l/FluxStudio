/**
 * Messaging Hook
 *
 * Public API for all messaging state and actions.
 * Reads from the Zustand messaging slice (Sprint 24 migration).
 * Includes API calls for message edit/delete operations.
 */

import { useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { useAuth } from '@/store/slices/authSlice';
import { messagingService } from '../services/messagingService';
import { apiService } from '@/services/apiService';
import { buildApiUrl } from '../config/environment';
import { hookLogger } from '../lib/logger';
import { toast } from '../lib/toast';
import type { MessageUser } from '../store/slices/messagingSlice';

const messagingLogger = hookLogger.child('useMessaging');

import type {
  Message,
  Conversation,
  MessageType,
  Priority,
  MessageAttachment,
  ConversationFilter,
  MessageSearchOptions,
  TypingIndicator,
  UserPresence,
  ConversationType,
} from '../types/messaging';

interface SendMessageOptions {
  content: string;
  type?: MessageType;
  priority?: Priority;
  attachments?: File[];
  replyTo?: string;
  mentions?: string[];
  projectId?: string;
}

interface CreateConversationOptions {
  type: ConversationType;
  name: string;
  description?: string;
  participants: string[];
  projectId?: string;
  organizationId?: string;
  teamId?: string;
  priority?: Priority;
}

interface UseMessagingReturn {
  // Conversations
  conversations: Conversation[];
  activeConversation: Conversation | null;
  conversationMessages: Message[];

  // Real-time features
  typingIndicators: TypingIndicator[];
  userPresence: Record<string, UserPresence>;

  // Actions
  createConversation: (options: CreateConversationOptions) => Promise<string>;
  sendMessage: (conversationId: string, options: SendMessageOptions) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  addParticipant: (conversationId: string, userId: string) => void;
  removeParticipant: (conversationId: string, userId: string) => void;

  // Search and filtering
  searchMessages: (options: MessageSearchOptions) => Message[];
  filterConversations: (filter: ConversationFilter) => Conversation[];

  // File handling
  uploadFile: (file: File, conversationId: string) => Promise<MessageAttachment>;

  // Typing indicators
  setTyping: (conversationId: string, isTyping: boolean) => void;

  // State
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;

  // Unread counts
  unreadCount: number;
}

// Default values for when store has no data yet
const defaultReturn: UseMessagingReturn = {
  conversations: [],
  activeConversation: null,
  conversationMessages: [],
  typingIndicators: [],
  userPresence: {},
  createConversation: async () => '',
  sendMessage: async () => {},
  editMessage: async () => {},
  deleteMessage: async () => {},
  setActiveConversation: () => {},
  joinConversation: () => {},
  leaveConversation: () => {},
  addParticipant: () => {},
  removeParticipant: () => {},
  searchMessages: () => [],
  filterConversations: () => [],
  uploadFile: async () => ({
    id: '',
    name: '',
    type: '',
    size: 0,
    url: '',
    isImage: false,
    isVideo: false,
    uploadedAt: new Date(),
    uploadedBy: '',
  }),
  setTyping: () => {},
  isLoading: false,
  error: null,
  lastUpdated: null,
  refresh: async () => {},
  unreadCount: 0,
};

/**
 * Optional messaging hook that returns default values when not ready
 */
export function useMessagingOptional(): UseMessagingReturn {
  const conversations = useStore((s) => s.messaging.conversations);
  const unreadCounts = useStore((s) => s.messaging.unreadCounts);
  const loadingStates = useStore((s) => s.messaging.loadingStates);

  return {
    ...defaultReturn,
    conversations: conversations as unknown as Conversation[],
    unreadCount: unreadCounts?.messages || 0,
    isLoading: loadingStates?.conversations || false,
  };
}

export function useMessaging(): UseMessagingReturn {
  const { user } = useAuth();
  const store = useStore((s) => s.messaging);

  // Set current user when auth changes
  useEffect(() => {
    if (user) {
      const messageUser: MessageUser = {
        id: user.id,
        name: user.name || '',
        userType: user.userType || 'designer',
        avatar: user.avatar,
        isOnline: true,
        lastSeen: new Date(),
      };
      store.setCurrentUser(messageUser);
      messagingService.setCurrentUser(messageUser as Parameters<typeof messagingService.setCurrentUser>[0]);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      store.fetchConversations();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeConversation = store.conversations.find((c) => c.id === store.activeConversationId) || null;
  const conversationMessages = store.activeConversationId
    ? store.messages[store.activeConversationId] || []
    : [];

  const createConversation = useCallback(async (options: CreateConversationOptions): Promise<string> => {
    const conversation = await messagingService.createConversation({
      type: options.type,
      name: options.name,
      description: options.description,
      participants: options.participants,
      projectId: options.projectId,
      metadata: {
        priority: options.priority || 'medium',
        isArchived: false,
        isMuted: false,
        isPinned: false,
        tags: [],
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.addConversation(conversation as any);
    return conversation.id;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async (conversationId: string, options: SendMessageOptions): Promise<void> => {
    if (!store.currentUser) return;

    await messagingService.sendMessage({
      conversationId,
      type: options.type || 'text',
      content: options.content,
      priority: options.priority,
      attachments: options.attachments,
      mentions: options.mentions,
      replyTo: options.replyTo,
      metadata: {
        priority: options.priority,
        projectId: options.projectId,
      },
    });
  }, [store.currentUser]);  

  const setActiveConversation = useCallback((conversationId: string | null) => {
    store.setActiveConversation(conversationId);
    if (conversationId) {
      store.markAsRead(conversationId);
      store.fetchMessages(conversationId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filterConversations = useCallback((filter: ConversationFilter): Conversation[] => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return store.conversations.filter((conv: any) => {
        if (!conv) return false;
        if (filter.type && conv.type !== filter.type) return false;
        if (filter.priority && conv.metadata?.priority !== filter.priority) return false;
        if (filter.hasUnread && conv.unreadCount === 0) return false;
        if (filter.isArchived !== undefined && conv.metadata?.isArchived !== filter.isArchived) return false;
        if (filter.isMuted !== undefined && conv.metadata?.isMuted !== filter.isMuted) return false;
        if (filter.isPinned !== undefined && conv.metadata?.isPinned !== filter.isPinned) return false;
        if (filter.projectId && conv.projectId !== filter.projectId) return false;
        if (filter.participantId) {
          if (!conv.participants || !Array.isArray(conv.participants)) return false;
          const hasParticipant = conv.participants.some((p: { id?: string }) => p && p.id === filter.participantId);
          if (!hasParticipant) return false;
        }
        return true;
      }) as unknown as Conversation[];
    } catch (error) {
      messagingLogger.error('Error in filterConversations', error);
      return [];
    }
  }, [store.conversations]);

  const uploadFile = useCallback(async (file: File, _conversationId: string): Promise<MessageAttachment> => {
    return {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
      isVideo: file.type.startsWith('video/'),
      uploadedAt: new Date(),
      uploadedBy: store.currentUser?.id || '',
    };
  }, [store.currentUser?.id]);

  const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (isTyping) {
      messagingService.startTyping(conversationId);
    } else {
      messagingService.stopTyping(conversationId);
    }
  }, []);

  const refresh = useCallback(async () => {
    await store.fetchConversations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editMessage = useCallback(async (messageId: string, content: string): Promise<void> => {
    const activeId = useStore.getState().messaging.activeConversationId;
    if (!activeId) throw new Error('No active conversation');

    // Optimistic update — apply edit to Zustand immediately
    const prevMessages = [...(useStore.getState().messaging.messages[activeId] || [])];
    useStore.getState().messaging.updateMessage(messageId, { content, updatedAt: new Date().toISOString() });

    try {
      await apiService.makeRequest(
        buildApiUrl(`/conversations/${activeId}/messages/${messageId}`),
        {
          method: 'PUT',
          body: JSON.stringify({ text: content }),
        }
      );

      useStore.getState().messaging.fetchMessages(activeId);
    } catch (err) {
      // Rollback optimistic update
      useStore.setState((state) => {
        state.messaging.messages[activeId] = prevMessages;
      });
      toast.error(err instanceof Error ? err.message : 'Failed to edit message');
      throw err;
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    const activeId = useStore.getState().messaging.activeConversationId;
    if (!activeId) throw new Error('No active conversation');

    // Optimistic update — remove message from Zustand immediately
    const prevMessages = [...(useStore.getState().messaging.messages[activeId] || [])];
    useStore.getState().messaging.deleteMessage(activeId, messageId);

    try {
      await apiService.delete(`/conversations/${activeId}/messages/${messageId}`);

      useStore.getState().messaging.fetchMessages(activeId);
    } catch (err) {
      // Rollback optimistic update
      useStore.setState((state) => {
        state.messaging.messages[activeId] = prevMessages;
      });
      toast.error(err instanceof Error ? err.message : 'Failed to delete message');
      throw err;
    }
  }, []);

  // Store types are structurally compatible with types/messaging at runtime
  // but have fewer required fields. Cast at the boundary.
  return {
    conversations: store.conversations as unknown as Conversation[],
    activeConversation: activeConversation as unknown as Conversation | null,
    conversationMessages: conversationMessages as unknown as Message[],
    typingIndicators: store.typingIndicators as unknown as TypingIndicator[],
    userPresence: store.userPresence as unknown as Record<string, UserPresence>,
    createConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    setActiveConversation,
    joinConversation: () => {},
    leaveConversation: () => {},
    addParticipant: () => {},
    removeParticipant: () => {},
    searchMessages: () => [],
    filterConversations,
    uploadFile,
    setTyping,
    isLoading: store.loadingStates?.conversations || false,
    error: store.error,
    lastUpdated: new Date(),
    refresh,
    unreadCount: store.unreadCounts?.messages || 0,
  };
}

export default useMessaging;
