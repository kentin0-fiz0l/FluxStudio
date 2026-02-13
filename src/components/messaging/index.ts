/**
 * Messaging Components Export Index
 * Central export point for all messaging-related components
 */

// Core Components
export { ChatMessageBubble, ChatAvatar } from './ChatMessageBubble';

export { MessageComposer } from './MessageComposer';
export type { MessageComposerProps } from './MessageComposer';

export { ConversationSidebar, ConversationItem, EmptyMessagesState } from './ConversationSidebar';
export type { ConversationSidebarProps, ConversationItemProps, EmptyMessagesStateProps } from './ConversationSidebar';

export { ChatPanel, EmptyChatState } from './ChatPanel';
export type { ChatPanelProps, ChatPanelRef } from './ChatPanel';

export { PinnedMessagesPanel } from './PinnedMessagesPanel';
export type { PinnedMessagesPanelProps } from './PinnedMessagesPanel';

export { ChatMessageList } from './ChatMessageList';
export type { ChatMessageListProps, ChatMessageListRef } from './ChatMessageList';

export { ChatInputArea } from './ChatInputArea';
export type { ChatInputAreaProps } from './ChatInputArea';

export { NewConversationDialog } from './NewConversationDialog';
export type { NewConversationDialogProps } from './NewConversationDialog';

export { ForwardMessageDialog } from './ForwardMessageDialog';
export type { ForwardMessageDialogProps } from './ForwardMessageDialog';

export { ChatSidebar } from './ChatSidebar';
export type { ChatSidebarProps } from './ChatSidebar';

export { ChatHeader } from './ChatHeader';
export type { ChatHeaderProps } from './ChatHeader';

export { MessageListView } from './MessageListView';
export type { MessageListViewProps, MessageListViewRef } from './MessageListView';

export { default as ThreadPanel } from './ThreadPanel';

// Local types and utilities
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
