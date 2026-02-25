/**
 * useMetMapSnapshots — TanStack Query hook for snapshot CRUD.
 *
 * Sprint 33: Named checkpoints of Y.Doc state.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { useAuth } from '@/store/slices/authSlice';

export interface MetMapSnapshot {
  id: string;
  songId: string;
  userId: string;
  name: string;
  description: string | null;
  sectionCount: number;
  totalBars: number;
  createdAt: string;
}

async function fetchSnapshots(songId: string): Promise<MetMapSnapshot[]> {
  const result = await apiService.get<{ snapshots: MetMapSnapshot[] }>(`/api/metmap/songs/${songId}/snapshots`);
  return result.data?.snapshots || [];
}

async function createSnapshotApi(
  songId: string,
  body: { name: string; description?: string; sectionCount?: number; totalBars?: number }
): Promise<MetMapSnapshot> {
  const result = await apiService.post<{ snapshot: MetMapSnapshot }>(`/api/metmap/songs/${songId}/snapshots`, body);
  return result.data!.snapshot;
}

async function deleteSnapshotApi(songId: string, snapshotId: string): Promise<void> {
  await apiService.delete(`/api/metmap/songs/${songId}/snapshots/${snapshotId}`);
}

async function restoreSnapshotApi(songId: string, snapshotId: string): Promise<void> {
  await apiService.post(`/api/metmap/songs/${songId}/snapshots/${snapshotId}/restore`);
}

export function useMetMapSnapshots(songId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['metmap-snapshots', songId];

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchSnapshots(songId!),
    enabled: !!songId && !!token,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; sectionCount?: number; totalBars?: number }) =>
      createSnapshotApi(songId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (snapshotId: string) => deleteSnapshotApi(songId!, snapshotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const restoreMutation = useMutation({
    mutationFn: (snapshotId: string) => restoreSnapshotApi(songId!, snapshotId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    snapshots,
    isLoading,
    createSnapshot: createMutation.mutateAsync,
    deleteSnapshot: deleteMutation.mutateAsync,
    restoreSnapshot: restoreMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}
