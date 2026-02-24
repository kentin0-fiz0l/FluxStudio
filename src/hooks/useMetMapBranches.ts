/**
 * useMetMapBranches — TanStack Query hook for branch management.
 *
 * Sprint 33: Fork branches from snapshots or current state for independent experimentation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
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

async function fetchBranches(songId: string, token: string): Promise<MetMapBranch[]> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/branches`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch branches');
  const data = await res.json();
  return data.branches || [];
}

async function createBranchApi(
  songId: string,
  token: string,
  body: { name: string; description?: string; sourceSnapshotId?: string }
): Promise<MetMapBranch> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/branches`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create branch');
  const data = await res.json();
  return data.branch;
}

async function deleteBranchApi(songId: string, branchId: string, token: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/branches/${branchId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete branch');
}

async function mergeBranchApi(songId: string, branchId: string, token: string): Promise<MetMapBranch> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/branches/${branchId}/merge`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to merge branch');
  const data = await res.json();
  return data.branch;
}

export function useMetMapBranches(songId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['metmap-branches', songId];

  const { data: branches = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchBranches(songId!, token!),
    enabled: !!songId && !!token,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; sourceSnapshotId?: string }) =>
      createBranchApi(songId!, token!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (branchId: string) => deleteBranchApi(songId!, branchId, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const mergeMutation = useMutation({
    mutationFn: (branchId: string) => mergeBranchApi(songId!, branchId, token!),
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
