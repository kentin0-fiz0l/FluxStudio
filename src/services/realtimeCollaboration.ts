/**
 * Real-time Collaboration Service
 *
 * @deprecated Use `import { collaborationService } from './collaboration'` instead.
 * This file re-exports from the consolidated collaboration module for backward compatibility.
 * @see DEBT-005
 */

// Re-export everything from the consolidated module
export {
  collaborationService,
  CollaborationService as RealtimeCollaborationService,
} from './collaboration';

export type {
  CollaborationSession,
  CollaboratorPresence,
  CursorPosition,
  SelectionRange,
  ViewportInfo,
  EditorState,
  Operation,
  CollaborationEvent,
} from './collaboration';

// Default export the singleton
export { collaborationService as default } from './collaboration';
