/**
 * Optimistic Mutation Factory
 *
 * Creates TanStack Query mutation configs with:
 * - Optimistic cache updates (list + optional detail)
 * - Automatic rollback on error
 * - Toast notifications
 * - Offline queue fallback (queues to offlineSlice on network failure)
 *
 * Usage:
 *   const mutation = useOptimisticCreate({
 *     listQueryKey: queryKeys.tasks.list(projectId),
 *     endpoint: `/api/projects/${projectId}/tasks`,
 *     createOptimisticItem: (input) => ({ id: `temp-${Date.now()}`, ...input }),
 *     successMessage: (item) => `Task "${item.title}" created`,
 *   });
 */

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { getApiUrl } from '../utils/apiHelpers';
import { toast } from './toast';
import { useStore } from '../store/store';

// ============================================================================
// Types
// ============================================================================

interface BaseConfig<TItem> {
  /** The query key for the list cache */
  listQueryKey: QueryKey;
  /** Query keys to invalidate on success */
  invalidateKeys?: QueryKey[];
  /** Success toast message */
  successMessage?: (item: TItem) => string;
  /** Error toast message */
  errorMessage?: string;
  /** Extra callback on success */
  onSuccess?: (item: TItem) => void;
}

interface CreateConfig<TItem, TInput> extends BaseConfig<TItem> {
  /** API endpoint (relative, e.g. `/api/projects/123/tasks`) */
  endpoint: string;
  /** Build the optimistic item from the mutation input */
  createOptimisticItem: (input: TInput) => TItem;
}

interface UpdateConfig<TItem, TInput> extends BaseConfig<TItem> {
  /** Function that returns the endpoint given the input */
  endpoint: (input: TInput) => string;
  /** Detail query key for single-item cache */
  detailQueryKey?: (input: TInput) => QueryKey;
  /** Apply the update to a cached item */
  applyUpdate: (item: TItem, input: TInput) => TItem;
  /** Extract the item ID from the input (for matching in the list) */
  getItemId: (input: TInput) => string;
}

interface DeleteConfig<TItem> extends BaseConfig<TItem> {
  /** Function that returns the endpoint given the item ID */
  endpoint: (id: string) => string;
  /** Detail query key for the deleted item */
  detailQueryKey?: (id: string) => QueryKey;
}

// Helper to check if an error is a network error (offline)
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  // Check for common network-related error messages
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') || msg.includes('fetch') || msg.includes('offline');
  }
  return false;
}

// Helper to make an authenticated API request via apiService
async function apiRequest<T>(
  endpoint: string,
  method: string,
  body?: unknown,
): Promise<T> {
  let result;
  switch (method) {
    case 'POST':
      result = await apiService.post<T>(endpoint, body);
      break;
    case 'PUT':
    case 'PATCH':
      result = await apiService.patch<T>(endpoint, body);
      break;
    case 'DELETE':
      result = await apiService.delete<T>(endpoint);
      break;
    default:
      result = await apiService.get<T>(endpoint);
  }
  const data = result.data as Record<string, unknown> | undefined;
  return ((data as Record<string, unknown>)?.task || data || result) as T;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for optimistic CREATE mutations.
 *
 * Adds a temporary item to the list cache immediately,
 * then replaces with server data on success or rolls back on error.
 */
export function useOptimisticCreate<TItem extends { id: string }, TInput>(
  config: CreateConfig<TItem, TInput>,
) {
  const queryClient = useQueryClient();
  const queueAction = useStore((s) => s.offline.queueAction);

  return useMutation<TItem, Error, TInput, { previous: TItem[] | undefined }>({
    mutationFn: (input) => apiRequest<TItem>(config.endpoint, 'POST', input),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: config.listQueryKey });
      const previous = queryClient.getQueryData<TItem[]>(config.listQueryKey);
      const optimistic = config.createOptimisticItem(input);

      queryClient.setQueryData<TItem[]>(
        config.listQueryKey,
        (old = []) => [...old, optimistic],
      );

      return { previous };
    },

    onError: (error, input, context) => {
      // Rollback the optimistic update
      if (context?.previous) {
        queryClient.setQueryData(config.listQueryKey, context.previous);
      }

      // If offline, queue for later sync
      if (isNetworkError(error)) {
        // Re-apply optimistic update (it was rolled back above)
        if (context?.previous) {
          const optimistic = config.createOptimisticItem(input);
          queryClient.setQueryData<TItem[]>(
            config.listQueryKey,
            (old = []) => [...old, optimistic],
          );
        }

        queueAction({
          type: 'create',
          payload: input,
          endpoint: getApiUrl(config.endpoint),
          method: 'POST',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }

      toast.error(config.errorMessage || error.message || 'Failed to create');
    },

    onSuccess: (item) => {
      config.onSuccess?.(item);
      if (config.successMessage) {
        toast.success(config.successMessage(item));
      }
      // Invalidate to replace temp item with real server data
      queryClient.invalidateQueries({ queryKey: config.listQueryKey });
      config.invalidateKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

/**
 * Hook for optimistic UPDATE mutations.
 *
 * Applies the update to the cached list/detail immediately,
 * then confirms with server data on success or rolls back on error.
 */
export function useOptimisticUpdate<TItem extends { id: string }, TInput>(
  config: UpdateConfig<TItem, TInput>,
) {
  const queryClient = useQueryClient();
  const queueAction = useStore((s) => s.offline.queueAction);

  return useMutation<
    TItem,
    Error,
    TInput,
    { previousList: TItem[] | undefined; previousDetail: TItem | undefined }
  >({
    mutationFn: (input) =>
      apiRequest<TItem>(config.endpoint(input), 'PUT', input),

    onMutate: async (input) => {
      const itemId = config.getItemId(input);

      await queryClient.cancelQueries({ queryKey: config.listQueryKey });
      if (config.detailQueryKey) {
        await queryClient.cancelQueries({ queryKey: config.detailQueryKey(input) });
      }

      const previousList = queryClient.getQueryData<TItem[]>(config.listQueryKey);
      const previousDetail = config.detailQueryKey
        ? queryClient.getQueryData<TItem>(config.detailQueryKey(input))
        : undefined;

      // Update list cache
      queryClient.setQueryData<TItem[]>(
        config.listQueryKey,
        (old = []) =>
          old.map((item) =>
            item.id === itemId ? config.applyUpdate(item, input) : item,
          ),
      );

      // Update detail cache
      if (config.detailQueryKey && previousDetail) {
        queryClient.setQueryData<TItem>(
          config.detailQueryKey(input),
          config.applyUpdate(previousDetail, input),
        );
      }

      return { previousList, previousDetail };
    },

    onError: (error, input, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(config.listQueryKey, context.previousList);
      }
      if (config.detailQueryKey && context?.previousDetail) {
        queryClient.setQueryData(config.detailQueryKey(input), context.previousDetail);
      }

      if (isNetworkError(error)) {
        queueAction({
          type: 'update',
          payload: input,
          endpoint: getApiUrl(config.endpoint(input)),
          method: 'PUT',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }

      toast.error(config.errorMessage || error.message || 'Failed to update');
    },

    onSuccess: (item) => {
      config.onSuccess?.(item);
      if (config.successMessage) {
        toast.success(config.successMessage(item));
      }
      queryClient.invalidateQueries({ queryKey: config.listQueryKey });
      config.invalidateKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
}

/**
 * Hook for optimistic DELETE mutations.
 *
 * Removes the item from the list cache immediately,
 * then confirms on success or rolls back on error.
 */
export function useOptimisticDelete<TItem extends { id: string }>(
  config: DeleteConfig<TItem>,
) {
  const queryClient = useQueryClient();
  const queueAction = useStore((s) => s.offline.queueAction);

  return useMutation<
    void,
    Error,
    string,
    { previousList: TItem[] | undefined; deletedItem: TItem | undefined }
  >({
    mutationFn: async (id) => {
      await apiRequest<void>(config.endpoint(id), 'DELETE');
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: config.listQueryKey });
      if (config.detailQueryKey) {
        await queryClient.cancelQueries({ queryKey: config.detailQueryKey(id) });
      }

      const previousList = queryClient.getQueryData<TItem[]>(config.listQueryKey);
      const deletedItem = previousList?.find((item) => item.id === id);

      queryClient.setQueryData<TItem[]>(
        config.listQueryKey,
        (old = []) => old.filter((item) => item.id !== id),
      );

      return { previousList, deletedItem };
    },

    onError: (error, id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(config.listQueryKey, context.previousList);
      }

      if (isNetworkError(error)) {
        queueAction({
          type: 'delete',
          payload: { id },
          endpoint: getApiUrl(config.endpoint(id)),
          method: 'DELETE',
          maxRetries: 3,
        });
        toast.info('Saved offline — will sync when back online');
        return;
      }

      toast.error(config.errorMessage || error.message || 'Failed to delete');
    },

    onSuccess: (_, id) => {
      const deletedItem = queryClient.getQueryData<TItem[]>(config.listQueryKey)
        ?.find((item) => item.id === id);
      if (config.successMessage && deletedItem) {
        toast.success(config.successMessage(deletedItem));
      }
      queryClient.invalidateQueries({ queryKey: config.listQueryKey });
      config.invalidateKeys?.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    },
  });
}
