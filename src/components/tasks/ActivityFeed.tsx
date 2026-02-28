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
  Filter,
  ChevronDown,
  Loader2,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useActivitiesQuery } from '@/hooks/useActivities';
import { useRealtimeActivities } from '@/hooks/useRealtimeActivities';
import {
  ActivityItem,
  ActivityFeedSkeleton,
  EmptyState,
  groupActivitiesByDate,
  type ActivityType,
  type Activity,
} from './activity';

// ============================================================================
// Re-exports for backward compatibility
// ============================================================================

export type { ActivityType, Activity } from './activity';

export interface ActivityFeedProps {
  projectId: string;
  maxItems?: number;
  compact?: boolean;
  /** Enable real-time Socket.IO updates (default: true) */
  realtime?: boolean;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projectId,
  maxItems = 50,
  compact = false,
  realtime = true,
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

  type QuickFilterType = 'all' | 'tasks' | 'comments' | 'members';
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterType>('all');

  // ============================================================================
  // Real-time Socket.IO updates (Sprint 50)
  // ============================================================================

  const { isConnected: isRealtimeConnected } = useRealtimeActivities({
    projectId: realtime ? projectId : undefined,
  });

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
    type: filterType !== 'all' ? filterType as import('@/hooks/useActivities').ActivityType : undefined,
    userId: filterUserId !== 'all' ? filterUserId : undefined,
    limit: itemsPerPage,
    offset: (page - 1) * itemsPerPage,
  });

  const activities: Activity[] = (activitiesData?.activities || [])
    .filter((a): a is typeof a & { timestamp: string; userId: string; userName: string; entityType: string } =>
      !!(a.timestamp || a.createdAt) && !!a.userId && !!a.userName
    )
    .map((a) => ({
      id: a.id,
      projectId: a.projectId,
      type: a.type as ActivityType,
      userId: a.userId!,
      userName: a.userName!,
      userEmail: a.userEmail || '',
      userAvatar: a.userAvatar,
      entityType: (a.entityType || 'task') as Activity['entityType'],
      entityId: a.entityId || a.id,
      entityTitle: a.entityTitle,
      action: a.action,
      metadata: a.metadata,
      timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
    }));
  const hasMore = activitiesData?.hasMore || false;
  const totalActivities = activitiesData?.total || 0;

  // ============================================================================
  // Filtering
  // ============================================================================

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

  React.useEffect(() => {
    switch (quickFilter) {
      case 'tasks':
        setFilterType('all');
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

  const quickFilteredActivities = React.useMemo(() => {
    if (quickFilter === 'tasks') {
      return filteredActivities.filter((a) => a.type.startsWith('task.'));
    }
    return filteredActivities;
  }, [filteredActivities, quickFilter]);

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
              <ActivityIcon className="h-5 w-5 text-neutral-700" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-neutral-900">Activity</h2>
              {totalActivities > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalActivities}
                </Badge>
              )}
              {isRealtimeConnected && (
                <span className="flex items-center gap-1 text-xs text-green-600" title="Live updates active">
                  <Wifi className="h-3 w-3" aria-hidden="true" />
                  Live
                </span>
              )}
            </div>

            {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" icon={<Filter className="h-4 w-4" aria-hidden="true" />}>
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
                      <SelectItem value="file.uploaded">File Uploaded</SelectItem>
                      <SelectItem value="message.sent">Message Sent</SelectItem>
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
            <Button variant="ghost" onClick={handleLoadMore} icon={<ChevronDown className="h-4 w-4" aria-hidden="true" />}>
              Load More Activity
            </Button>
          </div>
        )}

        {/* Loading More Indicator */}
        {isLoading && page > 1 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
