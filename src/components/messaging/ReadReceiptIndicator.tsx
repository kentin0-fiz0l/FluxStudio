/**
 * ReadReceiptIndicator Component
 *
 * Displays "Seen by X" or avatar stacks for read receipts on messages.
 * Minimal, non-intrusive design that shows who has seen the message.
 *
 * Features:
 * - Avatar stack for multiple viewers
 * - "Seen by X" text for single viewers
 * - Hover tooltip with full list
 * - Only shows on last message from sender
 */

import * as React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ReadReceiptUser {
  id: string;
  name: string;
  avatar?: string;
  readAt?: string;
}

interface ReadReceiptIndicatorProps {
  /** Users who have read this message */
  readBy: ReadReceiptUser[];
  /** Current user ID (to exclude from display) */
  currentUserId: string;
  /** Whether this is the sender's own message */
  isOwnMessage: boolean;
  /** Message status (for delivery indicators) */
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  /** Optional class name */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatReadTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

// ============================================================================
// Mini Avatar Component
// ============================================================================

function MiniAvatar({
  user,
  size = 'sm',
}: {
  user: ReadReceiptUser;
  size?: 'xs' | 'sm';
}) {
  const sizeClasses = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-5 h-5 text-[9px]',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center ring-1 ring-white dark:ring-neutral-900 overflow-hidden',
        sizeClasses[size]
      )}
      title={`Seen by ${user.name}`}
    >
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-medium text-neutral-600 dark:text-neutral-300">
          {getInitials(user.name)}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Avatar Stack Component
// ============================================================================

function AvatarStack({
  users,
  maxVisible = 3,
}: {
  users: ReadReceiptUser[];
  maxVisible?: number;
}) {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div className="flex -space-x-1.5">
      {visibleUsers.map((user) => (
        <MiniAvatar key={user.id} user={user} size="xs" />
      ))}
      {remainingCount > 0 && (
        <div
          className="w-4 h-4 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center text-[8px] font-medium text-neutral-700 dark:text-neutral-300 ring-1 ring-white dark:ring-neutral-900"
          title={`+${remainingCount} more`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ReadReceiptIndicator({
  readBy,
  currentUserId,
  isOwnMessage,
  status = 'sent',
  className,
}: ReadReceiptIndicatorProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  // Filter out current user from read receipts
  const otherReaders = readBy.filter(u => u.id !== currentUserId);

  // If this is not the sender's message, don't show read receipts
  if (!isOwnMessage) {
    return null;
  }

  // For own messages, show delivery/read status
  if (otherReaders.length === 0) {
    // No readers yet, show delivery status
    return (
      <div className={cn('flex items-center gap-1 text-xs', className)}>
        {status === 'sending' && (
          <span className="text-neutral-400">Sending...</span>
        )}
        {status === 'sent' && (
          <Check className="w-3.5 h-3.5 text-neutral-400" />
        )}
        {status === 'delivered' && (
          <CheckCheck className="w-3.5 h-3.5 text-neutral-400" />
        )}
        {status === 'failed' && (
          <span className="text-red-500">Failed</span>
        )}
      </div>
    );
  }

  // Show "Seen" with avatar(s)
  return (
    <div
      className={cn(
        'relative flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400',
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <CheckCheck className="w-3.5 h-3.5 text-primary-500" />

      {otherReaders.length === 1 ? (
        // Single reader: show name
        <span>Seen by {otherReaders[0].name.split(' ')[0]}</span>
      ) : otherReaders.length <= 3 ? (
        // 2-3 readers: show avatar stack + count
        <div className="flex items-center gap-1">
          <AvatarStack users={otherReaders} maxVisible={3} />
          <span>Seen by {otherReaders.length}</span>
        </div>
      ) : (
        // Many readers: show avatar stack + "Seen by X"
        <div className="flex items-center gap-1">
          <AvatarStack users={otherReaders} maxVisible={3} />
          <span>Seen by {otherReaders.length}</span>
        </div>
      )}

      {/* Tooltip with full reader list */}
      {showTooltip && otherReaders.length > 1 && (
        <div className="absolute bottom-full left-0 mb-1 p-2 bg-neutral-900 dark:bg-neutral-800 rounded-lg shadow-lg z-50 min-w-[160px] max-w-[240px]">
          <p className="text-xs font-medium text-white mb-1.5">
            Seen by {otherReaders.length}
          </p>
          <div className="space-y-1">
            {otherReaders.slice(0, 10).map(user => (
              <div key={user.id} className="flex items-center gap-2">
                <MiniAvatar user={user} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-200 truncate">{user.name}</p>
                  {user.readAt && (
                    <p className="text-[10px] text-neutral-400">
                      {formatReadTime(user.readAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {otherReaders.length > 10 && (
              <p className="text-[10px] text-neutral-400 mt-1">
                +{otherReaders.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Read Receipt (for message list items)
// ============================================================================

export function CompactReadReceipt({
  isRead,
  readCount,
  className,
}: {
  isRead: boolean;
  readCount?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {isRead ? (
        <>
          <CheckCheck className="w-3 h-3 text-primary-500" />
          {readCount && readCount > 0 && (
            <span className="text-[10px] text-neutral-400">{readCount}</span>
          )}
        </>
      ) : (
        <Check className="w-3 h-3 text-neutral-400" />
      )}
    </div>
  );
}

export default ReadReceiptIndicator;
