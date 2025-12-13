/**
 * Inline Reply Preview Component
 * Shows a quoted preview of the original message in a reply bubble
 * Supports click/keyboard navigation to jump to the original message
 */

import React, { KeyboardEvent } from 'react';
import { Pin } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InlineReplyPreviewProps {
  messageId: string;
  authorName: string;
  text: string;
  isPinned?: boolean;
  onJumpToMessage?: (messageId: string) => void;
  className?: string;
  /** Whether this is in an "own" message bubble (affects color scheme) */
  isOwnMessage?: boolean;
}

export function InlineReplyPreview({
  messageId,
  authorName,
  text,
  isPinned = false,
  onJumpToMessage,
  className,
  isOwnMessage = false,
}: InlineReplyPreviewProps) {
  const isClickable = !!onJumpToMessage;

  const handleClick = () => {
    if (onJumpToMessage) {
      onJumpToMessage(messageId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (onJumpToMessage && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onJumpToMessage(messageId);
    }
  };

  // Truncate text to ~80 chars for preview
  const truncatedText = text.length > 80 ? text.slice(0, 80) + '…' : text;

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      aria-label={isClickable ? `View original message from ${authorName}` : undefined}
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg border-l-2 transition-colors',
        isOwnMessage
          ? 'bg-primary-700/30 border-primary-400/50 hover:bg-primary-700/40'
          : 'bg-neutral-200/50 dark:bg-neutral-700/50 border-neutral-400 dark:border-neutral-500 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80',
        isClickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className={cn(
              'text-xs font-semibold truncate',
              isOwnMessage
                ? 'text-primary-200'
                : 'text-primary-600 dark:text-primary-400'
            )}
          >
            {authorName}
          </span>
          {isPinned && (
            <Pin
              className={cn(
                'w-3 h-3 flex-shrink-0',
                isOwnMessage
                  ? 'text-primary-300'
                  : 'text-accent-500'
              )}
            />
          )}
        </div>
        <p
          className={cn(
            'text-xs leading-snug truncate',
            isOwnMessage
              ? 'text-primary-100/80'
              : 'text-neutral-600 dark:text-neutral-300'
          )}
        >
          {truncatedText || 'Message unavailable'}
        </p>
      </div>
    </div>
  );
}

export default InlineReplyPreview;
