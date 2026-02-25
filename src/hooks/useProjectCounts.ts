/**
 * useProjectCounts - Hook for fetching project content counts
 *
 * Fetches counts from GET /api/projects/:projectId/counts for tab badges.
 * Returns: { messages, files, assets, boards }
 *
 * Usage:
 * const { counts, loading, error, refetch } = useProjectCounts(projectId);
 */

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { queryKeys } from '@/lib/queryClient';

export interface ProjectCounts {
  messages: number;
  files: number;
  assets: number;
  boards: number;
}

interface UseProjectCountsResult {
  counts: ProjectCounts | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultCounts: ProjectCounts = { messages: 0, files: 0, assets: 0, boards: 0 };

export function useProjectCounts(projectId: string | undefined): UseProjectCountsResult {
  const {
    data: counts = null,
    isLoading: loading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<ProjectCounts | null, Error>({
    queryKey: queryKeys.projectCounts.detail(projectId || ''),
    queryFn: async () => {
      if (!projectId) return null;

      const result = await apiService.get<{ success: boolean; counts: ProjectCounts; error?: string }>(`/projects/${projectId}/counts`);
      const data = result.data;
      if (data?.success && data.counts) return data.counts;
      throw new Error(data?.error || 'Invalid response');
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Return default counts on error so UI doesn't break
    placeholderData: defaultCounts,
  });

  const error = queryError?.message ?? null;

  const refetch = async () => { await queryRefetch(); };

  return { counts, loading, error, refetch };
}
