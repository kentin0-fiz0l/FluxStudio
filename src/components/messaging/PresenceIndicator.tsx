/**
 * PresenceIndicator Component
 *
 * Displays user presence status with "Online" or "Last seen X ago".
 * Uses real-time socket updates when available.
 *
 * Features:
 * - Green dot + "Online" for active users
 * - "Last seen X min ago" for inactive users
 * - Typing indicator integration
 * - Lightweight, uses existing socket infrastructure
 */

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface PresenceIndicatorProps {
  /** User's current status */
  status: PresenceStatus;
  /** Last seen timestamp (ISO string) */
  lastSeen?: string | Date;
  /** Whether user is currently typing */
  isTyping?: boolean;
  /** Show status dot only (no text) */
  dotOnly?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatLastSeen(lastSeen?: string | Date): string {
  if (!lastSeen) return 'Offline';

  const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Active just now';
  if (diffMins < 2) return 'Active 1 min ago';
  if (diffMins < 60) return `Active ${diffMins} min ago`;
  if (diffHours < 2) return 'Active 1 hour ago';
  if (diffHours < 24) return `Active ${diffHours} hours ago`;
  if (diffDays < 2) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays} days ago`;
  return `Last seen ${date.toLocaleDateString()}`;
}

function getStatusColor(status: PresenceStatus): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'busy':
      return 'bg-red-500';
    case 'offline':
    default:
      return 'bg-neutral-400 dark:bg-neutral-600';
  }
}

function getStatusText(status: PresenceStatus, lastSeen?: string | Date): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
    case 'offline':
    default:
      return formatLastSeen(lastSeen);
  }
}

// ============================================================================
// Status Dot Component
// ============================================================================

export function StatusDot({
  status,
  size = 'sm',
  className,
}: {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span
      className={cn(
        'rounded-full ring-2 ring-white dark:ring-neutral-900',
        getStatusColor(status),
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Typing Indicator
// ============================================================================

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-0.5', className)}>
      <span className="text-primary-600 dark:text-primary-400 text-xs italic">
        typing
      </span>
      <span className="flex gap-0.5 ml-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 bg-primary-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PresenceIndicator({
  status,
  lastSeen,
  isTyping = false,
  dotOnly = false,
  size = 'sm',
  className,
}: PresenceIndicatorProps) {
  // If typing, show typing indicator
  if (isTyping) {
    return <TypingIndicator className={className} />;
  }

  // Dot only mode
  if (dotOnly) {
    return <StatusDot status={status} size={size} className={className} />;
  }

  // Full indicator with text
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const statusText = getStatusText(status, lastSeen);
  const isOnline = status === 'online';

  return (
    <span
      className={cn(
        'flex items-center gap-1.5',
        textSizeClasses[size],
        className
      )}
    >
      <StatusDot status={status} size={size} />
      <span
        className={cn(
          isOnline
            ? 'text-green-600 dark:text-green-400'
            : 'text-neutral-500 dark:text-neutral-400'
        )}
      >
        {statusText}
      </span>
    </span>
  );
}

// ============================================================================
// Conversation Header Presence
// ============================================================================

export function ConversationHeaderPresence({
  isOnline,
  lastSeen,
  isTyping,
  memberCount,
  isGroup = false,
  className,
}: {
  isOnline?: boolean;
  lastSeen?: string | Date;
  isTyping?: boolean;
  memberCount?: number;
  isGroup?: boolean;
  className?: string;
}) {
  // Group conversations
  if (isGroup && memberCount) {
    return (
      <span className={cn('text-xs text-neutral-500 dark:text-neutral-400', className)}>
        {memberCount} members
        {isTyping && (
          <>
            {' · '}
            <TypingIndicator />
          </>
        )}
      </span>
    );
  }

  // Direct messages
  if (isTyping) {
    return <TypingIndicator className={className} />;
  }

  return (
    <PresenceIndicator
      status={isOnline ? 'online' : 'offline'}
      lastSeen={lastSeen}
      size="sm"
      className={className}
    />
  );
}

export default PresenceIndicator;
