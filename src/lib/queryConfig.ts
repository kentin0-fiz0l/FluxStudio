/**
 * Centralized TanStack Query Cache Configuration
 *
 * Defines staleTime and gcTime constants for different data categories.
 * All hooks should import from here instead of using hardcoded values.
 *
 * Sprint 54: Centralized cache management
 *
 * Categories:
 * - REALTIME: Data that changes frequently (typing indicators, presence)
 * - FREQUENT: Data refreshed often (activities, analytics, search)
 * - STANDARD: Typical data (comments, project counts, agent sessions)
 * - STABLE: Data that rarely changes (projects, files, channels)
 * - STATIC: Near-permanent data (templates, enums, user profile)
 */

/** 30 seconds — for real-time or rapidly changing data */
export const CACHE_REALTIME = {
  staleTime: 30 * 1000,
  gcTime: 2 * 60 * 1000,
} as const;

/** 1 minute — for frequently updated data */
export const CACHE_FREQUENT = {
  staleTime: 60 * 1000,
  gcTime: 5 * 60 * 1000,
} as const;

/** 2 minutes — standard data refresh interval */
export const CACHE_STANDARD = {
  staleTime: 2 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
} as const;

/** 5 minutes — for data that changes infrequently */
export const CACHE_STABLE = {
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
} as const;

/** 30 minutes — for near-static reference data */
export const CACHE_STATIC = {
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
} as const;

/**
 * Helper to create invalidation query key patterns.
 * Use with queryClient.invalidateQueries({ queryKey: invalidationKey('projects') })
 */
export function invalidationKey(prefix: string) {
  return [prefix] as const;
}
