/**
 * Main Zustand Store
 *
 * Composes all domain slices into a single unified store.
 * Uses immer for immutable updates and persist for offline storage.
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createProjectSlice, ProjectSlice } from './slices/projectSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createMessagingSlice, MessagingSlice } from './slices/messagingSlice';
import { createOfflineSlice, OfflineSlice } from './slices/offlineSlice';
import { createCollaborationSlice, CollaborationSlice } from './slices/collaborationSlice';
import { createTimelineSlice, TimelineSlice } from './slices/timelineSlice';
import { createAISlice, AISlice } from './slices/aiSlice';
import { createAgentSlice, AgentSlice } from './slices/agentSlice';

// ============================================================================
// Combined Store Type
// ============================================================================

export type FluxStore = AuthSlice &
  ProjectSlice &
  UISlice &
  MessagingSlice &
  OfflineSlice &
  CollaborationSlice &
  TimelineSlice &
  AISlice &
  AgentSlice;

// ============================================================================
// Store Creation
// ============================================================================

export const useStore = create<FluxStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((...args) => ({
          ...createAuthSlice(...(args as Parameters<typeof createAuthSlice>)),
          ...createProjectSlice(...(args as Parameters<typeof createProjectSlice>)),
          ...createUISlice(...(args as Parameters<typeof createUISlice>)),
          ...createMessagingSlice(...(args as Parameters<typeof createMessagingSlice>)),
          ...createOfflineSlice(...(args as Parameters<typeof createOfflineSlice>)),
          ...createCollaborationSlice(...(args as Parameters<typeof createCollaborationSlice>)),
          ...createTimelineSlice(...(args as Parameters<typeof createTimelineSlice>)),
          ...createAISlice(...(args as Parameters<typeof createAISlice>)),
          ...createAgentSlice(...(args as Parameters<typeof createAgentSlice>)),
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

// Agent
export const useAgentStore = () => useStore((state) => state.agent);

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
