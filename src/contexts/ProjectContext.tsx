/**
 * ProjectContext - Deprecated Wrapper
 *
 * Sprint 24: Migrated to Zustand projectSlice.
 * All state now lives in src/store/slices/projectSlice.ts.
 *
 * These exports are kept for backward compatibility.
 * New code should import from '@/store' instead:
 *   import { useProjectContext, useCurrentProjectId, useRequiredProject } from '@/store';
 */

import * as React from 'react';
import { useStore } from '../store/store';

// ============================================================================
// Types (kept for backward compat imports)
// ============================================================================

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  organizationId?: string;
  teamId?: string;
}

interface ProjectContextState {
  currentProject: ProjectSummary | null;
  projects: ProjectSummary[];
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
}

interface ProjectContextActions {
  switchProject: (projectId: string) => void;
  clearProject: () => void;
  isProjectSelected: (projectId: string) => boolean;
  refreshProjects: () => Promise<void>;
  getProject: (projectId: string) => ProjectSummary | undefined;
}

export type ProjectContextValue = ProjectContextState & ProjectContextActions;

// ============================================================================
// Deprecated Provider (no-op passthrough)
// ============================================================================

/** @deprecated Use Zustand store directly. This is a no-op passthrough. */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ============================================================================
// Deprecated Hooks (delegate to Zustand)
// ============================================================================

/** @deprecated Import useProjectContext from '@/store' instead. */
export function useProjectContext(): ProjectContextValue {
  const projects = useStore((s) => s.projects.projects);
  const activeProjectId = useStore((s) => s.projects.activeProjectId);
  const isLoading = useStore((s) => s.projects.isLoading);
  const error = useStore((s) => s.projects.error);
  const setActiveProject = useStore((s) => s.projects.setActiveProject);
  const clearActiveProject = useStore((s) => s.projects.clearActiveProject);
  const fetchProjects = useStore((s) => s.projects.fetchProjects);

  const currentProject = activeProjectId
    ? (projects.find((p) => p.id === activeProjectId) as ProjectSummary | undefined) || null
    : null;

  return {
    currentProject,
    projects: projects as unknown as ProjectSummary[],
    isLoading,
    error,
    isReady: true,
    switchProject: (projectId: string) => setActiveProject(projectId),
    clearProject: () => clearActiveProject(),
    isProjectSelected: (projectId: string) => projectId === activeProjectId,
    refreshProjects: fetchProjects,
    getProject: (projectId: string) => projects.find((p) => p.id === projectId) as ProjectSummary | undefined,
  };
}

/** @deprecated Import useProjectContext from '@/store' instead. */
export function useProjectContextOptional(): ProjectContextValue {
  return useProjectContext();
}

/** @deprecated Import useCurrentProjectId from '@/store' instead. */
export function useCurrentProjectId(): string | null {
  return useStore((s) => s.projects.activeProjectId);
}

/** @deprecated Import useRequiredProject from '@/store' instead. */
export function useRequiredProject(): {
  project: ProjectSummary | null;
  isLoading: boolean;
  hasProject: boolean;
} {
  const activeProjectId = useStore((s) => s.projects.activeProjectId);
  const projects = useStore((s) => s.projects.projects);
  const isLoading = useStore((s) => s.projects.isLoading);

  const project = activeProjectId
    ? (projects.find((p) => p.id === activeProjectId) as ProjectSummary | undefined) || null
    : null;

  return {
    project,
    isLoading,
    hasProject: project !== null,
  };
}

export default null;
