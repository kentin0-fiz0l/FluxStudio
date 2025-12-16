/**
 * Collaboration Types
 * Unified type definitions for all real-time collaboration features
 */

import { MessageUser } from '../../types/messaging';

// ============================================================================
// Common Types
// ============================================================================

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  timestamp: number;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
  text?: string;
}

export interface ViewportInfo {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  zoom: number;
}

// ============================================================================
// Presence Types
// ============================================================================

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: CursorPosition;
  isTyping: boolean;
  lastSeen: Date;
  currentView?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  device: 'desktop' | 'mobile' | 'tablet';
}

export interface CollaboratorPresence extends PresenceUser {
  userId: string;
  user: MessageUser;
  selection?: SelectionRange;
  viewport?: ViewportInfo;
  location?: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
  isTyping: boolean;
}

// ============================================================================
// Session Types (Document/Design Collaboration)
// ============================================================================

export type SessionType = 'project' | 'document' | 'design' | 'review';

export interface CollaborationSession {
  id: string;
  type: SessionType;
  resourceId: string;
  participants: CollaboratorPresence[];
  activeEditors: Map<string, EditorState>;
  sharedCursor: boolean;
  sharedSelection: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface EditorState {
  userId: string;
  documentId: string;
  content: string;
  operations: Operation[];
  version: number;
  lastModified: Date;
}

export interface Operation {
  type: 'insert' | 'delete' | 'format' | 'move';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, unknown>;
  userId: string;
  timestamp: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type CollaborationEventType =
  | 'join'
  | 'leave'
  | 'cursor'
  | 'selection'
  | 'edit'
  | 'comment'
  | 'reaction'
  | 'cursor_move'
  | 'user_join'
  | 'user_leave'
  | 'typing_start'
  | 'typing_stop'
  | 'annotation_add'
  | 'annotation_update'
  | 'annotation_delete'
  | 'message_send'
  | 'view_change';

export interface CollaborationEvent {
  type: CollaborationEventType;
  userId: string;
  sessionId?: string;
  conversationId?: string;
  data: unknown;
  timestamp: Date;
}

export interface Comment {
  id: string;
  text: string;
  position?: CursorPosition;
  userId: string;
  timestamp: Date;
}

export interface Reaction {
  emoji: string;
  targetId: string;
  userId: string;
  timestamp: Date;
}

// ============================================================================
// Connection Types
// ============================================================================

export interface ConnectionStatus {
  connected: boolean;
  offline?: boolean;
  reconnecting?: boolean;
  error?: string;
}

export type EventHandler<T = unknown> = (data: T) => void;
