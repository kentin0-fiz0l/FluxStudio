/**
 * useProjectPulse - Real-time activity and attention data for focused project
 *
 * Aggregates data from multiple sources to provide:
 * - Activity stream (recent events in project)
 * - Attention items (things needing user action)
 * - Unseen count (for badge indicator)
 * - Team presence (who's active)
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';
import { useActiveProjectOptional } from '@/contexts/ActiveProjectContext';
import { useSession } from '@/contexts/SessionContext';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';

// Activity item types
export type ActivityType =
  | 'message'
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'file_uploaded'
  | 'member_joined'
  | 'comment'
  | 'mention';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  actorName?: string;
  actorAvatar?: string;
  actionUrl?: string;
  projectId: string;
  isNew?: boolean; // Since last seen
}

export interface AttentionItem {
  id: string;
  type: 'mention' | 'assigned_task' | 'reply' | 'approval';
  title: string;
  description?: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  projectId: string;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
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
}

export interface UseProjectPulseReturn extends ProjectPulseState {
  /** Refresh pulse data */
  refresh: () => void;
  /** Mark all items as seen */
  markAllSeen: () => void;
  /** Get attention items by type */
  getAttentionByType: (type: AttentionItem['type']) => AttentionItem[];
}

export function useProjectPulse(): UseProjectPulseReturn {
  const activeProjectContext = useActiveProjectOptional();
  const activeProject = activeProjectContext?.activeProject ?? null;
  const hasFocus = activeProjectContext?.hasFocus ?? false;
  const { session, markAsSeen, getTimeSinceLastSeen } = useSession();
  const { state: notificationState } = useNotifications();
  const { tasks } = useTasks(activeProject?.id);
  const { user } = useAuth();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Build activity stream from notifications
  const activityStream = React.useMemo((): ActivityItem[] => {
    if (!hasFocus || !activeProject) return [];

    const lastSeenTime = session.lastSeenTimestamp
      ? new Date(session.lastSeenTimestamp)
      : null;

    // Convert notifications to activity items
    const activities: ActivityItem[] = notificationState.notifications
      .filter((n) => n.projectId === activeProject.id)
      .slice(0, 20) // Limit to recent 20
      .map((notification): ActivityItem => {
        const timestamp = new Date(notification.createdAt);
        return {
          id: notification.id,
          type: mapNotificationToActivityType(notification.type),
          title: notification.title,
          description: notification.message,
          timestamp,
          actionUrl: notification.actionUrl || undefined,
          projectId: activeProject.id,
          isNew: lastSeenTime ? timestamp > lastSeenTime : true,
        };
      });

    // Sort by timestamp descending
    return activities.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [hasFocus, activeProject, notificationState.notifications, session.lastSeenTimestamp]);

  // Build attention items from notifications and tasks
  const attentionItems = React.useMemo((): AttentionItem[] => {
    if (!hasFocus || !activeProject || !user) return [];

    const items: AttentionItem[] = [];

    // Add unread notifications that need attention (mentions, replies)
    notificationState.notifications
      .filter(
        (n) =>
          n.projectId === activeProject.id &&
          !n.isRead &&
          (n.type === 'message_mention' || n.type === 'message_reply')
      )
      .forEach((notification) => {
        items.push({
          id: notification.id,
          type: notification.type === 'message_mention' ? 'mention' : 'reply',
          title: notification.title,
          description: notification.message,
          timestamp: new Date(notification.createdAt),
          priority: notification.priority || 'medium',
          actionUrl: notification.actionUrl || undefined,
          projectId: activeProject.id,
        });
      });

    // Add assigned tasks that are not completed
    if (tasks) {
      tasks
        .filter(
          (task) =>
            task.assigneeId === user.id &&
            task.status !== 'done' &&
            task.status !== 'completed'
        )
        .forEach((task) => {
          items.push({
            id: `task-${task.id}`,
            type: 'assigned_task',
            title: task.title,
            description: task.description || undefined,
            timestamp: new Date(task.createdAt),
            priority: mapTaskPriorityToAttention(task.priority),
            actionUrl: `/projects/${activeProject.id}?tab=tasks`,
            projectId: activeProject.id,
          });
        });
    }

    // Sort by priority then timestamp
    return items.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [hasFocus, activeProject, notificationState.notifications, tasks, user]);

  // Calculate unseen count
  const unseenCount = React.useMemo(() => {
    if (!hasFocus || !activeProject) return 0;

    const lastSeenTime = session.lastSeenTimestamp
      ? new Date(session.lastSeenTimestamp)
      : null;

    if (!lastSeenTime) {
      // Never seen = count unread notifications for this project
      return notificationState.notifications.filter(
        (n) => n.projectId === activeProject.id && !n.isRead
      ).length;
    }

    // Count items newer than last seen
    return notificationState.notifications.filter(
      (n) =>
        n.projectId === activeProject.id &&
        new Date(n.createdAt) > lastSeenTime
    ).length;
  }, [hasFocus, activeProject, notificationState.notifications, session.lastSeenTimestamp]);

  // Team members (placeholder - will integrate with socket presence)
  const teamMembers = React.useMemo((): TeamMember[] => {
    // TODO: Integrate with actual presence data from SocketContext
    return [];
  }, []);

  const refresh = React.useCallback(() => {
    // For now, data is reactive via contexts
    // Future: trigger API refresh
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  const markAllSeen = React.useCallback(() => {
    markAsSeen();
  }, [markAsSeen]);

  const getAttentionByType = React.useCallback(
    (type: AttentionItem['type']): AttentionItem[] => {
      return attentionItems.filter((item) => item.type === type);
    },
    [attentionItems]
  );

  return {
    activityStream,
    attentionItems,
    teamMembers,
    unseenCount,
    isLoading,
    error,
    isAvailable: hasFocus && !!activeProject,
    refresh,
    markAllSeen,
    getAttentionByType,
  };
}

// Helper: Map notification type to activity type
function mapNotificationToActivityType(
  notificationType: Notification['type']
): ActivityType {
  switch (notificationType) {
    case 'message_mention':
      return 'mention';
    case 'message_reply':
      return 'message';
    case 'project_member_added':
      return 'member_joined';
    case 'project_file_uploaded':
      return 'file_uploaded';
    case 'project_status_changed':
      return 'task_completed';
    default:
      return 'comment';
  }
}

// Helper: Map task priority to attention priority
function mapTaskPriorityToAttention(
  taskPriority?: string
): AttentionItem['priority'] {
  switch (taskPriority) {
    case 'urgent':
    case 'critical':
      return 'urgent';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

export default useProjectPulse;
