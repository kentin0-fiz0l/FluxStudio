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

export { useStore, useAuthStore, useProjectStore, useUIStore, useCurrentContext, useUnreadCounts, useFormationDraftStore } from './store';
export type { FluxStore } from './store';

// Domain-specific hooks for convenience
export { useAuth, useSession } from './slices/authSlice';
export { useProjects, useActiveProject, useProjectContext, useCurrentProjectId, useRequiredProject } from './slices/projectSlice';
export { useUI, useTheme, useSidebar, useWorkspace, useWorkingContext } from './slices/uiSlice';
export { useOrganization, useOrg } from './slices/orgSlice';
export { useNotifications, useNotification, useNotificationInit } from './slices/notificationSlice';
export { useMessagingStore, useMessagingStore as useMessaging } from './slices/messagingSlice';
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
export { useAssetStore, useFileStore } from './slices/assetSlice';
export { useConnectors, useConnectorList } from './slices/connectorSlice';
export { useFormationDraftStore as useFormationDraft } from './store';

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
  ThemeVariant,
  LayoutDensity,
  ThemeSettings,
  WorkspaceMode,
  CurrentContext,
  WorkspaceActivity,
  WorkflowStep,
  LastEntity,
  WorkingContextData,
} from './slices/uiSlice';
export type {
  SessionState,
  UserType,
} from './slices/authSlice';
export type {
  OrgState,
  Breadcrumb,
} from './slices/orgSlice';
export type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationState,
} from './slices/notificationSlice';
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
export type {
  AssetRecord,
  AssetType,
  AssetStatus,
  AssetsFilter,
  FileRecord,
  FileType,
  FileSource,
  FilesFilter,
} from './slices/assetSlice';
export type {
  ConnectorProvider,
  ConnectorStatus,
  Connector,
  ConnectorFile,
  ImportedFile,
  ConnectorState,
} from './slices/connectorSlice';
export type {
  DraftStatus,
  ShowPlan,
  ShowPlanSection,
  MusicAnalysis,
  RefinementEntry,
  FormationDraftState,
  FormationDraftSlice,
} from './slices/formationDraftSlice';
