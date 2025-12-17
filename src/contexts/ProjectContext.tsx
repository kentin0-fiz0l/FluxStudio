/**
 * ProjectContext - Single Source of Truth for Current Project
 *
 * This context is the authoritative source for the currently selected project
 * throughout the FluxStudio application. It provides:
 * - Current project state (with full project data)
 * - Project list for the switcher
 * - URL sync (projectId in search params) with localStorage fallback
 * - Project switching triggers refetches across the app
 *
 * Usage:
 * const { currentProject, projects, switchProject, clearProject } = useProjectContext();
 *
 * URL Pattern:
 * - /messages?projectId=xxx -> scoped to project xxx
 * - /notifications?projectId=xxx -> scoped to project xxx
 * - /files?projectId=xxx -> scoped to project xxx
 *
 * FluxStudio principle: "Projects are the home for everything"
 */

import * as React from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getApiUrl } from '@/utils/apiHelpers';

// ============================================================================
// Types
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
  /** Currently selected project, or null if none */
  currentProject: ProjectSummary | null;
  /** List of available projects for the switcher */
  projects: ProjectSummary[];
  /** Whether projects are being loaded */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Whether context has finished initializing */
  isReady: boolean;
}

interface ProjectContextActions {
  /** Switch to a different project */
  switchProject: (projectId: string) => void;
  /** Clear current project selection (go to global view) */
  clearProject: () => void;
  /** Check if a specific project is currently selected */
  isProjectSelected: (projectId: string) => boolean;
  /** Refresh projects list */
  refreshProjects: () => Promise<void>;
  /** Get project by ID */
  getProject: (projectId: string) => ProjectSummary | undefined;
}

export type ProjectContextValue = ProjectContextState & ProjectContextActions;

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'fluxstudio.currentProjectId';
const URL_PARAM = 'projectId';

// Pages where projectId should be synced to URL
const PROJECT_SCOPED_PATHS = [
  '/messages',
  '/notifications',
  '/file',
  '/files',
  '/assets',
  '/tools',
];

// ============================================================================
// Context
// ============================================================================

const ProjectContext = React.createContext<ProjectContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [currentProject, setCurrentProject] = React.useState<ProjectSummary | null>(null);
  const [projects, setProjects] = React.useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  // Track if we've initialized from URL/storage
  const hasInitialized = React.useRef(false);

  // ============================================================================
  // Fetch Projects
  // ============================================================================

  const fetchProjects = React.useCallback(async (): Promise<ProjectSummary[]> => {
    if (!user) return [];

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/projects'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const result = await response.json();
      const projectList: ProjectSummary[] = (result.projects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        organizationId: p.organizationId,
        teamId: p.teamId,
      }));

      return projectList;
    } catch (err) {
      console.error('Error fetching projects:', err);
      throw err;
    }
  }, [user]);

  const refreshProjects = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const projectList = await fetchProjects();
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, [fetchProjects]);

  // ============================================================================
  // Initialize from URL/Storage
  // ============================================================================

  React.useEffect(() => {
    if (!user || hasInitialized.current) return;

    const initialize = async () => {
      setIsLoading(true);

      try {
        const projectList = await fetchProjects();
        setProjects(projectList);

        // Priority: 1) URL param, 2) localStorage
        const urlProjectId = searchParams.get(URL_PARAM);
        const storedProjectId = localStorage.getItem(STORAGE_KEY);
        const targetProjectId = urlProjectId || storedProjectId;

        if (targetProjectId) {
          const project = projectList.find(p => p.id === targetProjectId);
          if (project) {
            setCurrentProject(project);
            // Sync to storage if from URL
            if (urlProjectId) {
              localStorage.setItem(STORAGE_KEY, urlProjectId);
            }
          } else {
            // Invalid project ID, clear storage
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        hasInitialized.current = true;
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsReady(true);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [user, fetchProjects, searchParams]);

  // ============================================================================
  // Sync URL when project changes
  // ============================================================================

  const updateURLWithProject = React.useCallback((projectId: string | null) => {
    const isProjectScopedPath = PROJECT_SCOPED_PATHS.some(path =>
      location.pathname.startsWith(path)
    );

    if (isProjectScopedPath) {
      const newParams = new URLSearchParams(searchParams);
      if (projectId) {
        newParams.set(URL_PARAM, projectId);
      } else {
        newParams.delete(URL_PARAM);
      }
      setSearchParams(newParams, { replace: true });
    }
  }, [location.pathname, searchParams, setSearchParams]);

  // ============================================================================
  // Actions
  // ============================================================================

  const switchProject = React.useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.warn(`Project ${projectId} not found`);
      return;
    }

    setCurrentProject(project);
    localStorage.setItem(STORAGE_KEY, projectId);
    updateURLWithProject(projectId);

    // Dispatch event for other components to react to
    window.dispatchEvent(new CustomEvent('project:changed', {
      detail: { projectId, project }
    }));
  }, [projects, updateURLWithProject]);

  const clearProject = React.useCallback(() => {
    setCurrentProject(null);
    localStorage.removeItem(STORAGE_KEY);
    updateURLWithProject(null);

    window.dispatchEvent(new CustomEvent('project:cleared'));
  }, [updateURLWithProject]);

  const isProjectSelected = React.useCallback(
    (projectId: string) => currentProject?.id === projectId,
    [currentProject]
  );

  const getProject = React.useCallback(
    (projectId: string) => projects.find(p => p.id === projectId),
    [projects]
  );

  // ============================================================================
  // Listen for URL changes (e.g., direct navigation)
  // ============================================================================

  React.useEffect(() => {
    if (!isReady) return;

    const urlProjectId = searchParams.get(URL_PARAM);

    // If URL has projectId and it's different from current, switch
    if (urlProjectId && urlProjectId !== currentProject?.id) {
      const project = projects.find(p => p.id === urlProjectId);
      if (project) {
        setCurrentProject(project);
        localStorage.setItem(STORAGE_KEY, urlProjectId);
      }
    }
    // If URL doesn't have projectId but we're on a scoped path, update URL
    else if (!urlProjectId && currentProject) {
      const isProjectScopedPath = PROJECT_SCOPED_PATHS.some(path =>
        location.pathname.startsWith(path)
      );
      if (isProjectScopedPath) {
        updateURLWithProject(currentProject.id);
      }
    }
  }, [searchParams, currentProject, projects, isReady, location.pathname, updateURLWithProject]);

  // ============================================================================
  // Clear state on logout
  // ============================================================================

  React.useEffect(() => {
    if (!user) {
      setCurrentProject(null);
      setProjects([]);
      setIsReady(false);
      hasInitialized.current = false;
    }
  }, [user]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = React.useMemo<ProjectContextValue>(
    () => ({
      currentProject,
      projects,
      isLoading,
      error,
      isReady,
      switchProject,
      clearProject,
      isProjectSelected,
      refreshProjects,
      getProject,
    }),
    [
      currentProject,
      projects,
      isLoading,
      error,
      isReady,
      switchProject,
      clearProject,
      isProjectSelected,
      refreshProjects,
      getProject,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

export function useProjectContext(): ProjectContextValue {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}

export function useProjectContextOptional(): ProjectContextValue | null {
  return React.useContext(ProjectContext);
}

// ============================================================================
// Utility Hook: Get current project ID for API calls
// ============================================================================

export function useCurrentProjectId(): string | null {
  const context = useProjectContextOptional();
  return context?.currentProject?.id ?? null;
}

// ============================================================================
// Utility Hook: Require project context (shows empty state if no project)
// ============================================================================

export function useRequiredProject(): {
  project: ProjectSummary | null;
  isLoading: boolean;
  hasProject: boolean;
} {
  const context = useProjectContextOptional();

  return {
    project: context?.currentProject ?? null,
    isLoading: context?.isLoading ?? true,
    hasProject: !!context?.currentProject,
  };
}

export default ProjectContext;
