/**
 * UI Slice - User interface state
 */

import { StateCreator } from 'zustand';
import { FluxStore } from '../store';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: unknown;
}

export interface UIState {
  theme: Theme;
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
}

export interface UIActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
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
}

export interface UISlice {
  ui: UIState & UIActions;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: UIState = {
  theme: 'system',
  sidebarCollapsed: false,
  sidebarWidth: 280,
  commandPaletteOpen: false,
  activeModal: { isOpen: false, type: null },
  toasts: [],
  isFullscreen: false,
  focusMode: false,
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
      // Apply theme to document
      applyTheme(theme);
    },

    toggleTheme: () => {
      const current = get().ui.theme;
      const next = current === 'light' ? 'dark' : 'light';
      get().ui.setTheme(next);
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
  },
});

// ============================================================================
// Theme Helper
// ============================================================================

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' && systemPrefersDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
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
