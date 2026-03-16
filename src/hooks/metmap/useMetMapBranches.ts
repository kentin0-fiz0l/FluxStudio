/**
 * useMetMapBranches — TanStack Query hook for branch management.
 *
 * Sprint 33: Fork branches from snapshots or current state for independent experimentation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/store/slices/authSlice';

export interface MetMapBranch {
  id: string;
  songId: string;
  userId: string;
  name: string;
  description: string | null;
  sourceSnapshotId: string | null;
  sourceSnapshotName: string | null;
  isMain: boolean;
  mergedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchBranches(songId: string): Promise<MetMapBranch[]> {
  const result = await apiService.get<{ branches: MetMapBranch[] }>(`/api/metmap/songs/${songId}/branches`);
  return result.data?.branches || [];
}

async function createBranchApi(
  songId: string,
  body: { name: string; description?: string; sourceSnapshotId?: string }
): Promise<MetMapBranch> {
  const result = await apiService.post<{ branch: MetMapBranch }>(`/api/metmap/songs/${songId}/branches`, body);
  return result.data!.branch;
}

async function deleteBranchApi(songId: string, branchId: string): Promise<void> {
  await apiService.delete(`/api/metmap/songs/${songId}/branches/${branchId}`);
}

async function mergeBranchApi(songId: string, branchId: string): Promise<MetMapBranch> {
  const result = await apiService.post<{ branch: MetMapBranch }>(`/api/metmap/songs/${songId}/branches/${branchId}/merge`);
  return result.data!.branch;
}

export function useMetMapBranches(songId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['metmap-branches', songId];

  const { data: branches = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchBranches(songId!),
    enabled: !!songId && !!token,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; sourceSnapshotId?: string }) =>
      createBranchApi(songId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (branchId: string) => deleteBranchApi(songId!, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const mergeMutation = useMutation({
    mutationFn: (branchId: string) => mergeBranchApi(songId!, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    branches,
    isLoading,
    createBranch: createMutation.mutateAsync,
    deleteBranch: deleteMutation.mutateAsync,
    mergeBranch: mergeMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isMerging: mergeMutation.isPending,
  };
}
