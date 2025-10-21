/**
 * Activity Feed Type Definitions
 *
 * Shared types for activity tracking across the application.
 * Used by both frontend components and backend API.
 */

// ============================================================================
// Activity Types
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

export type EntityType = 'task' | 'comment' | 'project' | 'milestone' | 'member';

// ============================================================================
// Activity Interface
// ============================================================================

export interface Activity {
  id: string;
  projectId: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  entityType: EntityType;
  entityId: string;
  entityTitle?: string;
  action: string; // Human-readable description
  metadata?: ActivityMetadata;
  timestamp: string; // ISO8601
}

// ============================================================================
// Activity Metadata
// ============================================================================

export interface ActivityMetadata {
  field?: string; // What field changed (e.g., 'status', 'priority', 'assignedTo')
  oldValue?: string; // Previous value
  newValue?: string; // New value
  preview?: string; // For comments - preview of content
  [key: string]: any; // Allow additional metadata
}

// ============================================================================
// Activity Response Types
// ============================================================================

export interface ActivitiesResponse {
  success: boolean;
  activities: Activity[];
  total: number;
  hasMore: boolean;
}

export interface ActivityQueryParams {
  limit?: number;
  offset?: number;
  type?: ActivityType;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Activity Creation Helpers
// ============================================================================

export interface CreateActivityInput {
  type: ActivityType;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  entityType: EntityType;
  entityId: string;
  entityTitle?: string;
  action: string;
  metadata?: ActivityMetadata;
}

// ============================================================================
// Activity Filter Types
// ============================================================================

export type ActivityFilterType = ActivityType | 'all';
export type ActivityDateRange = '24h' | '7d' | '30d' | 'all';

export interface ActivityFilters {
  type: ActivityFilterType;
  userId: string | 'all';
  dateRange: ActivityDateRange;
}

// ============================================================================
// Activity Statistics
// ============================================================================

export interface ActivityStats {
  total: number;
  byType: Partial<Record<ActivityType, number>>;
  byUser: Record<string, { name: string; count: number }>;
  last24h: number;
  last7d: number;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isTaskActivity(type: ActivityType): boolean {
  return type.startsWith('task.');
}

export function isCommentActivity(type: ActivityType): boolean {
  return type.startsWith('comment.');
}

export function isMilestoneActivity(type: ActivityType): boolean {
  return type.startsWith('milestone.');
}

export function isMemberActivity(type: ActivityType): boolean {
  return type.startsWith('member.');
}

// ============================================================================
// Activity Type Labels
// ============================================================================

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  'task.created': 'Task Created',
  'task.updated': 'Task Updated',
  'task.deleted': 'Task Deleted',
  'task.completed': 'Task Completed',
  'comment.created': 'Comment Added',
  'comment.deleted': 'Comment Deleted',
  'member.added': 'Member Added',
  'milestone.created': 'Milestone Created',
  'milestone.completed': 'Milestone Completed',
};

// ============================================================================
// Date Range Labels
// ============================================================================

export const DATE_RANGE_LABELS: Record<ActivityDateRange, string> = {
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  all: 'All Time',
};

// ============================================================================
// Activity Utilities
// ============================================================================

/**
 * Get human-readable label for activity type
 */
export function getActivityTypeLabel(type: ActivityType): string {
  return ACTIVITY_TYPE_LABELS[type] || 'Unknown Activity';
}

/**
 * Get date range label
 */
export function getDateRangeLabel(range: ActivityDateRange): string {
  return DATE_RANGE_LABELS[range] || 'All Time';
}

/**
 * Check if activity occurred within a date range
 */
export function isActivityInDateRange(
  activity: Activity,
  range: ActivityDateRange
): boolean {
  if (range === 'all') return true;

  const now = new Date();
  const activityDate = new Date(activity.timestamp);
  const cutoff = new Date();

  switch (range) {
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

  return activityDate >= cutoff;
}

/**
 * Filter activities by criteria
 */
export function filterActivities(
  activities: Activity[],
  filters: Partial<ActivityFilters>
): Activity[] {
  return activities.filter((activity) => {
    // Filter by type
    if (filters.type && filters.type !== 'all' && activity.type !== filters.type) {
      return false;
    }

    // Filter by user
    if (filters.userId && filters.userId !== 'all' && activity.userId !== filters.userId) {
      return false;
    }

    // Filter by date range
    if (filters.dateRange && !isActivityInDateRange(activity, filters.dateRange)) {
      return false;
    }

    return true;
  });
}

/**
 * Sort activities by timestamp (newest first)
 */
export function sortActivitiesByDate(activities: Activity[]): Activity[] {
  return [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Group activities by user
 */
export function groupActivitiesByUser(
  activities: Activity[]
): Map<string, Activity[]> {
  const grouped = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const existing = grouped.get(activity.userId) || [];
    grouped.set(activity.userId, [...existing, activity]);
  });

  return grouped;
}

/**
 * Calculate activity statistics
 */
export function calculateActivityStats(activities: Activity[]): ActivityStats {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const byType: Partial<Record<ActivityType, number>> = {};
  const byUser: Record<string, { name: string; count: number }> = {};
  let last24h = 0;
  let last7d = 0;

  activities.forEach((activity) => {
    // Count by type
    byType[activity.type] = (byType[activity.type] || 0) + 1;

    // Count by user
    if (!byUser[activity.userId]) {
      byUser[activity.userId] = { name: activity.userName, count: 0 };
    }
    byUser[activity.userId].count++;

    // Count by time range
    const timestamp = new Date(activity.timestamp);
    if (timestamp >= oneDayAgo) last24h++;
    if (timestamp >= sevenDaysAgo) last7d++;
  });

  return {
    total: activities.length,
    byType,
    byUser,
    last24h,
    last7d,
  };
}
