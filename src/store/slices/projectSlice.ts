/**
 * Project Slice - Project management state
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  startDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  organizationId?: string;
  members?: string[];
  tags?: string[];
}

export interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  recentProjectIds: string[];
  isLoading: boolean;
  error: string | null;
}

export interface ProjectActions {
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setActiveProject: (projectId: string | null) => void;
  clearActiveProject: () => void;
  getActiveProject: () => Project | null;
  isProjectActive: (projectId: string) => boolean;
  addToRecent: (projectId: string) => void;
  fetchProjects: () => Promise<void>;
}

export interface ProjectSlice {
  projects: ProjectState & ProjectActions;
}

// ============================================================================
// Initial State
// ============================================================================

const MAX_RECENT_PROJECTS = 5;

const initialState: ProjectState = {
  projects: [],
  activeProjectId: null,
  recentProjectIds: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createProjectSlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  ProjectSlice
> = (set, get) => ({
  projects: {
    ...initialState,

    setProjects: (projects: Project[]) => {
      set((state) => {
        state.projects.projects = projects;
      });
    },

    addProject: (project: Project) => {
      set((state) => {
        state.projects.projects.push(project);
      });
    },

    updateProject: (id: string, updates: Partial<Project>) => {
      set((state) => {
        const index = state.projects.projects.findIndex((p) => p.id === id);
        if (index !== -1) {
          state.projects.projects[index] = {
            ...state.projects.projects[index],
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
      });
    },

    removeProject: (id: string) => {
      set((state) => {
        state.projects.projects = state.projects.projects.filter((p) => p.id !== id);
        if (state.projects.activeProjectId === id) {
          state.projects.activeProjectId = null;
        }
        state.projects.recentProjectIds = state.projects.recentProjectIds.filter((rid) => rid !== id);
      });
    },

    setActiveProject: (projectId: string | null) => {
      set((state) => {
        state.projects.activeProjectId = projectId;
        if (projectId) {
          // Add to recent
          state.projects.recentProjectIds = [
            projectId,
            ...state.projects.recentProjectIds.filter((id) => id !== projectId),
          ].slice(0, MAX_RECENT_PROJECTS);
        }
      });

      // Persist to localStorage for backwards compatibility
      if (projectId) {
        const project = get().projects.projects.find((p) => p.id === projectId);
        if (project) {
          localStorage.setItem('fluxstudio.activeProject', JSON.stringify({
            id: project.id,
            name: project.name,
          }));
        }
      } else {
        localStorage.removeItem('fluxstudio.activeProject');
      }
    },

    clearActiveProject: () => {
      set((state) => {
        state.projects.activeProjectId = null;
      });
      localStorage.removeItem('fluxstudio.activeProject');
    },

    getActiveProject: () => {
      const state = get();
      if (!state.projects.activeProjectId) return null;
      return state.projects.projects.find((p) => p.id === state.projects.activeProjectId) || null;
    },

    isProjectActive: (projectId: string) => {
      return get().projects.activeProjectId === projectId;
    },

    addToRecent: (projectId: string) => {
      set((state) => {
        state.projects.recentProjectIds = [
          projectId,
          ...state.projects.recentProjectIds.filter((id) => id !== projectId),
        ].slice(0, MAX_RECENT_PROJECTS);
      });
    },

    fetchProjects: async () => {
      set((state) => {
        state.projects.isLoading = true;
        state.projects.error = null;
      });

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/projects', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();

        set((state) => {
          state.projects.projects = data.projects || data;
          state.projects.isLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.projects.error = error instanceof Error ? error.message : 'Failed to fetch projects';
          state.projects.isLoading = false;
        });
      }
    },
  },
});

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useProjects = () => {
  return useStore((state) => ({
    projects: state.projects.projects,
    isLoading: state.projects.isLoading,
    error: state.projects.error,
    fetchProjects: state.projects.fetchProjects,
    addProject: state.projects.addProject,
    updateProject: state.projects.updateProject,
    removeProject: state.projects.removeProject,
  }));
};

/**
 * useProjectContext - backwards-compatible hook matching the old ProjectContext API.
 * Always returns an object (never null), unlike the old useProjectContextOptional.
 */
export const useProjectContext = () => {
  const projects = useStore((s) => s.projects.projects);
  const activeProjectId = useStore((s) => s.projects.activeProjectId);
  const isLoading = useStore((s) => s.projects.isLoading);
  const error = useStore((s) => s.projects.error);
  const setActiveProject = useStore((s) => s.projects.setActiveProject);
  const clearActiveProject = useStore((s) => s.projects.clearActiveProject);
  const fetchProjects = useStore((s) => s.projects.fetchProjects);

  const currentProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) || null
    : null;

  return {
    currentProject,
    projects,
    isLoading,
    error,
    isReady: true,
    switchProject: (projectId: string) => setActiveProject(projectId),
    clearProject: () => clearActiveProject(),
    isProjectSelected: (projectId: string) => projectId === activeProjectId,
    refreshProjects: fetchProjects,
    getProject: (projectId: string) => projects.find((p) => p.id === projectId),
  };
};

export const useActiveProject = () => {
  const activeProjectId = useStore((state) => state.projects.activeProjectId);
  const projects = useStore((state) => state.projects.projects);
  const setActiveProject = useStore((state) => state.projects.setActiveProject);
  const clearActiveProject = useStore((state) => state.projects.clearActiveProject);

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) || null
    : null;

  return {
    activeProject,
    activeProjectId,
    hasFocus: activeProjectId !== null,
    setActiveProject,
    clearActiveProject,
    isProjectFocused: (id: string) => id === activeProjectId,
    isReady: true,
  };
};

/**
 * useCurrentProjectId - returns just the active project ID (or null).
 * Drop-in replacement for the old ProjectContext utility hook.
 */
export const useCurrentProjectId = (): string | null => {
  return useStore((s) => s.projects.activeProjectId);
};

/**
 * useRequiredProject - returns project + loading state for gated UIs.
 * Drop-in replacement for the old ProjectContext utility hook.
 */
export const useRequiredProject = () => {
  const activeProjectId = useStore((s) => s.projects.activeProjectId);
  const projects = useStore((s) => s.projects.projects);
  const isLoading = useStore((s) => s.projects.isLoading);

  const project = activeProjectId
    ? projects.find((p) => p.id === activeProjectId) || null
    : null;

  return {
    project,
    isLoading,
    hasProject: project !== null,
  };
};
