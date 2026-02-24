/**
 * useRealtimeMessages Hook
 * Real-time message synchronization and optimistic updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, MessageUser } from '../types/messaging';
import { realtimeCollaborationService } from '../services/realtimeCollaborationService';

interface MessageUpdate {
  type: 'add' | 'update' | 'delete' | 'reaction';
  message: Message;
  conversationId: string;
  userId: string;
  timestamp: Date;
}

interface OptimisticMessage extends Omit<Message, 'id'> {
  id: string;
  isOptimistic?: boolean;
  isSending?: boolean;
  sendError?: string;
}

interface UseRealtimeMessagesOptions {
  conversationId?: string;
  currentUser: MessageUser;
  enabled?: boolean;
}

export function useRealtimeMessages({
  conversationId,
  currentUser,
  enabled = true
}: UseRealtimeMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [queuedMessageCount, setQueuedMessageCount] = useState(0);

  const messageQueueRef = useRef<MessageUpdate[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define all handlers before the useEffect that uses them
  const handleIncomingMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      const exists = prev.find(m => m.id === message.id);
      if (exists) return prev;

      // Insert message in chronological order
      const newMessages = [...prev, message];
      return newMessages.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });

    // Remove corresponding optimistic message if it exists
    setOptimisticMessages(prev =>
      prev.filter(m => !(m.content === message.content && m.author.id === message.author.id))
    );

    setLastSyncTime(new Date());
  }, []);

  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    setMessages(prev =>
      prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
    );
    setLastSyncTime(new Date());
  }, []);

  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setLastSyncTime(new Date());
  }, []);

  const handleMessageReaction = useCallback((reactionData: { messageId: string; reactions: unknown }) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === reactionData.messageId) {
          // Update message reactions
          return {
            ...m,
            reactions: reactionData.reactions
          };
        }
        return m;
      })
    );
    setLastSyncTime(new Date());
  }, []);

  const sendMessageToServer = useCallback(async (update: MessageUpdate): Promise<void> => {
    // In a real implementation, this would make an API call
    // For now, we'll simulate with WebSocket
    realtimeCollaborationService.sendMessageEvent(update.conversationId, update.message);
  }, []);

  const processMessageQueue = useCallback(async () => {
    if (messageQueueRef.current.length === 0) return;

    setSyncStatus('syncing');

    try {
      // Process queued messages
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      setQueuedMessageCount(0);

      for (const update of queue) {
        await sendMessageToServer(update);
      }

      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to process message queue:', error);
      setSyncStatus('error');
      // Schedule retry handled below
    }
  }, [sendMessageToServer]);

  // Initialize real-time connection - after all handlers are defined
  useEffect(() => {
    if (!enabled || !conversationId) return;

    const handleConnectionStatus = (status: { connected: boolean }) => {
      setIsConnected(status.connected);
      if (status.connected) {
        // Process queued messages when reconnected
        processMessageQueue();
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    };

    const handleMessageEvent = (event: { conversationId: string; type: string; userId: string; data: Message & { id: string } }) => {
      if (event.conversationId !== conversationId) return;

      switch (event.type) {
        case 'message_send':
          if (event.userId !== currentUser.id) {
            handleIncomingMessage(event.data);
          }
          break;

        case 'message_update':
          if (event.userId !== currentUser.id) {
            handleMessageUpdate(event.data);
          }
          break;

        case 'message_delete':
          if (event.userId !== currentUser.id) {
            handleMessageDelete(event.data.id);
          }
          break;

        case 'message_reaction':
          if (event.userId !== currentUser.id) {
            handleMessageReaction(event.data as unknown as { messageId: string; reactions: unknown });
          }
          break;
      }
    };

    realtimeCollaborationService.on('connection_status', handleConnectionStatus);
    realtimeCollaborationService.on('message_event', handleMessageEvent);

    // Join conversation
    realtimeCollaborationService.joinConversation(conversationId);

    const retryTimeout = retryTimeoutRef.current;

    return () => {
      realtimeCollaborationService.off('connection_status', handleConnectionStatus);
      realtimeCollaborationService.off('message_event', handleMessageEvent);
      realtimeCollaborationService.leaveConversation(conversationId);

      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [conversationId, currentUser.id, enabled, handleIncomingMessage, handleMessageUpdate, handleMessageDelete, handleMessageReaction, processMessageQueue]);

  const sendMessage = useCallback(async (messageData: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!conversationId) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: OptimisticMessage = {
      ...messageData,
      id: optimisticId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOptimistic: true,
      isSending: true,
      author: currentUser
    };

    // Add optimistic message immediately
    setOptimisticMessages(prev => [...prev, optimisticMessage]);

    const messageUpdate: MessageUpdate = {
      type: 'add',
      message: optimisticMessage as Message,
      conversationId,
      userId: currentUser.id,
      timestamp: new Date()
    };

    try {
      if (isConnected) {
        await sendMessageToServer(messageUpdate);

        // Remove optimistic message after successful send
        setTimeout(() => {
          setOptimisticMessages(prev =>
            prev.filter(m => m.id !== optimisticId)
          );
        }, 1000);
      } else {
        // Queue message for later sending
        messageQueueRef.current.push(messageUpdate);
        setQueuedMessageCount(prev => prev + 1);

        // Update optimistic message to show queued state
        setOptimisticMessages(prev =>
          prev.map(m =>
            m.id === optimisticId
              ? { ...m, isSending: false, sendError: 'Queued for sending...' }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);

      // Update optimistic message to show error
      setOptimisticMessages(prev =>
        prev.map(m =>
          m.id === optimisticId
            ? { ...m, isSending: false, sendError: 'Failed to send. Tap to retry.' }
            : m
        )
      );
    }
  }, [conversationId, currentUser, isConnected, sendMessageToServer]);

  const retryMessage = useCallback((messageId: string) => {
    const optimisticMessage = optimisticMessages.find(m => m.id === messageId);
    if (!optimisticMessage || !conversationId) return;

    // Reset message state
    setOptimisticMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? { ...m, isSending: true, sendError: undefined }
          : m
      )
    );

    const messageUpdate: MessageUpdate = {
      type: 'add',
      message: optimisticMessage as Message,
      conversationId,
      userId: currentUser.id,
      timestamp: new Date()
    };

    messageQueueRef.current.push(messageUpdate);
    setQueuedMessageCount(prev => prev + 1);
    processMessageQueue();
  }, [optimisticMessages, conversationId, currentUser.id, processMessageQueue]);

  const updateMessage = useCallback(async (messageId: string, updates: Partial<Message>) => {
    if (!conversationId) return;

    // Optimistically update local message
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? { ...m, ...updates, updatedAt: new Date() }
          : m
      )
    );

    const messageUpdate: MessageUpdate = {
      type: 'update',
      message: { id: messageId, ...updates } as Message,
      conversationId,
      userId: currentUser.id,
      timestamp: new Date()
    };

    if (isConnected) {
      try {
        await sendMessageToServer(messageUpdate);
      } catch (error) {
        console.error('Failed to update message:', error);
        // Revert optimistic update on error
        // In a real app, you'd revert to the previous state
      }
    } else {
      messageQueueRef.current.push(messageUpdate);
      setQueuedMessageCount(prev => prev + 1);
    }
  }, [conversationId, currentUser.id, isConnected, sendMessageToServer]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!conversationId) return;

    // Optimistically remove message
    setMessages(prev => prev.filter(m => m.id !== messageId));

    const messageUpdate: MessageUpdate = {
      type: 'delete',
      message: { id: messageId } as Message,
      conversationId,
      userId: currentUser.id,
      timestamp: new Date()
    };

    if (isConnected) {
      try {
        await sendMessageToServer(messageUpdate);
      } catch (error) {
        console.error('Failed to delete message:', error);
        // Revert optimistic delete on error
      }
    } else {
      messageQueueRef.current.push(messageUpdate);
      setQueuedMessageCount(prev => prev + 1);
    }
  }, [conversationId, currentUser.id, isConnected, sendMessageToServer]);

  // Combine real messages with optimistic messages
  const allMessages = [...messages, ...optimisticMessages].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    messages: allMessages,
    isConnected,
    syncStatus,
    lastSyncTime,
    queuedMessages: queuedMessageCount,
    sendMessage,
    updateMessage,
    deleteMessage,
    retryMessage,
    processMessageQueue
  };
}

export default useRealtimeMessages;