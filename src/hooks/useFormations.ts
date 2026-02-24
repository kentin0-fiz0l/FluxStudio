/**
 * Formations Hooks - FluxStudio Drill Writer
 *
 * React hooks for formation data fetching and mutations.
 * Uses TanStack Query for caching, loading states, and error handling.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/slices/authSlice';
import { hookLogger } from '../lib/logger';
import { queryKeys } from '../lib/queryClient';
import {
  fetchFormations,
  fetchFormation,
  createFormation,
  updateFormation,
  deleteFormation,
  saveFormation,
  FormationListItem
} from '../services/formationsApi';
import { Formation, Performer, Position } from '../services/formationService';

const formationsLogger = hookLogger.child('useFormations');

// ============================================================================
// FORMATIONS LIST HOOK
// ============================================================================

export interface UseFormationsOptions {
  projectId: string;
  enabled?: boolean;
}

export interface UseFormationsResult {
  formations: FormationListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: { name: string; description?: string }) => Promise<Formation>;
  remove: (formationId: string) => Promise<void>;
}

export function useFormations({ projectId, enabled = true }: UseFormationsOptions): UseFormationsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: formations = [],
    isLoading: loading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<FormationListItem[], Error>({
    queryKey: queryKeys.formations.list(projectId),
    queryFn: async () => {
      return fetchFormations(projectId);
    },
    enabled: !!user && !!projectId && enabled,
  });

  const error = queryError?.message ?? null;

  const createMutation = useMutation<Formation, Error, { name: string; description?: string }>({
    mutationFn: async (data) => {
      if (!user) throw new Error('Authentication required');
      return createFormation(projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formations.list(projectId) });
    },
    onError: (err) => {
      formationsLogger.error('Error creating formation', err);
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (formationId) => {
      if (!user) throw new Error('Authentication required');
      await deleteFormation(formationId);
    },
    onMutate: async (formationId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.formations.list(projectId) });
      const previous = queryClient.getQueryData<FormationListItem[]>(queryKeys.formations.list(projectId));
      queryClient.setQueryData<FormationListItem[]>(
        queryKeys.formations.list(projectId),
        (old = []) => old.filter(f => f.id !== formationId)
      );
      return { previous };
    },
    onError: (_err, _formationId, context: unknown) => {
      queryClient.setQueryData(queryKeys.formations.list(projectId), (context as { previous?: FormationListItem[] })?.previous);
      formationsLogger.error('Error deleting formation', _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formations.list(projectId) });
    },
  });

  const create = useCallback(
    async (data: { name: string; description?: string }) => createMutation.mutateAsync(data),
    [createMutation]
  );
  const remove = useCallback(
    async (formationId: string) => { await deleteMutation.mutateAsync(formationId); },
    [deleteMutation]
  );
  const refetch = useCallback(async () => { await queryRefetch(); }, [queryRefetch]);

  return { formations, loading, error, refetch, create, remove };
}

// ============================================================================
// SINGLE FORMATION HOOK
// ============================================================================

export interface UseFormationOptions {
  formationId: string | undefined;
  enabled?: boolean;
}

export interface UseFormationResult {
  formation: Formation | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  update: (data: { name?: string; description?: string }) => Promise<Formation>;
  save: (data: {
    name?: string;
    performers: Performer[];
    keyframes: Array<{
      id: string;
      timestamp: number;
      transition?: string;
      duration?: number;
      positions: Record<string, Position> | Map<string, Position>;
    }>;
  }) => Promise<Formation>;
  saving: boolean;
}

export function useFormation({ formationId, enabled = true }: UseFormationOptions): UseFormationResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: formation = null,
    isLoading: loading,
    error: queryError,
    refetch: queryRefetch,
  } = useQuery<Formation | null, Error>({
    queryKey: queryKeys.formations.detail(formationId || ''),
    queryFn: async () => {
      if (!formationId) return null;
      return fetchFormation(formationId);
    },
    enabled: !!user && !!formationId && enabled,
  });

  const error = queryError?.message ?? null;

  const updateMut = useMutation<Formation, Error, { name?: string; description?: string }>({
    mutationFn: async (data) => {
      if (!user || !formationId) throw new Error('Authentication required');
      return updateFormation(formationId, data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.formations.detail(formationId || ''), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.formations.lists() });
    },
    onError: (err) => {
      formationsLogger.error('Error updating formation', err);
    },
  });

  const saveMut = useMutation<Formation, Error, {
    name?: string;
    performers: Performer[];
    keyframes: Array<{
      id: string;
      timestamp: number;
      transition?: string;
      duration?: number;
      positions: Record<string, Position> | Map<string, Position>;
    }>;
  }>({
    mutationFn: async (data) => {
      if (!user || !formationId) throw new Error('Authentication required');
      return saveFormation(formationId, data);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.formations.detail(formationId || ''), saved);
    },
    onError: (err) => {
      formationsLogger.error('Error saving formation', err);
    },
  });

  const update = useCallback(
    async (data: { name?: string; description?: string }) => updateMut.mutateAsync(data),
    [updateMut]
  );
  const save = useCallback(
    async (data: Parameters<typeof saveMut.mutateAsync>[0]) => saveMut.mutateAsync(data),
    [saveMut]
  );
  const refetch = useCallback(async () => { await queryRefetch(); }, [queryRefetch]);

  return { formation, loading, error, refetch, update, save, saving: saveMut.isPending };
}

// ============================================================================
// CREATE FORMATION HOOK
// ============================================================================

export interface UseCreateFormationResult {
  create: (projectId: string, data: { name: string; description?: string }) => Promise<Formation>;
  loading: boolean;
  error: string | null;
}

export function useCreateFormation(): UseCreateFormationResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation<Formation, Error, { projectId: string; data: { name: string; description?: string } }>({
    mutationFn: async ({ projectId, data }) => {
      if (!user) throw new Error('Authentication required');
      return createFormation(projectId, data);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formations.list(projectId) });
    },
    onError: (err) => {
      formationsLogger.error('Error creating formation', err);
    },
  });

  const create = useCallback(
    async (projectId: string, data: { name: string; description?: string }) =>
      mutation.mutateAsync({ projectId, data }),
    [mutation]
  );

  return { create, loading: mutation.isPending, error: mutation.error?.message ?? null };
}

// ============================================================================
// SAVE FORMATION HOOK
// ============================================================================

export interface UseSaveFormationResult {
  save: (formationId: string, data: {
    name?: string;
    performers: Performer[];
    keyframes: Array<{
      id: string;
      timestamp: number;
      transition?: string;
      duration?: number;
      positions: Record<string, Position> | Map<string, Position>;
    }>;
  }) => Promise<Formation>;
  saving: boolean;
  error: string | null;
  lastSaved: Date | null;
}

export function useSaveFormation(): UseSaveFormationResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation<
    { formation: Formation; savedAt: Date },
    Error,
    { formationId: string; data: Parameters<typeof saveFormation>[1] }
  >({
    mutationFn: async ({ formationId, data }) => {
      if (!user) throw new Error('Authentication required');
      const formation = await saveFormation(formationId, data);
      return { formation, savedAt: new Date() };
    },
    onSuccess: ({ formation }, { formationId }) => {
      queryClient.setQueryData(queryKeys.formations.detail(formationId), formation);
    },
    onError: (err) => {
      formationsLogger.error('Error saving formation', err);
    },
  });

  const save = useCallback(
    async (formationId: string, data: Parameters<typeof saveFormation>[1]) => {
      const result = await mutation.mutateAsync({ formationId, data });
      return result.formation;
    },
    [mutation]
  );

  return {
    save,
    saving: mutation.isPending,
    error: mutation.error?.message ?? null,
    lastSaved: mutation.data?.savedAt ?? null,
  };
}

export default {
  useFormations,
  useFormation,
  useCreateFormation,
  useSaveFormation
};
