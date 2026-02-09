/**
 * Activity Management React Query Hooks
 *
 * Provides efficient activity feed management with:
 * - Automatic caching with optimized refetch intervals
 * - Real-time activity polling for collaboration
 * - Filtering and pagination support
 * - Error handling with retry logic
 *
 * @example
 * const { data, isLoading } = useActivitiesQuery(projectId, { limit: 50 });
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';

// Re-export useAuth for convenience
export { useAuth } from '../contexts/AuthContext';

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
  | 'milestone.completed'
  | 'file'
  | 'task'
  | 'comment'
  | 'project'
  | 'member'
  | 'milestone'
  | 'message'
  | 'formation'
  | 'board';

export interface Activity {
  id: string;
  projectId: string;
  projectName?: string; // For dashboard activities across projects
  type: ActivityType | string;
  action: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  entityType?: 'task' | 'comment' | 'project' | 'milestone' | 'member' | 'file' | 'formation' | 'board' | string;
  entityId?: string;
  entityTitle?: string;
  description?: string;
  metadata?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    preview?: string;
    [key: string]: unknown;
  };
  timestamp?: string;
  createdAt?: string;
}

export interface ActivitiesResponse {
  success: boolean;
  activities: Activity[];
  total: number;
  hasMore: boolean;
}

export interface ActivitiesQueryParams {
  limit?: number;
  offset?: number;
  type?: ActivityType;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// Query Key Factory
// ============================================================================

const activitiesKeys = {
  all: ['activities'] as const,
  lists: () => [...activitiesKeys.all, 'list'] as const,
  list: (projectId: string, filters?: ActivitiesQueryParams) =>
    [...activitiesKeys.lists(), projectId, filters] as const,
  details: () => [...activitiesKeys.all, 'detail'] as const,
  detail: (id: string) => [...activitiesKeys.details(), id] as const,
};

// ============================================================================
// useActivitiesQuery Hook
// ============================================================================

/**
 * Fetch activities for a project with filtering and pagination
 *
 * Features:
 * - Automatic caching with 2-minute stale time
 * - Real-time updates via polling (every 30 seconds)
 * - Supports filtering by type, user, and date range
 * - Pagination with limit/offset
 * - Automatic retry on failure (3 attempts)
 *
 * @param projectId - The ID of the project
 * @param params - Query parameters for filtering and pagination
 * @param options - Additional React Query options
 */
export const useActivitiesQuery = (
  projectId: string | undefined,
  params?: ActivitiesQueryParams,
  options?: Omit<
    UseQueryOptions<ActivitiesResponse, Error>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) => {
  return useQuery<ActivitiesResponse, Error>({
    queryKey: activitiesKeys.list(projectId || '', params),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');

      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      // Build query string
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.userId) queryParams.append('userId', params.userId);
      if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

      const url = `${getApiUrl(`/api/projects/${projectId}/activities`)}?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || 'Failed to fetch activities'
        );
      }

      const result = await response.json();

      // Normalize response format
      return {
        success: result.success ?? true,
        activities: result.activities || [],
        total: result.total || 0,
        hasMore: result.hasMore || false,
      };
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchInterval: 30 * 1000, // Poll every 30 seconds for real-time updates
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
};

// ============================================================================
// useRecentActivitiesQuery Hook
// ============================================================================

/**
 * Fetch recent activities (last 24 hours) for quick overview
 *
 * Optimized for dashboard widgets and sidebar displays
 *
 * @param projectId - The ID of the project
 * @param limit - Maximum number of activities to fetch (default: 10)
 */
export const useRecentActivitiesQuery = (
  projectId: string | undefined,
  limit: number = 10
) => {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  return useActivitiesQuery(
    projectId,
    {
      limit,
      dateFrom: oneDayAgo.toISOString(),
    },
    {
      staleTime: 1 * 60 * 1000, // 1 minute for recent activities
      refetchInterval: 15 * 1000, // Poll every 15 seconds
    }
  );
};

// ============================================================================
// useUserActivitiesQuery Hook
// ============================================================================

/**
 * Fetch activities for a specific user in a project
 *
 * Useful for user profile pages or filtering by team member
 *
 * @param projectId - The ID of the project
 * @param userId - The ID of the user
 * @param params - Additional query parameters
 */
export const useUserActivitiesQuery = (
  projectId: string | undefined,
  userId: string | undefined,
  params?: Omit<ActivitiesQueryParams, 'userId'>
) => {
  return useActivitiesQuery(projectId, {
    ...params,
    userId,
  });
};

// ============================================================================
// useActivityTypeQuery Hook
// ============================================================================

/**
 * Fetch activities filtered by type
 *
 * Useful for specialized views (e.g., only task updates, only comments)
 *
 * @param projectId - The ID of the project
 * @param type - The activity type to filter by
 * @param params - Additional query parameters
 */
export const useActivityTypeQuery = (
  projectId: string | undefined,
  type: ActivityType,
  params?: Omit<ActivitiesQueryParams, 'type'>
) => {
  return useActivitiesQuery(projectId, {
    ...params,
    type,
  });
};

// ============================================================================
// Activity Statistics Hook
// ============================================================================

/**
 * Get activity statistics for a project
 *
 * Provides aggregated counts by activity type for analytics
 *
 * @param projectId - The ID of the project
 */
export const useActivityStats = (projectId: string | undefined) => {
  const { data, isLoading } = useActivitiesQuery(
    projectId,
    { limit: 1000 }, // Fetch large set for accurate stats
    { refetchInterval: 5 * 60 * 1000 } // Refresh every 5 minutes
  );

  const stats = React.useMemo(() => {
    if (!data?.activities) {
      return {
        total: 0,
        byType: {} as Record<ActivityType, number>,
        byUser: {} as Record<string, { name: string; count: number }>,
        last24h: 0,
        last7d: 0,
      };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    const byUser: Record<string, { name: string; count: number }> = {};
    let last24h = 0;
    let last7d = 0;

    data.activities.forEach((activity) => {
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
      total: data.activities.length,
      byType: byType as Record<ActivityType, number>,
      byUser,
      last24h,
      last7d,
    };
  }, [data]);

  return { stats, isLoading };
};

// Import React for useMemo
import * as React from 'react';

// ============================================================================
// useDashboardActivities Hook
// ============================================================================

/**
 * Fetch recent activities across all user's projects
 *
 * Optimized for dashboard display - shows activity across all accessible projects
 *
 * @param params - Query parameters for filtering and pagination
 */
export const useDashboardActivities = (params?: { limit?: number; offset?: number }) => {
  return useQuery<ActivitiesResponse, Error>({
    queryKey: ['activities', 'dashboard', params],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      // Build query string
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `${getApiUrl('/api/projects/activities/recent')}?${queryParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || 'Failed to fetch activities'
        );
      }

      const result = await response.json();

      // Normalize response format
      return {
        success: result.success ?? true,
        activities: result.activities || [],
        total: result.total || 0,
        hasMore: result.hasMore || false,
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
    retry: 3,
  });
};

// ============================================================================
// Export all hooks
// ============================================================================

export default useActivitiesQuery;
