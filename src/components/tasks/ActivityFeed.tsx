/**
 * Activity Feed Component - Flux Studio Sprint 2
 *
 * A comprehensive activity timeline showing all project actions in chronological order.
 * Implements transparency and collaboration features with filtering, pagination, and
 * detailed activity descriptions.
 *
 * Features:
 * - Chronological activity timeline grouped by date
 * - User avatars and action icons
 * - Highlighted entities (tasks, comments, members)
 * - Filtering by type, user, and date range
 * - Paginated loading (50 items per page)
 * - Relative timestamps with absolute on hover
 * - Empty state for new projects
 * - Responsive design
 *
 * @example
 * <ActivityFeed projectId="proj_123" />
 * <ActivityFeed projectId="proj_123" compact maxItems={10} />
 */

import * as React from 'react';
import {
  Activity as ActivityIcon,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Flag,
  Check as FlagCheck,
  Filter,
  ChevronDown,
  Loader2,
  Clock,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivitiesQuery } from '@/hooks/useActivities';

// ============================================================================
// Type Definitions
// ============================================================================

export type ActivityType =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.completed'
  | 'comment.created'
  | 'comment.deleted'
  | 'member.added'
  | 'milestone.created'
  | 'milestone.completed';

export interface Activity {
  id: string;
  projectId: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  entityType: 'task' | 'comment' | 'project' | 'milestone' | 'member';
  entityId: string;
  entityTitle?: string;
  action: string;
  metadata?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    preview?: string;
  };
  timestamp: string;
}

export interface ActivityFeedProps {
  projectId: string;
  maxItems?: number;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Activity Icon and Color Mapping
// ============================================================================

// Icon map defined at module level to avoid recreation during render
const ACTIVITY_ICON_MAP: Record<ActivityType, React.ElementType> = {
  'task.created': PlusCircle,
  'task.updated': Edit,
  'task.deleted': Trash2,
  'task.completed': CheckCircle2,
  'comment.created': MessageSquare,
  'comment.deleted': Trash2,
  'member.added': UserPlus,
  'milestone.created': Flag,
  'milestone.completed': FlagCheck,
};

// Color map defined at module level to avoid recreation during render
const ACTIVITY_COLOR_MAP: Record<ActivityType, string> = {
  'task.created': 'text-blue-600 bg-blue-100',
  'task.updated': 'text-purple-600 bg-purple-100',
  'task.deleted': 'text-red-600 bg-red-100',
  'task.completed': 'text-success-600 bg-success-100',
  'comment.created': 'text-accent-600 bg-accent-100',
  'comment.deleted': 'text-red-600 bg-red-100',
  'member.added': 'text-primary-600 bg-primary-100',
  'milestone.created': 'text-secondary-600 bg-secondary-100',
  'milestone.completed': 'text-success-600 bg-success-100',
};

const getActivityColor = (type: ActivityType): string => {
  return ACTIVITY_COLOR_MAP[type] || 'text-neutral-600 bg-neutral-100';
};

// Dedicated component to render activity type icons - avoids dynamic component creation during render
const ActivityTypeIcon: React.FC<{ type: ActivityType; className?: string }> = ({ type, className }) => {
  const Icon = ACTIVITY_ICON_MAP[type] || ActivityIcon;
  return <Icon className={className} />;
};

// ============================================================================
// Activity Description Component
// ============================================================================

interface ActivityDescriptionProps {
  activity: Activity;
}

const ActivityDescription: React.FC<ActivityDescriptionProps> = ({ activity }) => {
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

// ============================================================================
// Date Grouping Utility
// ============================================================================

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const groupActivitiesByDate = (activities: Activity[]): [string, Activity[]][] => {
  const grouped = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (isSameDay(date, today)) {
      label = 'Today';
    } else if (isSameDay(date, yesterday)) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(activity);
  });

  return Array.from(grouped.entries());
};

// ============================================================================
// Activity Item Component
// ============================================================================

interface ActivityItemProps {
  activity: Activity;
  compact?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, compact = false }) => {
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
            <ActivityTypeIcon type={activity.type} className="h-3.5 w-3.5" />
          </div>

          {/* Description */}
          <div className="flex-1 min-w-0">
            <ActivityDescription activity={activity} />
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 mt-1 ml-8">
          <Clock className="h-3 w-3 text-neutral-400" />
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

// ============================================================================
// Loading Skeleton
// ============================================================================

const ActivityFeedSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3 px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

// ============================================================================
// Empty State
// ============================================================================

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-neutral-100 p-4 mb-4">
      <ActivityIcon className="h-8 w-8 text-neutral-400" />
    </div>
    <h3 className="text-lg font-semibold text-neutral-900 mb-2">No activity yet</h3>
    <p className="text-sm text-neutral-600 max-w-sm">
      Project activity will appear here once team members start creating tasks, adding comments, or
      making updates.
    </p>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projectId,
  maxItems = 50,
  compact = false,
  className,
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [filterType, setFilterType] = React.useState<ActivityType | 'all'>('all');
  const [filterUserId, setFilterUserId] = React.useState<string | 'all'>('all');
  const [dateRange, setDateRange] = React.useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [page, setPage] = React.useState(1);
  const itemsPerPage = maxItems;

  // Quick filter chip options
  type QuickFilterType = 'all' | 'tasks' | 'comments' | 'members';
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterType>('all');

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const {
    data: activitiesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useActivitiesQuery(projectId, {
    type: filterType !== 'all' ? filterType : undefined,
    userId: filterUserId !== 'all' ? filterUserId : undefined,
    limit: itemsPerPage,
    offset: (page - 1) * itemsPerPage,
  });

  const activities = activitiesData?.activities || [];
  const hasMore = activitiesData?.hasMore || false;
  const totalActivities = activitiesData?.total || 0;

  // ============================================================================
  // Filtering
  // ============================================================================

  // Apply date range filter on client side
  const filteredActivities = React.useMemo(() => {
    if (dateRange === 'all') return activities;

    const now = new Date();
    const cutoff = new Date();

    switch (dateRange) {
      case '24h':
        cutoff.setHours(now.getHours() - 24);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
    }

    return activities.filter((activity) => new Date(activity.timestamp) >= cutoff);
  }, [activities, dateRange]);

  // Get unique users for filter
  const uniqueUsers = React.useMemo(() => {
    const users = new Map<string, { id: string; name: string }>();
    activities.forEach((activity) => {
      if (!users.has(activity.userId)) {
        users.set(activity.userId, {
          id: activity.userId,
          name: activity.userName,
        });
      }
    });
    return Array.from(users.values());
  }, [activities]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const handleResetFilters = () => {
    setFilterType('all');
    setFilterUserId('all');
    setDateRange('all');
    setPage(1);
  };

  const hasActiveFilters = filterType !== 'all' || filterUserId !== 'all' || dateRange !== 'all';

  // Apply quick filter to activity type
  React.useEffect(() => {
    switch (quickFilter) {
      case 'tasks':
        setFilterType('all'); // Will show all task types
        break;
      case 'comments':
        setFilterType('comment.created');
        break;
      case 'members':
        setFilterType('member.added');
        break;
      default:
        setFilterType('all');
    }
    setPage(1);
  }, [quickFilter]);

  // Filter activities by quick filter (for 'tasks' which includes multiple types)
  const quickFilteredActivities = React.useMemo(() => {
    if (quickFilter === 'tasks') {
      return filteredActivities.filter((a) => a.type.startsWith('task.'));
    }
    return filteredActivities;
  }, [filteredActivities, quickFilter]);

  // Group activities by date (use quickFilteredActivities)
  const groupedActivities = React.useMemo(
    () => groupActivitiesByDate(quickFilteredActivities),
    [quickFilteredActivities]
  );

  // ============================================================================
  // Render
  // ============================================================================

  if (isError) {
    return (
      <div className={cn('p-4', className)}>
        <div className="rounded-lg border border-error-200 bg-error-50 p-4">
          <p className="text-sm text-error-800">
            Failed to load activity feed: {error?.message || 'Unknown error'}
          </p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with Filters */}
      {!compact && (
        <div className="flex flex-col gap-3 px-4 py-3 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5 text-neutral-700" />
              <h2 className="text-lg font-semibold text-neutral-900">Activity</h2>
              {totalActivities > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalActivities}
                </Badge>
              )}
            </div>

            {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" icon={<Filter className="h-4 w-4" />}>
                Filter
                {hasActiveFilters && (
                  <Badge variant="primary" className="ml-2 h-4 w-4 p-0 text-xs">
                    {[filterType !== 'all', filterUserId !== 'all', dateRange !== 'all'].filter(
                      Boolean
                    ).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Filter by Activity Type</h4>
                  <Select
                    value={filterType}
                    onValueChange={(value) => {
                      setFilterType(value as ActivityType | 'all');
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activities</SelectItem>
                      <SelectItem value="task.created">Task Created</SelectItem>
                      <SelectItem value="task.updated">Task Updated</SelectItem>
                      <SelectItem value="task.completed">Task Completed</SelectItem>
                      <SelectItem value="task.deleted">Task Deleted</SelectItem>
                      <SelectItem value="comment.created">Comment Added</SelectItem>
                      <SelectItem value="member.added">Member Added</SelectItem>
                      <SelectItem value="milestone.created">Milestone Created</SelectItem>
                      <SelectItem value="milestone.completed">Milestone Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Filter by User</h4>
                  <Select
                    value={filterUserId}
                    onValueChange={(value) => {
                      setFilterUserId(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {uniqueUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Date Range</h4>
                  <Select
                    value={dateRange}
                    onValueChange={(value) => {
                      setDateRange(value as typeof dateRange);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="24h">Last 24 Hours</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters} className="w-full">
                    Reset Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'tasks', 'comments', 'members'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setQuickFilter(filter)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full transition-colors capitalize',
                  quickFilter === filter
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-transparent'
                )}
              >
                {filter === 'all' ? 'All' : filter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ActivityFeedSkeleton />
        ) : quickFilteredActivities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className={cn('divide-y divide-neutral-100', compact ? 'space-y-1' : 'py-2')}>
            {groupedActivities.map(([dateLabel, dateActivities]) => (
              <div key={dateLabel} className={cn(!compact && 'py-3')}>
                {/* Date Header */}
                {!compact && (
                  <div className="px-4 py-2 sticky top-0 bg-neutral-50 border-b border-neutral-200 z-10">
                    <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                      {dateLabel}
                    </h3>
                  </div>
                )}

                {/* Activities for this date */}
                <div className={cn(compact ? 'space-y-1' : 'space-y-0')}>
                  {dateActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} compact={compact} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="flex justify-center py-4 px-4 border-t border-neutral-200">
            <Button variant="ghost" onClick={handleLoadMore} icon={<ChevronDown className="h-4 w-4" />}>
              Load More Activity
            </Button>
          </div>
        )}

        {/* Loading More Indicator */}
        {isLoading && page > 1 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
