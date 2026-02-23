/**
 * Comments Management React Query Hooks
 *
 * Provides efficient comment management with:
 * - Optimistic updates for instant UI feedback
 * - Automatic cache synchronization
 * - Error handling with rollback
 * - Toast notifications for user feedback
 * - Real-time collaboration support
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { getApiUrl } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../lib/toast';
import { CACHE_STANDARD } from '@/lib/queryConfig';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Comment {
  id: string;
  taskId: string;
  projectId: string;
  content: string; // Markdown text
  mentions: string[]; // User IDs mentioned
  createdBy: string;
  createdAt: string; // ISO8601
  updatedAt: string | null;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCommentInput {
  content: string;
  mentions?: string[];
}

export interface UpdateCommentInput {
  content?: string;
  mentions?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  comments?: T[];
  comment?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (projectId: string, taskId: string) =>
    [...commentKeys.lists(), projectId, taskId] as const,
  details: () => [...commentKeys.all, 'detail'] as const,
  detail: (commentId: string) => [...commentKeys.details(), commentId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all comments for a specific task
 *
 * Features:
 * - Automatic caching with 2-minute stale time
 * - Auto-refetch on window focus (collaboration awareness)
 * - Disabled when projectId or taskId is not provided
 *
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task to fetch comments for
 * @param options - Additional React Query options
 */
export const useCommentsQuery = (
  projectId: string | undefined,
  taskId: string | undefined,
  options?: Omit<UseQueryOptions<Comment[], Error>, 'queryKey' | 'queryFn'>
) => {
  const { user } = useAuth();

  return useQuery<Comment[], Error>({
    queryKey: commentKeys.list(projectId || '', taskId || ''),
    queryFn: async () => {
      if (!projectId || !taskId) throw new Error('Project ID and Task ID are required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        getApiUrl(`/api/projects/${projectId}/tasks/${taskId}/comments`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch comments');
      }

      const result: ApiResponse<Comment> = await response.json();

      // Handle different response formats
      if (result.comments) return result.comments;
      if (result.data && Array.isArray(result.data)) return result.data;
      return [];
    },
    enabled: !!projectId && !!taskId && !!user,
    staleTime: CACHE_STANDARD.staleTime,
    refetchOnWindowFocus: true,
    ...options,
  });
};

/**
 * Fetch a single comment by ID
 *
 * Useful for comment detail views or modals
 *
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task
 * @param commentId - The ID of the comment to fetch
 */
export const useCommentQuery = (
  projectId: string | undefined,
  taskId: string | undefined,
  commentId: string | undefined
) => {
  const { user } = useAuth();

  return useQuery<Comment, Error>({
    queryKey: commentKeys.detail(commentId || ''),
    queryFn: async () => {
      if (!projectId || !taskId || !commentId) {
        throw new Error('Project ID, Task ID, and Comment ID are required');
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        getApiUrl(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch comment');
      }

      const result: ApiResponse<Comment> = await response.json();
      return result.comment || (result.data as Comment);
    },
    enabled: !!projectId && !!taskId && !!commentId && !!user,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new comment with optimistic update
 *
 * Flow:
 * 1. Immediately add temporary comment to cache (optimistic)
 * 2. Send request to server
 * 3. On success: Replace temporary comment with real comment from server
 * 4. On error: Rollback to previous state and show error toast
 *
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task to create the comment in
 */
export const useCreateCommentMutation = (projectId: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    Comment,
    Error,
    CreateCommentInput,
    { previousComments: Comment[] | undefined }
  >({
    mutationFn: async (newComment: CreateCommentInput) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        getApiUrl(`/api/projects/${projectId}/tasks/${taskId}/comments`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(newComment),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to create comment');
      }

      const result: ApiResponse<Comment> = await response.json();
      return result.comment || (result.data as Comment);
    },

    // Optimistic update: Add comment to cache immediately
    onMutate: async (newComment) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: commentKeys.list(projectId, taskId) });

      // Snapshot the previous comments for rollback
      const previousComments = queryClient.getQueryData<Comment[]>(
        commentKeys.list(projectId, taskId)
      );

      // Optimistically update cache with temporary comment
      const tempComment: Comment = {
        id: `temp-${Date.now()}`, // Temporary ID
        taskId,
        projectId,
        content: newComment.content,
        mentions: newComment.mentions || [],
        createdBy: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: null,
        author: {
          id: user?.id || '',
          name: user?.name || '',
          email: user?.email || '',
        },
      };

      queryClient.setQueryData<Comment[]>(commentKeys.list(projectId, taskId), (old = []) => [
        ...old,
        tempComment,
      ]);

      return { previousComments };
    },

    // On error: Rollback to previous state
    onError: (error, _newComment, context) => {
      queryClient.setQueryData(commentKeys.list(projectId, taskId), context?.previousComments);
      toast.error(error.message || 'Failed to create comment');
    },

    // On success: Replace temporary comment with real comment and show success toast
    onSuccess: (_createdComment) => {
      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: commentKeys.list(projectId, taskId) });
      toast.success('Comment posted successfully');
    },
  });
};

/**
 * Update an existing comment with optimistic update
 *
 * Flow:
 * 1. Immediately update comment in cache (optimistic)
 * 2. Send request to server
 * 3. On success: Confirm update with server response
 * 4. On error: Rollback to previous state and show error toast
 *
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task
 */
export const useUpdateCommentMutation = (projectId: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    Comment,
    Error,
    { commentId: string; updates: UpdateCommentInput },
    { previousComments: Comment[] | undefined; previousComment: Comment | undefined }
  >({
    mutationFn: async ({ commentId, updates }) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        getApiUrl(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`),
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to update comment');
      }

      const result: ApiResponse<Comment> = await response.json();
      return result.comment || (result.data as Comment);
    },

    // Optimistic update: Modify comment in cache immediately
    onMutate: async ({ commentId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentKeys.list(projectId, taskId) });
      await queryClient.cancelQueries({ queryKey: commentKeys.detail(commentId) });

      // Snapshot previous values
      const previousComments = queryClient.getQueryData<Comment[]>(
        commentKeys.list(projectId, taskId)
      );
      const previousComment = queryClient.getQueryData<Comment>(commentKeys.detail(commentId));

      // Optimistically update comment list
      queryClient.setQueryData<Comment[]>(commentKeys.list(projectId, taskId), (old = []) =>
        old.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : comment
        )
      );

      // Optimistically update comment detail if cached
      if (previousComment) {
        queryClient.setQueryData<Comment>(commentKeys.detail(commentId), {
          ...previousComment,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousComments, previousComment };
    },

    // On error: Rollback to previous state
    onError: (error, { commentId }, context) => {
      queryClient.setQueryData(commentKeys.list(projectId, taskId), context?.previousComments);
      if (context?.previousComment) {
        queryClient.setQueryData(commentKeys.detail(commentId), context.previousComment);
      }
      toast.error(error.message || 'Failed to update comment');
    },

    // On success: Show success toast and invalidate queries
    onSuccess: () => {
      toast.success('Comment updated successfully');
      queryClient.invalidateQueries({ queryKey: commentKeys.list(projectId, taskId) });
    },
  });
};

/**
 * Delete a comment with optimistic update
 *
 * Flow:
 * 1. Immediately remove comment from cache (optimistic)
 * 2. Send delete request to server
 * 3. On success: Confirm deletion with success toast
 * 4. On error: Rollback to previous state and show error toast
 *
 * @param projectId - The ID of the project
 * @param taskId - The ID of the task
 */
export const useDeleteCommentMutation = (projectId: string, taskId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    void,
    Error,
    string,
    { previousComments: Comment[] | undefined; deletedComment: Comment | undefined }
  >({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('Authentication required');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        getApiUrl(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to delete comment');
      }
    },

    // Optimistic update: Remove comment from cache immediately
    onMutate: async (commentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentKeys.list(projectId, taskId) });

      // Snapshot previous comments
      const previousComments = queryClient.getQueryData<Comment[]>(
        commentKeys.list(projectId, taskId)
      );

      // Find the comment being deleted for rollback
      const deletedComment = previousComments?.find((comment) => comment.id === commentId);

      // Optimistically remove comment from cache
      queryClient.setQueryData<Comment[]>(
        commentKeys.list(projectId, taskId),
        (old = []) => old.filter((comment) => comment.id !== commentId)
      );

      return { previousComments, deletedComment };
    },

    // On error: Rollback to previous state
    onError: (error, _commentId, context) => {
      queryClient.setQueryData(commentKeys.list(projectId, taskId), context?.previousComments);
      toast.error(error.message || 'Failed to delete comment');
    },

    // On success: Show success toast and invalidate queries
    onSuccess: () => {
      toast.success('Comment deleted successfully');
      queryClient.invalidateQueries({ queryKey: commentKeys.list(projectId, taskId) });
    },
  });
};

/**
 * Invalidate all comment queries for a specific task
 * Useful after external updates (e.g., WebSocket events)
 */
export const invalidateTaskComments = (
  queryClient: import('@tanstack/react-query').QueryClient,
  projectId: string,
  taskId: string
) => {
  queryClient.invalidateQueries({ queryKey: commentKeys.list(projectId, taskId) });
};

export { commentKeys };
