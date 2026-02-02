/**
 * MessageListView Component
 *
 * Renders the message list with:
 * - Date separators between message groups
 * - Message grouping (consecutive messages from same author)
 * - Parent message enrichment for replies
 * - Typing indicator
 *
 * Extracted from MessagesNew.tsx for Phase 4.2 Technical Debt Resolution
 */

import * as React from 'react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatMessageBubble as MessageBubble } from './ChatMessageBubble';
import type { Message } from './types';

export interface MessageListViewProps {
  messages: Message[];
  messageById: Map<string, Message>;
  currentUserId?: string;
  pinnedMessageIds: string[];
  highlightedMessageId: string | null;
  threadHighlightId: string | null;
  editingMessageId: string | null;
  editingDraft: string;
  typingUserNames: string[];

  // Handlers
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
  onForward: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onOpenThread: (messageId: string) => void;
  onViewInFiles: (assetId: string) => void;
  onChangeEditingDraft: (draft: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
}

export interface MessageListViewRef {
  scrollToEnd: () => void;
  container: HTMLDivElement | null;
}

// Date separator helper
function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

// Date Separator
function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {getDateLabel(date)}
        </span>
      </div>
    </div>
  );
}

// Typing Indicator (simple inline version)
function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;

  let text: string;
  if (users.length === 1) {
    text = `${users[0]} is typing...`;
  } else if (users.length === 2) {
    text = `${users[0]} and ${users[1]} are typing...`;
  } else if (users.length === 3) {
    text = `${users[0]}, ${users[1]}, and ${users[2]} are typing...`;
  } else {
    text = `${users[0]}, ${users[1]}, + ${users.length - 2} others are typing...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs">{text}</span>
    </div>
  );
}

export const MessageListView = forwardRef<MessageListViewRef, MessageListViewProps>(
  function MessageListView(
    {
      messages,
      messageById,
      currentUserId,
      pinnedMessageIds,
      highlightedMessageId,
      threadHighlightId,
      editingMessageId,
      editingDraft,
      typingUserNames,
      onReply,
      onEdit,
      onDelete,
      onPin,
      onCopy,
      onJumpToMessage,
      onForward,
      onReact,
      onOpenThread,
      onViewInFiles,
      onChangeEditingDraft,
      onSubmitEdit,
      onCancelEdit,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      scrollToEnd: () => endRef.current?.scrollIntoView({ behavior: 'smooth' }),
      container: containerRef.current,
    }));

    if (messages.length === 0) {
      return (
        <div className="flex-1 overflow-y-auto py-4">
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
        </div>
      );
    }

    return (
      <div ref={containerRef} className="flex-1 overflow-y-auto py-4">
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

          return (
            <React.Fragment key={message.id}>
              {showDateSeparator && <DateSeparator date={message.timestamp} />}
              <MessageBubble
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
                isGrouped={isGrouped}
                currentUserId={currentUserId}
                isPinned={pinnedMessageIds.includes(message.id)}
                isHighlighted={
                  highlightedMessageId === message.id ||
                  threadHighlightId === message.id
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
        {typingUserNames.length > 0 && <TypingIndicator users={typingUserNames} />}

        <div ref={endRef} />
      </div>
    );
  }
);

export default MessageListView;
