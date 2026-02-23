/**
 * UI Slice - User interface state
 */

import { StateCreator } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';
export type ThemeVariant = 'default' | 'cosmic' | 'minimal' | 'vibrant';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

export interface ThemeSettings {
  variant: ThemeVariant;
  layoutDensity: LayoutDensity;
  showAnimations: boolean;
  customAccentColor?: string;
}

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: unknown;
}

export type WorkspaceMode = 'focus' | 'overview' | 'collaboration' | 'review';
export type CurrentContext = 'dashboard' | 'project' | 'conversation' | 'organization' | 'team';

export interface WorkspaceActivity {
  id: string;
  type: 'message' | 'file_upload' | 'project_update' | 'project_created' | 'conversation_created' | 'review_completed' | 'automation_enabled' | 'ai_feedback';
  title: string;
  description: string;
  timestamp: string;
  organizationId?: string;
  teamId?: string;
  projectId?: string;
  conversationId?: string;
  userId: string;
  userName: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  actions: Array<{
    id: string;
    label: string;
    primary?: boolean;
  }>;
}

export interface LastEntity {
  conversationId?: string;
  messageId?: string;
  fileId?: string;
  assetId?: string;
  boardId?: string;
}

export interface WorkingContextData {
  projectId: string;
  lastRoute: string;
  lastEntity: LastEntity;
  lastSeenAt: string;
  intentNote?: string;
  version: number;
}

export interface UIState {
  theme: Theme;
  themeSettings: ThemeSettings;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  commandPaletteOpen: boolean;
  activeModal: ModalState;
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }>;
  isFullscreen: boolean;
  focusMode: boolean;

  // Workspace state (from WorkspaceContext)
  currentContext: CurrentContext;
  currentMode: WorkspaceMode;
  recentActivity: WorkspaceActivity[];
  currentWorkflow: WorkflowStep | null;
  loadingStates: Record<string, boolean>;

  // Working context (from WorkingContext) - per-project state stored in-memory
  workingContext: WorkingContextData | null;
  hasResumableContext: boolean;
}

export interface UIActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  updateThemeSettings: (updates: Partial<ThemeSettings>) => void;
  resetThemeSettings: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openModal: (type: string, data?: unknown) => void;
  closeModal: () => void;
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void;
  removeToast: (id: string) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setFocusMode: (focusMode: boolean) => void;

  // Workspace actions (from WorkspaceContext)
  setContext: (context: CurrentContext, mode?: WorkspaceMode) => void;
  addActivity: (activity: Omit<WorkspaceActivity, 'id' | 'timestamp'>) => void;
  startWorkflow: (workflow: Omit<WorkflowStep, 'current'>) => void;
  completeWorkflowStep: (stepId: string) => void;
  setWorkspaceLoading: (key: string, loading: boolean) => void;
  isWorkspaceLoading: (key: string) => boolean;

  // Working context actions (from WorkingContext)
  updateWorkingContext: (updates: Partial<Omit<WorkingContextData, 'projectId' | 'version'>>) => void;
  setIntentNote: (note: string | undefined) => void;
  clearIntentNote: () => void;
  clearWorkingContext: () => void;
  loadWorkingContextForProject: (projectId: string) => void;
  getWorkingContextForProject: (projectId: string) => WorkingContextData | null;
}

export interface UISlice {
  ui: UIState & UIActions;
}

// ============================================================================
// Initial State
// ============================================================================

const THEME_SETTINGS_KEY = 'flux-studio-theme';
const THEME_PREFERENCE_KEY = 'flux-studio-theme-preference';

const defaultThemeSettings: ThemeSettings = {
  variant: 'default',
  layoutDensity: 'comfortable',
  showAnimations: true,
};

/** Load persisted theme preference from localStorage */
function loadThemePreference(): Theme {
  try {
    const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* ignore */ }
  return 'system';
}

function loadThemeSettings(): ThemeSettings {
  try {
    const stored = localStorage.getItem(THEME_SETTINGS_KEY);
    if (stored) return { ...defaultThemeSettings, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return defaultThemeSettings;
}

const WORKING_CONTEXT_VERSION = 1;
const WORKING_CONTEXT_PREFIX = 'fluxstudio.workingContext';

function loadWorkingContext(projectId: string): WorkingContextData | null {
  try {
    const stored = localStorage.getItem(`${WORKING_CONTEXT_PREFIX}.${projectId}`);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.version !== WORKING_CONTEXT_VERSION) return null;
    if (!parsed.projectId || !parsed.lastRoute || !parsed.lastSeenAt) return null;
    return parsed;
  } catch { return null; }
}

function saveWorkingContext(context: WorkingContextData): void {
  try {
    localStorage.setItem(`${WORKING_CONTEXT_PREFIX}.${context.projectId}`, JSON.stringify(context));
  } catch { /* ignore */ }
}

const initialState: UIState = {
  theme: loadThemePreference(),
  themeSettings: loadThemeSettings(),
  sidebarCollapsed: false,
  sidebarWidth: 280,
  commandPaletteOpen: false,
  activeModal: { isOpen: false, type: null },
  toasts: [],
  isFullscreen: false,
  focusMode: false,

  // Workspace
  currentContext: 'dashboard',
  currentMode: 'overview',
  recentActivity: [],
  currentWorkflow: null,
  loadingStates: {},

  // Working context
  workingContext: null,
  hasResumableContext: false,
};

// ============================================================================
// Slice Creator
// ============================================================================

export const createUISlice: StateCreator<
  FluxStore,
  [['zustand/immer', never]],
  [],
  UISlice
> = (set, get) => ({
  ui: {
    ...initialState,

    setTheme: (theme: Theme) => {
      set((state) => {
        state.ui.theme = theme;
      });
      // Persist to localStorage
      try { localStorage.setItem(THEME_PREFERENCE_KEY, theme); } catch { /* ignore */ }
      // Apply theme to document
      applyTheme(theme);
    },

    toggleTheme: () => {
      const current = get().ui.theme;
      const next = current === 'light' ? 'dark' : 'light';
      get().ui.setTheme(next);
    },

    updateThemeSettings: (updates: Partial<ThemeSettings>) => {
      set((state) => {
        Object.assign(state.ui.themeSettings, updates);
      });
      const newSettings = { ...get().ui.themeSettings };
      try { localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(newSettings)); } catch { /* ignore */ }
      applyThemeSettings(newSettings);
    },

    resetThemeSettings: () => {
      set((state) => {
        state.ui.themeSettings = { ...defaultThemeSettings };
      });
      try { localStorage.removeItem(THEME_SETTINGS_KEY); } catch { /* ignore */ }
      applyThemeSettings(defaultThemeSettings);
    },

    setSidebarCollapsed: (collapsed: boolean) => {
      set((state) => {
        state.ui.sidebarCollapsed = collapsed;
      });
    },

    toggleSidebar: () => {
      set((state) => {
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
      });
    },

    setSidebarWidth: (width: number) => {
      set((state) => {
        state.ui.sidebarWidth = Math.max(200, Math.min(500, width));
      });
    },

    openCommandPalette: () => {
      set((state) => {
        state.ui.commandPaletteOpen = true;
      });
    },

    closeCommandPalette: () => {
      set((state) => {
        state.ui.commandPaletteOpen = false;
      });
    },

    toggleCommandPalette: () => {
      set((state) => {
        state.ui.commandPaletteOpen = !state.ui.commandPaletteOpen;
      });
    },

    openModal: (type: string, data?: unknown) => {
      set((state) => {
        state.ui.activeModal = { isOpen: true, type, data };
      });
    },

    closeModal: () => {
      set((state) => {
        state.ui.activeModal = { isOpen: false, type: null };
      });
    },

    addToast: (toast) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => {
        state.ui.toasts.push({ ...toast, id });
      });

      // Auto-remove after duration
      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          get().ui.removeToast(id);
        }, duration);
      }
    },

    removeToast: (id: string) => {
      set((state) => {
        state.ui.toasts = state.ui.toasts.filter((t) => t.id !== id);
      });
    },

    setFullscreen: (fullscreen: boolean) => {
      set((state) => {
        state.ui.isFullscreen = fullscreen;
      });
    },

    setFocusMode: (focusMode: boolean) => {
      set((state) => {
        state.ui.focusMode = focusMode;
      });
    },

    // Workspace actions
    setContext: (context: CurrentContext, mode?: WorkspaceMode) => {
      set((state) => {
        state.ui.currentContext = context;
        if (mode) state.ui.currentMode = mode;
      });
    },

    addActivity: (activity) => {
      const fullActivity: WorkspaceActivity = {
        ...activity,
        id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      set((state) => {
        state.ui.recentActivity = [fullActivity, ...state.ui.recentActivity].slice(0, 50);
      });
    },

    startWorkflow: (workflow) => {
      set((state) => {
        state.ui.currentWorkflow = { ...workflow, current: true };
      });
    },

    completeWorkflowStep: (stepId) => {
      set((state) => {
        if (state.ui.currentWorkflow?.id === stepId) {
          state.ui.currentWorkflow.completed = true;
        }
      });
    },

    setWorkspaceLoading: (key, loading) => {
      set((state) => {
        state.ui.loadingStates[key] = loading;
      });
    },

    isWorkspaceLoading: (key) => {
      return get().ui.loadingStates[key] || false;
    },

    // Working context actions
    updateWorkingContext: (updates) => {
      const activeProjectId = get().projects.activeProjectId;
      if (!activeProjectId) return;

      set((state) => {
        const now = new Date().toISOString();
        const prev = state.ui.workingContext;
        const newCtx: WorkingContextData = prev
          ? { ...prev, ...updates, lastSeenAt: now }
          : {
              projectId: activeProjectId,
              lastRoute: updates.lastRoute ?? '/',
              lastEntity: updates.lastEntity ?? {},
              lastSeenAt: now,
              intentNote: updates.intentNote,
              version: WORKING_CONTEXT_VERSION,
            };
        state.ui.workingContext = newCtx;
        state.ui.hasResumableContext = !!(newCtx.lastRoute && newCtx.lastRoute !== '/');
      });
      // Debounced save
      const ctx = get().ui.workingContext;
      if (ctx) saveWorkingContext(ctx);
    },

    setIntentNote: (note) => {
      get().ui.updateWorkingContext({ intentNote: note });
    },

    clearIntentNote: () => {
      get().ui.updateWorkingContext({ intentNote: undefined });
    },

    clearWorkingContext: () => {
      const activeProjectId = get().projects.activeProjectId;
      if (activeProjectId) {
        try { localStorage.removeItem(`${WORKING_CONTEXT_PREFIX}.${activeProjectId}`); } catch { /* ignore */ }
      }
      set((state) => {
        state.ui.workingContext = null;
        state.ui.hasResumableContext = false;
      });
    },

    loadWorkingContextForProject: (projectId) => {
      const loaded = loadWorkingContext(projectId);
      set((state) => {
        state.ui.workingContext = loaded;
        state.ui.hasResumableContext = !!(loaded?.lastRoute && loaded.lastRoute !== '/');
      });
    },

    getWorkingContextForProject: (projectId) => {
      const current = get().ui.workingContext;
      if (current?.projectId === projectId) return current;
      return loadWorkingContext(projectId);
    },
  },
});

// ============================================================================
// Theme Helper
// ============================================================================

let systemThemeCleanup: (() => void) | null = null;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const systemPrefersDark = mq.matches;

  if (theme === 'dark' || (theme === 'system' && systemPrefersDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Listen for system theme changes when in 'system' mode
  if (systemThemeCleanup) {
    systemThemeCleanup();
    systemThemeCleanup = null;
  }

  if (theme === 'system') {
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    mq.addEventListener('change', handler);
    systemThemeCleanup = () => mq.removeEventListener('change', handler);
  }
}

function applyThemeSettings(settings: ThemeSettings) {
  const root = document.documentElement;

  // Remove existing variant/density classes
  root.classList.remove('theme-default', 'theme-cosmic', 'theme-minimal', 'theme-vibrant');
  root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
  root.classList.remove('no-animations');

  root.classList.add(`theme-${settings.variant}`);
  root.classList.add(`density-${settings.layoutDensity}`);

  if (!settings.showAnimations) root.classList.add('no-animations');

  if (settings.customAccentColor) {
    root.style.setProperty('--accent-color', settings.customAccentColor);
  } else {
    root.style.removeProperty('--accent-color');
  }
}

// ============================================================================
// Convenience Hooks
// ============================================================================

import { useStore } from '../store';

export const useUI = () => {
  return useStore((state) => state.ui);
};

export const useTheme = () => {
  const theme = useStore((state) => state.ui.theme);
  const setTheme = useStore((state) => state.ui.setTheme);
  const toggleTheme = useStore((state) => state.ui.toggleTheme);
  return { theme, setTheme, toggleTheme };
};

export const useSidebar = () => {
  const collapsed = useStore((state) => state.ui.sidebarCollapsed);
  const width = useStore((state) => state.ui.sidebarWidth);
  const toggle = useStore((state) => state.ui.toggleSidebar);
  const setCollapsed = useStore((state) => state.ui.setSidebarCollapsed);
  const setWidth = useStore((state) => state.ui.setSidebarWidth);
  return { collapsed, width, toggle, setCollapsed, setWidth };
};

/**
 * useWorkspace - backwards-compatible hook matching the old WorkspaceContext API.
 * Returns { state, actions } shape for consumer compatibility.
 */
export const useWorkspace = () => {
  return useStore(useShallow((s) => ({
    state: {
      currentContext: s.ui.currentContext,
      currentMode: s.ui.currentMode,
      recentActivity: s.ui.recentActivity,
      currentWorkflow: s.ui.currentWorkflow,
      sidebarCollapsed: s.ui.sidebarCollapsed,
      commandPaletteOpen: s.ui.commandPaletteOpen,
      // Derive activeProject from projectSlice for backwards compatibility
      activeProject: s.projects.activeProjectId
        ? s.projects.projects.find((p) => p.id === s.projects.activeProjectId) || null
        : null,
      activeConversation: null as { id: string; name: string } | null,
      activeOrganization: s.org?.currentOrganization ?? null,
      activeTeam: null as { id: string; name: string } | null,
    },
    actions: {
      setContext: s.ui.setContext,
      addActivity: s.ui.addActivity,
      toggleSidebar: s.ui.toggleSidebar,
      openCommandPalette: s.ui.openCommandPalette,
      closeCommandPalette: s.ui.closeCommandPalette,
      startWorkflow: s.ui.startWorkflow,
      completeWorkflowStep: s.ui.completeWorkflowStep,
      setActiveProject: (project: { id: string } | null) => {
        s.projects.setActiveProject(project?.id ?? null);
      },
      setActiveConversation: (_conversation: unknown) => {
        // No-op: conversations are managed through messagingSlice
      },
      getContextualActions: () => [] as Array<{ title: string; description: string; type: string; action: () => void; priority: string }>,
      isLoading: s.ui.isWorkspaceLoading,
    },
  })));
};

export const useWorkingContext = () => {
  return useStore(useShallow((state) => ({
    workingContext: state.ui.workingContext,
    hasResumableContext: state.ui.hasResumableContext,
    updateWorkingContext: state.ui.updateWorkingContext,
    setIntentNote: state.ui.setIntentNote,
    clearIntentNote: state.ui.clearIntentNote,
    clearWorkingContext: state.ui.clearWorkingContext,
    loadWorkingContextForProject: state.ui.loadWorkingContextForProject,
    getWorkingContextForProject: state.ui.getWorkingContextForProject,
  })));
};
