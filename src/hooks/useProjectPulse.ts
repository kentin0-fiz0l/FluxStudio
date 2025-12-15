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
import { useActiveProject } from '@/contexts/ActiveProjectContext';
import { useSession } from '@/contexts/SessionContext';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { useTasks, Task } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectPresence, ProjectPresenceMember, PulseEvent } from '@/hooks/useProjectPresence';

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
  userId: string;
  name: string;
  userName: string;
  avatar?: string;
  isOnline: boolean;
  joinedAt?: string;
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
  /** Whether socket is connected */
  isConnected: boolean;
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
  const { activeProject, hasFocus } = useActiveProject();
  const { session, markAsSeen, getTimeSinceLastSeen } = useSession();
  const { state: notificationState } = useNotifications();
  const { tasks } = useTasks(activeProject?.id);
  const { user } = useAuth();

  // Get presence from unified socket
  const { members: presenceMembers, isConnected, onPulseEvent } = useProjectPresence();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [realtimeActivity, setRealtimeActivity] = React.useState<ActivityItem[]>([]);

  // Build activity stream from notifications + real-time events
  const activityStream = React.useMemo((): ActivityItem[] => {
    if (!hasFocus || !activeProject) return [];

    const lastSeenTime = session.lastSeenTimestamp
      ? new Date(session.lastSeenTimestamp)
      : null;

    // Convert notifications to activity items
    const notificationActivities: ActivityItem[] = notificationState.notifications
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

    // Merge with real-time activity, avoiding duplicates
    const allActivities = [...realtimeActivity];
    for (const notifActivity of notificationActivities) {
      if (!allActivities.some((a) => a.id === notifActivity.id)) {
        allActivities.push(notifActivity);
      }
    }

    // Sort by timestamp descending
    return allActivities.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    ).slice(0, 30);
  }, [hasFocus, activeProject, notificationState.notifications, session.lastSeenTimestamp, realtimeActivity]);

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

  // Team members from socket presence
  const teamMembers = React.useMemo((): TeamMember[] => {
    return presenceMembers.map((m): TeamMember => ({
      id: m.userId,
      userId: m.userId,
      name: m.userName,
      userName: m.userName,
      avatar: m.avatar,
      isOnline: m.isOnline,
      joinedAt: m.joinedAt,
    }));
  }, [presenceMembers]);

  // Subscribe to real-time pulse events
  React.useEffect(() => {
    if (!hasFocus || !activeProject) {
      setRealtimeActivity([]);
      return;
    }

    const unsubscribe = onPulseEvent((event: PulseEvent) => {
      if (event.projectId !== activeProject.id) return;

      if (event.type === 'activity') {
        // Add real-time activity to the list
        const newItem = event.event as ActivityItem;
        setRealtimeActivity((prev) => {
          // Deduplicate
          if (prev.some((item) => item.id === newItem.id)) {
            return prev;
          }
          return [{ ...newItem, isNew: true }, ...prev].slice(0, 20);
        });
      }
    });

    return unsubscribe;
  }, [hasFocus, activeProject, onPulseEvent]);

  // Clear realtime activity when project changes
  React.useEffect(() => {
    setRealtimeActivity([]);
  }, [activeProject?.id]);

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
    isConnected,
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
