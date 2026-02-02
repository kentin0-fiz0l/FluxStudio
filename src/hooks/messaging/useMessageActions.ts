/**
 * useMessageActions Hook
 *
 * Extracts message action handlers from MessagesNew.tsx:
 * - Send messages (with attachments)
 * - Reply to messages
 * - React to messages
 * - Pin/unpin messages
 * - Copy message content
 * - Edit messages
 * - Delete messages
 * - Forward messages
 *
 * Phase 4.2 Technical Debt Resolution
 */

import { useState, useRef, useCallback } from 'react';
import type { Message, PendingAttachment } from '@/components/messaging/types';

interface UseMessageActionsOptions {
  selectedConversationId: string | null;
  messages: Message[];
  userId?: string;
  realtime: {
    sendMessage: (text: string, options?: { replyToMessageId?: string; assetId?: string }) => void;
    startTyping: () => void;
    stopTyping: () => void;
    addReaction: (messageId: string, emoji: string) => void;
    removeReaction: (messageId: string, emoji: string) => void;
    pinMessage: (messageId: string) => void;
    unpinMessage: (messageId: string) => void;
    editMessage: (messageId: string, text: string) => void;
    deleteMessage: (messageId: string) => void;
    forwardMessage: (targetConversationId: string, messageId: string) => void;
    pinnedMessageIds: string[];
  };
  pendingAttachments: PendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  composerRef?: React.RefObject<HTMLDivElement>;
}

interface UseMessageActionsReturn {
  // Message state
  newMessage: string;
  setNewMessage: (value: string) => void;
  replyTo: Message['replyTo'] | undefined;
  setReplyTo: React.Dispatch<React.SetStateAction<Message['replyTo'] | undefined>>;
  isSending: boolean;

  // Editing state
  editingMessageId: string | null;
  editingDraft: string;
  setEditingDraft: React.Dispatch<React.SetStateAction<string>>;

  // Forward state
  forwardSourceMessage: Message | null;
  isForwardModalOpen: boolean;
  setIsForwardModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  forwardTargetConversationId: string | null;
  setForwardTargetConversationId: React.Dispatch<React.SetStateAction<string | null>>;

  // Handlers
  handleSendMessage: () => Promise<void>;
  handleInputChange: (value: string) => void;
  handleReply: (message: Message) => void;
  handleReact: (messageId: string, emoji: string) => void;
  handlePinMessage: (messageId: string) => void;
  handleCopyMessage: (messageId: string) => Promise<void>;
  handleStartEdit: (message: Message) => void;
  handleSubmitEdit: () => void;
  handleCancelEdit: () => void;
  handleDeleteMessage: (messageId: string) => void;
  handleStartForward: (message: Message) => void;
  handleConfirmForward: () => void;
  handleCancelForward: () => void;
}

export function useMessageActions({
  selectedConversationId,
  messages,
  userId,
  realtime,
  pendingAttachments,
  setPendingAttachments,
  composerRef,
}: UseMessageActionsOptions): UseMessageActionsReturn {
  // Message composition state
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message['replyTo'] | undefined>();
  const [isSending, setIsSending] = useState(false);

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  // Forward state
  const [forwardSourceMessage, setForwardSourceMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTargetConversationId, setForwardTargetConversationId] = useState<string | null>(null);

  // Typing debounce state
  const lastTypingSentRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    // Get uploaded attachments (those with assetId and no error)
    const uploadedAttachments = pendingAttachments.filter(a => a.assetId && !a.error && !a.uploading);
    const hasText = newMessage.trim().length > 0;
    const hasAttachments = uploadedAttachments.length > 0;

    // Need either text or attachments
    if ((!hasText && !hasAttachments) || !selectedConversationId || isSending) return;

    setIsSending(true);
    try {
      // Send attachments first (one message per attachment)
      for (let i = 0; i < uploadedAttachments.length; i++) {
        const attachment = uploadedAttachments[i];
        // For the first attachment, include any text
        const messageText = (i === 0 && hasText) ? newMessage.trim() : '';

        realtime.sendMessage(messageText, {
          replyToMessageId: i === 0 ? replyTo?.id : undefined,
          assetId: attachment.assetId,
        });
      }

      // If we have text but no attachments, send text-only message
      if (hasText && !hasAttachments) {
        realtime.sendMessage(newMessage.trim(), {
          replyToMessageId: replyTo?.id,
        });
      }

      // Clear state
      setNewMessage('');
      setReplyTo(undefined);
      // Clean up pending attachments (revoke object URLs)
      pendingAttachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setPendingAttachments([]);
      // Stop typing indicator
      realtime.stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedConversationId, isSending, pendingAttachments, replyTo, realtime, setPendingAttachments]);

  // Handle typing indicator with debouncing (max 1 event per second)
  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);

    // Start typing indicator with debouncing
    if (value.trim()) {
      const now = Date.now();
      // Only send typing event at most once per second
      if (now - lastTypingSentRef.current > 1000) {
        realtime.startTyping();
        lastTypingSentRef.current = now;
        isTypingRef.current = true;
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 5 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          realtime.stopTyping();
          isTypingRef.current = false;
        }
      }, 5000);
    } else {
      // Text cleared - stop typing immediately
      if (isTypingRef.current) {
        realtime.stopTyping();
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [realtime]);

  // Reply handler
  const handleReply = useCallback((message: Message) => {
    setReplyTo({
      id: message.id,
      content: message.content,
      author: message.author
    });
    // Scroll composer into view
    setTimeout(() => {
      composerRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }, [composerRef]);

  // React handler
  const handleReact = useCallback((messageId: string, emoji: string) => {
    // Find the message to check if user has already reacted
    const msg = messages.find(m => m.id === messageId);
    const reactions = msg?.reactions || [];
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const hasUserReacted = existingReaction?.userIds?.includes(userId || '') || false;

    if (hasUserReacted) {
      realtime.removeReaction(messageId, emoji);
    } else {
      realtime.addReaction(messageId, emoji);
    }
  }, [messages, userId, realtime]);

  // Pin handler
  const handlePinMessage = useCallback((messageId: string) => {
    const isPinned = realtime.pinnedMessageIds.includes(messageId);
    if (isPinned) {
      realtime.unpinMessage(messageId);
    } else {
      realtime.pinMessage(messageId);
    }
  }, [realtime]);

  // Copy handler
  const handleCopyMessage = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.content) return;
    try {
      await navigator.clipboard.writeText(msg.content);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  }, [messages]);

  // Edit handlers
  const handleStartEdit = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditingDraft(message.content || '');
  }, []);

  const handleSubmitEdit = useCallback(() => {
    if (!editingMessageId || !editingDraft.trim()) return;
    realtime.editMessage(editingMessageId, editingDraft.trim());
    setEditingMessageId(null);
    setEditingDraft('');
  }, [editingMessageId, editingDraft, realtime]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingDraft('');
  }, []);

  // Delete handler
  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!selectedConversationId) return;
    try {
      realtime.deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, [selectedConversationId, realtime]);

  // Forward handlers
  const handleStartForward = useCallback((message: Message) => {
    setForwardSourceMessage(message);
    setForwardTargetConversationId(null);
    setIsForwardModalOpen(true);
  }, []);

  const handleConfirmForward = useCallback(() => {
    if (!forwardSourceMessage || !forwardTargetConversationId) return;

    realtime.forwardMessage(forwardTargetConversationId, forwardSourceMessage.id);
    setIsForwardModalOpen(false);
    setForwardSourceMessage(null);
    setForwardTargetConversationId(null);
  }, [forwardSourceMessage, forwardTargetConversationId, realtime]);

  const handleCancelForward = useCallback(() => {
    setIsForwardModalOpen(false);
    setForwardSourceMessage(null);
    setForwardTargetConversationId(null);
  }, []);

  return {
    // Message state
    newMessage,
    setNewMessage,
    replyTo,
    setReplyTo,
    isSending,

    // Editing state
    editingMessageId,
    editingDraft,
    setEditingDraft,

    // Forward state
    forwardSourceMessage,
    isForwardModalOpen,
    setIsForwardModalOpen,
    forwardTargetConversationId,
    setForwardTargetConversationId,

    // Handlers
    handleSendMessage,
    handleInputChange,
    handleReply,
    handleReact,
    handlePinMessage,
    handleCopyMessage,
    handleStartEdit,
    handleSubmitEdit,
    handleCancelEdit,
    handleDeleteMessage,
    handleStartForward,
    handleConfirmForward,
    handleCancelForward,
  };
}

export default useMessageActions;
