/**
 * ActivityStream - Real-time feed of project activity
 *
 * Shows recent events in the focused project:
 * - Messages and mentions
 * - Task updates
 * - File uploads
 * - Team activity
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  CheckSquare,
  FileUp,
  UserPlus,
  AtSign,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityItem, ActivityType } from '@/hooks/useProjectPulse';

export interface ActivityStreamProps {
  /** Activity items to display */
  items: ActivityItem[];
  /** Maximum items to show (default: 10) */
  maxItems?: number;
  /** Callback when an item is clicked */
  onItemClick?: (item: ActivityItem) => void;
  /** Custom className */
  className?: string;
  /** Show empty state when no items */
  showEmpty?: boolean;
}

// Icon mapping for activity types
const activityIcons: Record<ActivityType, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4" />,
  task_created: <CheckSquare className="h-4 w-4" />,
  task_completed: <CheckSquare className="h-4 w-4" />,
  task_assigned: <CheckSquare className="h-4 w-4" />,
  file_uploaded: <FileUp className="h-4 w-4" />,
  member_joined: <UserPlus className="h-4 w-4" />,
  comment: <MessageCircle className="h-4 w-4" />,
  mention: <AtSign className="h-4 w-4" />,
};

// Color mapping for activity types
const activityColors: Record<ActivityType, string> = {
  message: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  task_created: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  task_completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  task_assigned: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  file_uploaded: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  member_joined: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  comment: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  mention: 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActivityItemRow({
  item,
  onClick,
}: {
  item: ActivityItem;
  onClick?: () => void;
}) {
  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
        item.isNew && 'bg-primary-50/50 dark:bg-primary-900/10'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          activityColors[item.type]
        )}
      >
        {activityIcons[item.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* New indicator */}
            {item.isNew && (
              <span className="inline-block w-2 h-2 rounded-full bg-primary-500 mr-1.5" />
            )}
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {item.title}
            </span>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(item.timestamp)}
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
            {item.description}
          </p>
        )}
        {item.actorName && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            by {item.actorName}
          </p>
        )}
      </div>
    </div>
  );

  if (item.actionUrl) {
    return (
      <Link
        to={item.actionUrl}
        onClick={onClick}
        className="block"
      >
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

export function ActivityStream({
  items,
  maxItems = 10,
  onItemClick,
  className,
  showEmpty = true,
}: ActivityStreamProps) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0 && showEmpty) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <Clock className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No recent activity
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          Activity will appear here as your team works
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {displayItems.map((item) => (
        <ActivityItemRow
          key={item.id}
          item={item}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
        />
      ))}
      {items.length > maxItems && (
        <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 py-2">
          +{items.length - maxItems} more
        </p>
      )}
    </div>
  );
}

export default ActivityStream;
