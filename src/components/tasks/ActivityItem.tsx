/**
 * ActivityItem - Individual activity entry with description and timestamp
 */

import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { type Activity, getActivityColor, ActivityTypeIcon } from './activity-types';

// Activity Description Component
const ActivityDescription: React.FC<{ activity: Activity }> = ({ activity }) => {
  const { type, userName, entityTitle, metadata } = activity;

  const renderStatusBadge = (value: string) => (
    <Badge variant="secondary" className="mx-1 text-xs">
      {value}
    </Badge>
  );

  switch (type) {
    case 'task.created':
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> created task{' '}
          <span className="font-medium text-primary-600">"{entityTitle}"</span>
        </span>
      );

    case 'task.updated':
      if (metadata?.field === 'status') {
        return (
          <span className="text-sm text-neutral-700">
            <strong className="font-semibold text-neutral-900">{userName}</strong> moved{' '}
            <span className="font-medium">"{entityTitle}"</span> from{' '}
            {renderStatusBadge(metadata.oldValue || '')} to{' '}
            {renderStatusBadge(metadata.newValue || '')}
          </span>
        );
      }
      if (metadata?.field === 'priority') {
        return (
          <span className="text-sm text-neutral-700">
            <strong className="font-semibold text-neutral-900">{userName}</strong> changed priority of{' '}
            <span className="font-medium">"{entityTitle}"</span> from{' '}
            {renderStatusBadge(metadata.oldValue || '')} to{' '}
            {renderStatusBadge(metadata.newValue || '')}
          </span>
        );
      }
      if (metadata?.field === 'assignedTo') {
        return (
          <span className="text-sm text-neutral-700">
            <strong className="font-semibold text-neutral-900">{userName}</strong> assigned{' '}
            <span className="font-medium">"{entityTitle}"</span> to{' '}
            <strong>{metadata.newValue || 'Unassigned'}</strong>
          </span>
        );
      }
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> updated{' '}
          <span className="font-medium">"{entityTitle}"</span>
        </span>
      );

    case 'task.completed':
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> completed{' '}
          <span className="font-medium text-success-600">"{entityTitle}"</span>
        </span>
      );

    case 'task.deleted':
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> deleted task{' '}
          <span className="font-medium text-error-600">"{entityTitle}"</span>
        </span>
      );

    case 'comment.created':
      return (
        <div className="text-sm">
          <span className="text-neutral-700">
            <strong className="font-semibold text-neutral-900">{userName}</strong> commented on{' '}
            <span className="font-medium">"{entityTitle}"</span>
          </span>
          {metadata?.preview && (
            <p className="text-xs text-neutral-600 mt-1 italic pl-4 border-l-2 border-neutral-200">
              "{metadata.preview}"
            </p>
          )}
        </div>
      );

    case 'comment.deleted':
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> deleted a comment on{' '}
          <span className="font-medium">"{entityTitle}"</span>
        </span>
      );

    case 'member.added':
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> added{' '}
          <strong className="text-primary-600">{metadata?.newValue}</strong> to the project
        </span>
      );

    case 'milestone.created':
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> created milestone{' '}
          <span className="font-medium text-secondary-600">"{entityTitle}"</span>
        </span>
      );

    case 'milestone.completed':
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> completed milestone{' '}
          <span className="font-medium text-success-600">"{entityTitle}"</span>
        </span>
      );

    default:
      return (
        <span className="text-sm text-neutral-700">
          <strong className="font-semibold text-neutral-900">{userName}</strong> performed an action
        </span>
      );
  }
};

// Activity Item Component
export interface ActivityItemProps {
  activity: Activity;
  compact?: boolean;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, compact = false }) => {
  const colorClass = getActivityColor(activity.type);
  const [showFullTimestamp, setShowFullTimestamp] = React.useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const absoluteTime = new Date(activity.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      className={cn(
        'flex gap-3 py-3 animate-fadeIn',
        !compact && 'px-4 hover:bg-neutral-50 rounded-lg transition-colors'
      )}
    >
      {/* Avatar */}
      {!compact && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          {activity.userAvatar ? (
            <AvatarImage src={activity.userAvatar} alt={activity.userName} />
          ) : null}
          <AvatarFallback className="text-xs bg-primary-100 text-primary-700">
            {getInitials(activity.userName)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center rounded-full p-1.5 flex-shrink-0',
              colorClass
            )}
          >
            <ActivityTypeIcon type={activity.type} className="h-3.5 w-3.5" aria-hidden="true" />
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            <ActivityDescription activity={activity} />
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 mt-1 ml-8">
          <Clock className="h-3 w-3 text-neutral-400" aria-hidden="true" />
          <span
            className="text-xs text-neutral-500 cursor-help"
            onMouseEnter={() => setShowFullTimestamp(true)}
            onMouseLeave={() => setShowFullTimestamp(false)}
            title={absoluteTime}
          >
            {showFullTimestamp ? absoluteTime : formatRelativeTime(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};
