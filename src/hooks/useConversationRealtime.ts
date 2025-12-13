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
  MessageReactionSummary,
  PinnedMessage,
  ConversationPinsUpdatedPayload,
} from '../services/messagingSocketService';

interface TypingUser {
  userId: string;
  userEmail: string;
  userName?: string;
  avatarUrl?: string | null;
  conversationId: string;
}

interface ThreadSummary {
  threadRootMessageId: string;
  replyCount: number;
  lastReplyAt?: string;
}

interface ReadReceipt {
  conversationId: string;
  userId: string;
  messageId: string;
}

interface ReactionUpdate {
  messageId: string;
  reactions: MessageReactionSummary[];
  updatedBy: string;
}

interface UseConversationRealtimeOptions {
  conversationId?: string;
  autoConnect?: boolean;
  onNewMessage?: (data: { conversationId: string; message: ConversationMessage }) => void;
  onMessageDeleted?: (data: { conversationId: string; messageId: string }) => void;
  onMessageEdited?: (data: { message: ConversationMessage }) => void;
  onTypingStart?: (data: TypingUser) => void;
  onTypingStop?: (data: { conversationId: string; userId: string }) => void;
  onReadReceipt?: (data: ReadReceipt) => void;
  onNotification?: (notification: Notification) => void;
  onReactionUpdated?: (data: ReactionUpdate) => void;
  onPinsUpdated?: (data: ConversationPinsUpdatedPayload) => void;
}

interface UseConversationRealtimeReturn {
  // Connection state
  isConnected: boolean;

  // Real-time data
  messages: ConversationMessage[];
  typingUsers: TypingUser[];
  unreadCount: number;
  pinnedMessageIds: string[];

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

  // Reaction actions
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;

  // Pin actions
  pinMessage: (messageId: string) => void;
  unpinMessage: (messageId: string) => void;

  // Edit actions
  editMessage: (messageId: string, content: string) => void;

  // Forward actions
  forwardMessage: (targetConversationId: string, messageId: string) => void;
}

export function useConversationRealtime(options: UseConversationRealtimeOptions = {}): UseConversationRealtimeReturn {
  const { user } = useAuth();
  const {
    conversationId,
    autoConnect = true,
    onNewMessage,
    onMessageDeleted,
    onMessageEdited,
    onTypingStart,
    onTypingStop,
    onReadReceipt,
    onNotification,
    onReactionUpdated,
    onPinsUpdated,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);

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

  // Add reaction to a message
  const addReaction = useCallback((messageId: string, emoji: string) => {
    // Optimistically update local state
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions || [];
      const existingReaction = reactions.find(r => r.emoji === emoji);
      const userId = user?.id || '';

      if (existingReaction) {
        // Already have this emoji - add user if not already there
        if (!existingReaction.userIds.includes(userId)) {
          return {
            ...m,
            reactions: reactions.map(r =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
                : r
            )
          };
        }
        return m;
      } else {
        // New emoji
        return {
          ...m,
          reactions: [...reactions, { emoji, count: 1, userIds: [userId] }]
        };
      }
    }));

    // Send to server
    messagingSocketService.addReaction(messageId, emoji, (response) => {
      if (!response.ok) {
        console.error('[useConversationRealtime] Failed to add reaction:', response.error);
        // Could revert optimistic update here if needed
      }
    });
  }, [user?.id]);

  // Remove reaction from a message
  const removeReaction = useCallback((messageId: string, emoji: string) => {
    // Optimistically update local state
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions || [];
      const userId = user?.id || '';

      return {
        ...m,
        reactions: reactions
          .map(r => {
            if (r.emoji !== emoji) return r;
            const newUserIds = r.userIds.filter(id => id !== userId);
            return newUserIds.length > 0
              ? { ...r, count: newUserIds.length, userIds: newUserIds }
              : null;
          })
          .filter((r): r is MessageReactionSummary => r !== null)
      };
    }));

    // Send to server
    messagingSocketService.removeReaction(messageId, emoji, (response) => {
      if (!response.ok) {
        console.error('[useConversationRealtime] Failed to remove reaction:', response.error);
        // Could revert optimistic update here if needed
      }
    });
  }, [user?.id]);

  // Pin a message
  const pinMessage = useCallback((messageId: string) => {
    // Optimistically update local state
    setPinnedMessageIds(prev => {
      if (prev.includes(messageId)) return prev;
      return [...prev, messageId];
    });

    // Send to server
    messagingSocketService.pinMessage(messageId, (response) => {
      if (!response.ok) {
        console.error('[useConversationRealtime] Failed to pin message:', response.error);
        // Revert optimistic update
        setPinnedMessageIds(prev => prev.filter(id => id !== messageId));
      }
    });
  }, []);

  // Unpin a message
  const unpinMessage = useCallback((messageId: string) => {
    // Optimistically update local state
    setPinnedMessageIds(prev => prev.filter(id => id !== messageId));

    // Send to server
    messagingSocketService.unpinMessage(messageId, (response) => {
      if (!response.ok) {
        console.error('[useConversationRealtime] Failed to unpin message:', response.error);
        // Revert optimistic update
        setPinnedMessageIds(prev => [...prev, messageId]);
      }
    });
  }, []);

  // Edit a message
  const editMessage = useCallback((messageId: string, content: string) => {
    if (!conversationId) return;

    // Optimistically update local state
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, content, editedAt: new Date().toISOString() }
        : msg
    ));

    // Send to server
    messagingSocketService.editMessage(conversationId, messageId, content, (response) => {
      if (!response.ok) {
        console.error('[useConversationRealtime] Failed to edit message:', response.error);
        // Could revert optimistic update here if needed by refetching
      }
    });
  }, [conversationId]);

  // Forward a message to another conversation
  const forwardMessage = useCallback((targetConversationId: string, messageId: string) => {
    if (!conversationId) return;

    // Send to server - no optimistic update needed since target conversation handles the new message
    messagingSocketService.forwardMessage(conversationId, targetConversationId, messageId, (response) => {
      if (!response.ok) {
        console.error('[useConversationRealtime] Failed to forward message:', response.error);
      }
    });
  }, [conversationId]);

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

    // Typing indicators (enhanced with user info)
    unsubscribers.push(
      messagingSocketService.on('conversation:user-typing', (data: unknown) => {
        const typedData = data as {
          conversationId: string;
          userId: string;
          userEmail: string;
          userName?: string;
          avatarUrl?: string | null;
          isTyping: boolean;
        };
        setTypingUsers(prev => {
          // Don't add if already in list
          if (prev.some(u => u.userId === typedData.userId)) return prev;
          return [...prev, {
            userId: typedData.userId,
            userEmail: typedData.userEmail,
            userName: typedData.userName || typedData.userEmail?.split('@')[0],
            avatarUrl: typedData.avatarUrl,
            conversationId: typedData.conversationId
          }];
        });
        onTypingStart?.({
          userId: typedData.userId,
          userEmail: typedData.userEmail,
          userName: typedData.userName,
          avatarUrl: typedData.avatarUrl,
          conversationId: typedData.conversationId
        });

        // Auto-remove after 5 seconds if no stop event
        const timeoutKey = `${typedData.conversationId}:${typedData.userId}`;
        const existingTimeout = typingTimeouts.current.get(timeoutKey);
        if (existingTimeout) clearTimeout(existingTimeout);

        typingTimeouts.current.set(timeoutKey, setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== typedData.userId));
          typingTimeouts.current.delete(timeoutKey);
        }, 5000));
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

    // Reactions updated
    unsubscribers.push(
      messagingSocketService.on('conversation:reaction:updated', (data: unknown) => {
        const typedData = data as ReactionUpdate;
        // Update local messages state with new reactions
        setMessages(prev => prev.map(m =>
          m.id === typedData.messageId
            ? { ...m, reactions: typedData.reactions }
            : m
        ));
        onReactionUpdated?.(typedData);
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

    // Pins updated
    unsubscribers.push(
      messagingSocketService.on('conversation:pins:updated', (data: unknown) => {
        const typedData = data as ConversationPinsUpdatedPayload;
        // Update pinned message IDs from the full pins list
        setPinnedMessageIds(typedData.pins.map(p => p.message.id));
        onPinsUpdated?.(typedData);
      })
    );

    // Message edited
    unsubscribers.push(
      messagingSocketService.on('conversation:message:edited', (data: unknown) => {
        const typedData = data as { message: ConversationMessage };
        // Update the message in local state
        setMessages(prev => prev.map(msg =>
          msg.id === typedData.message.id
            ? { ...msg, content: typedData.message.content, editedAt: typedData.message.editedAt }
            : msg
        ));
        onMessageEdited?.(typedData);
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
    onReactionUpdated,
    onPinsUpdated,
    onMessageEdited,
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
    pinnedMessageIds,

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

    // Reaction actions
    addReaction,
    removeReaction,

    // Pin actions
    pinMessage,
    unpinMessage,

    // Edit actions
    editMessage,

    // Forward actions
    forwardMessage,
  };
}

export default useConversationRealtime;
