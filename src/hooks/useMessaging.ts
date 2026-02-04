/**
 * Messaging Hook
 * Simplified wrapper around MessagingContext for backward compatibility
 */

import { useMessaging as useMessagingContext, useMessagingOptional as useMessagingContextOptional } from '../contexts/MessagingContext';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import {
  Message,
  Conversation,
  MessageUser,
  ConversationType,
  MessageType,
  Priority,
  MessageAttachment,
  ConversationFilter,
  MessageSearchOptions,
  TypingIndicator,
  UserPresence,
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

// Default values for when context is not available
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
 * Optional messaging hook that returns default values when context is not available
 * Use this in components that may render outside the MessagingProvider
 */
export function useMessagingOptional(): UseMessagingReturn {
  const context = useMessagingContextOptional();

  // If context is not available, return defaults
  if (!context) {
    return defaultReturn;
  }

  // Delegate to the full hook logic via a wrapper
  // Note: We can't call useMessaging() here because it would throw
  // Instead, we duplicate the minimal logic needed
  const { state } = context;

  return {
    ...defaultReturn,
    conversations: state.conversations,
    unreadCount: state.unreadCounts?.messages || 0,
    isLoading: state.loading.conversations || state.loading.notifications || false,
  };
}

export function useMessaging(): UseMessagingReturn {
  const { user } = useAuth();
  const { state, actions } = useMessagingContext();

  // Set current user when auth changes
  useEffect(() => {
    if (user) {
      const messageUser: MessageUser = {
        id: user.id,
        name: user.name,
        userType: user.userType || 'designer',
        avatar: user.avatar,
        isOnline: true,
        lastSeen: new Date(),
      };
      actions.setCurrentUser(messageUser);
    }
  }, [user, actions]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      actions.loadConversations();
      actions.loadNotifications();
    }
  }, [user, actions]);

  const activeConversation = state.conversations.find(c => c.id === state.activeConversationId) || null;
  const conversationMessages = state.activeConversationId
    ? state.messages[state.activeConversationId] || []
    : [];

  const createConversation = async (options: CreateConversationOptions): Promise<string> => {
    const conversation = await actions.createConversation({
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
    return conversation.id;
  };

  const sendMessage = async (conversationId: string, options: SendMessageOptions): Promise<void> => {
    if (!state.currentUser) return;

    await actions.sendMessage({
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
  };

  const setActiveConversation = (conversationId: string | null) => {
    actions.selectConversation(conversationId || '');
    if (conversationId) {
      actions.loadMessages(conversationId);
    }
  };

  const joinConversation = (_conversationId: string) => {
    // Implementation handled by messaging service
  };

  const leaveConversation = (_conversationId: string) => {
    // Implementation handled by messaging service
  };

  const addParticipant = (_conversationId: string, _userId: string) => {
    // Would call messaging service to add participant
  };

  const removeParticipant = (_conversationId: string, _userId: string) => {
    // Would call messaging service to remove participant
  };

  const searchMessages = (_options: MessageSearchOptions): Message[] => {
    // For now, return empty array - would implement search
    return [];
  };

  const filterConversations = (filter: ConversationFilter): Conversation[] => {
    try {
      return state.conversations.filter(conv => {
        if (!conv) {
          console.error('[useMessaging] Undefined conversation in array');
          return false;
        }
        if (filter.type && conv.type !== filter.type) return false;
        if (filter.priority && conv.metadata?.priority !== filter.priority) return false;
        if (filter.hasUnread && conv.unreadCount === 0) return false;
        if (filter.isArchived !== undefined && conv.metadata?.isArchived !== filter.isArchived) return false;
        if (filter.isMuted !== undefined && conv.metadata?.isMuted !== filter.isMuted) return false;
        if (filter.isPinned !== undefined && conv.metadata?.isPinned !== filter.isPinned) return false;
        if (filter.projectId && conv.projectId !== filter.projectId) return false;
        if (filter.participantId) {
          if (!conv.participants || !Array.isArray(conv.participants)) {
            console.error('[useMessaging] Invalid participants array:', conv.participants);
            return false;
          }
          const hasParticipant = conv.participants.some(p => {
            if (!p) {
              console.error('[useMessaging] Undefined participant in conversation:', conv.id);
              return false;
            }
            if (!p.id) {
              console.error('[useMessaging] Participant without id:', p);
              return false;
            }
            return p.id === filter.participantId;
          });
          if (!hasParticipant) return false;
        }
        return true;
      });
    } catch (error) {
      console.error('[useMessaging] Error in filterConversations:', error);
      return [];
    }
  };

  const uploadFile = async (file: File, _conversationId: string): Promise<MessageAttachment> => {
    // Mock implementation - would upload file and return attachment
    return {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
      isVideo: file.type.startsWith('video/'),
      uploadedAt: new Date(),
      uploadedBy: state.currentUser?.id || '',
    };
  };

  const setTyping = (conversationId: string, isTyping: boolean) => {
    if (isTyping) {
      actions.startTyping(conversationId);
    } else {
      actions.stopTyping(conversationId);
    }
  };

  const refresh = async () => {
    await actions.loadConversations();
    await actions.loadNotifications();
  };

  const editMessage = async (_messageId: string, _content: string): Promise<void> => {
    // TODO: Implement message editing via API
  };

  const deleteMessage = async (_messageId: string): Promise<void> => {
    // TODO: Implement message deletion via API
  };

  return {
    // Conversations
    conversations: state.conversations,
    activeConversation,
    conversationMessages,

    // Real-time features
    typingIndicators: [], // Would implement from state
    userPresence: state.userPresence,

    // Actions
    createConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    setActiveConversation,
    joinConversation,
    leaveConversation,
    addParticipant,
    removeParticipant,

    // Search and filtering
    searchMessages,
    filterConversations,

    // File handling
    uploadFile,

    // Typing indicators
    setTyping,

    // State
    isLoading: state.loading.conversations || state.loading.notifications || false,
    error: null,
    lastUpdated: new Date(),
    refresh,

    // Unread counts
    unreadCount: state.unreadCounts?.messages || 0,
  };
}

export default useMessaging;