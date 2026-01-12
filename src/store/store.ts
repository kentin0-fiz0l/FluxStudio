/**
 * Main Zustand Store
 *
 * Composes all domain slices into a single unified store.
 * Uses immer for immutable updates and persist for offline storage.
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { createAuthSlice } from './slices/authSlice';
import { createProjectSlice } from './slices/projectSlice';
import { createUISlice } from './slices/uiSlice';
import { createMessagingSlice } from './slices/messagingSlice';
import { createOfflineSlice } from './slices/offlineSlice';
import { createCollaborationSlice } from './slices/collaborationSlice';
import { createTimelineSlice } from './slices/timelineSlice';
import { createAISlice } from './slices/aiSlice';

// Import and re-export FluxStore type from types.ts to avoid circular dependencies
import type { FluxStore } from './types';
export type { FluxStore };

// ============================================================================
// Store Creation
// ============================================================================

export const useStore = create<FluxStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((...args) => ({
          ...createAuthSlice(...args),
          ...createProjectSlice(...args),
          ...createUISlice(...args),
          ...createMessagingSlice(...args),
          ...createOfflineSlice(...args),
          ...createCollaborationSlice(...args),
          ...createTimelineSlice(...args),
          ...createAISlice(...args),
        })),
        {
          name: 'fluxstudio-store',
          // Only persist specific slices
          partialize: (state) => ({
            auth: {
              user: state.auth.user,
              isAuthenticated: state.auth.isAuthenticated,
            },
            projects: {
              activeProjectId: state.projects.activeProjectId,
              recentProjectIds: state.projects.recentProjectIds,
            },
            ui: {
              theme: state.ui.theme,
              sidebarCollapsed: state.ui.sidebarCollapsed,
            },
            offline: {
              pendingActions: state.offline.pendingActions,
            },
          }),
        }
      )
    ),
    { name: 'FluxStudio' }
  )
);

// ============================================================================
// Convenience Selectors
// ============================================================================

// Auth
export const useAuthStore = () => useStore((state) => state.auth);

// Projects
export const useProjectStore = () => useStore((state) => state.projects);

// UI
export const useUIStore = () => useStore((state) => state.ui);

// ============================================================================
// Store Utilities
// ============================================================================

// Get store state outside of React
export const getState = useStore.getState;

// Subscribe to store changes outside of React
export const subscribe = useStore.subscribe;

// Reset entire store (useful for logout)
export const resetStore = () => {
  useStore.setState((state) => {
    // Reset all slices to initial state
    state.auth = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: state.auth.login,
      logout: state.auth.logout,
      setUser: state.auth.setUser,
      setLoading: state.auth.setLoading,
      setError: state.auth.setError,
    };
    state.projects.activeProjectId = null;
    state.projects.projects = [];
    state.messaging.conversations = [];
    state.offline.pendingActions = [];
  });
};
