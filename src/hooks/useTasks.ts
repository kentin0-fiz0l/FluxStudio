/**
 * Task Management React Query Hooks
 *
 * Provides efficient task management with:
 * - Optimistic updates for instant UI feedback
 * - Automatic cache synchronization
 * - Error handling with rollback
 * - Toast notifications for user feedback
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { queryKeys, invalidateProjectQueries } from '../lib/queryClient';
import { toast } from '../lib/toast';
import { taskSocketService } from '../services/taskSocketService';

// Type definitions
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignedTo?: string | null;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignedTo?: string | null;
  dueDate?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  tasks?: T[];
  task?: T;
  error?: string;
  message?: string;
}

/**
 * Fetch all tasks for a specific project
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Auto-refetch on window focus (collaboration awareness)
 * - Disabled when projectId is not provided
 *
 * @param projectId - The ID of the project to fetch tasks for
 * @param options - Additional React Query options
 */
export const useTasksQuery = (
  projectId: string | undefined,
  options?: Omit<UseQueryOptions<Task[], Error>, 'queryKey' | 'queryFn'>
) => {
  const { user } = useAuth();

  return useQuery<Task[], Error>({
    queryKey: queryKeys.tasks.list(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch tasks');
      }

      const result: ApiResponse<Task> = await response.json();

      // Handle different response formats
      if (result.tasks) return result.tasks;
      if (result.data && Array.isArray(result.data)) return result.data;
      return [];
    },
    enabled: !!projectId && !!user,
    ...options,
  });
};

/**
 * Fetch a single task by ID
 *
 * Useful for task detail modals or pages
 *
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task to fetch
 */
export const useTaskQuery = (projectId: string | undefined, taskId: string | undefined) => {
  const { user } = useAuth();

  return useQuery<Task, Error>({
    queryKey: queryKeys.tasks.detail(taskId || ''),
    queryFn: async () => {
      if (!projectId || !taskId) throw new Error('Project ID and Task ID are required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch task');
      }

      const result: ApiResponse<Task> = await response.json();
      return result.task || result.data as Task;
    },
    enabled: !!projectId && !!taskId && !!user,
  });
};

/**
 * Create a new task with optimistic update
 *
 * Flow:
 * 1. Immediately add temporary task to cache (optimistic)
 * 2. Send request to server
 * 3. On success: Replace temporary task with real task from server
 * 4. On error: Rollback to previous state and show error toast
 *
 * @param projectId - The ID of the project to create the task in
 */
export const useCreateTaskMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Task, Error, CreateTaskInput, { previousTasks: Task[] | undefined }>({
    mutationFn: async (newTask: CreateTaskInput) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newTask),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to create task');
      }

      const result: ApiResponse<Task> = await response.json();
      return result.task || result.data as Task;
    },

    // Optimistic update: Add task to cache immediately
    onMutate: async (newTask) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(projectId) });

      // Snapshot the previous tasks for rollback
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(projectId));

      // Optimistically update cache with temporary task
      const tempTask: Task = {
        id: `temp-${Date.now()}`, // Temporary ID
        ...newTask,
        title: newTask.title,
        description: newTask.description || '',
        status: newTask.status || 'todo',
        priority: newTask.priority || 'medium',
        assignedTo: newTask.assignedTo || null,
        dueDate: newTask.dueDate || null,
        createdBy: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      };

      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(projectId),
        (old = []) => [...old, tempTask]
      );

      return { previousTasks };
    },

    // On error: Rollback to previous state
    onError: (error, newTask, context) => {
      queryClient.setQueryData(queryKeys.tasks.list(projectId), context?.previousTasks);
      toast.error(error.message || 'Failed to create task');
    },

    // On success: Replace temporary task with real task and show success toast
    onSuccess: (createdTask) => {
      toast.success(`Task "${createdTask.title}" created successfully`);

      // Emit socket event for real-time update (broadcast to other users)
      taskSocketService.emitTaskCreated(projectId, createdTask);

      // Invalidate queries to ensure fresh data
      invalidateProjectQueries(projectId);
    },
  });
};

/**
 * Update an existing task with optimistic update
 *
 * Flow:
 * 1. Immediately update task in cache (optimistic)
 * 2. Send request to server
 * 3. On success: Confirm update with server response
 * 4. On error: Rollback to previous state and show error toast
 *
 * @param projectId - The ID of the project
 */
export const useUpdateTaskMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    Task,
    Error,
    { taskId: string; updates: UpdateTaskInput },
    { previousTasks: Task[] | undefined; previousTask: Task | undefined }
  >({
    mutationFn: async ({ taskId, updates }) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to update task');
      }

      const result: ApiResponse<Task> = await response.json();
      return result.task || result.data as Task;
    },

    // Optimistic update: Modify task in cache immediately
    onMutate: async ({ taskId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });

      // Snapshot previous values
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(projectId));
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(taskId));

      // Optimistically update task list
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(projectId),
        (old = []) =>
          old.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                  // Handle status change to completed
                  completedAt:
                    updates.status === 'completed' && task.status !== 'completed'
                      ? new Date().toISOString()
                      : task.completedAt,
                }
              : task
          )
      );

      // Optimistically update task detail if cached
      if (previousTask) {
        queryClient.setQueryData<Task>(queryKeys.tasks.detail(taskId), {
          ...previousTask,
          ...updates,
          updatedAt: new Date().toISOString(),
          completedAt:
            updates.status === 'completed' && previousTask.status !== 'completed'
              ? new Date().toISOString()
              : previousTask.completedAt,
        });
      }

      return { previousTasks, previousTask };
    },

    // On error: Rollback to previous state
    onError: (error, { taskId }, context) => {
      queryClient.setQueryData(queryKeys.tasks.list(projectId), context?.previousTasks);
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
      }
      toast.error(error.message || 'Failed to update task');
    },

    // On success: Show success toast and invalidate queries
    onSuccess: (updatedTask) => {
      toast.success(`Task "${updatedTask.title}" updated successfully`);

      // Emit socket event for real-time update (broadcast to other users)
      taskSocketService.emitTaskUpdated(projectId, updatedTask);

      invalidateProjectQueries(projectId);
    },
  });
};

/**
 * Delete a task with optimistic update
 *
 * Flow:
 * 1. Immediately remove task from cache (optimistic)
 * 2. Send delete request to server
 * 3. On success: Confirm deletion with success toast
 * 4. On error: Rollback to previous state and show error toast
 *
 * @param projectId - The ID of the project
 */
export const useDeleteTaskMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    void,
    Error,
    string,
    { previousTasks: Task[] | undefined; deletedTask: Task | undefined }
  >({
    mutationFn: async (taskId: string) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to delete task');
      }
    },

    // Optimistic update: Remove task from cache immediately
    onMutate: async (taskId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(projectId) });

      // Snapshot previous tasks
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(projectId));

      // Find the task being deleted for rollback
      const deletedTask = previousTasks?.find((task) => task.id === taskId);

      // Optimistically remove task from cache
      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(projectId),
        (old = []) => old.filter((task) => task.id !== taskId)
      );

      return { previousTasks, deletedTask };
    },

    // On error: Rollback to previous state
    onError: (error, taskId, context) => {
      queryClient.setQueryData(queryKeys.tasks.list(projectId), context?.previousTasks);
      toast.error(error.message || 'Failed to delete task');
    },

    // On success: Show success toast and invalidate queries
    onSuccess: (_, taskId, context) => {
      const taskTitle = context?.deletedTask?.title || 'Task';
      toast.success(`"${taskTitle}" deleted successfully`);

      // Emit socket event for real-time update (broadcast to other users)
      taskSocketService.emitTaskDeleted(projectId, taskId);

      invalidateProjectQueries(projectId);
    },
  });
};

/**
 * Batch update multiple tasks (e.g., bulk status change)
 *
 * Useful for operations like:
 * - Marking multiple tasks as completed
 * - Changing priority for multiple tasks
 * - Reassigning multiple tasks
 *
 * @param projectId - The ID of the project
 */
export const useBatchUpdateTasksMutation = (projectId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    Task[],
    Error,
    { taskIds: string[]; updates: UpdateTaskInput },
    { previousTasks: Task[] | undefined }
  >({
    mutationFn: async ({ taskIds, updates }) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');

      // Execute updates in parallel
      const updatePromises = taskIds.map((taskId) =>
        fetch(getApiUrl(`/api/projects/${projectId}/tasks/${taskId}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updates),
        }).then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update task');
          }
          const result: ApiResponse<Task> = await response.json();
          return result.task || result.data as Task;
        })
      );

      return Promise.all(updatePromises);
    },

    // Optimistic update
    onMutate: async ({ taskIds, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(projectId) });

      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.list(projectId));

      queryClient.setQueryData<Task[]>(
        queryKeys.tasks.list(projectId),
        (old = []) =>
          old.map((task) =>
            taskIds.includes(task.id)
              ? { ...task, ...updates, updatedAt: new Date().toISOString() }
              : task
          )
      );

      return { previousTasks };
    },

    onError: (error, variables, context) => {
      queryClient.setQueryData(queryKeys.tasks.list(projectId), context?.previousTasks);
      toast.error(error.message || 'Failed to update tasks');
    },

    onSuccess: (_, { taskIds }) => {
      toast.success(`${taskIds.length} task${taskIds.length > 1 ? 's' : ''} updated successfully`);
      invalidateProjectQueries(projectId);
    },
  });
};
