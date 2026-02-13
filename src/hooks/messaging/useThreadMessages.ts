/**
 * useThreadMessages Hook
 *
 * Extracts thread panel state and handlers from MessagesNew.tsx:
 * - Thread panel visibility
 * - Active thread root message
 * - Thread messages loading
 * - Thread reply handling
 *
 * Phase 4.2 Technical Debt Resolution
 */

import { useState, useCallback } from 'react';
import type { Message } from '@/components/messaging/types';

interface UseThreadMessagesOptions {
  conversationId: string | null;
  userId?: string;
  userName?: string;
  realtime: {
    sendMessage: (text: string, options?: { replyToMessageId?: string }) => void;
  };
}

interface UseThreadMessagesReturn {
  // State
  activeThreadRootId: string | null;
  isThreadPanelOpen: boolean;
  threadMessages: Message[];
  isLoadingThread: boolean;
  threadHighlightId: string | null;

  // Handlers
  handleOpenThread: (messageId: string) => Promise<void>;
  handleCloseThread: () => void;
  handleThreadReply: (text: string) => Promise<void>;
  setThreadHighlightId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useThreadMessages({
  conversationId,
  userId,
  userName,
  realtime,
}: UseThreadMessagesOptions): UseThreadMessagesReturn {
  const [activeThreadRootId, setActiveThreadRootId] = useState<string | null>(null);
  const [isThreadPanelOpen, setIsThreadPanelOpen] = useState(false);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [threadHighlightId, setThreadHighlightId] = useState<string | null>(null);

  // Open thread panel and load thread messages
  const handleOpenThread = useCallback(async (messageId: string) => {
    if (!conversationId) return;

    setActiveThreadRootId(messageId);
    setIsThreadPanelOpen(true);
    setIsLoadingThread(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `/api/conversations/${conversationId}/threads/${messageId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Transform to Message format
        const transformedMessages = (data.messages || []).map((m: { id: string; text: string; createdAt: string; userId: string; userName?: string }): Message => ({
          id: m.id,
          content: m.text,
          timestamp: new Date(m.createdAt),
          author: {
            id: m.userId,
            name: m.userName || 'Unknown',
            initials: (m.userName || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
          },
          status: 'delivered',
          isCurrentUser: m.userId === userId,
        }));
        setThreadMessages(transformedMessages);
      }
    } catch (error) {
      console.error('Failed to load thread messages:', error);
    } finally {
      setIsLoadingThread(false);
    }
  }, [conversationId, userId]);

  // Close thread panel
  const handleCloseThread = useCallback(() => {
    setIsThreadPanelOpen(false);
    setActiveThreadRootId(null);
    setThreadMessages([]);
  }, []);

  // Reply to thread
  const handleThreadReply = useCallback(async (text: string) => {
    if (!conversationId || !activeThreadRootId) return;

    // Send message with thread root reference
    realtime.sendMessage(text, {
      replyToMessageId: activeThreadRootId,
    });

    // Optimistically add to thread messages
    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      content: text,
      timestamp: new Date(),
      author: {
        id: userId || '',
        name: userName || 'You',
        initials: (userName || 'Y').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
      },
      status: 'sending',
      isCurrentUser: true,
    };
    setThreadMessages(prev => [...prev, newMessage]);
  }, [conversationId, activeThreadRootId, realtime, userId, userName]);

  return {
    // State
    activeThreadRootId,
    isThreadPanelOpen,
    threadMessages,
    isLoadingThread,
    threadHighlightId,

    // Handlers
    handleOpenThread,
    handleCloseThread,
    handleThreadReply,
    setThreadHighlightId,
  };
}

export default useThreadMessages;
