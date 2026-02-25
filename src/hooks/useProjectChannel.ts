/**
 * Project Channel Hook - Flux Studio Phase 2 Messages Integration
 *
 * Uses TanStack Query for channel fetching with lazy creation via mutation.
 * Channels are created on-demand when users first access the Messages tab.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { queryKeys } from '../lib/queryClient';

interface Channel {
  id: string;
  name: string;
  type: 'direct' | 'project' | 'team' | 'consultation' | 'support' | 'broadcast';
  projectId?: string;
  participants: Array<{
    id: string;
    name: string;
    role?: string;
    avatar?: string;
    userType?: 'client' | 'designer' | 'admin';
    isOnline?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface UseProjectChannelReturn {
  channel: Channel | null;
  loading: boolean;
  error: string | null;
  createChannel: (projectName: string, memberIds: string[]) => Promise<Channel | null>;
  refresh: () => Promise<void>;
}

export function useProjectChannel(projectId: string): UseProjectChannelReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: channel = null,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<Channel | null, Error>({
    queryKey: queryKeys.projectChannels.detail(projectId),
    queryFn: async () => {
      if (!projectId || !user) return null;

      try {
        const result = await apiService.get<{ channel: Channel | null }>(`/api/projects/${projectId}/channel`);
        return result.data?.channel || null;
      } catch (error) {
        // Return null on 404 instead of throwing
        if (error instanceof Error && error.message.includes('404')) return null;
        throw error;
      }
    },
    enabled: !!projectId && !!user,
    staleTime: 5 * 60 * 1000, // channels don't change often
  });

  const error = queryError?.message ?? null;

  const createChannelMutation = useMutation<Channel | null, Error, { projectName: string; memberIds: string[] }>({
    mutationFn: async ({ projectName, memberIds }) => {
      if (!projectId || !user) throw new Error('Project ID and user authentication required');

      // Step 1: Create channel in messaging service (external URL — keep raw fetch)
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authentication required');

      const messagingUrl = process.env.REACT_APP_MESSAGING_URL || 'http://localhost:3004';
      const createResponse = await fetch(`${messagingUrl}/api/channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${projectName} Discussion`,
          type: 'project',
          projectId,
          participants: memberIds,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create channel in messaging service');
      }

      const channelData = await createResponse.json();
      const newChannel: Channel = channelData.channel || channelData;

      // Step 2: Link channel to project
      try {
        await apiService.post(`/api/projects/${projectId}/channel`, { channelId: newChannel.id });
      } catch {
        console.warn('[useProjectChannel] Channel created but linking to project failed');
      }

      return newChannel;
    },
    onSuccess: (newChannel) => {
      queryClient.setQueryData(queryKeys.projectChannels.detail(projectId), newChannel);
    },
  });

  const createChannel = useCallback(
    async (projectName: string, memberIds: string[]): Promise<Channel | null> => {
      try {
        return await createChannelMutation.mutateAsync({ projectName, memberIds });
      } catch {
        return null;
      }
    },
    [createChannelMutation]
  );

  const refresh = useCallback(async () => { await refetch(); }, [refetch]);

  return { channel, loading, error, createChannel, refresh };
}

export default useProjectChannel;
