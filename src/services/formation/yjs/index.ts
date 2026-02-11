/**
 * Formation Yjs Module
 *
 * Real-time collaboration infrastructure for formation editing.
 * Re-exports all types, utilities, and providers for easy import.
 */

// Types and constants
export {
  // Types
  type YjsPosition,
  type YjsPerformer,
  type YjsKeyframe,
  type YjsFormationMeta,
  type YjsAudioTrack,
  type FormationAwarenessState,
  type YFormationMeta,
  type YPerformers,
  type YKeyframes,
  type YPositions,
  type FormationYjsDoc,

  // Conversion utilities
  yMapToPerformer,
  performerToYMapEntries,
  yMapToKeyframe,
  keyframeToYMapEntries,
  yMapToFormationMeta,
  yMapToAudioTrack,

  // Room utilities
  getFormationRoomName,
  parseFormationRoomName,

  // Constants
  FORMATION_YJS_TYPES,
  COLLABORATION_COLORS,
  getUserColor,
} from './formationYjsTypes';

// Awareness utilities
export {
  type CursorPosition,
  type PresenceInfo,

  // Constants
  IDLE_THRESHOLD_MS,
  CURSOR_STALE_THRESHOLD_MS,
  ACTIVITY_UPDATE_INTERVAL_MS,

  // Utilities
  isUserIdle,
  isCursorStale,
  awarenessToPresence,
  getActiveCollaborators,
  getCollaboratorsWithPerformerSelected,
  getCollaboratorDraggingPerformer,
  isPerformerBeingDraggedByOther,
  getCollaboratorsOnKeyframe,
  getCollaborationSummary,
  formatLastActivity,
  createDebouncedUpdater,
  createThrottledUpdater,
} from './formationAwareness';
