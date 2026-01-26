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

// NEW: Refactored Components (MessagesNew.tsx extraction)
export { ChatMessageBubble, ChatAvatar } from './ChatMessageBubble';
export type { ChatMessageBubbleProps } from './ChatMessageBubble';

export { MessageComposer } from './MessageComposer';
export type { MessageComposerProps } from './MessageComposer';

export { ConversationSidebar, ConversationItem, EmptyMessagesState } from './ConversationSidebar';
export type { ConversationSidebarProps, ConversationItemProps, EmptyMessagesStateProps } from './ConversationSidebar';

export { ChatPanel, PinnedMessagesPanel, EmptyChatState } from './ChatPanel';
export type { ChatPanelProps, ChatPanelRef } from './ChatPanel';

export { NewConversationDialog } from './NewConversationDialog';
export type { NewConversationDialogProps } from './NewConversationDialog';

export { ForwardMessageDialog } from './ForwardMessageDialog';
export type { ForwardMessageDialogProps } from './ForwardMessageDialog';

export { default as ThreadPanel } from './ThreadPanel';

// NEW: Local types and utilities (explicitly named to avoid conflicts)
export {
  EMOJI_CATEGORIES,
  type PendingAttachment,
  type ReplyContext,
  type ConversationFilter,
} from './types';

export {
  formatTime,
  formatFileSize,
  getInitials,
  QUICK_REACTIONS,
} from './utils';

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