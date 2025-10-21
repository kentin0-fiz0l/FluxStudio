/**
 * React Query Client Configuration
 *
 * Centralizes React Query configuration with optimal defaults for:
 * - Data caching and staleness
 * - Automatic refetching strategies
 * - Retry logic for resilience
 * - Error handling
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Global React Query client instance
 *
 * Configuration Philosophy:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes before refetch
 * - cacheTime: 30 minutes - Unused data remains in cache for 30 minutes
 * - refetchOnWindowFocus: true - Ensures users see latest data when returning to app
 * - retry: 1 - Single retry for failed requests to handle transient network issues
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data freshness: 5 minutes before considered stale
      staleTime: 1000 * 60 * 5,

      // Cache retention: 30 minutes in memory for unused data
      gcTime: 1000 * 60 * 30, // React Query v5 uses 'gcTime' instead of 'cacheTime'

      // Auto-refetch when user returns to window (important for collaboration)
      refetchOnWindowFocus: true,

      // Disable refetch on mount if data is not stale (avoid unnecessary requests)
      refetchOnMount: false,

      // Disable refetch on reconnect (handled by window focus)
      refetchOnReconnect: false,

      // Single retry attempt for failed requests
      retry: 1,

      // Exponential backoff: 1000ms * (2^attemptIndex)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Single retry for mutations
      retry: 1,

      // Exponential backoff for mutations
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * Query key factory for consistent cache key naming
 *
 * Benefits:
 * - Type-safe query keys
 * - Prevents typos
 * - Easier invalidation patterns
 * - Self-documenting code
 */
export const queryKeys = {
  // Project-related keys
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: { organizationId?: string; teamId?: string }) =>
      [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  // Task-related keys
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (projectId: string) => [...queryKeys.tasks.lists(), projectId] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (taskId: string) => [...queryKeys.tasks.details(), taskId] as const,
  },

  // Milestone-related keys
  milestones: {
    all: ['milestones'] as const,
    lists: () => [...queryKeys.milestones.all, 'list'] as const,
    list: (projectId: string) => [...queryKeys.milestones.lists(), projectId] as const,
    details: () => [...queryKeys.milestones.all, 'detail'] as const,
    detail: (milestoneId: string) => [...queryKeys.milestones.details(), milestoneId] as const,
  },

  // Team-related keys
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    list: (organizationId?: string) =>
      [...queryKeys.teams.lists(), organizationId] as const,
    details: () => [...queryKeys.teams.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.teams.details(), id] as const,
  },

  // Organization-related keys
  organizations: {
    all: ['organizations'] as const,
    lists: () => [...queryKeys.organizations.all, 'list'] as const,
    details: () => [...queryKeys.organizations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
  },
};

/**
 * Helper function to invalidate all queries for a specific project
 * Useful when a project is updated or deleted
 */
export const invalidateProjectQueries = (projectId: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(projectId) });
};

/**
 * Helper function to invalidate all queries for a specific organization
 * Useful when organization is updated or user switches context
 */
export const invalidateOrganizationQueries = (organizationId: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.organizations.detail(organizationId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.teams.list(organizationId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.list({ organizationId }) });
};

/**
 * Helper function to invalidate all queries for a specific team
 * Useful when team is updated or user switches context
 */
export const invalidateTeamQueries = (teamId: string) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.list({ teamId }) });
};
