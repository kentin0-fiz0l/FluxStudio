/**
 * Activity Helper Utilities
 *
 * Helper functions for working with activities in the frontend.
 * Provides formatting, grouping, and display utilities.
 */

import {
  Activity,
  ActivityType,
  ActivityDateRange,
  ActivityStats,
  calculateActivityStats,
  filterActivities,
  sortActivitiesByDate,
} from '../types/activity';

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get date label for grouping (Today, Yesterday, or formatted date)
 */
export function getDateGroupLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, today)) {
    return 'Today';
  } else if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

/**
 * Group activities by date
 */
export function groupActivitiesByDate(
  activities: Activity[]
): [string, Activity[]][] {
  const grouped = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const label = getDateGroupLabel(date);

    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(activity);
  });

  // Return as array of tuples, preserving chronological order
  return Array.from(grouped.entries());
}

/**
 * Format timestamp for display
 */
export function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format full timestamp (for tooltips)
 */
export function formatFullActivityTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================================================
// Activity Display Helpers
// ============================================================================

/**
 * Get user initials from name
 */
export function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get color class for activity type
 */
export function getActivityColor(type: ActivityType): string {
  const colorMap: Record<ActivityType, string> = {
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
  return colorMap[type] || 'text-neutral-600 bg-neutral-100';
}

/**
 * Get status badge variant from status string
 */
export function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'success' | 'warning' | 'error' {
  const statusMap: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'error'> = {
    todo: 'default',
    'in-progress': 'warning',
    review: 'secondary',
    completed: 'success',
    low: 'default',
    medium: 'warning',
    high: 'error',
    critical: 'error',
  };
  return statusMap[status.toLowerCase()] || 'default';
}

// ============================================================================
// Activity Filtering and Searching
// ============================================================================

/**
 * Search activities by text query
 */
export function searchActivities(
  activities: Activity[],
  query: string
): Activity[] {
  if (!query.trim()) return activities;

  const lowerQuery = query.toLowerCase();

  return activities.filter((activity) => {
    return (
      activity.userName.toLowerCase().includes(lowerQuery) ||
      activity.action.toLowerCase().includes(lowerQuery) ||
      activity.entityTitle?.toLowerCase().includes(lowerQuery) ||
      activity.metadata?.preview?.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get unique users from activities
 */
export function getUniqueUsersFromActivities(
  activities: Activity[]
): Array<{ id: string; name: string; email: string; avatar?: string }> {
  const users = new Map<
    string,
    { id: string; name: string; email: string; avatar?: string }
  >();

  activities.forEach((activity) => {
    if (!users.has(activity.userId)) {
      users.set(activity.userId, {
        id: activity.userId,
        name: activity.userName,
        email: activity.userEmail,
        avatar: activity.userAvatar,
      });
    }
  });

  return Array.from(users.values());
}

/**
 * Get activities for a specific user
 */
export function getActivitiesByUser(
  activities: Activity[],
  userId: string
): Activity[] {
  return activities.filter((activity) => activity.userId === userId);
}

/**
 * Get activities for a specific entity
 */
export function getActivitiesByEntity(
  activities: Activity[],
  entityId: string
): Activity[] {
  return activities.filter((activity) => activity.entityId === entityId);
}

// ============================================================================
// Activity Stats and Analytics
// ============================================================================

/**
 * Get most active users
 */
export function getMostActiveUsers(
  activities: Activity[],
  limit: number = 5
): Array<{ userId: string; userName: string; count: number }> {
  const stats = calculateActivityStats(activities);

  return Object.entries(stats.byUser)
    .map(([userId, { name, count }]) => ({
      userId,
      userName: name,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get activity trend (activities per day for last N days)
 */
export function getActivityTrend(
  activities: Activity[],
  days: number = 7
): Array<{ date: string; count: number }> {
  const trend: Array<{ date: string; count: number }> = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = activities.filter((activity) => {
      const activityDate = new Date(activity.timestamp);
      return activityDate >= date && activityDate < nextDate;
    }).length;

    trend.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    });
  }

  return trend;
}

/**
 * Get percentage change in activity from previous period
 */
export function getActivityPercentageChange(
  activities: Activity[],
  periodDays: number = 7
): number {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(
    now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000
  );

  const currentPeriodCount = activities.filter(
    (a) => new Date(a.timestamp) >= periodStart
  ).length;

  const previousPeriodCount = activities.filter(
    (a) =>
      new Date(a.timestamp) >= previousPeriodStart &&
      new Date(a.timestamp) < periodStart
  ).length;

  if (previousPeriodCount === 0) return currentPeriodCount > 0 ? 100 : 0;

  return Math.round(
    ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100
  );
}

// ============================================================================
// Activity Feed Optimization
// ============================================================================

/**
 * Paginate activities
 */
export function paginateActivities(
  activities: Activity[],
  page: number,
  pageSize: number
): {
  items: Activity[];
  hasMore: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
} {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = activities.slice(start, end);

  return {
    items,
    hasMore: end < activities.length,
    total: activities.length,
    currentPage: page,
    totalPages: Math.ceil(activities.length / pageSize),
  };
}

/**
 * Merge and deduplicate activities from multiple sources
 */
export function mergeActivities(...activityArrays: Activity[][]): Activity[] {
  const merged = activityArrays.flat();
  const unique = new Map<string, Activity>();

  merged.forEach((activity) => {
    unique.set(activity.id, activity);
  });

  return sortActivitiesByDate(Array.from(unique.values()));
}

// ============================================================================
// Export all utilities
// ============================================================================

export {
  calculateActivityStats,
  filterActivities,
  sortActivitiesByDate,
} from '../types/activity';
