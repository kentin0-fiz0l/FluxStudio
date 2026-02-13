/**
 * ChatMessageList Component
 * Renders the scrollable message list with date separators,
 * message grouping, typing indicators, and scroll management
 */

import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { MessageCircle, Pin } from 'lucide-react';
import { ChatAvatar } from './ChatMessageBubble';
import type { Message } from './types';

// ============================================================================
// Helper Components
// ============================================================================

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

// ============================================================================
// MessageBubbleWrapper
// ============================================================================

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

          {/* Quick actions */}
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

// ============================================================================
// ChatMessageList
// ============================================================================

export interface ChatMessageListProps {
  messages: Message[];
  pinnedMessageIds: string[];
  typingUsers: Array<{ userId: string; userName?: string; userEmail?: string }>;
  highlightedMessageId: string | null;
  threadHighlightId?: string | null;
  editingMessageId: string | null;
  editingDraft: string;
  currentUserId?: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  onForward: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onOpenThread: (messageId: string) => void;
  onViewInFiles?: (assetId: string) => void;
  onJumpToMessage: (messageId: string) => void;
  onChangeEditingDraft: (draft: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
}

export interface ChatMessageListRef {
  scrollToBottom: () => void;
  scrollToMessage: (messageId: string) => void;
}

export const ChatMessageList = forwardRef<ChatMessageListRef, ChatMessageListProps>(
  function ChatMessageList(
    {
      messages,
      pinnedMessageIds,
      typingUsers,
      highlightedMessageId,
      threadHighlightId,
      editingMessageId,
      editingDraft,
      currentUserId,
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
    },
    ref
  ) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const messageById = useMemo(
      () => new Map(messages.map((m) => [m.id, m])),
      [messages]
    );

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

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    return (
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

              const parentMessage = message.replyTo?.id
                ? messageById.get(message.replyTo.id)
                : undefined;

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
    );
  }
);

export default ChatMessageList;
