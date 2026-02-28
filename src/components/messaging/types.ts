/**
 * Messaging Component Types
 * UI-focused types for the messaging components
 * Complements src/types/messaging.ts with component-specific interfaces
 */

// Re-export relevant types from global messaging types
export type { MessageStatus, Priority } from '../../types/messaging';

// UI-focused user interface (simpler than global MessageUser)
export interface MessageUser {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

// Attachment for display in messages
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  size: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

// Link preview data
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

// Reaction count display
export interface ReactionCount {
  emoji: string;
  count: number;
  userIds: string[];
}

// Asset attached to a message
export interface MessageAsset {
  id: string;
  name: string;
  kind: 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';
  ownerId?: string;
  organizationId?: string;
  description?: string;
  createdAt?: string;
  file: {
    id: string;
    name: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    url: string;
    thumbnailUrl?: string;
    storageKey?: string;
  };
}

// Voice message data
export interface VoiceMessage {
  duration: number;
  waveform: number[];
  url: string;
}

// Reply context for quoted messages
export interface ReplyContext {
  id: string;
  content: string;
  author: MessageUser;
}

// Core message interface for UI
export interface Message {
  id: string;
  content: string;
  author: MessageUser;
  timestamp: Date;
  isCurrentUser: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEdited?: boolean;
  editedAt?: Date;
  editHistory?: Array<{ content: string; editedAt: string }>;
  isDeleted?: boolean;
  isSystemMessage?: boolean;
  replyTo?: ReplyContext;
  attachments?: MessageAttachment[];
  asset?: MessageAsset | null;
  linkPreviews?: LinkPreview[];
  reactions?: ReactionCount[];
  isPinned?: boolean;
  isForwarded?: boolean;
  voiceMessage?: VoiceMessage;
  threadReplyCount?: number;
  threadRootMessageId?: string | null;
  threadLastReplyAt?: Date;
  readBy?: Array<{ id: string; name: string; avatar?: string }>;
}

// Conversation for UI display
export interface Conversation {
  id: string;
  title: string;
  type: 'direct' | 'group' | 'channel';
  participant: MessageUser;
  participants?: MessageUser[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isTyping?: boolean;
  typingUsers?: string[];
  projectId?: string | null;
  projectName?: string | null;
}

// Filter types for conversation list
export type ConversationFilter = 'all' | 'unread' | 'archived' | 'starred' | 'muted';

// API response type for conversation list
export interface ConversationListItem {
  id: string;
  organizationId: string | null;
  name: string | null;
  isGroup: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  projectId?: string | null;
  projectName?: string | null;
  members?: Array<{
    id: string;
    conversationId: string;
    userId: string;
    role: string;
    user?: {
      id: string;
      email: string;
      name?: string;
    };
  }>;
}

// Pending attachment during upload
export interface PendingAttachment {
  id: string;
  file: File;
  preview?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
  assetId?: string;
  asset?: MessageAsset;
}

// Typing user indicator
export interface TypingUser {
  userId: string;
  userEmail: string;
  userName?: string;
  conversationId: string;
}

// Read receipt data
export interface ReadReceipt {
  userId: string;
  userName: string;
  readAt: Date;
}

// Send message options
export interface SendMessageOptions {
  replyToMessageId?: string;
  assetId?: string;
  projectId?: string;
}

// Message UI state
export interface MessageUIState {
  isEditing: boolean;
  isHighlighted: boolean;
  isGrouped: boolean;
  isPinned: boolean;
}

// Emoji categories for picker
export const EMOJI_CATEGORIES = {
  recent: ['👍', '❤️', '😂', '🎉', '🔥', '👏', '😍', '🙌'],
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥'],
  gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🙏', '🤝', '👏', '🙌'],
  objects: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '⭐', '🌟', '✨', '💫', '🔥', '💥', '💢', '💦', '💨', '🎉', '🎊'],
  nature: ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', '🦀', '🦞', '🦐', '🦑', '🌍', '🌎']
} as const;

// Quick reaction emojis
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👏'] as const;
