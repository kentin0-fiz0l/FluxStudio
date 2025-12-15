/**
 * Messaging Slice - Chat and conversation state
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  replyToId?: string;
  reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
  attachments?: Array<{ id: string; url: string; type: string; name: string }>;
  isRead?: boolean;
  isPinned?: boolean;
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  members: string[];
  lastMessage?: Message;
  unreadCount: number;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  typingIndicators: TypingIndicator[];
  isLoading: boolean;
  error: string | null;
}

export interface MessagingActions {
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  setTyping: (indicator: TypingIndicator) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  markAsRead: (conversationId: string) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, replyToId?: string) => Promise<void>;
}

export interface MessagingSlice {
  messaging: MessagingState & MessagingActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: MessagingState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingIndicators: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createMessagingSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  MessagingSlice
> = (set, get) => ({
  messaging: {
    ...initialState,

    setConversations: (conversations) => {
      set((state) => {
        state.messaging.conversations = conversations;
      });
    },

    addConversation: (conversation) => {
      set((state) => {
        state.messaging.conversations.unshift(conversation);
      });
    },

    setActiveConversation: (id) => {
      set((state) => {
        state.messaging.activeConversationId = id;
      });
    },

    setMessages: (conversationId, messages) => {
      set((state) => {
        state.messaging.messages[conversationId] = messages;
      });
    },

    addMessage: (message) => {
      set((state) => {
        const messages = state.messaging.messages[message.conversationId] || [];
        messages.push(message);
        state.messaging.messages[message.conversationId] = messages;

        // Update conversation's last message
        const conversation = state.messaging.conversations.find(
          (c) => c.id === message.conversationId
        );
        if (conversation) {
          conversation.lastMessage = message;
          conversation.updatedAt = message.createdAt;
        }
      });
    },

    updateMessage: (messageId, updates) => {
      set((state) => {
        for (const conversationId of Object.keys(state.messaging.messages)) {
          const messages = state.messaging.messages[conversationId];
          const index = messages.findIndex((m) => m.id === messageId);
          if (index !== -1) {
            messages[index] = { ...messages[index], ...updates };
            break;
          }
        }
      });
    },

    deleteMessage: (conversationId, messageId) => {
      set((state) => {
        state.messaging.messages[conversationId] = (
          state.messaging.messages[conversationId] || []
        ).filter((m) => m.id !== messageId);
      });
    },

    setTyping: (indicator) => {
      set((state) => {
        // Remove existing indicator for this user/conversation
        state.messaging.typingIndicators = state.messaging.typingIndicators.filter(
          (t) => !(t.conversationId === indicator.conversationId && t.userId === indicator.userId)
        );
        state.messaging.typingIndicators.push(indicator);
      });

      // Auto-clear after 5 seconds
      setTimeout(() => {
        get().messaging.clearTyping(indicator.conversationId, indicator.userId);
      }, 5000);
    },

    clearTyping: (conversationId, userId) => {
      set((state) => {
        state.messaging.typingIndicators = state.messaging.typingIndicators.filter(
          (t) => !(t.conversationId === conversationId && t.userId === userId)
        );
      });
    },

    markAsRead: (conversationId) => {
      set((state) => {
        const conversation = state.messaging.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
      });
    },

    fetchConversations: async () => {
      set((state) => {
        state.messaging.isLoading = true;
      });

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch conversations');

        const data = await response.json();
        set((state) => {
          state.messaging.conversations = data.conversations || data;
          state.messaging.isLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.messaging.error = error instanceof Error ? error.message : 'Failed to fetch';
          state.messaging.isLoading = false;
        });
      }
    },

    fetchMessages: async (conversationId) => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch messages');

        const data = await response.json();
        set((state) => {
          state.messaging.messages[conversationId] = data.messages || data;
        });
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    },

    sendMessage: async (conversationId, content, replyToId) => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content, replyToId }),
        });

        if (!response.ok) throw new Error('Failed to send message');

        const message = await response.json();
        get().messaging.addMessage(message);
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
  },
});

// ============================================================================
// Convenience Hook
// ============================================================================

import { useStore } from '../store';

export const useMessaging = () => {
  return useStore((state) => state.messaging);
};
