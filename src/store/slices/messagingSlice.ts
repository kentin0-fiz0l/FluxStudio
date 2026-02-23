/**
 * Messaging Slice - Chat and conversation state
 *
 * Migrated from MessagingContext (Sprint 24).
 * All messaging state now lives here. The old Context is a socket bridge only.
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';
import { storeLogger } from '@/services/logging';

// ============================================================================
// Types
// ============================================================================

export interface MessageUser {
  id: string;
  name: string;
  userType: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface UserPresence {
  userId: string;
  status: string;
  lastSeen?: Date;
}

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
  /** Optimistic send status */
  status?: 'sending' | 'sent' | 'failed';
  /** Temp ID used for optimistic messages before server confirmation */
  _tempId?: string;
  /** History of previous content edits */
  editHistory?: Array<{ content: string; editedAt: string }>;
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
  // Extended fields from messaging types
  type?: string;
  participants?: Array<{ id: string; name: string; [key: string]: unknown }>;
  metadata?: { priority?: string; isArchived?: boolean; isMuted?: boolean; isPinned?: boolean; tags?: string[] };
  lastActivity?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface MessagingState {
  currentUser: MessageUser | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingIndicators: TypingIndicator[];
  userPresence: Record<string, UserPresence>;
  connectionStatus: boolean;
  loadingStates: Record<string, boolean>;
  unreadCounts: { messages: number; notifications: number };
  isLoading: boolean;
  error: string | null;
}

export interface MessagingActions {
  // User
  setCurrentUser: (user: MessageUser) => void;

  // Conversations
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  setActiveConversation: (id: string | null) => void;

  // Messages
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  editMessageWithHistory: (messageId: string, newContent: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;

  // Typing
  setTyping: (indicator: TypingIndicator) => void;
  clearTyping: (conversationId: string, userId: string) => void;

  // Presence
  setUserPresence: (presenceList: UserPresence[]) => void;
  updateUserPresence: (presence: UserPresence) => void;

  // Connection
  setConnectionStatus: (connected: boolean) => void;

  // Loading
  setLoadingState: (key: string, loading: boolean) => void;

  // Read state
  markAsRead: (conversationId: string) => void;

  // Optimistic helpers
  replaceOptimisticMessage: (tempId: string, message: Message) => void;
  markMessageFailed: (conversationId: string, tempId: string) => void;
  retryMessage: (conversationId: string, tempId: string) => Promise<void>;

  // Async actions
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
  currentUser: null,
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingIndicators: [],
  userPresence: {},
  connectionStatus: false,
  loadingStates: {},
  unreadCounts: { messages: 0, notifications: 0 },
  isLoading: false,
  error: null,
};

// ============================================================================
// Helpers
// ============================================================================

function computeUnreadMessages(conversations: Conversation[]): number {
  return conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
}

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

    // ── User ──────────────────────────────────────────────────────────

    setCurrentUser: (user) => {
      set((state) => {
        state.messaging.currentUser = user;
      });
    },

    // ── Conversations ────────────────────────────────────────────────

    setConversations: (conversations) => {
      set((state) => {
        state.messaging.conversations = conversations;
        state.messaging.unreadCounts.messages = computeUnreadMessages(conversations);
      });
    },

    addConversation: (conversation) => {
      set((state) => {
        state.messaging.conversations.unshift(conversation);
      });
    },

    updateConversation: (id, updates) => {
      set((state) => {
        const conv = state.messaging.conversations.find((c) => c.id === id);
        if (conv) {
          Object.assign(conv, updates);
        }
      });
    },

    setActiveConversation: (id) => {
      set((state) => {
        state.messaging.activeConversationId = id;
      });
    },

    // ── Messages ─────────────────────────────────────────────────────

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

        // Update conversation's last message and unread count
        const conversation = state.messaging.conversations.find(
          (c) => c.id === message.conversationId
        );
        if (conversation) {
          conversation.lastMessage = message;
          conversation.updatedAt = message.createdAt;
          if (conversation.lastActivity !== undefined) {
            conversation.lastActivity = message.createdAt;
          }
          // Increment unread if not the active conversation
          if (message.conversationId !== state.messaging.activeConversationId) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
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

    editMessageWithHistory: (messageId, newContent) => {
      set((state) => {
        for (const conversationId of Object.keys(state.messaging.messages)) {
          const messages = state.messaging.messages[conversationId];
          const msg = messages.find((m) => m.id === messageId);
          if (msg) {
            // Save current content to edit history
            const history = msg.editHistory || [];
            history.push({ content: msg.content, editedAt: new Date().toISOString() });
            msg.editHistory = history;
            msg.content = newContent;
            msg.updatedAt = new Date().toISOString();
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

    // ── Typing ───────────────────────────────────────────────────────

    setTyping: (indicator) => {
      set((state) => {
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

    // ── Presence ─────────────────────────────────────────────────────

    setUserPresence: (presenceList) => {
      set((state) => {
        const map: Record<string, UserPresence> = {};
        for (const p of presenceList) {
          map[p.userId] = p;
        }
        state.messaging.userPresence = map;
      });
    },

    updateUserPresence: (presence) => {
      set((state) => {
        state.messaging.userPresence[presence.userId] = presence;
      });
    },

    // ── Connection ───────────────────────────────────────────────────

    setConnectionStatus: (connected) => {
      set((state) => {
        state.messaging.connectionStatus = connected;
      });
    },

    // ── Loading ──────────────────────────────────────────────────────

    setLoadingState: (key, loading) => {
      set((state) => {
        state.messaging.loadingStates[key] = loading;
      });
    },

    // ── Read state ───────────────────────────────────────────────────

    markAsRead: (conversationId) => {
      set((state) => {
        const conversation = state.messaging.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
        // Recompute total
        state.messaging.unreadCounts.messages = computeUnreadMessages(state.messaging.conversations);
      });
    },

    // ── Optimistic helpers ──────────────────────────────────────────

    replaceOptimisticMessage: (tempId, message) => {
      set((state) => {
        for (const conversationId of Object.keys(state.messaging.messages)) {
          const messages = state.messaging.messages[conversationId];
          const index = messages.findIndex((m) => m._tempId === tempId);
          if (index !== -1) {
            messages[index] = { ...message, status: 'sent' };
            break;
          }
        }
      });
    },

    markMessageFailed: (conversationId, tempId) => {
      set((state) => {
        const messages = state.messaging.messages[conversationId] || [];
        const msg = messages.find((m) => m._tempId === tempId);
        if (msg) {
          msg.status = 'failed';
        }
      });
    },

    retryMessage: async (conversationId, tempId) => {
      const messages = get().messaging.messages[conversationId] || [];
      const failedMsg = messages.find((m) => m._tempId === tempId && m.status === 'failed');
      if (!failedMsg) return;

      // Mark as sending again
      set((state) => {
        const msgs = state.messaging.messages[conversationId] || [];
        const msg = msgs.find((m) => m._tempId === tempId);
        if (msg) msg.status = 'sending';
      });

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: failedMsg.content, replyToId: failedMsg.replyToId }),
        });
        if (!response.ok) throw new Error('Failed to send message');
        const serverMessage = await response.json();
        get().messaging.replaceOptimisticMessage(tempId, serverMessage);
      } catch (error) {
        storeLogger.error('Retry failed', error);
        get().messaging.markMessageFailed(conversationId, tempId);
      }
    },

    // ── Async actions ────────────────────────────────────────────────

    fetchConversations: async () => {
      set((state) => {
        state.messaging.loadingStates.conversations = true;
        state.messaging.isLoading = true;
      });

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch conversations');

        const data = await response.json();
        const conversations = data.conversations || data;
        set((state) => {
          state.messaging.conversations = conversations;
          state.messaging.unreadCounts.messages = computeUnreadMessages(conversations);
          state.messaging.loadingStates.conversations = false;
          state.messaging.isLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.messaging.error = error instanceof Error ? error.message : 'Failed to fetch';
          state.messaging.loadingStates.conversations = false;
          state.messaging.isLoading = false;
        });
      }
    },

    fetchMessages: async (conversationId) => {
      set((state) => {
        state.messaging.loadingStates[`messages-${conversationId}`] = true;
      });

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch messages');

        const data = await response.json();
        set((state) => {
          state.messaging.messages[conversationId] = data.messages || data;
          state.messaging.loadingStates[`messages-${conversationId}`] = false;
        });
      } catch (error) {
        storeLogger.error('Failed to fetch messages', error);
        set((state) => {
          state.messaging.loadingStates[`messages-${conversationId}`] = false;
        });
      }
    },

    sendMessage: async (conversationId, content, replyToId) => {
      const currentUser = get().messaging.currentUser;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Optimistic: insert message immediately with "sending" status
      const optimisticMessage: Message = {
        id: tempId,
        conversationId,
        authorId: currentUser?.id || 'unknown',
        content,
        createdAt: new Date().toISOString(),
        replyToId,
        status: 'sending',
        _tempId: tempId,
      };
      get().messaging.addMessage(optimisticMessage);

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

        const serverMessage = await response.json();
        // Replace the optimistic placeholder with the real server message
        get().messaging.replaceOptimisticMessage(tempId, serverMessage);
      } catch (error) {
        storeLogger.error('Failed to send message', error);
        // Mark as failed so the UI can show retry
        get().messaging.markMessageFailed(conversationId, tempId);
        throw error;
      }
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useMessagingStore = () => {
  return useStore((state) => state.messaging);
};
