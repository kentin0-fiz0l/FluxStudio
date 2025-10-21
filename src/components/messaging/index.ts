/**
 * Messaging Components Export Index
 * Central export point for all messaging-related components
 */

// Main Components
export { default as MessagingDashboard } from './MessagingDashboard';
export { default as MessageInterface } from './MessageInterface';
export { default as ConversationList } from './ConversationList';
export { default as NotificationCenter } from './NotificationCenter';

// Message Components
export { default as MessageBubble } from './MessageBubble';
export { default as TypingIndicator } from './TypingIndicator';
export { default as FileUploadButton } from './FileUploadButton';

// Dialog Components
export { default as CreateConversationDialog } from './CreateConversationDialog';
export { default as MessageSearchDialog } from './MessageSearchDialog';

// Feature Components
export { default as UserPresenceIndicator } from './UserPresenceIndicator';
export { default as ImageAnnotationTool } from './ImageAnnotationTool';
export { default as QuickChatActions } from './QuickChatActions';

// Context
export { MessagingProvider, useMessaging } from '../../contexts/MessagingContext';

// Types (re-export for convenience)
export type {
  Message,
  Conversation,
  Notification,
  MessageUser,
  MessageType,
  ConversationType,
  NotificationType,
  Priority,
  MessageAttachment,
  ImageAnnotation,
  DesignReview,
  ConsultationSession,
} from '../../types/messaging';