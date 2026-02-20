/**
 * useAudioTracks — TanStack Query hooks for multi-track audio CRUD.
 *
 * Provides fetching, creating, updating, deleting, and reordering
 * audio tracks per song. Optimistic updates for volume/pan/mute/solo.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../utils/apiHelpers';

// ==================== Types ====================

export interface AudioTrack {
  id: string;
  songId: string;
  userId: string;
  name: string;
  audioKey: string | null;
  audioUrl: string | null;
  audioDurationSeconds: number | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  sortOrder: number;
  beatMap: { bpm: number; beats: number[]; onsets: number[]; confidence: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrackData {
  name?: string;
  file?: File;
}

export interface UpdateTrackData {
  name?: string;
  volume?: number;
  pan?: number;
  muted?: boolean;
  solo?: boolean;
}

// ==================== API Functions ====================

async function fetchTracks(songId: string, token: string): Promise<AudioTrack[]> {
  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/tracks`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch tracks');
  const data = await res.json();
  return data.tracks ?? data;
}

async function createTrackApi(songId: string, token: string, trackData: CreateTrackData): Promise<AudioTrack> {
  const formData = new FormData();
  if (trackData.name) formData.append('name', trackData.name);
  if (trackData.file) formData.append('audio', trackData.file);

  const res = await fetch(getApiUrl(`/api/metmap/songs/${songId}/tracks`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to create track');
  const data = await res.json();
  return data.track ?? data;
}

async function updateTrackApi(trackId: string, token: string, changes: UpdateTrackData): Promise<AudioTrack> {
  const res = await fetch(getApiUrl(`/api/metmap/tracks/${trackId}`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error('Failed to update track');
  const data = await res.json();
  return data.track ?? data;
}

async function deleteTrackApi(trackId: string, token: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/metmap/tracks/${trackId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete track');
}

async function reorderTrackApi(trackId: string, token: string, newOrder: number): Promise<void> {
  const res = await fetch(getApiUrl(`/api/metmap/tracks/${trackId}/reorder`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sortOrder: newOrder }),
  });
  if (!res.ok) throw new Error('Failed to reorder track');
}

async function updateTrackBeatMapApi(
  trackId: string,
  token: string,
  beatMap: AudioTrack['beatMap']
): Promise<void> {
  const res = await fetch(getApiUrl(`/api/metmap/tracks/${trackId}/beat-map`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ beatMap }),
  });
  if (!res.ok) throw new Error('Failed to save beat map');
}

// ==================== Hooks ====================

export function useAudioTracks(songId: string | undefined) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['audio-tracks', songId];

  const tracksQuery = useQuery({
    queryKey,
    queryFn: () => fetchTracks(songId!, token!),
    enabled: !!songId && !!token,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTrackData) => createTrackApi(songId!, token!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ trackId, changes }: { trackId: string; changes: UpdateTrackData }) =>
      updateTrackApi(trackId, token!, changes),
    onMutate: async ({ trackId, changes }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AudioTrack[]>(queryKey);
      queryClient.setQueryData<AudioTrack[]>(queryKey, (old) =>
        old?.map((t) => (t.id === trackId ? { ...t, ...changes } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (trackId: string) => deleteTrackApi(trackId, token!),
    onMutate: async (trackId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AudioTrack[]>(queryKey);
      queryClient.setQueryData<AudioTrack[]>(queryKey, (old) =>
        old?.filter((t) => t.id !== trackId)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ trackId, newOrder }: { trackId: string; newOrder: number }) =>
      reorderTrackApi(trackId, token!, newOrder),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const beatMapMutation = useMutation({
    mutationFn: ({ trackId, beatMap }: { trackId: string; beatMap: AudioTrack['beatMap'] }) =>
      updateTrackBeatMapApi(trackId, token!, beatMap),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    tracks: tracksQuery.data ?? [],
    isLoading: tracksQuery.isLoading,
    error: tracksQuery.error,
    createTrack: createMutation.mutateAsync,
    updateTrack: (trackId: string, changes: UpdateTrackData) =>
      updateMutation.mutate({ trackId, changes }),
    deleteTrack: deleteMutation.mutateAsync,
    reorderTrack: (trackId: string, newOrder: number) =>
      reorderMutation.mutate({ trackId, newOrder }),
    saveTrackBeatMap: (trackId: string, beatMap: AudioTrack['beatMap']) =>
      beatMapMutation.mutate({ trackId, beatMap }),
    isCreating: createMutation.isPending,
  };
}
