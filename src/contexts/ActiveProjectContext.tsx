/**
 * ActiveProjectContext - Global project focus state
 *
 * Provides app-wide "active project" context that persists across navigation
 * and page refreshes. When a project is "focused", global pages like /messages
 * and /notifications automatically scope to that project.
 *
 * Usage:
 * const { activeProject, setActiveProject, clearActiveProject, isProjectFocused } = useActiveProject();
 *
 * Entry points:
 * - Projects list: "Focus" button on project cards
 * - ProjectDetail: "Focus on this project" in header
 * - Messages/Notifications: Clicking project badge
 *
 * FluxStudio principle: "Projects are the home for everything"
 */

import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ActiveProject {
  id: string;
  name: string;
}

interface ActiveProjectContextValue {
  /** Currently focused project, or null if no focus */
  activeProject: ActiveProject | null;
  /** Set the active/focused project */
  setActiveProject: (project: ActiveProject) => void;
  /** Clear the active project, return to global view */
  clearActiveProject: () => void;
  /** Check if a specific project is currently focused */
  isProjectFocused: (projectId: string) => boolean;
  /** Check if any project is focused */
  hasFocus: boolean;
  /** Whether the context has finished hydrating from localStorage */
  isReady: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'fluxstudio.activeProject';

// ============================================================================
// Context
// ============================================================================

const ActiveProjectContext = React.createContext<ActiveProjectContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function ActiveProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProjectState] = React.useState<ActiveProject | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed?.name) {
          setActiveProjectState(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to restore active project from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage when active project changes
  const setActiveProject = React.useCallback((project: ActiveProject) => {
    setActiveProjectState(project);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (error) {
      console.warn('Failed to persist active project to localStorage:', error);
    }
  }, []);

  const clearActiveProject = React.useCallback(() => {
    setActiveProjectState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove active project from localStorage:', error);
    }
  }, []);

  const isProjectFocused = React.useCallback(
    (projectId: string) => activeProject?.id === projectId,
    [activeProject]
  );

  const hasFocus = activeProject !== null;

  const value = React.useMemo(
    () => ({
      activeProject,
      setActiveProject,
      clearActiveProject,
      isProjectFocused,
      hasFocus,
      isReady: isHydrated,
    }),
    [activeProject, setActiveProject, clearActiveProject, isProjectFocused, hasFocus, isHydrated]
  );

  // Always render the provider - consumers can check isReady if needed
  return (
    <ActiveProjectContext.Provider value={value}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useActiveProject(): ActiveProjectContextValue {
  const context = React.useContext(ActiveProjectContext);
  if (!context) {
    throw new Error('useActiveProject must be used within an ActiveProjectProvider');
  }
  return context;
}

// ============================================================================
// Optional Hook (for components that may be outside provider)
// ============================================================================

export function useActiveProjectOptional(): ActiveProjectContextValue | null {
  return React.useContext(ActiveProjectContext);
}

export default ActiveProjectContext;
