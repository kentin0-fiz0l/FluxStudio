/**
 * Formations Hooks - FluxStudio Drill Writer
 *
 * React hooks for formation data fetching and mutations.
 * Provides loading states, error handling, and cache invalidation.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hookLogger } from '../lib/logger';
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
  const [formations, setFormations] = useState<FormationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user || !projectId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFormations(projectId);
      setFormations(result);
    } catch (err) {
      formationsLogger.error('Error fetching formations', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch formations');
      setFormations([]);
    } finally {
      setLoading(false);
    }
  }, [user, projectId, enabled]);

  const create = useCallback(async (data: { name: string; description?: string }) => {
    if (!user) throw new Error('Authentication required');

    try {
      const formation = await createFormation(projectId, data);
      // Refetch list to include new formation
      await refetch();
      return formation;
    } catch (err) {
      formationsLogger.error('Error creating formation', err);
      throw err;
    }
  }, [user, projectId, refetch]);

  const remove = useCallback(async (formationId: string) => {
    if (!user) throw new Error('Authentication required');

    try {
      await deleteFormation(formationId);
      // Update local state immediately
      setFormations(prev => prev.filter(f => f.id !== formationId));
    } catch (err) {
      formationsLogger.error('Error deleting formation', err);
      throw err;
    }
  }, [user]);

  // Fetch formations when projectId changes or on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    formations,
    loading,
    error,
    refetch,
    create,
    remove
  };
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
  const [formation, setFormation] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user || !formationId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFormation(formationId);
      setFormation(result);
    } catch (err) {
      formationsLogger.error('Error fetching formation', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch formation');
      setFormation(null);
    } finally {
      setLoading(false);
    }
  }, [user, formationId, enabled]);

  const update = useCallback(async (data: { name?: string; description?: string }) => {
    if (!user || !formationId) throw new Error('Authentication required');

    try {
      const updated = await updateFormation(formationId, data);
      setFormation(prev => prev ? { ...prev, ...updated } : updated);
      return updated;
    } catch (err) {
      formationsLogger.error('Error updating formation', err);
      throw err;
    }
  }, [user, formationId]);

  const save = useCallback(async (data: {
    name?: string;
    performers: Performer[];
    keyframes: Array<{
      id: string;
      timestamp: number;
      transition?: string;
      duration?: number;
      positions: Record<string, Position> | Map<string, Position>;
    }>;
  }) => {
    if (!user || !formationId) throw new Error('Authentication required');

    setSaving(true);
    try {
      const saved = await saveFormation(formationId, data);
      setFormation(saved);
      return saved;
    } catch (err) {
      formationsLogger.error('Error saving formation', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user, formationId]);

  // Fetch formation when formationId changes or on mount
  useEffect(() => {
    if (formationId) {
      refetch();
    } else {
      setFormation(null);
    }
  }, [formationId, refetch]);

  return {
    formation,
    loading,
    error,
    refetch,
    update,
    save,
    saving
  };
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (projectId: string, data: { name: string; description?: string }) => {
    if (!user) throw new Error('Authentication required');

    setLoading(true);
    setError(null);

    try {
      const formation = await createFormation(projectId, data);
      return formation;
    } catch (err) {
      formationsLogger.error('Error creating formation', err);
      const message = err instanceof Error ? err.message : 'Failed to create formation';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { create, loading, error };
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const save = useCallback(async (formationId: string, data: {
    name?: string;
    performers: Performer[];
    keyframes: Array<{
      id: string;
      timestamp: number;
      transition?: string;
      duration?: number;
      positions: Record<string, Position> | Map<string, Position>;
    }>;
  }) => {
    if (!user) throw new Error('Authentication required');

    setSaving(true);
    setError(null);

    try {
      const formation = await saveFormation(formationId, data);
      setLastSaved(new Date());
      return formation;
    } catch (err) {
      formationsLogger.error('Error saving formation', err);
      const message = err instanceof Error ? err.message : 'Failed to save formation';
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user]);

  return { save, saving, error, lastSaved };
}

export default {
  useFormations,
  useFormation,
  useCreateFormation,
  useSaveFormation
};
