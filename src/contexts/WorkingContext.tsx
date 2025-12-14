/**
 * WorkingContext - Work Momentum for FluxStudio
 *
 * Captures and restores user's working context within focused projects:
 * - Last route visited within the project
 * - Last entity viewed (conversation, message, file, asset, board)
 * - Optional intent note (manual breadcrumb)
 * - Timestamp for staleness detection
 *
 * Per-project storage in localStorage with versioning for migrations.
 * Part of "Work Momentum": Pick up exactly where you left off.
 */

import * as React from 'react';
import { useActiveProject } from './ActiveProjectContext';

// Current schema version - increment when structure changes
const WORKING_CONTEXT_VERSION = 1;
const STORAGE_KEY_PREFIX = 'fluxstudio.workingContext';
const DEBOUNCE_MS = 1000; // Debounce localStorage writes

/**
 * Entity references that can be restored.
 * All optional - we capture whatever is available.
 */
export interface LastEntity {
  conversationId?: string;
  messageId?: string;
  fileId?: string;
  assetId?: string;
  boardId?: string;
}

/**
 * Working context for a single project.
 * Persisted to localStorage per project.
 */
export interface WorkingContextData {
  /** Project this context belongs to */
  projectId: string;
  /** Last route path visited within project scope */
  lastRoute: string;
  /** Last entity viewed (for deep restoration) */
  lastEntity: LastEntity;
  /** When user last interacted with this project */
  lastSeenAt: string;
  /** Optional user-entered breadcrumb */
  intentNote?: string;
  /** Schema version for migrations */
  version: number;
}

interface WorkingContextValue {
  /** Current working context for active project (null if no project focused) */
  workingContext: WorkingContextData | null;
  /** Update working context (partial updates supported) */
  updateWorkingContext: (updates: Partial<Omit<WorkingContextData, 'projectId' | 'version'>>) => void;
  /** Set the intent note */
  setIntentNote: (note: string | undefined) => void;
  /** Clear the intent note */
  clearIntentNote: () => void;
  /** Check if context is stale (older than threshold) */
  isStale: (thresholdMs?: number) => boolean;
  /** Clear working context for current project */
  clearWorkingContext: () => void;
  /** Get working context for a specific project (for restoration checks) */
  getWorkingContextForProject: (projectId: string) => WorkingContextData | null;
  /** Check if we have resumable context for the active project */
  hasResumableContext: boolean;
}

/**
 * Generate localStorage key for a project's working context.
 */
function getStorageKey(projectId: string): string {
  return `${STORAGE_KEY_PREFIX}.${projectId}`;
}

/**
 * Load working context from localStorage for a project.
 * Returns null if not found or invalid.
 */
function loadWorkingContext(projectId: string): WorkingContextData | null {
  try {
    const key = getStorageKey(projectId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Version check - migrate if needed
    if (parsed.version !== WORKING_CONTEXT_VERSION) {
      // For now, just discard old versions
      // Future: add migration logic here
      console.warn(`WorkingContext version mismatch for project ${projectId}, discarding`);
      localStorage.removeItem(key);
      return null;
    }

    // Validate required fields
    if (!parsed.projectId || !parsed.lastRoute || !parsed.lastSeenAt) {
      console.warn(`WorkingContext invalid for project ${projectId}, discarding`);
      localStorage.removeItem(key);
      return null;
    }

    return parsed as WorkingContextData;
  } catch (error) {
    console.warn(`Failed to load WorkingContext for project ${projectId}:`, error);
    return null;
  }
}

/**
 * Save working context to localStorage.
 */
function saveWorkingContext(context: WorkingContextData): void {
  try {
    const key = getStorageKey(context.projectId);
    localStorage.setItem(key, JSON.stringify(context));
  } catch (error) {
    console.warn(`Failed to save WorkingContext for project ${context.projectId}:`, error);
  }
}

/**
 * Clear working context from localStorage.
 */
function clearStoredWorkingContext(projectId: string): void {
  try {
    const key = getStorageKey(projectId);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear WorkingContext for project ${projectId}:`, error);
  }
}

const WorkingContext = React.createContext<WorkingContextValue | null>(null);

export function WorkingContextProvider({ children }: { children: React.ReactNode }) {
  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;

  // Current working context (for active project)
  const [workingContext, setWorkingContext] = React.useState<WorkingContextData | null>(null);

  // Debounce ref for localStorage writes
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Load context when active project changes
  React.useEffect(() => {
    if (!activeProjectId) {
      setWorkingContext(null);
      return;
    }

    const loaded = loadWorkingContext(activeProjectId);
    setWorkingContext(loaded);
  }, [activeProjectId]);

  // Debounced save to localStorage
  const scheduleSave = React.useCallback((context: WorkingContextData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveWorkingContext(context);
      saveTimeoutRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const updateWorkingContext = React.useCallback(
    (updates: Partial<Omit<WorkingContextData, 'projectId' | 'version'>>) => {
      if (!activeProjectId) return;

      setWorkingContext((prev) => {
        const now = new Date().toISOString();
        const newContext: WorkingContextData = prev
          ? {
              ...prev,
              ...updates,
              lastSeenAt: now,
            }
          : {
              projectId: activeProjectId,
              lastRoute: updates.lastRoute ?? '/',
              lastEntity: updates.lastEntity ?? {},
              lastSeenAt: now,
              intentNote: updates.intentNote,
              version: WORKING_CONTEXT_VERSION,
            };

        scheduleSave(newContext);
        return newContext;
      });
    },
    [activeProjectId, scheduleSave]
  );

  const setIntentNote = React.useCallback(
    (note: string | undefined) => {
      updateWorkingContext({ intentNote: note });
    },
    [updateWorkingContext]
  );

  const clearIntentNote = React.useCallback(() => {
    setIntentNote(undefined);
  }, [setIntentNote]);

  const isStale = React.useCallback(
    (thresholdMs: number = 7 * 24 * 60 * 60 * 1000) => {
      // Default: 7 days
      if (!workingContext) return true;
      const lastSeen = new Date(workingContext.lastSeenAt).getTime();
      return Date.now() - lastSeen > thresholdMs;
    },
    [workingContext]
  );

  const clearWorkingContext = React.useCallback(() => {
    if (!activeProjectId) return;
    clearStoredWorkingContext(activeProjectId);
    setWorkingContext(null);
  }, [activeProjectId]);

  const getWorkingContextForProject = React.useCallback(
    (projectId: string): WorkingContextData | null => {
      if (projectId === activeProjectId && workingContext) {
        return workingContext;
      }
      return loadWorkingContext(projectId);
    },
    [activeProjectId, workingContext]
  );

  // Has resumable context if we have a context with a meaningful route
  const hasResumableContext = React.useMemo(() => {
    if (!workingContext) return false;
    // Must have a route that's not just the root
    if (!workingContext.lastRoute || workingContext.lastRoute === '/') return false;
    // Must have been seen recently (within 30 days)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const lastSeen = new Date(workingContext.lastSeenAt).getTime();
    if (Date.now() - lastSeen > thirtyDaysMs) return false;
    return true;
  }, [workingContext]);

  const value = React.useMemo(
    () => ({
      workingContext,
      updateWorkingContext,
      setIntentNote,
      clearIntentNote,
      isStale,
      clearWorkingContext,
      getWorkingContextForProject,
      hasResumableContext,
    }),
    [
      workingContext,
      updateWorkingContext,
      setIntentNote,
      clearIntentNote,
      isStale,
      clearWorkingContext,
      getWorkingContextForProject,
      hasResumableContext,
    ]
  );

  return (
    <WorkingContext.Provider value={value}>{children}</WorkingContext.Provider>
  );
}

export function useWorkingContext(): WorkingContextValue {
  const context = React.useContext(WorkingContext);
  if (!context) {
    throw new Error('useWorkingContext must be used within a WorkingContextProvider');
  }
  return context;
}

export function useWorkingContextOptional(): WorkingContextValue | null {
  return React.useContext(WorkingContext);
}

export default WorkingContext;
