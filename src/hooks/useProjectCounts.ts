/**
 * useProjectCounts - Hook for fetching project content counts
 *
 * Fetches counts from GET /api/projects/:projectId/counts for tab badges.
 * Returns: { messages, files, assets, boards }
 *
 * Usage:
 * const { counts, loading, error, refetch } = useProjectCounts(projectId);
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/utils/apiHelpers';

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

export function useProjectCounts(projectId: string | undefined): UseProjectCountsResult {
  const [counts, setCounts] = useState<ProjectCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!projectId) {
      setCounts(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/projects/${projectId}/counts`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch counts: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.counts) {
        setCounts(data.counts);
      } else {
        throw new Error(data.error || 'Invalid response');
      }
    } catch (err) {
      console.error('Error fetching project counts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set default counts on error to avoid breaking the UI
      setCounts({
        messages: 0,
        files: 0,
        assets: 0,
        boards: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
  };
}
