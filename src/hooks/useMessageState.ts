/**
 * useMessageState Hook
 * Manages editing, reply, and highlight state for messaging
 *
 * Features:
 * - Tracks message being edited with draft content
 * - Manages reply-to context
 * - Handles highlighted message state with auto-clear
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, ReplyContext } from '../components/messaging/types';

interface UseMessageStateOptions {
  /** Callback to edit message via realtime service */
  onEditMessage?: (messageId: string, content: string) => void;
  /** Auto-clear highlight after this many ms (default: 2000) */
  highlightTimeoutMs?: number;
}

interface UseMessageStateReturn {
  // Editing state
  /** ID of message currently being edited */
  editingMessageId: string | null;
  /** Draft content for the message being edited */
  editingDraft: string;
  /** Start editing a message */
  startEdit: (message: Message) => void;
  /** Update the editing draft */
  setEditingDraft: (draft: string) => void;
  /** Submit the edited message */
  submitEdit: () => void;
  /** Cancel editing */
  cancelEdit: () => void;
  /** Check if a specific message is being edited */
  isEditing: (messageId: string) => boolean;

  // Reply state
  /** Current reply context */
  replyTo: ReplyContext | undefined;
  /** Set reply context from a message */
  setReplyTo: (message: Message) => void;
  /** Clear reply context */
  clearReply: () => void;

  // Highlight state
  /** ID of currently highlighted message */
  highlightedMessageId: string | null;
  /** Highlight a message (auto-clears after timeout) */
  highlightMessage: (messageId: string) => void;
  /** Check if a specific message is highlighted */
  isHighlighted: (messageId: string) => boolean;
}

export function useMessageState({
  onEditMessage,
  highlightTimeoutMs = 2000,
}: UseMessageStateOptions = {}): UseMessageStateReturn {
  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');

  // Reply state
  const [replyTo, setReplyToState] = useState<ReplyContext | undefined>();

  // Highlight state
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Editing handlers
  const startEdit = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditingDraft(message.content || '');
  }, []);

  const submitEdit = useCallback(() => {
    if (!editingMessageId || !editingDraft.trim()) return;

    onEditMessage?.(editingMessageId, editingDraft.trim());
    setEditingMessageId(null);
    setEditingDraft('');
  }, [editingMessageId, editingDraft, onEditMessage]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingDraft('');
  }, []);

  const isEditing = useCallback((messageId: string) => {
    return editingMessageId === messageId;
  }, [editingMessageId]);

  // Reply handlers
  const setReplyTo = useCallback((message: Message) => {
    setReplyToState({
      id: message.id,
      content: message.content,
      author: message.author,
    });
  }, []);

  const clearReply = useCallback(() => {
    setReplyToState(undefined);
  }, []);

  // Highlight handlers
  const highlightMessage = useCallback((messageId: string) => {
    // Clear any existing timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    setHighlightedMessageId(messageId);

    // Auto-clear after timeout
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId(prev => (prev === messageId ? null : prev));
    }, highlightTimeoutMs);
  }, [highlightTimeoutMs]);

  const isHighlighted = useCallback((messageId: string) => {
    return highlightedMessageId === messageId;
  }, [highlightedMessageId]);

  return {
    // Editing
    editingMessageId,
    editingDraft,
    startEdit,
    setEditingDraft,
    submitEdit,
    cancelEdit,
    isEditing,

    // Reply
    replyTo,
    setReplyTo,
    clearReply,

    // Highlight
    highlightedMessageId,
    highlightMessage,
    isHighlighted,
  };
}

export default useMessageState;
