/**
 * Messaging Context Provider
 * Centralized state management for the messaging system
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo } from 'react';
import { Message, Conversation, Notification, MessageUser, UserPresence } from '../types/messaging';
import { messagingService } from '../services/messagingService';
import { createLogger } from '../lib/logger';

const msgCtxLogger = createLogger('MessagingContext');

// Action Types
type MessagingAction =
  | { type: 'SET_CURRENT_USER'; payload: MessageUser }
  | { type: 'SET_CONVERSATIONS'; payload: Conversation[] }
  | { type: 'ADD_CONVERSATION'; payload: Conversation }
  | { type: 'UPDATE_CONVERSATION'; payload: { id: string; updates: Partial<Conversation> } }
  | { type: 'SET_ACTIVE_CONVERSATION'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } }
  | { type: 'SET_TYPING_USERS'; payload: { conversationId: string; userIds: string[] } }
  | { type: 'ADD_TYPING_USER'; payload: { conversationId: string; userId: string } }
  | { type: 'REMOVE_TYPING_USER'; payload: { conversationId: string; userId: string } }
  | { type: 'SET_USER_PRESENCE'; payload: UserPresence[] }
  | { type: 'UPDATE_USER_PRESENCE'; payload: UserPresence }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } };

// State Interface
interface MessagingState {
  currentUser: MessageUser | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  notifications: Notification[];
  typingUsers: Record<string, string[]>; // conversationId -> userIds
  userPresence: Record<string, UserPresence>; // userId -> presence
  connectionStatus: boolean;
  loading: Record<string, boolean>;
  unreadCounts: {
    messages: number;
    notifications: number;
  };
}

// Initial State
const initialState: MessagingState = {
  currentUser: null,
  conversations: [],
  activeConversationId: null,
  messages: {},
  notifications: [],
  typingUsers: {},
  userPresence: {},
  connectionStatus: false,
  loading: {},
  unreadCounts: {
    messages: 0,
    notifications: 0,
  },
};

// Reducer
function messagingReducer(state: MessagingState, action: MessagingAction): MessagingState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };

    case 'SET_CONVERSATIONS':
      const unreadMessages = action.payload.reduce((sum, conv) => sum + conv.unreadCount, 0);
      return {
        ...state,
        conversations: action.payload,
        unreadCounts: { ...state.unreadCounts, messages: unreadMessages },
      };

    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id ? { ...conv, ...action.payload.updates } : conv
        ),
      };

    case 'SET_ACTIVE_CONVERSATION':
      return { ...state, activeConversationId: action.payload };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages,
        },
      };

    case 'ADD_MESSAGE':
      const conversationId = action.payload.conversationId;
      const existingMessages = state.messages[conversationId] || [];

      // Update conversation's last message and activity
      const updatedConversations = state.conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessage: action.payload,
            lastActivity: action.payload.createdAt,
            unreadCount: conv.id === state.activeConversationId ? 0 : conv.unreadCount + 1,
          };
        }
        return conv;
      });

      return {
        ...state,
        conversations: updatedConversations,
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, action.payload],
        },
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: Object.fromEntries(
          Object.entries(state.messages).map(([convId, msgs]) => [
            convId,
            msgs.map(msg => msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg),
          ])
        ),
      };

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: Object.fromEntries(
          Object.entries(state.messages).map(([convId, msgs]) => [
            convId,
            msgs.filter(msg => msg && msg.id !== action.payload),
          ])
        ),
      };

    case 'SET_NOTIFICATIONS':
      const unreadNotifications = action.payload.filter(n => n && !n.isRead).length;
      return {
        ...state,
        notifications: action.payload,
        unreadCounts: { ...state.unreadCounts, notifications: unreadNotifications },
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCounts: {
          ...state.unreadCounts,
          notifications: action.payload.isRead ? state.unreadCounts.notifications : state.unreadCounts.notifications + 1,
        },
      };

    case 'UPDATE_NOTIFICATION':
      const updatedNotifications = state.notifications.map(notif =>
        notif.id === action.payload.id ? { ...notif, ...action.payload.updates } : notif
      );
      const unreadCount = updatedNotifications.filter(n => n && !n.isRead).length;

      return {
        ...state,
        notifications: updatedNotifications,
        unreadCounts: { ...state.unreadCounts, notifications: unreadCount },
      };

    case 'SET_TYPING_USERS':
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.conversationId]: action.payload.userIds,
        },
      };

    case 'ADD_TYPING_USER':
      const currentTyping = state.typingUsers[action.payload.conversationId] || [];
      if (!currentTyping.includes(action.payload.userId)) {
        return {
          ...state,
          typingUsers: {
            ...state.typingUsers,
            [action.payload.conversationId]: [...currentTyping, action.payload.userId],
          },
        };
      }
      return state;

    case 'REMOVE_TYPING_USER':
      const typingList = state.typingUsers[action.payload.conversationId] || [];
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.conversationId]: typingList.filter(id => id !== action.payload.userId),
        },
      };

    case 'SET_USER_PRESENCE':
      return {
        ...state,
        userPresence: action.payload.reduce((acc, presence) => {
          acc[presence.userId] = presence;
          return acc;
        }, {} as Record<string, UserPresence>),
      };

    case 'UPDATE_USER_PRESENCE':
      return {
        ...state,
        userPresence: {
          ...state.userPresence,
          [action.payload.userId]: action.payload,
        },
      };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.loading,
        },
      };

    default:
      return state;
  }
}

// Context
interface MessagingContextType {
  state: MessagingState;
  dispatch: React.Dispatch<MessagingAction>;
  actions: {
    setCurrentUser: (user: MessageUser) => void;
    loadConversations: () => Promise<void>;
    createConversation: (data: Parameters<typeof messagingService.createConversation>[0]) => Promise<Conversation>;
    selectConversation: (conversationId: string) => void;
    loadMessages: (conversationId: string) => Promise<void>;
    sendMessage: (data: Parameters<typeof messagingService.sendMessage>[0]) => Promise<void>;
    loadNotifications: () => Promise<void>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
    startTyping: (conversationId: string) => void;
    stopTyping: (conversationId: string) => void;
  };
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

// Provider
interface MessagingProviderProps {
  children: ReactNode;
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const [state, dispatch] = useReducer(messagingReducer, initialState);

  // Initialize real-time listeners
  useEffect(() => {
    // Message events
    const handleMessageReceived = (message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    };

    // Typing events
    const handleTypingStarted = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      dispatch({
        type: 'ADD_TYPING_USER',
        payload: {
          conversationId: data.conversationId,
          userId: data.userId,
        },
      });
    };

    const handleTypingStopped = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      dispatch({
        type: 'REMOVE_TYPING_USER',
        payload: {
          conversationId: data.conversationId,
          userId: data.userId,
        },
      });
    };

    // Presence events
    const handleUserOnline = (user: { userId: string; status: string; lastSeen?: Date }) => {
      dispatch({ type: 'UPDATE_USER_PRESENCE', payload: user as UserPresence });
    };

    const handleUserOffline = (user: { userId: string; status: string; lastSeen?: Date }) => {
      dispatch({ type: 'UPDATE_USER_PRESENCE', payload: user as UserPresence });
    };

    // Notification events
    const handleMentionReceived = (data: { messageId: string; conversationId: string; mentionedBy: MessageUser; content: string; priority: string; timestamp: Date }) => {
      const notification: Notification = {
        id: `mention-${data.messageId}-${Date.now()}`,
        type: 'mention',
        priority: data.priority as Notification['priority'],
        title: `${data.mentionedBy.name} mentioned you`,
        message: data.content,
        messageId: data.messageId,
        conversationId: data.conversationId,
        isRead: false,
        isArchived: false,
        isSnoozed: false,
        createdAt: data.timestamp,
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    };

    // Set up listeners
    messagingService.onMessageReceived(handleMessageReceived);
    messagingService.onTypingStarted(handleTypingStarted);
    messagingService.onTypingStopped(handleTypingStopped);
    messagingService.onUserOnline(handleUserOnline);
    messagingService.onUserOffline(handleUserOffline);
    messagingService.onMentionReceived(handleMentionReceived);

    // Return cleanup function
    return () => {
      messagingService.off('message:received', handleMessageReceived);
      messagingService.off('typing:started', handleTypingStarted);
      messagingService.off('typing:stopped', handleTypingStopped);
      messagingService.off('user:online', handleUserOnline);
      messagingService.off('user:offline', handleUserOffline);
      messagingService.off('notification:mention', handleMentionReceived);
    };
  }, []);

  // Actions - memoized to prevent infinite re-renders
  const actions = useMemo(() => ({
    setCurrentUser: (user: MessageUser) => {
      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      messagingService.setCurrentUser(user);
    },

    loadConversations: async () => {
      dispatch({ type: 'SET_LOADING', payload: { key: 'conversations', loading: true } });
      try {
        const conversations = await messagingService.getConversations();
        dispatch({ type: 'SET_CONVERSATIONS', payload: conversations });
      } catch (error) {
        msgCtxLogger.error('Failed to load conversations', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'conversations', loading: false } });
      }
    },

    createConversation: async (data: Parameters<typeof messagingService.createConversation>[0]) => {
      const conversation = await messagingService.createConversation(data);
      dispatch({ type: 'ADD_CONVERSATION', payload: conversation });
      return conversation;
    },

    selectConversation: (conversationId: string) => {
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: conversationId });
      // Mark messages as read - let the reducer handle finding the conversation
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: { id: conversationId, updates: { unreadCount: 0 } },
      });
    },

    loadMessages: async (conversationId: string) => {
      dispatch({ type: 'SET_LOADING', payload: { key: `messages-${conversationId}`, loading: true } });
      try {
        const messages = await messagingService.getMessages(conversationId);
        dispatch({ type: 'SET_MESSAGES', payload: { conversationId, messages } });
      } catch (error) {
        msgCtxLogger.error('Failed to load messages', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: `messages-${conversationId}`, loading: false } });
      }
    },

    sendMessage: async (data: Parameters<typeof messagingService.sendMessage>[0]) => {
      try {
        await messagingService.sendMessage(data);
        // Message will be added via real-time listener
      } catch (error) {
        msgCtxLogger.error('Failed to send message', error);
        throw error;
      }
    },

    loadNotifications: async () => {
      dispatch({ type: 'SET_LOADING', payload: { key: 'notifications', loading: true } });
      try {
        const notifications = await messagingService.getNotifications();
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      } catch (error) {
        msgCtxLogger.error('Failed to load notifications', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: { key: 'notifications', loading: false } });
      }
    },

    markNotificationAsRead: async (notificationId: string) => {
      try {
        await messagingService.markNotificationAsRead(notificationId);
        dispatch({
          type: 'UPDATE_NOTIFICATION',
          payload: { id: notificationId, updates: { isRead: true } },
        });
      } catch (error) {
        msgCtxLogger.error('Failed to mark notification as read', error);
      }
    },

    markAllNotificationsAsRead: async () => {
      try {
        await messagingService.markAllNotificationsAsRead();
        // Let the service or a separate action handle updating all notifications
        // For now, reload notifications to get updated state
        const notifications = await messagingService.getNotifications();
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
      } catch (error) {
        msgCtxLogger.error('Failed to mark all notifications as read', error);
      }
    },

    startTyping: (conversationId: string) => {
      messagingService.startTyping(conversationId);
    },

    stopTyping: (conversationId: string) => {
      messagingService.stopTyping(conversationId);
    },
  }), []); // Empty dependency array since actions don't directly depend on state values

  return (
    <MessagingContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </MessagingContext.Provider>
  );
}

// Hook
export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}

// Optional hook - returns null if not within MessagingProvider
// Use this for components that may render outside the provider
export function useMessagingOptional() {
  return useContext(MessagingContext);
}

export default MessagingContext;