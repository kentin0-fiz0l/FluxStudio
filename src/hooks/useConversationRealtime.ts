/**
 * useConversationRealtime Hook
 *
 * Provides real-time updates for conversation-based messaging using the new
 * conversation socket events. This hook integrates with messagingSocketService
 * to provide live message updates, typing indicators, and read receipts.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  messagingSocketService,
  ConversationMessage,
  Conversation,
  Notification,
} from '../services/messagingSocketService';

interface TypingUser {
  userId: string;
  userEmail: string;
  conversationId: string;
}

interface ReadReceipt {
  conversationId: string;
  userId: string;
  messageId: string;
}

interface UseConversationRealtimeOptions {
  conversationId?: string;
  autoConnect?: boolean;
  onNewMessage?: (data: { conversationId: string; message: ConversationMessage }) => void;
  onMessageDeleted?: (data: { conversationId: string; messageId: string }) => void;
  onTypingStart?: (data: TypingUser) => void;
  onTypingStop?: (data: { conversationId: string; userId: string }) => void;
  onReadReceipt?: (data: ReadReceipt) => void;
  onNotification?: (notification: Notification) => void;
}

interface UseConversationRealtimeReturn {
  // Connection state
  isConnected: boolean;

  // Real-time data
  messages: ConversationMessage[];
  typingUsers: TypingUser[];
  unreadCount: number;

  // Actions
  connect: () => void;
  disconnect: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (text: string, options?: { replyToMessageId?: string; assetId?: string; projectId?: string }) => void;
  deleteMessage: (messageId: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  markAsRead: (messageId: string) => void;
  subscribeToNotifications: () => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
}

export function useConversationRealtime(options: UseConversationRealtimeOptions = {}): UseConversationRealtimeReturn {
  const { user } = useAuth();
  const {
    conversationId,
    autoConnect = true,
    onNewMessage,
    onMessageDeleted,
    onTypingStart,
    onTypingStop,
    onReadReceipt,
    onNotification,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const currentConversationId = useRef<string | null>(null);
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Connect to socket
  const connect = useCallback(() => {
    if (!user) return;
    messagingSocketService.connect();
  }, [user]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    messagingSocketService.disconnect();
    setIsConnected(false);
  }, []);

  // Join a conversation room
  const joinConversation = useCallback((convId: string) => {
    if (currentConversationId.current && currentConversationId.current !== convId) {
      messagingSocketService.leaveConversation(currentConversationId.current);
    }
    currentConversationId.current = convId;
    messagingSocketService.joinConversation(convId);
  }, []);

  // Leave a conversation room
  const leaveConversation = useCallback((convId: string) => {
    messagingSocketService.leaveConversation(convId);
    if (currentConversationId.current === convId) {
      currentConversationId.current = null;
    }
  }, []);

  // Send a message
  const sendMessage = useCallback((text: string, msgOptions?: { replyToMessageId?: string; assetId?: string; projectId?: string }) => {
    if (!currentConversationId.current) return;
    messagingSocketService.sendMessage({
      conversationId: currentConversationId.current,
      text,
      ...msgOptions,
    });
  }, []);

  // Delete a message
  const deleteMessage = useCallback((messageId: string) => {
    if (!currentConversationId.current) return;
    messagingSocketService.deleteMessage(currentConversationId.current, messageId);
  }, []);

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!currentConversationId.current) return;
    messagingSocketService.startTyping(currentConversationId.current);
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!currentConversationId.current) return;
    messagingSocketService.stopTyping(currentConversationId.current);
  }, []);

  // Mark conversation as read
  const markAsRead = useCallback((messageId: string) => {
    if (!currentConversationId.current) return;
    messagingSocketService.markAsRead(currentConversationId.current, messageId);
  }, []);

  // Subscribe to notifications
  const subscribeToNotifications = useCallback(() => {
    messagingSocketService.subscribeToNotifications();
  }, []);

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId: string) => {
    messagingSocketService.markNotificationRead(notificationId);
  }, []);

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(() => {
    messagingSocketService.markAllNotificationsRead();
  }, []);

  // Set up event listeners
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Connection events
    unsubscribers.push(
      messagingSocketService.on('connect', () => {
        setIsConnected(true);
        // Auto-join conversation if provided
        if (conversationId) {
          joinConversation(conversationId);
        }
        // Auto-subscribe to notifications
        subscribeToNotifications();
      })
    );

    unsubscribers.push(
      messagingSocketService.on('disconnect', () => {
        setIsConnected(false);
      })
    );

    // Initial messages on conversation join
    unsubscribers.push(
      messagingSocketService.on('conversation:messages', (data: unknown) => {
        const { messages: initialMessages } = data as { conversationId: string; messages: ConversationMessage[]; hasMore: boolean };
        setMessages(initialMessages);
      })
    );

    // New message
    unsubscribers.push(
      messagingSocketService.on('conversation:message:new', (data: unknown) => {
        const typedData = data as { conversationId: string; message: ConversationMessage };
        setMessages(prev => [...prev, typedData.message]);
        onNewMessage?.(typedData);
      })
    );

    // Message notification (for other conversations)
    unsubscribers.push(
      messagingSocketService.on('conversation:message:notify', (data: unknown) => {
        const typedData = data as { conversationId: string; message: ConversationMessage; senderEmail: string };
        // Could show a toast notification here
        console.log(`[Realtime] New message in ${typedData.conversationId} from ${typedData.senderEmail}`);
      })
    );

    // Message deleted
    unsubscribers.push(
      messagingSocketService.on('conversation:message:deleted', (data: unknown) => {
        const typedData = data as { conversationId: string; messageId: string; deletedBy: string };
        setMessages(prev => prev.filter(m => m.id !== typedData.messageId));
        onMessageDeleted?.(typedData);
      })
    );

    // Typing indicators
    unsubscribers.push(
      messagingSocketService.on('conversation:user-typing', (data: unknown) => {
        const typedData = data as { conversationId: string; userId: string; userEmail: string };
        setTypingUsers(prev => {
          if (prev.some(u => u.userId === typedData.userId)) return prev;
          return [...prev, typedData];
        });
        onTypingStart?.(typedData);

        // Auto-remove after 3 seconds if no stop event
        const timeoutKey = `${typedData.conversationId}:${typedData.userId}`;
        const existingTimeout = typingTimeouts.current.get(timeoutKey);
        if (existingTimeout) clearTimeout(existingTimeout);

        typingTimeouts.current.set(timeoutKey, setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== typedData.userId));
          typingTimeouts.current.delete(timeoutKey);
        }, 3000));
      })
    );

    unsubscribers.push(
      messagingSocketService.on('conversation:user-stopped-typing', (data: unknown) => {
        const typedData = data as { conversationId: string; userId: string };
        setTypingUsers(prev => prev.filter(u => u.userId !== typedData.userId));
        onTypingStop?.(typedData);

        // Clear timeout
        const timeoutKey = `${typedData.conversationId}:${typedData.userId}`;
        const existingTimeout = typingTimeouts.current.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeouts.current.delete(timeoutKey);
        }
      })
    );

    // Read receipts
    unsubscribers.push(
      messagingSocketService.on('conversation:read-receipt', (data: unknown) => {
        const typedData = data as { conversationId: string; userId: string; messageId: string };
        onReadReceipt?.(typedData);
      })
    );

    // Notifications
    unsubscribers.push(
      messagingSocketService.on('notification:new', (notification: unknown) => {
        onNotification?.(notification as Notification);
      })
    );

    unsubscribers.push(
      messagingSocketService.on('notifications:unread-count', (data: unknown) => {
        const typedData = data as { count: number };
        setUnreadCount(typedData.count);
      })
    );

    // Auto-connect if enabled
    if (autoConnect && user) {
      connect();
    }

    // Cleanup
    return () => {
      unsubscribers.forEach(unsub => unsub());
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
      typingTimeouts.current.clear();
    };
  }, [
    user,
    autoConnect,
    conversationId,
    connect,
    joinConversation,
    subscribeToNotifications,
    onNewMessage,
    onMessageDeleted,
    onTypingStart,
    onTypingStop,
    onReadReceipt,
    onNotification,
  ]);

  // Handle conversation ID changes
  useEffect(() => {
    if (isConnected && conversationId) {
      joinConversation(conversationId);
    }
  }, [isConnected, conversationId, joinConversation]);

  return {
    // Connection state
    isConnected,

    // Real-time data
    messages,
    typingUsers,
    unreadCount,

    // Actions
    connect,
    disconnect,
    joinConversation,
    leaveConversation,
    sendMessage,
    deleteMessage,
    startTyping,
    stopTyping,
    markAsRead,
    subscribeToNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  };
}

export default useConversationRealtime;
