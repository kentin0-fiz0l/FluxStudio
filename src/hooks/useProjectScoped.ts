/**
 * useProjectScoped - Hook for project-scoped pages
 *
 * This hook provides consistent project scoping behavior for pages
 * that require a project context. It handles:
 * - Loading state while project list loads
 * - Redirect/empty state when no project is selected
 * - Project ID for API calls
 *
 * Usage:
 * const { projectId, currentProject, isLoading, shouldShowEmptyState } = useProjectScoped();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (shouldShowEmptyState) return <NoProjectSelected />;
 *
 * // Now projectId is guaranteed to be non-null
 * const { data } = useQuery(['messages', projectId], () => fetchMessages(projectId));
 */

import { useProjectContextOptional, ProjectSummary } from '@/contexts/ProjectContext';

export interface UseProjectScopedResult {
  /** Current project ID (null if none selected) */
  projectId: string | null;
  /** Current project data */
  currentProject: ProjectSummary | null;
  /** Available projects list */
  projects: ProjectSummary[];
  /** Whether projects are loading */
  isLoading: boolean;
  /** Whether the context is ready */
  isReady: boolean;
  /** Whether to show empty state (no project selected after loading) */
  shouldShowEmptyState: boolean;
  /** Switch to a different project */
  switchProject: (projectId: string) => void;
  /** Clear project selection */
  clearProject: () => void;
}

export function useProjectScoped(): UseProjectScopedResult {
  const context = useProjectContextOptional();

  // Handle case when provider is not available
  const currentProject = context?.currentProject ?? null;
  const projects = context?.projects ?? [];
  const isLoading = context?.isLoading ?? true;
  const isReady = context?.isReady ?? false;
  const switchProject = context?.switchProject ?? (() => {});
  const clearProject = context?.clearProject ?? (() => {});

  const projectId = currentProject?.id ?? null;
  const shouldShowEmptyState = isReady && !isLoading && !currentProject;

  return {
    projectId,
    currentProject,
    projects,
    isLoading,
    isReady,
    shouldShowEmptyState,
    switchProject,
    clearProject,
  };
}

/**
 * useProjectRequired - Stricter version that throws if no project
 *
 * Use this in components that absolutely require a project context
 * and should never render without one.
 */
export function useProjectRequired(): {
  projectId: string;
  currentProject: ProjectSummary;
} {
  const context = useProjectContextOptional();

  if (!context) {
    throw new Error('useProjectRequired: Project context not available');
  }

  if (!context.isReady) {
    throw new Error('useProjectRequired: Project context not ready');
  }

  if (!context.currentProject) {
    throw new Error('useProjectRequired: No project selected');
  }

  return {
    projectId: context.currentProject.id,
    currentProject: context.currentProject,
  };
}

export default useProjectScoped;
