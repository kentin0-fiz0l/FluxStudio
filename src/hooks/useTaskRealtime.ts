/**
 * Real-Time Task Updates Hook
 *
 * Provides real-time task synchronization across multiple users viewing the same project.
 *
 * Features:
 * - Automatic React Query cache updates when tasks change
 * - Toast notifications for changes from other users
 * - Presence tracking (who's viewing the project)
 * - Automatic room join/leave on mount/unmount
 * - Graceful handling of socket disconnections
 * - Prevents duplicate updates from own actions
 *
 * Usage:
 * ```tsx
 * const { onlineUsers } = useTaskRealtime(projectId);
 * ```
 */

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../lib/toast';
import {
  taskSocketService,
  Task,
  TaskUpdatePayload,
  TaskDeletePayload,
  PresenceUser,
  PresenceUpdatePayload,
} from '../services/taskSocketService';

export interface UseTaskRealtimeOptions {
  /** Disable toast notifications for updates from other users */
  disableNotifications?: boolean;
  /** Custom callback when task is created by another user */
  onTaskCreatedByOther?: (task: Task, userName: string) => void;
  /** Custom callback when task is updated by another user */
  onTaskUpdatedByOther?: (task: Task, userName: string) => void;
  /** Custom callback when task is deleted by another user */
  onTaskDeletedByOther?: (taskId: string, userName: string) => void;
}

export interface UseTaskRealtimeReturn {
  /** List of users currently viewing this project */
  onlineUsers: PresenceUser[];
  /** Whether the socket is connected */
  isConnected: boolean;
}

/**
 * Hook to enable real-time task updates for a project
 *
 * @param projectId - The project ID to track
 * @param options - Configuration options
 */
export const useTaskRealtime = (
  projectId: string | undefined,
  options: UseTaskRealtimeOptions = {}
): UseTaskRealtimeReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const {
    disableNotifications = false,
    onTaskCreatedByOther,
    onTaskUpdatedByOther,
    onTaskDeletedByOther,
  } = options;

  useEffect(() => {
    // Don't connect if no project or no user
    if (!projectId || !user) return;

    // Initialize socket connection
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
      console.warn('No auth token available for task socket');
      return;
    }

    // Connect to task socket service
    if (!taskSocketService.isSocketConnected()) {
      taskSocketService.connect(authToken, user.id, user.name);
    }

    // Join project room
    taskSocketService.joinProject(projectId);
    setIsConnected(taskSocketService.isSocketConnected());

    // Handler: Task created by another user
    const handleTaskCreated = (payload: TaskUpdatePayload) => {
      // Skip if it's our own update (prevent duplicate)
      if (payload.userId === user.id) {
        console.log('Ignoring own task:created event');
        return;
      }

      console.log('Processing task:created from another user', payload);

      // Update React Query cache
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(projectId),
        (old = []) => {
          // Check if task already exists (prevent duplicates)
          if (old.some((t) => t.id === payload.task.id)) {
            console.log('Task already exists in cache, skipping');
            return old;
          }
          return [...old, payload.task];
        }
      );

      // Show toast notification
      if (!disableNotifications) {
        toast.info(`${payload.userName} created: ${payload.task.title}`);
      }

      // Call custom callback
      onTaskCreatedByOther?.(payload.task, payload.userName);
    };

    // Handler: Task updated by another user
    const handleTaskUpdated = (payload: TaskUpdatePayload) => {
      // Skip if it's our own update
      if (payload.userId === user.id) {
        console.log('Ignoring own task:updated event');
        return;
      }

      console.log('Processing task:updated from another user', payload);

      // Update React Query cache
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(projectId),
        (old = []) => {
          return old.map((task) =>
            task.id === payload.task.id ? payload.task : task
          );
        }
      );

      // Also update task detail cache if it exists
      queryClient.setQueryData<Task>(
        queryKeys.tasks.detail(payload.task.id),
        payload.task
      );

      // Determine what changed for better notification
      const statusChanged = payload.task.status;
      let message = `${payload.userName} updated: ${payload.task.title}`;

      if (statusChanged === 'completed') {
        message = `${payload.userName} completed: ${payload.task.title}`;
      }

      // Show toast notification
      if (!disableNotifications) {
        toast.info(message);
      }

      // Call custom callback
      onTaskUpdatedByOther?.(payload.task, payload.userName);
    };

    // Handler: Task deleted by another user
    const handleTaskDeleted = (payload: TaskDeletePayload) => {
      // Skip if it's our own update
      if (payload.userId === user.id) {
        console.log('Ignoring own task:deleted event');
        return;
      }

      console.log('Processing task:deleted from another user', payload);

      // Get task title before removing (for notification)
      const tasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(projectId));
      const deletedTask = tasks?.find((t) => t.id === payload.taskId);

      // Update React Query cache
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(projectId),
        (old = []) => {
          return old.filter((task) => task.id !== payload.taskId);
        }
      );

      // Remove from detail cache if exists
      queryClient.removeQueries({
        queryKey: queryKeys.tasks.detail(payload.taskId),
      });

      // Show toast notification
      if (!disableNotifications) {
        const taskTitle = deletedTask?.title || 'a task';
        toast.warning(`${payload.userName} deleted: ${taskTitle}`);
      }

      // Call custom callback
      onTaskDeletedByOther?.(payload.taskId, payload.userName);
    };

    // Handler: Presence update (users joining/leaving)
    const handlePresenceUpdate = (payload: PresenceUpdatePayload) => {
      if (payload.projectId !== projectId) return;

      console.log('Presence update:', payload.users);

      // Filter out current user from online users list
      const otherUsers = payload.users.filter((u) => u.id !== user.id);
      setOnlineUsers(otherUsers);
    };

    // Subscribe to events
    taskSocketService.onTaskCreated(handleTaskCreated);
    taskSocketService.onTaskUpdated(handleTaskUpdated);
    taskSocketService.onTaskDeleted(handleTaskDeleted);
    taskSocketService.onPresenceUpdate(handlePresenceUpdate);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up task realtime subscription');

      // Unsubscribe from events
      taskSocketService.offTaskCreated(handleTaskCreated);
      taskSocketService.offTaskUpdated(handleTaskUpdated);
      taskSocketService.offTaskDeleted(handleTaskDeleted);
      taskSocketService.offPresenceUpdate(handlePresenceUpdate);

      // Leave project room
      taskSocketService.leaveProject(projectId);

      // Reset state
      setOnlineUsers([]);
      setIsConnected(false);
    };
  }, [
    projectId,
    user,
    queryClient,
    disableNotifications,
    onTaskCreatedByOther,
    onTaskUpdatedByOther,
    onTaskDeletedByOther,
  ]);

  return {
    onlineUsers,
    isConnected,
  };
};

/**
 * Hook to get connection status without subscribing to events
 * Useful for displaying connection indicator in UI
 */
export const useTaskSocketStatus = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(taskSocketService.isSocketConnected());
    };

    // Check immediately
    checkConnection();

    // Check periodically (every 5 seconds)
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  return { isConnected };
};
