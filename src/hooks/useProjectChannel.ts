/**
 * Project Channel Hook - Flux Studio Phase 2 Messages Integration
 *
 * Implements lazy channel creation for project-specific messaging.
 * Channels are created on-demand when users first access the Messages tab.
 *
 * Pattern:
 * 1. Check if project already has a channel (GET /api/projects/:id/channel)
 * 2. If not, create channel when needed (POST /api/channels + link to project)
 * 3. Return channel state with loading and error handling
 *
 * @example
 * const { channel, loading, error, createChannel } = useProjectChannel(projectId);
 *
 * // Create channel when Messages tab is opened
 * if (!channel && !loading) {
 *   await createChannel('Project Name', ['user1', 'user2']);
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Channel data structure matching messaging service schema
 */
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

/**
 * Hook return type with channel state and actions
 */
interface UseProjectChannelReturn {
  channel: Channel | null;
  loading: boolean;
  error: string | null;
  createChannel: (projectName: string, memberIds: string[]) => Promise<Channel | null>;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing project messaging channels with lazy creation
 *
 * @param projectId - The ID of the project to manage channels for
 * @returns Channel state, loading status, errors, and channel creation function
 */
export function useProjectChannel(projectId: string): UseProjectChannelReturn {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches the existing channel for a project from the Projects API
   * Returns null if no channel exists (which is expected for new projects)
   */
  const fetchProjectChannel = useCallback(async () => {
    if (!projectId || !user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/projects/${projectId}/channel`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        // No channel exists yet - this is normal for new projects
        setChannel(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch project channel: ${response.statusText}`);
      }

      const data = await response.json();
      setChannel(data.channel || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch channel';
      console.error('[useProjectChannel] Error fetching channel:', errorMessage);
      setError(errorMessage);
      setChannel(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  /**
   * Creates a new channel for the project using lazy creation pattern:
   *
   * Step 1: Create channel in messaging service (POST /api/channels)
   * Step 2: Link channel to project (POST /api/projects/:id/channel)
   *
   * This ensures the channel is only created when actually needed (e.g., when
   * user first opens the Messages tab), avoiding unnecessary channels for
   * projects where messaging is never used.
   *
   * @param projectName - Name to use for the channel
   * @param memberIds - Array of user IDs to add as channel participants
   * @returns The created channel or null if creation failed
   */
  const createChannel = useCallback(async (
    projectName: string,
    memberIds: string[]
  ): Promise<Channel | null> => {
    if (!projectId || !user) {
      setError('Project ID and user authentication required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Step 1: Create channel in messaging service
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

      // Step 2: Link channel to project in Projects API
      const linkResponse = await fetch(`/api/projects/${projectId}/channel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: newChannel.id,
        }),
      });

      if (!linkResponse.ok) {
        // Channel was created but linking failed - log warning but don't fail
        console.warn('[useProjectChannel] Channel created but linking to project failed');
      }

      // Update local state with new channel
      setChannel(newChannel);
      return newChannel;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create channel';
      console.error('[useProjectChannel] Error creating channel:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, user]);

  /**
   * Refreshes the channel data from the server
   * Useful after updates or to ensure data is current
   */
  const refresh = useCallback(async () => {
    await fetchProjectChannel();
  }, [fetchProjectChannel]);

  /**
   * Fetch channel when project ID changes or component mounts
   * This checks if a channel already exists for the project
   */
  useEffect(() => {
    fetchProjectChannel();
  }, [fetchProjectChannel]);

  return {
    channel,
    loading,
    error,
    createChannel,
    refresh,
  };
}

export default useProjectChannel;
