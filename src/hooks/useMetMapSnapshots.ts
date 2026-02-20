/**
 * useMetMapSnapshots — TanStack Query hook for snapshot CRUD.
 *
 * Sprint 33: Named checkpoints of Y.Doc state.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

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

async function fetchSnapshots(songId: string, token: string): Promise<MetMapSnapshot[]> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/snapshots`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch snapshots');
  const data = await res.json();
  return data.snapshots || [];
}

async function createSnapshotApi(
  songId: string,
  token: string,
  body: { name: string; description?: string; sectionCount?: number; totalBars?: number }
): Promise<MetMapSnapshot> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/snapshots`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create snapshot');
  const data = await res.json();
  return data.snapshot;
}

async function deleteSnapshotApi(songId: string, snapshotId: string, token: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/snapshots/${snapshotId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete snapshot');
}

async function restoreSnapshotApi(songId: string, snapshotId: string, token: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/snapshots/${snapshotId}/restore`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to restore snapshot');
}

export function useMetMapSnapshots(songId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['metmap-snapshots', songId];

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchSnapshots(songId!, token!),
    enabled: !!songId && !!token,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; sectionCount?: number; totalBars?: number }) =>
      createSnapshotApi(songId!, token!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (snapshotId: string) => deleteSnapshotApi(songId!, snapshotId, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const restoreMutation = useMutation({
    mutationFn: (snapshotId: string) => restoreSnapshotApi(songId!, snapshotId, token!),
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
