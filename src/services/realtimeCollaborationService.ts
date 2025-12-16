/**
 * Real-time Collaboration Service
 *
 * @deprecated Use `import { collaborationService } from './collaboration'` instead.
 * This file re-exports from the consolidated collaboration module for backward compatibility.
 * @see DEBT-005
 */

// Re-export from consolidated module
export {
  realtimeCollaborationService,
  collaborationService,
  CollaborationService,
} from './collaboration';

export type {
  PresenceUser,
  CollaborationEvent,
  TypingIndicator,
} from './collaboration';

// Default export for backward compatibility
export { realtimeCollaborationService as default } from './collaboration';
