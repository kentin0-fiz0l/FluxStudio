/**
 * ChatMessage Molecule - Flux Design Language
 *
 * Chat message component for messaging interfaces.
 * Supports text, attachments, timestamps, and read receipts.
 *
 * @example
 * <ChatMessage
 *   message={{
 *     id: '1',
 *     text: 'Hello team!',
 *     sender: { name: 'John Doe', avatar: '/avatar.jpg' },
 *     timestamp: new Date(),
 *     isCurrentUser: false
 *   }}
 * />
 */

import * as React from 'react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Paperclip, MoreVertical } from 'lucide-react';

export interface ChatMessageSender {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
}

export interface ChatMessageAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: ChatMessageSender;
  timestamp: Date;
  isCurrentUser: boolean;
  read?: boolean;
  attachments?: ChatMessageAttachment[];
}

export interface ChatMessageProps {
  /**
   * Message data
   */
  message: ChatMessage;

  /**
   * Show avatar
   */
  showAvatar?: boolean;

  /**
   * Show sender name
   */
  showSenderName?: boolean;

  /**
   * Show timestamp
   */
  showTimestamp?: boolean;

  /**
   * Show read receipt
   */
  showReadReceipt?: boolean;

  /**
   * Message click handler
   */
  onClick?: (message: ChatMessage) => void;

  /**
   * Attachment click handler
   */
  onAttachmentClick?: (attachment: ChatMessageAttachment) => void;

  /**
   * More options handler
   */
  onMoreOptions?: (message: ChatMessage) => void;

  /**
   * Custom className
   */
  className?: string;
}

export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  (
    {
      message,
      showAvatar = true,
      showSenderName = true,
      showTimestamp = true,
      showReadReceipt = true,
      onClick,
      onAttachmentClick,
      onMoreOptions,
      className,
    },
    ref
  ) => {
    // Format timestamp
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    // Format file size
    const formatFileSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Get user initials
    const getUserInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-3 py-2 px-4 group hover:bg-neutral-50 transition-colors',
          message.isCurrentUser && 'flex-row-reverse',
          className
        )}
        onClick={() => onClick?.(message)}
      >
        {/* Avatar */}
        {showAvatar && (
          <div className="flex-shrink-0">
            {message.sender.avatar ? (
              <img
                src={message.sender.avatar}
                alt={message.sender.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                {message.sender.initials || getUserInitials(message.sender.name)}
              </div>
            )}
          </div>
        )}

        {/* Message Content */}
        <div
          className={cn(
            'flex flex-col gap-1 max-w-[70%]',
            message.isCurrentUser && 'items-end'
          )}
        >
          {/* Sender Name & Timestamp */}
          {(showSenderName || showTimestamp) && (
            <div
              className={cn(
                'flex items-center gap-2 text-xs text-neutral-600',
                message.isCurrentUser && 'flex-row-reverse'
              )}
            >
              {showSenderName && !message.isCurrentUser && (
                <span className="font-medium">{message.sender.name}</span>
              )}
              {showTimestamp && (
                <span className="text-neutral-500">
                  {formatTime(message.timestamp)}
                </span>
              )}
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={cn(
              'relative rounded-2xl px-4 py-2 shadow-sm',
              message.isCurrentUser
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : 'bg-white border border-neutral-200 text-neutral-900 rounded-tl-sm'
            )}
          >
            {/* Message Text */}
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.text}
            </p>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttachmentClick?.(attachment);
                    }}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border transition-colors w-full text-left',
                      message.isCurrentUser
                        ? 'bg-primary-700 border-primary-500 hover:bg-primary-800'
                        : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                    )}
                  >
                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {attachment.name}
                      </p>
                      <p className={cn(
                        'text-xs',
                        message.isCurrentUser ? 'text-primary-200' : 'text-neutral-500'
                      )}>
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Read Receipt */}
            {message.isCurrentUser && showReadReceipt && (
              <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 bg-white rounded-full shadow-sm">
                {message.read ? (
                  <CheckCheck className="w-3 h-3 text-primary-600" />
                ) : (
                  <Check className="w-3 h-3 text-neutral-400" />
                )}
              </div>
            )}
          </div>

          {/* More Options */}
          {onMoreOptions && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoreOptions(message);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-200"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4 text-neutral-600" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = 'ChatMessage';
