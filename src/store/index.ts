/**
 * FluxStudio Unified Store
 *
 * Zustand-based state management replacing the 13-level provider pyramid.
 * Each domain has its own slice, composed into a single store.
 *
 * Usage:
 *   import { useStore } from '@/store';
 *   const user = useStore(state => state.auth.user);
 *   const setProject = useStore(state => state.projects.setActive);
 */

export { useStore, useAuthStore, useProjectStore, useUIStore } from './store';
export type { FluxStore } from './store';

// Domain-specific hooks for convenience
export { useAuth } from './slices/authSlice';
export { useProjects, useActiveProject } from './slices/projectSlice';
export { useUI, useTheme, useSidebar } from './slices/uiSlice';
export { useMessaging } from './slices/messagingSlice';
export { useOffline, useSyncStatus } from './slices/offlineSlice';
export {
  useCollaboration,
  useActiveSession,
  useCollaborators,
  useLocks,
  useIsEntityLocked,
} from './slices/collaborationSlice';
export {
  useTimeline,
  usePlayback,
  useTimelineProject,
  useTimelineSelection,
  useTimelineView,
  useClip,
  useTrack,
} from './slices/timelineSlice';
export {
  useAI,
  useActiveConversation,
  useAIConversations,
  useAISuggestions,
  useAIUsage,
  useAIPreferences,
  useGenerationRequests,
} from './hooks/aiHooks';

// Type exports
export type {
  AuthState,
  User,
} from './slices/authSlice';
export type {
  Project,
  ProjectState,
} from './slices/projectSlice';
export type {
  UIState,
  Theme,
} from './slices/uiSlice';
export type {
  Conversation,
  Message as MessagingMessage,
  MessagingState,
} from './slices/messagingSlice';
export type {
  NetworkStatus,
  SyncStatus,
  PendingAction,
  OfflineState,
} from './slices/offlineSlice';
export type {
  Collaborator,
  CursorPosition,
  Selection,
  EditLock,
  CollaborationEdit,
  CollaborationSession,
  CollaborationState,
} from './slices/collaborationSlice';
export type {
  TrackType,
  ClipType,
  Track,
  Clip,
  Marker,
  Keyframe,
  Animation,
  TimelineProject,
  PlaybackState,
  ViewState,
  SelectionState,
  TimelineState,
} from './slices/timelineSlice';
export type {
  AIModel,
  GenerationType,
  AIMessage,
  AIAttachment,
  AIConversation,
  GenerationRequest,
  AISuggestion,
  AIUsage,
  AIPreferences,
  AIState,
} from './slices/aiSlice';
