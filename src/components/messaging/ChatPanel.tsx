/**
 * ChatPanel Component
 * Main chat area container with header, message list, and composer
 *
 * Features:
 * - Chat header with participant info and action buttons
 * - Pinned messages panel
 * - Message list with date separators
 * - Typing indicators
 * - Message composer integration
 * - Thread panel support
 * - Mobile responsive
 */

import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  ArrowLeft,
  Search,
  Phone,
  Video,
  Pin,
  MoreVertical,
  X,
  PinOff,
  Sparkles,
  MessageCircle,
  Loader2,
} from 'lucide-react';

import { Card } from '@/components/ui';
import { ChatAvatar } from './ChatMessageBubble';
import type { Message, Conversation } from './types';

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Conversation header presence/status display
 */
function ConversationHeaderPresence({
  isOnline,
  lastSeen,
  isTyping,
  isGroup,
  memberCount,
}: {
  isOnline?: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
  isGroup?: boolean;
  memberCount?: number;
}) {
  if (isTyping) {
    return (
      <p className="text-xs text-primary-600 dark:text-primary-400 animate-pulse">
        typing...
      </p>
    );
  }

  if (isGroup && memberCount) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {memberCount} members
      </p>
    );
  }

  if (isOnline) {
    return (
      <p className="text-xs text-green-600 dark:text-green-400">Online</p>
    );
  }

  if (lastSeen) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Last seen {formatLastSeen(lastSeen)}
      </p>
    );
  }

  return null;
}

function formatLastSeen(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Date separator between messages from different days
 */
function DateSeparator({ date }: { date: Date }) {
  const formatDate = (d: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-4 my-4 px-4">
      <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
        {formatDate(date)}
      </span>
      <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
    </div>
  );
}

/**
 * Typing indicator showing who is typing
 */
function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;

  const message =
    users.length === 1
      ? `${users[0]} is typing...`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing...`
        : `${users[0]} and ${users.length - 1} others are typing...`;

  return (
    <div className="px-4 py-2 flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{message}</span>
    </div>
  );
}

/**
 * Pinned Messages Panel showing all pinned messages
 */
export function PinnedMessagesPanel({
  messages,
  onClose,
  onUnpin,
  onJumpTo,
}: {
  messages: Message[];
  onClose: () => void;
  onUnpin: (messageId: string) => void;
  onJumpTo: (messageId: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="absolute inset-x-0 top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 p-4 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-accent-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Pinned Messages</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No pinned messages yet</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 top-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 p-4 max-h-64 overflow-y-auto z-20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-accent-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Pinned Messages ({messages.length})
          </h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      </div>
      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-3 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            onClick={() => onJumpTo(msg.id)}
          >
            <ChatAvatar user={msg.author} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{msg.author.name}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">{msg.content}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(msg.id);
              }}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
              title="Unpin"
            >
              <PinOff className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state for when no conversation is selected
 */
export function EmptyChatState({ onStartConversation }: { onStartConversation: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
        <MessageCircle className="w-10 h-10 text-primary-600 dark:text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        Select a conversation
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        Choose a conversation from the sidebar or start a new one.
      </p>
      <button
        onClick={onStartConversation}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
      >
        Start New Conversation
      </button>
    </div>
  );
}

/**
 * Thread micro-hint for first-time users
 */
function ThreadMicroHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-indigo-900 dark:text-indigo-100">
            <span className="font-medium">Threads keep replies organized.</span>
            {' '}Click the reply icon on any message to start a focused thread.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss hint"
        >
          <X className="w-4 h-4 text-indigo-500" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main ChatPanel Component
// ============================================================================

export interface ChatPanelProps {
  /** The selected conversation */
  conversation: Conversation | null;
  /** Messages in the conversation */
  messages: Message[];
  /** Pinned message IDs */
  pinnedMessageIds: string[];
  /** Users currently typing */
  typingUsers: Array<{ userId: string; userName?: string; userEmail?: string }>;
  /** Whether connected to real-time */
  isConnected: boolean;
  /** Message that is highlighted (for jump-to) */
  highlightedMessageId: string | null;
  /** Thread highlight ID */
  threadHighlightId?: string | null;
  /** ID of message being edited */
  editingMessageId: string | null;
  /** Draft text for editing */
  editingDraft: string;
  /** Current user ID */
  currentUserId?: string;
  /** Whether mobile chat is shown */
  showMobileChat: boolean;
  /** Called to go back on mobile */
  onMobileBack: () => void;
  /** Called when reply is clicked */
  onReply: (message: Message) => void;
  /** Called when edit is clicked */
  onEdit: (message: Message) => void;
  /** Called when delete is clicked */
  onDelete: (messageId: string) => void;
  /** Called when pin is clicked */
  onPin: (messageId: string) => void;
  /** Called when copy is clicked */
  onCopy: (messageId: string) => void;
  /** Called when forward is clicked */
  onForward: (message: Message) => void;
  /** Called when react is clicked */
  onReact: (messageId: string, emoji: string) => void;
  /** Called to open thread */
  onOpenThread: (messageId: string) => void;
  /** Called to view asset in files */
  onViewInFiles?: (assetId: string) => void;
  /** Called to jump to a message */
  onJumpToMessage: (messageId: string) => void;
  /** Called when editing draft changes */
  onChangeEditingDraft: (draft: string) => void;
  /** Called to submit edit */
  onSubmitEdit: () => void;
  /** Called to cancel edit */
  onCancelEdit: () => void;
  /** Called to start new conversation */
  onStartConversation: () => void;
  /** Pinned messages panel state */
  showPinnedMessages: boolean;
  onTogglePinnedMessages: () => void;
  /** Summary panel state */
  showSummaryPanel: boolean;
  onToggleSummaryPanel: () => void;
  /** Message search state */
  showMessageSearch: boolean;
  onToggleMessageSearch: () => void;
  /** Thread hint state */
  showThreadHint?: boolean;
  onDismissThreadHint?: () => void;
  /** Message search panel component (rendered externally) */
  messageSearchPanel?: React.ReactNode;
  /** Message composer component (rendered externally) */
  composer: React.ReactNode;
}

export interface ChatPanelRef {
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(function ChatPanel(
  {
    conversation,
    messages,
    pinnedMessageIds,
    typingUsers,
    isConnected,
    highlightedMessageId,
    threadHighlightId,
    editingMessageId,
    editingDraft,
    currentUserId,
    showMobileChat,
    onMobileBack,
    onReply,
    onEdit,
    onDelete,
    onPin,
    onCopy,
    onForward,
    onReact,
    onOpenThread,
    onViewInFiles,
    onJumpToMessage,
    onChangeEditingDraft,
    onSubmitEdit,
    onCancelEdit,
    onStartConversation,
    showPinnedMessages,
    onTogglePinnedMessages,
    showSummaryPanel,
    onToggleSummaryPanel,
    showMessageSearch,
    onToggleMessageSearch,
    showThreadHint,
    onDismissThreadHint,
    messageSearchPanel,
    composer,
  },
  ref
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Message lookup map for finding parent messages
  const messageById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages]
  );

  // Pinned messages derived from IDs
  const pinnedMessages = useMemo(
    () => messages.filter((m) => pinnedMessageIds.includes(m.id)),
    [messages, pinnedMessageIds]
  );

  // Expose scroll methods via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    },
    scrollToMessage: (messageId: string) => {
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageEl) {
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageEl.classList.add('ring-2', 'ring-primary-500');
        setTimeout(() => messageEl.classList.remove('ring-2', 'ring-primary-500'), 2000);
      }
    },
  }));

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Dynamic import to avoid circular dependency - use parent's MessageBubble
  // The actual rendering of messages is done by the parent component
  // which passes in the rendered messages or uses a render prop

  if (!conversation) {
    return (
      <Card className={`flex-1 flex flex-col overflow-hidden border-0 md:border ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <EmptyChatState onStartConversation={onStartConversation} />
      </Card>
    );
  }

  return (
    <Card className={`flex-1 flex flex-col overflow-hidden border-0 md:border ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onMobileBack}
            className="md:hidden p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
          <ChatAvatar user={conversation.participant} size="md" showStatus />
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {conversation.title}
            </h3>
            <ConversationHeaderPresence
              isOnline={conversation.participant?.isOnline}
              lastSeen={conversation.participant?.lastSeen}
              isTyping={typingUsers.some((t) => t.userId === conversation.participant?.id)}
              isGroup={conversation.type === 'group'}
              memberCount={conversation.participants?.length}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMessageSearch}
            className={`p-2 rounded-lg transition-colors ${
              showMessageSearch
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Search messages (Ctrl+F)"
          >
            <Search
              className={`w-5 h-5 ${
                showMessageSearch ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'
              }`}
            />
          </button>
          <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Voice call">
            <Phone className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
          <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg" title="Video call">
            <Video className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
          <button
            onClick={onTogglePinnedMessages}
            className={`p-2 rounded-lg transition-colors ${
              showPinnedMessages
                ? 'bg-accent-100 dark:bg-accent-900/30'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Pinned messages"
          >
            <Pin
              className={`w-5 h-5 ${
                showPinnedMessages ? 'text-accent-600' : 'text-neutral-600 dark:text-neutral-400'
              }`}
            />
          </button>
          <button
            onClick={onToggleSummaryPanel}
            className={`p-2 rounded-lg transition-colors ${
              showSummaryPanel
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title="Conversation summary"
          >
            <Sparkles
              className={`w-5 h-5 ${
                showSummaryPanel ? 'text-primary-600' : 'text-neutral-600 dark:text-neutral-400'
              }`}
            />
          </button>
          <button
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            title="More options"
          >
            <MoreVertical className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Pinned Messages Panel */}
      {showPinnedMessages && (
        <PinnedMessagesPanel
          messages={pinnedMessages}
          onClose={onTogglePinnedMessages}
          onUnpin={onPin}
          onJumpTo={(id) => {
            onJumpToMessage(id);
            onTogglePinnedMessages();
          }}
        />
      )}

      {/* Message Search Panel */}
      {showMessageSearch && messageSearchPanel}

      {/* Thread micro-hint */}
      {showThreadHint && messages.length > 0 && onDismissThreadHint && (
        <ThreadMicroHint onDismiss={onDismissThreadHint} />
      )}

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto py-4 relative">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 dark:from-primary-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const showDateSeparator =
                !prevMessage ||
                message.timestamp.toDateString() !== prevMessage.timestamp.toDateString();
              const isGrouped =
                prevMessage &&
                prevMessage.author.id === message.author.id &&
                message.timestamp.getTime() - prevMessage.timestamp.getTime() < 60000;

              // Look up parent message for reply threading
              const parentMessage = message.replyTo?.id
                ? messageById.get(message.replyTo.id)
                : undefined;

              // Enrich message with parent data if available
              const enrichedMessage =
                parentMessage && message.replyTo
                  ? {
                      ...message,
                      replyTo: {
                        id: parentMessage.id,
                        content: parentMessage.content,
                        author: parentMessage.author,
                      },
                    }
                  : message;

              // We need to import MessageBubble from the parent or use render props
              // For now, we'll use a simple inline rendering
              return (
                <React.Fragment key={message.id}>
                  {showDateSeparator && <DateSeparator date={message.timestamp} />}
                  <MessageBubbleWrapper
                    message={enrichedMessage}
                    onReply={() => onReply(message)}
                    onEdit={() => onEdit(message)}
                    onDelete={() => onDelete(message.id)}
                    onPin={() => onPin(message.id)}
                    onCopy={() => onCopy(message.id)}
                    onJumpToMessage={onJumpToMessage}
                    onForward={() => onForward(message)}
                    onReact={(emoji) => onReact(message.id, emoji)}
                    onOpenThread={() => onOpenThread(message.id)}
                    onViewInFiles={onViewInFiles}
                    isGrouped={isGrouped || false}
                    currentUserId={currentUserId}
                    isPinned={pinnedMessageIds.includes(message.id)}
                    isHighlighted={
                      highlightedMessageId === message.id || threadHighlightId === message.id
                    }
                    isEditing={editingMessageId === message.id}
                    editingDraft={editingMessageId === message.id ? editingDraft : ''}
                    onChangeEditingDraft={onChangeEditingDraft}
                    onSubmitEdit={onSubmitEdit}
                    onCancelEdit={onCancelEdit}
                  />
                </React.Fragment>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator
                users={typingUsers.map(
                  (u) => u.userName || u.userEmail?.split('@')[0] || 'Someone'
                )}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Reconnecting...
          </div>
        </div>
      )}

      {/* Message Composer */}
      {composer}
    </Card>
  );
});

// ============================================================================
// Message Bubble Wrapper (placeholder for actual MessageBubble integration)
// ============================================================================

/**
 * Wrapper component that renders a single message bubble
 * This is a temporary implementation - the actual MessageBubble should be
 * imported from ChatMessageBubble.tsx when integrating
 */
interface MessageBubbleWrapperProps {
  message: Message;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onCopy: () => void;
  onJumpToMessage: (messageId: string) => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
  onOpenThread: () => void;
  onViewInFiles?: (assetId: string) => void;
  isGrouped: boolean;
  currentUserId?: string;
  isPinned: boolean;
  isHighlighted: boolean;
  isEditing: boolean;
  editingDraft: string;
  onChangeEditingDraft: (draft: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
}

function MessageBubbleWrapper({
  message,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onCopy: _onCopy,
  onJumpToMessage,
  onForward: _onForward,
  onReact,
  onOpenThread,
  onViewInFiles: _onViewInFiles,
  isGrouped,
  currentUserId,
  isPinned,
  isHighlighted,
  isEditing,
  editingDraft,
  onChangeEditingDraft,
  onSubmitEdit,
  onCancelEdit,
}: MessageBubbleWrapperProps) {
  // Note: _onCopy, _onForward, _onViewInFiles are available but not used in this simplified wrapper
  // The full ChatMessageBubble component uses these
  // This is a simplified placeholder - the full MessageBubble from ChatMessageBubble.tsx
  // should be used in the actual integration
  const isOwn = message.author.id === currentUserId;

  return (
    <div
      data-message-id={message.id}
      className={`px-4 ${isGrouped ? 'pt-0.5' : 'pt-3'} ${
        isHighlighted ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500 rounded' : ''
      } ${isOwn ? 'flex justify-end' : ''}`}
    >
      <div className={`flex gap-3 max-w-[85%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isGrouped && !isOwn && (
          <ChatAvatar user={message.author} size="sm" />
        )}
        {!isGrouped && isOwn && <div className="w-8" />}
        {isGrouped && <div className="w-8" />}

        <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
          {!isGrouped && (
            <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {message.author.name}
              </span>
              <span className="text-xs text-neutral-500">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isPinned && <Pin className="w-3 h-3 text-accent-500" />}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingDraft}
                onChange={(e) => onChangeEditingDraft(e.target.value)}
                className="w-full p-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={onSubmitEdit}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 text-sm bg-neutral-200 dark:bg-neutral-700 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`inline-block p-3 rounded-2xl ${
                isOwn
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'
              }`}
            >
              {/* Reply reference */}
              {message.replyTo && (
                <button
                  onClick={() => onJumpToMessage(message.replyTo!.id)}
                  className={`block mb-2 text-left text-xs p-2 rounded-lg ${
                    isOwn
                      ? 'bg-primary-500/50 hover:bg-primary-500/70'
                      : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                  }`}
                >
                  <span className="font-medium">{message.replyTo.author?.name || 'Unknown'}</span>
                  <p className="truncate">{message.replyTo.content}</p>
                </button>
              )}

              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

              {message.isEdited && (
                <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-neutral-500'}`}>
                  {' '}(edited)
                </span>
              )}
            </div>
          )}

          {/* Quick actions - shown on hover in full implementation */}
          {!isEditing && (
            <div className="flex gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
              <button onClick={onReply} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded" title="Reply">
                <MessageCircle className="w-4 h-4 text-neutral-500" />
              </button>
              {isOwn && (
                <>
                  <button onClick={onEdit} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded" title="Edit">
                    <span className="text-xs">✏️</span>
                  </button>
                  <button onClick={onDelete} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded" title="Delete">
                    <span className="text-xs">🗑️</span>
                  </button>
                </>
              )}
              <button onClick={onPin} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded" title={isPinned ? 'Unpin' : 'Pin'}>
                <Pin className="w-4 h-4 text-neutral-500" />
              </button>
              <button onClick={() => onReact('👍')} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded" title="React">
                <span className="text-xs">👍</span>
              </button>
            </div>
          )}

          {/* Thread indicator */}
          {message.threadReplyCount && message.threadReplyCount > 0 && (
            <button
              onClick={onOpenThread}
              className="mt-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              {message.threadReplyCount} {message.threadReplyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded-full text-xs"
                >
                  {reaction.emoji} {reaction.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;
