/**
 * useAudioTracks — TanStack Query hooks for multi-track audio CRUD.
 *
 * Provides fetching, creating, updating, deleting, and reordering
 * audio tracks per song. Optimistic updates for volume/pan/mute/solo.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { buildApiUrl } from '@/config/environment';

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

async function fetchTracks(songId: string): Promise<AudioTrack[]> {
  const res = await apiService.get<{ tracks: AudioTrack[] } | AudioTrack[]>(`/metmap/songs/${songId}/tracks`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch tracks');
  const data = res.data as { tracks?: AudioTrack[] };
  return data.tracks ?? (res.data as AudioTrack[]);
}

async function createTrackApi(songId: string, trackData: CreateTrackData): Promise<AudioTrack> {
  const formData = new FormData();
  if (trackData.name) formData.append('name', trackData.name);
  if (trackData.file) formData.append('audio', trackData.file);

  const res = await apiService.post<{ track: AudioTrack } | AudioTrack>(`/metmap/songs/${songId}/tracks`, formData);
  if (!res.success) throw new Error(res.error || 'Failed to create track');
  const data = res.data as { track?: AudioTrack };
  return data.track ?? (res.data as AudioTrack);
}

async function updateTrackApi(trackId: string, changes: UpdateTrackData): Promise<AudioTrack> {
  const res = await apiService.makeRequest<{ track: AudioTrack } | AudioTrack>(buildApiUrl(`/metmap/tracks/${trackId}`), {
    method: 'PUT',
    body: JSON.stringify(changes),
  });
  if (!res.success) throw new Error(res.error || 'Failed to update track');
  const data = res.data as { track?: AudioTrack };
  return data.track ?? (res.data as AudioTrack);
}

async function deleteTrackApi(trackId: string): Promise<void> {
  const res = await apiService.delete(`/metmap/tracks/${trackId}`);
  if (!res.success) throw new Error(res.error || 'Failed to delete track');
}

async function reorderTrackApi(trackId: string, newOrder: number): Promise<void> {
  const res = await apiService.makeRequest(buildApiUrl(`/metmap/tracks/${trackId}/reorder`), {
    method: 'PUT',
    body: JSON.stringify({ sortOrder: newOrder }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to reorder track');
}

async function updateTrackBeatMapApi(
  trackId: string,
  beatMap: AudioTrack['beatMap']
): Promise<void> {
  const res = await apiService.makeRequest(buildApiUrl(`/metmap/tracks/${trackId}/beat-map`), {
    method: 'PUT',
    body: JSON.stringify({ beatMap }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to save beat map');
}

// ==================== Hooks ====================

export function useAudioTracks(songId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['audio-tracks', songId];

  const tracksQuery = useQuery({
    queryKey,
    queryFn: () => fetchTracks(songId!),
    enabled: !!songId && !!user,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTrackData) => createTrackApi(songId!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ trackId, changes }: { trackId: string; changes: UpdateTrackData }) =>
      updateTrackApi(trackId, changes),
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
    mutationFn: (trackId: string) => deleteTrackApi(trackId),
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
      reorderTrackApi(trackId, newOrder),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const beatMapMutation = useMutation({
    mutationFn: ({ trackId, beatMap }: { trackId: string; beatMap: AudioTrack['beatMap'] }) =>
      updateTrackBeatMapApi(trackId, beatMap),
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
