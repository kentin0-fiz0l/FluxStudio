/**
 * useProjectPulse - Real-time activity and attention data for focused project
 *
 * Fetches data from pulse API endpoints:
 * - Activity stream (recent events in project)
 * - Attention items (things needing user action)
 * - Unseen count (for badge indicator)
 * - Team presence (who's active)
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';
import { useActiveProject } from '@/contexts/ActiveProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectPresence, PresenceMember } from './useProjectPresence';

// Activity item from API
export interface ActivityItem {
  id: string;
  projectId: string;
  type: string;
  actorUserId: string | null;
  title: string;
  entity: {
    conversationId?: string;
    messageId?: string;
    fileId?: string;
    assetId?: string;
    boardId?: string;
    notificationId?: string;
  };
  createdAt: string;
  deepLink: string;
  preview?: string;
  isNew?: boolean;
}

// Attention item from API
export interface AttentionItem {
  id: string;
  projectId: string;
  reason: 'mention' | 'reply' | 'task_assigned';
  title: string;
  description?: string;
  entity: {
    conversationId?: string;
    messageId?: string;
    taskId?: string;
    notificationId?: string;
  };
  createdAt: string;
  deepLink: string;
  status: 'open' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Team member presence (compatible with PresenceMember)
export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  userName: string;
  avatar?: string;
  joinedAt?: string;
  isOnline: boolean;
  lastActivity?: string;
  currentView?: string;
}

export interface ProjectPulseState {
  /** Recent activity in the project */
  activityStream: ActivityItem[];
  /** Items needing user attention */
  attentionItems: AttentionItem[];
  /** Team members and their status */
  teamMembers: TeamMember[];
  /** Count of unseen items since last viewed */
  unseenCount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Whether pulse is available (project is focused) */
  isAvailable: boolean;
  /** Last seen timestamp */
  lastSeenAt: string | null;
}

export interface UseProjectPulseReturn extends ProjectPulseState {
  /** Refresh pulse data */
  refresh: () => void;
  /** Mark all items as seen */
  markAllSeen: () => void;
  /** Get attention items by type */
  getAttentionByType: (reason: AttentionItem['reason']) => AttentionItem[];
}

// API helper
async function fetchPulseEndpoint<T>(
  projectId: string,
  endpoint: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`/api/projects/${projectId}/pulse/${endpoint}`, {
    method: options?.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Pulse API error: ${response.status}`);
  }

  return response.json();
}

export function useProjectPulse(): UseProjectPulseReturn {
  const { activeProject, hasFocus } = useActiveProject();
  const { user } = useAuth();
  const { members: presenceMembers, isConnected: presenceConnected } = useProjectPresence();

  const [activityStream, setActivityStream] = React.useState<ActivityItem[]>([]);
  const [attentionItems, setAttentionItems] = React.useState<AttentionItem[]>([]);
  const [unseenCount, setUnseenCount] = React.useState(0);
  const [lastSeenAt, setLastSeenAt] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const projectId = activeProject?.id;

  // Convert presence members to TeamMember format
  const teamMembers = React.useMemo((): TeamMember[] => {
    return presenceMembers.map((m) => ({
      id: m.userId,
      userId: m.userId,
      name: m.userName,
      userName: m.userName,
      avatar: m.avatar,
      joinedAt: m.joinedAt,
      isOnline: m.isOnline,
    }));
  }, [presenceMembers]);

  // Fetch pulse data (activity, attention, unseen count)
  // Note: Team presence is handled via socket in useProjectPresence
  const fetchPulseData = React.useCallback(async () => {
    if (!projectId || !hasFocus || !user) {
      setActivityStream([]);
      setAttentionItems([]);
      setUnseenCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch activity, attention, and unseen count in parallel
      // Presence is handled by socket (useProjectPresence)
      const [activityRes, attentionRes, unseenRes] = await Promise.all([
        fetchPulseEndpoint<{ success: boolean; data: ActivityItem[] }>(
          projectId,
          'activity?limit=50'
        ),
        fetchPulseEndpoint<{ success: boolean; data: AttentionItem[] }>(
          projectId,
          'attention?limit=50'
        ),
        fetchPulseEndpoint<{ success: boolean; count: number; lastSeenAt: string | null }>(
          projectId,
          'unseen-count'
        ),
      ]);

      if (activityRes.success) {
        setActivityStream(activityRes.data);
      }
      if (attentionRes.success) {
        setAttentionItems(attentionRes.data);
      }
      if (unseenRes.success) {
        setUnseenCount(unseenRes.count);
        setLastSeenAt(unseenRes.lastSeenAt);
      }
    } catch (err) {
      console.error('Failed to fetch pulse data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pulse data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, hasFocus, user]);

  // Initial fetch when project changes
  React.useEffect(() => {
    fetchPulseData();
  }, [fetchPulseData]);

  // Refresh function
  const refresh = React.useCallback(() => {
    fetchPulseData();
  }, [fetchPulseData]);

  // Mark all as seen
  const markAllSeen = React.useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetchPulseEndpoint<{ success: boolean; lastSeenAt: string }>(
        projectId,
        'mark-seen',
        { method: 'POST', body: {} }
      );

      if (response.success) {
        setUnseenCount(0);
        setLastSeenAt(response.lastSeenAt);
        // Update activity items to no longer be "new"
        setActivityStream((prev) =>
          prev.map((item) => ({ ...item, isNew: false }))
        );
      }
    } catch (err) {
      console.error('Failed to mark pulse as seen:', err);
    }
  }, [projectId]);

  // Get attention by type
  const getAttentionByType = React.useCallback(
    (reason: AttentionItem['reason']): AttentionItem[] => {
      return attentionItems.filter((item) => item.reason === reason);
    },
    [attentionItems]
  );

  return {
    activityStream,
    attentionItems,
    teamMembers,
    unseenCount,
    lastSeenAt,
    isLoading,
    error,
    isAvailable: hasFocus && !!activeProject,
    refresh,
    markAllSeen,
    getAttentionByType,
  };
}

export default useProjectPulse;
