/**
 * Main Zustand Store
 *
 * Composes all domain slices into a single unified store.
 * Uses immer for immutable updates and persist for offline storage.
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { registerStore } from './storeRef';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createProjectSlice, ProjectSlice } from './slices/projectSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createMessagingSlice, MessagingSlice } from './slices/messagingSlice';
import { createOfflineSlice, OfflineSlice } from './slices/offlineSlice';
import { createCollaborationSlice, CollaborationSlice } from './slices/collaborationSlice';
import { createTimelineSlice, TimelineSlice } from './slices/timelineSlice';
import { createAISlice, AISlice } from './slices/aiSlice';
import { createAgentSlice, AgentSlice } from './slices/agentSlice';
import { createOrgSlice, OrgSlice } from './slices/orgSlice';
import { createNotificationSlice, NotificationSlice } from './slices/notificationSlice';
import { createAssetSlice, AssetSlice } from './slices/assetSlice';
import { createConnectorSlice, ConnectorSlice } from './slices/connectorSlice';
import { createScene3DSlice, Scene3DSlice } from './slices/scene3dSlice';
import { createFormationDraftSlice, FormationDraftSlice } from './slices/formationDraftSlice';
import { createSocketSlice, SocketSlice } from './slices/socketSlice';

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
  AgentSlice &
  OrgSlice &
  NotificationSlice &
  AssetSlice &
  ConnectorSlice &
  Scene3DSlice &
  FormationDraftSlice &
  SocketSlice;

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
          ...createOrgSlice(...(args as Parameters<typeof createOrgSlice>)),
          ...createNotificationSlice(...(args as Parameters<typeof createNotificationSlice>)),
          ...createAssetSlice(...(args as Parameters<typeof createAssetSlice>)),
          ...createConnectorSlice(...(args as Parameters<typeof createConnectorSlice>)),
          ...createScene3DSlice(...(args as Parameters<typeof createScene3DSlice>)),
          ...createFormationDraftSlice(...(args as Parameters<typeof createFormationDraftSlice>)),
          ...createSocketSlice(...(args as Parameters<typeof createSocketSlice>)),
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
          // Deep merge to preserve action functions inside nested slice objects
          merge: (persistedState, currentState) => {
            const persisted = persistedState as Record<string, unknown> | undefined;
            if (!persisted) return currentState;
            const merged = { ...currentState } as Record<string, unknown>;
            for (const key of Object.keys(persisted)) {
              const currentVal = merged[key];
              const persistedVal = persisted[key];
              if (
                currentVal && typeof currentVal === 'object' && !Array.isArray(currentVal) &&
                persistedVal && typeof persistedVal === 'object' && !Array.isArray(persistedVal)
              ) {
                merged[key] = { ...currentVal, ...(persistedVal as Record<string, unknown>) };
              } else {
                merged[key] = persistedVal;
              }
            }
            return merged as unknown as FluxStore;
          },
          // Apply theme on hydration so dark mode works on initial page load
          onRehydrateStorage: () => (state) => {
            if (state?.ui?.theme) {
              state.ui.setTheme(state.ui.theme);
            }
          },
        }
      )
    ),
    { name: 'FluxStudio' }
  )
);

// Register store reference so slices can access it without circular imports
registerStore(useStore as unknown as (...args: unknown[]) => unknown);

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

// Messaging
export const useMessagingStoreRoot = () => useStore((state) => state.messaging);

// Assets / Files
export const useAssetStoreRoot = () => useStore((state) => state.assets);

// Notifications
export const useNotificationStore = () => useStore((state) => state.notifications);

// Scene 3D
export const useScene3DStore = () => useStore((state) => state.scene3d);

// Formation Draft
export const useFormationDraftStore = () => useStore((state) => state.formationDraft);

// Socket
export const useSocketStoreRoot = () => useStore((state) => state.socket);

// ============================================================================
// Cross-Slice Selectors
// ============================================================================

/** Current user + active project in one shot (common in page headers) */
export const useCurrentContext = () => useStore((state) => ({
  user: state.auth.user,
  isAuthenticated: state.auth.isAuthenticated,
  activeProject: state.projects.activeProjectId
    ? state.projects.projects.find((p) => p.id === state.projects.activeProjectId) || null
    : null,
  activeProjectId: state.projects.activeProjectId,
  theme: state.ui.theme,
}));

/** Unread counts across messaging and notifications */
export const useUnreadCounts = () => useStore((state) => ({
  messages: state.messaging.unreadCounts?.messages || 0,
  notifications: state.notifications?.unreadCount || 0,
}));

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
    // Preserve all action functions, reset only state values
    state.auth.user = null;
    state.auth.isAuthenticated = false;
    state.auth.isLoading = false;
    state.auth.error = null;
    state.auth.token = null;
    state.auth.isReturningSession = false;
    state.projects.activeProjectId = null;
    state.projects.projects = [];
    state.messaging.conversations = [];
    state.offline.pendingActions = [];
    state.socket.isConnected = false;
    state.socket.connectionError = null;
    state.socket.typingUsers = {};
    state.socket.onlineUsers = {};
    state.socket.activeConversations = [];
  });
};
