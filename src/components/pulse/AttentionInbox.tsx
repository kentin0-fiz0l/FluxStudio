/**
 * AttentionInbox - Items needing user attention
 *
 * Shows actionable items that need the user's response:
 * - Mentions requiring reply
 * - Assigned tasks
 * - Pending approvals
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  AtSign,
  CheckSquare,
  MessageCircle,
  ShieldCheck,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AttentionItem } from '@/hooks/useProjectPulse';

export interface AttentionInboxProps {
  /** Attention items to display */
  items: AttentionItem[];
  /** Callback when an item is clicked */
  onItemClick?: (item: AttentionItem) => void;
  /** Custom className */
  className?: string;
  /** Compact mode for sidebar */
  compact?: boolean;
}

// Icon mapping for attention types
const attentionIcons: Record<AttentionItem['type'], React.ReactNode> = {
  mention: <AtSign className="h-4 w-4" aria-hidden="true" />,
  assigned_task: <CheckSquare className="h-4 w-4" aria-hidden="true" />,
  reply: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
  approval: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
};

// Labels for attention types
const attentionLabels: Record<AttentionItem['type'], string> = {
  mention: 'Mention',
  assigned_task: 'Task',
  reply: 'Reply',
  approval: 'Approval',
};

const priorityBadgeVariants = {
  urgent: 'error',
  high: 'warning',
  medium: 'default',
  low: 'default',
} as const;

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function AttentionItemRow({
  item,
  onClick,
  compact,
}: {
  item: AttentionItem;
  onClick?: () => void;
  compact?: boolean;
}) {
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg transition-colors',
        'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
        compact ? 'p-2' : 'p-3',
        item.priority === 'urgent' && 'bg-red-50/50 dark:bg-red-900/10'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 rounded-lg flex items-center justify-center',
          compact ? 'w-7 h-7' : 'w-8 h-8',
          item.priority === 'urgent'
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : item.priority === 'high'
            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
        )}
      >
        {attentionIcons[item.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-medium text-neutral-900 dark:text-neutral-100 truncate',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {item.title}
          </span>
          {(item.priority === 'urgent' || item.priority === 'high') && (
            <Badge
              variant={priorityBadgeVariants[item.priority]}
              size="sm"
            >
              {item.priority}
            </Badge>
          )}
        </div>
        {!compact && item.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-1">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-neutral-500 dark:text-neutral-500">
            {attentionLabels[item.type]}
          </span>
          <span className="text-xs text-neutral-400">•</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-500">
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
      </div>

      {/* Action indicator */}
      <ChevronRight
        aria-hidden="true"
        className={cn(
          'flex-shrink-0 text-neutral-400',
          compact ? 'h-4 w-4' : 'h-5 w-5'
        )}
      />
    </div>
  );

  if (item.actionUrl) {
    return (
      <Link to={item.actionUrl} onClick={onClick} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className="block w-full text-left"
      disabled={!onClick}
    >
      {content}
    </button>
  );
}

export function AttentionInbox({
  items,
  onItemClick,
  className,
  compact = false,
}: AttentionInboxProps) {
  // Group items by type
  const groupedItems = React.useMemo(() => {
    const groups: Record<AttentionItem['type'], AttentionItem[]> = {
      mention: [],
      reply: [],
      assigned_task: [],
      approval: [],
    };

    items.forEach((item) => {
      groups[item.type].push(item);
    });

    return groups;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <Inbox className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          All caught up!
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          Nothing needs your attention right now
        </p>
      </div>
    );
  }

  // Count by type for header
  const counts = {
    mentions: groupedItems.mention.length + groupedItems.reply.length,
    tasks: groupedItems.assigned_task.length,
    approvals: groupedItems.approval.length,
  };

  return (
    <div className={cn('space-y-1', className)}>
      {/* Summary header */}
      {!compact && (
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
          {counts.mentions > 0 && (
            <span className="flex items-center gap-1">
              <AtSign className="h-3 w-3" aria-hidden="true" />
              {counts.mentions} message{counts.mentions !== 1 ? 's' : ''}
            </span>
          )}
          {counts.tasks > 0 && (
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" aria-hidden="true" />
              {counts.tasks} task{counts.tasks !== 1 ? 's' : ''}
            </span>
          )}
          {counts.approvals > 0 && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {counts.approvals} approval{counts.approvals !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Items */}
      {items.map((item) => (
        <AttentionItemRow
          key={item.id}
          item={item}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

export default AttentionInbox;
