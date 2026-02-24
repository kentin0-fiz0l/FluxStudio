/* eslint-disable react-refresh/only-export-components */
/**
 * Messaging Socket Bridge
 *
 * Connects real-time socket events to the Zustand messaging slice.
 * This is NOT a Context provider — it's a side-effect component.
 * All state lives in src/store/slices/messagingSlice.ts.
 *
 * Sprint 24: Migrated from useReducer-based Context to Zustand bridge.
 */

import { useEffect } from 'react';
import { messagingService } from '../services/messagingService';
import { useStore } from '../store/store';
import type { UserPresence } from '../store/slices/messagingSlice';

/**
 * MessagingSocketBridge - mounts as a side-effect component (no children)
 * Sets up socket event listeners that write to the Zustand store.
 */
export function MessagingSocketBridge() {
  const addMessage = useStore((s) => s.messaging.addMessage);
  const setTyping = useStore((s) => s.messaging.setTyping);
  const clearTyping = useStore((s) => s.messaging.clearTyping);
  const updateUserPresence = useStore((s) => s.messaging.updateUserPresence);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMessageReceived = (message: any) => {
      addMessage(message);
    };

    const handleTypingStarted = (data: { conversationId: string; userId: string; userName?: string; timestamp: Date }) => {
      setTyping({
        conversationId: data.conversationId,
        userId: data.userId,
        userName: data.userName || data.userId,
        timestamp: Date.now(),
      });
    };

    const handleTypingStopped = (data: { conversationId: string; userId: string; timestamp: Date }) => {
      clearTyping(data.conversationId, data.userId);
    };

    const handleUserOnline = (user: { userId: string; status: string; lastSeen?: Date }) => {
      updateUserPresence(user as UserPresence);
    };

    const handleUserOffline = (user: { userId: string; status: string; lastSeen?: Date }) => {
      updateUserPresence(user as UserPresence);
    };

    // Register listeners
    messagingService.onMessageReceived(handleMessageReceived);
    messagingService.onTypingStarted(handleTypingStarted);
    messagingService.onTypingStopped(handleTypingStopped);
    messagingService.onUserOnline(handleUserOnline);
    messagingService.onUserOffline(handleUserOffline);

    return () => {
      messagingService.off('message:received', handleMessageReceived);
      messagingService.off('typing:started', handleTypingStarted);
      messagingService.off('typing:stopped', handleTypingStopped);
      messagingService.off('user:online', handleUserOnline);
      messagingService.off('user:offline', handleUserOffline);
    };
  }, [addMessage, setTyping, clearTyping, updateUserPresence]);

  return null;
}

/**
 * Legacy exports for backward compatibility.
 * Components that imported MessagingProvider or useMessaging from this file
 * should migrate to importing from '@/hooks/useMessaging' or '@/store'.
 */

 
const noop = () => {};

/** @deprecated Use MessagingSocketBridge instead. This is a no-op passthrough. */
export function MessagingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/** @deprecated Import useMessaging from '@/hooks/useMessaging' instead. */
export function useMessaging() {
  const store = useStore((s) => s.messaging);
  // Return shape matching the old Context API for backward compat
  return {
    state: {
      currentUser: store.currentUser,
      conversations: store.conversations,
      activeConversationId: store.activeConversationId,
      messages: store.messages,
      typingUsers: {} as Record<string, string[]>,
      userPresence: store.userPresence,
      connectionStatus: store.connectionStatus,
      loading: store.loadingStates,
      unreadCounts: store.unreadCounts,
      notifications: [] as unknown[],
    },
    dispatch: noop,
    actions: {
      setCurrentUser: store.setCurrentUser,
      loadConversations: store.fetchConversations,
      createConversation: async (_data: unknown) => {
        // Callers should use messagingService directly
        return {} as unknown;
      },
      selectConversation: (conversationId: string) => {
        store.setActiveConversation(conversationId);
        store.markAsRead(conversationId);
      },
      loadMessages: store.fetchMessages,
      sendMessage: async (_data: unknown) => {
        // Callers should use the hook's sendMessage instead
      },
      loadNotifications: noop,
      markNotificationAsRead: async (_id: string) => {},
      markAllNotificationsAsRead: async () => {},
      startTyping: (_conversationId: string) => {
        messagingService.startTyping(_conversationId);
      },
      stopTyping: (_conversationId: string) => {
        messagingService.stopTyping(_conversationId);
      },
    },
  };
}

/** @deprecated Import useMessagingOptional from '@/hooks/useMessaging' instead. */
export function useMessagingOptional() {
  return useMessaging();
}

import React from 'react';

export default null;
