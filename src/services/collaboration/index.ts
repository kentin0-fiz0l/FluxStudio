/**
 * Collaboration Services
 *
 * Unified real-time collaboration for documents, designs, and messaging.
 *
 * @example
 * // Using the unified service
 * import { collaborationService } from './services/collaboration';
 *
 * collaborationService.connect();
 * collaborationService.joinAsUser(currentUser);
 * collaborationService.joinConversation(conversationId);
 *
 * @see DEBT-005: Consolidate duplicate real-time collaboration services
 */

export { CollaborationService } from './CollaborationService';

// Export all types
export type {
  CursorPosition,
  SelectionRange,
  ViewportInfo,
  PresenceUser,
  CollaboratorPresence,
  TypingIndicator,
  SessionType,
  CollaborationSession,
  EditorState,
  Operation,
  CollaborationEventType,
  CollaborationEvent,
  Comment,
  Reaction,
  ConnectionStatus,
  EventHandler,
} from './types';

// Create singleton instance
import { CollaborationService } from './CollaborationService';

const collaborationService = new CollaborationService();

// Export singleton with both names for backward compatibility
export { collaborationService };

// Alias for the messaging-focused consumers
export const realtimeCollaborationService = collaborationService;

// Default export
export default collaborationService;
