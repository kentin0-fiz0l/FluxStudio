/**
 * Message Handlers Hook
 *
 * Consolidates message action handlers (send, reply, edit, delete, react, pin, etc.)
 * Extracted from MessagesNew.tsx for Phase 4.2 decomposition.
 */

import { useState, useRef, useCallback } from 'react';
import type { Message } from '@/components/messaging/types';
import type { UseConversationRealtimeReturn } from '@/hooks/useConversationRealtime';
import { toast } from '@/lib/toast';

export interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
  assetId?: string;
  uploading?: boolean;
  error?: string;
}

export interface UseMessageHandlersOptions {
  selectedConversationId: string | null;
  messages: Message[];
  userId?: string;
  realtime: UseConversationRealtimeReturn;
  pendingAttachments: PendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
}

export function useMessageHandlers({
  selectedConversationId,
  messages,
  userId,
  realtime,
  pendingAttachments,
  setPendingAttachments,
}: UseMessageHandlersOptions) {
  // Local state
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message['replyTo'] | undefined>();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Forward state
  const [forwardSourceMessage, setForwardSourceMessage] = useState<Message | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTargetConversationId, setForwardTargetConversationId] = useState<string | null>(null);

  // Typing indicator refs
  const lastTypingSentRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const uploadedAttachments = pendingAttachments.filter(a => a.assetId && !a.error && !a.uploading);
    const hasText = newMessage.trim().length > 0;
    const hasAttachments = uploadedAttachments.length > 0;

    if ((!hasText && !hasAttachments) || !selectedConversationId || isSending) return;

    setIsSending(true);
    try {
      // Send attachments first
      for (let i = 0; i < uploadedAttachments.length; i++) {
        const attachment = uploadedAttachments[i];
        const messageText = (i === 0 && hasText) ? newMessage.trim() : '';

        realtime.sendMessage(messageText, {
          replyToMessageId: i === 0 ? replyTo?.id : undefined,
          assetId: attachment.assetId,
        });
      }

      // Text-only message
      if (hasText && !hasAttachments) {
        realtime.sendMessage(newMessage.trim(), {
          replyToMessageId: replyTo?.id,
        });
      }

      // Clear state
      setNewMessage('');
      setReplyTo(undefined);
      pendingAttachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setPendingAttachments([]);
      realtime.stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [newMessage, selectedConversationId, isSending, pendingAttachments, replyTo, realtime, setPendingAttachments]);

  // Input change with typing indicator
  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);

    if (value.trim()) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > 1000) {
        realtime.startTyping();
        lastTypingSentRef.current = now;
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          realtime.stopTyping();
          isTypingRef.current = false;
        }
      }, 5000);
    } else {
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
  }, []);

  // React handler
  const handleReact = useCallback((messageId: string, emoji: string) => {
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
      toast.success('Message copied to clipboard');
    } catch (err) {
      console.error('Failed to copy message:', err);
      toast.error('Failed to copy message');
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
      toast.error('Failed to delete message');
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
    // State
    newMessage,
    replyTo,
    editingMessageId,
    editingDraft,
    isSending,
    forwardSourceMessage,
    isForwardModalOpen,
    forwardTargetConversationId,

    // Setters
    setNewMessage,
    setReplyTo,
    setEditingDraft,
    setForwardTargetConversationId,
    setIsForwardModalOpen,

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

export default useMessageHandlers;
