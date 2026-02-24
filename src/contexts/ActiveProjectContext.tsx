/* eslint-disable react-refresh/only-export-components */
/**
 * ActiveProjectContext - Deprecated Wrapper
 *
 * Sprint 24: Migrated to Zustand projectSlice.
 * All state now lives in src/store/slices/projectSlice.ts.
 *
 * New code should import from '@/store' instead:
 *   import { useActiveProject } from '@/store';
 */

import * as React from 'react';
import { useStore } from '../store/store';

// ============================================================================
// Types (kept for backward compat imports)
// ============================================================================

export interface ActiveProject {
  id: string;
  name: string;
}

interface ActiveProjectContextValue {
  activeProject: ActiveProject | null;
  setActiveProject: (project: ActiveProject) => void;
  clearActiveProject: () => void;
  isProjectFocused: (projectId: string) => boolean;
  hasFocus: boolean;
  isReady: boolean;
}

// ============================================================================
// Deprecated Provider (no-op passthrough)
// ============================================================================

/** @deprecated Use Zustand store directly. This is a no-op passthrough. */
export function ActiveProjectProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ============================================================================
// Deprecated Hooks (delegate to Zustand)
// ============================================================================

/** @deprecated Import useActiveProject from '@/store' instead. */
export function useActiveProject(): ActiveProjectContextValue {
  const activeProjectId = useStore((s) => s.projects.activeProjectId);
  const projects = useStore((s) => s.projects.projects);
  const setActive = useStore((s) => s.projects.setActiveProject);
  const clearActive = useStore((s) => s.projects.clearActiveProject);

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : null;

  const result: ActiveProject | null = activeProject
    ? { id: activeProject.id, name: activeProject.name }
    : null;

  return {
    activeProject: result,
    setActiveProject: (project: ActiveProject) => setActive(project.id),
    clearActiveProject: () => clearActive(),
    isProjectFocused: (projectId: string) => projectId === activeProjectId,
    hasFocus: activeProjectId !== null,
    isReady: true,
  };
}

/** @deprecated Import useActiveProject from '@/store' instead. */
export function useActiveProjectOptional(): ActiveProjectContextValue | null {
  return useActiveProject();
}

export default null;
