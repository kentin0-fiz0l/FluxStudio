/**
 * Messaging and Communication Types for Flux Studio
 * Comprehensive data models for messages, conversations, notifications, and communication workflows
 */

// Base user reference for messaging
export interface MessageUser {
  id: string;
  name: string;
  email?: string;
  userType: 'client' | 'designer' | 'admin';
  avatar?: string;
  color?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

// Priority levels for messages and notifications
export type Priority = 'critical' | 'high' | 'medium' | 'low';

// Message types for different communication scenarios
export type MessageType =
  | 'text'           // Regular text message
  | 'file'           // File attachment
  | 'image'          // Image with optional annotation
  | 'voice'          // Voice note
  | 'video'          // Video message
  | 'system'         // System-generated message
  | 'announcement'   // Broadcast announcement
  | 'milestone'      // Project milestone celebration
  | 'approval'       // Design approval workflow
  | 'feedback'       // Design feedback with annotations
  | 'consultation';  // Consultation session notes

// Conversation types for different communication contexts
export type ConversationType =
  | 'direct'         // 1:1 conversation
  | 'project'        // Project-specific channel
  | 'team'           // Team collaboration space
  | 'consultation'   // Consultation session room
  | 'support'        // Support/help conversation
  | 'broadcast';     // One-to-many announcements

// Message status for delivery and read receipts
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// File attachment interface
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  isImage: boolean;
  isVideo: boolean;
  annotations?: ImageAnnotation[];
  uploadedAt: Date;
  uploadedBy: string;
}

// Image annotation for design feedback
export interface ImageAnnotation {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  type: 'point' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand';
  color: string;
  content: string;
  createdBy: MessageUser;
  createdAt: Date;
  path?: Array<{ x: number; y: number }>;
}

// Core message interface
export interface Message {
  id: string;
  conversationId: string;
  type: MessageType;
  content: string;
  author: MessageUser;
  replyTo?: string; // ID of message being replied to
  mentions?: string[]; // User IDs mentioned in message
  attachments?: MessageAttachment[];
  annotations?: ImageAnnotation[];
  metadata?: {
    priority?: Priority;
    tags?: string[];
    projectId?: string;
    milestoneId?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'needs-revision';
    consultationId?: string;
    systemAction?: string;
    messageType?: string;
    oldStatus?: string;
    newStatus?: string;
  };
  status: MessageStatus;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Thread support
  threadId?: string;
  isThreadRoot?: boolean;
  replyCount?: number;
  lastReplyAt?: Date;
}

// Conversation interface
export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  description?: string;
  participants: MessageUser[];
  projectId?: string;
  organizationId?: string;
  teamId?: string;

  // Metadata
  metadata: {
    isArchived: boolean;
    isMuted: boolean;
    isPinned: boolean;
    priority: Priority;
    tags: string[];
    color?: string;
    icon?: string;
  };

  // Latest activity
  lastMessage?: Message;
  lastActivity: Date;
  unreadCount: number;

  // Permissions
  permissions: {
    canWrite: boolean;
    canAddMembers: boolean;
    canArchive: boolean;
    canDelete: boolean;
  };

  createdBy: MessageUser;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced notification types
export type NotificationType =
  | 'message'          // New message received
  | 'mention'          // User mentioned in message
  | 'file_shared'      // File shared in conversation
  | 'approval_request' // Design approval needed
  | 'approval_status'  // Approval status changed
  | 'milestone'        // Project milestone reached
  | 'consultation'     // Consultation scheduled/started
  | 'deadline'         // Project deadline approaching
  | 'system'           // System notifications
  | 'announcement'     // Broadcast announcements
  | 'invitation'       // Team/project invitation
  | 'comment'          // Comment on file/design
  | 'activity';        // General activity updates

// Enhanced notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  priority: Priority;
  title: string;
  message: string;
  summary?: string; // Brief one-line summary

  // Associated data
  messageId?: string;
  conversationId?: string;
  projectId?: string;
  userId?: string;
  fileId?: string;

  // Rich content
  avatar?: string;
  thumbnail?: string;
  actions?: NotificationAction[];

  // State
  isRead: boolean;
  isArchived: boolean;
  isSnoozed: boolean;
  snoozeUntil?: Date;

  // Metadata
  metadata?: {
    tags?: string[];
    category?: string;
    source?: string;
    relatedUsers?: MessageUser[];
    autoExpire?: Date;
  };

  createdAt: Date;
  readAt?: Date;

  // Grouping support
  groupId?: string;
  groupCount?: number;
  isGrouped?: boolean;
}

// Notification actions (quick reply, approve, etc.)
export interface NotificationAction {
  id: string;
  type: 'button' | 'link' | 'input' | 'select';
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  action: string;
  data?: Record<string, any>;
  icon?: string;
}

// Message context for threading and organization
export interface MessageContext {
  projectId?: string;
  projectName?: string;
  fileId?: string;
  fileName?: string;
  milestoneId?: string;
  milestoneName?: string;
  consultationId?: string;
  consultationTopic?: string;
}

// Typing indicator for real-time communication
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  lastUpdate: Date;
}

// Online presence for users
export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  currentActivity?: string;
  isTyping?: boolean;
  isOnline?: boolean;
}

// Message search and filtering
export interface MessageSearchOptions {
  query?: string;
  conversationId?: string;
  authorId?: string;
  messageType?: MessageType;
  hasAttachments?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  priority?: Priority;
  isUnread?: boolean;
  limit?: number;
  offset?: number;
}

// Conversation filter options
export interface ConversationFilter {
  type?: ConversationType;
  priority?: Priority;
  hasUnread?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  projectId?: string;
  participantId?: string;
  tags?: string[];
}

// Real-time event types
export type RealtimeEventType =
  | 'message_sent'
  | 'message_updated'
  | 'message_deleted'
  | 'user_typing'
  | 'user_online'
  | 'user_offline'
  | 'conversation_created'
  | 'conversation_updated'
  | 'participant_added'
  | 'participant_removed'
  | 'notification_created';

// Real-time event payload
export interface RealtimeEvent {
  type: RealtimeEventType;
  conversationId?: string;
  userId?: string;
  data: any;
  timestamp: Date;
}

// Communication analytics
export interface CommunicationMetrics {
  responseTime: {
    average: number;
    median: number;
    percentile95: number;
  };
  messageVolume: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  userEngagement: {
    activeUsers: number;
    messagesPerUser: number;
    conversationsPerUser: number;
  };
  projectCommunication: {
    projectId: string;
    messageCount: number;
    participantCount: number;
    lastActivity: Date;
    responseRate: number;
  }[];
  satisfaction: {
    rating: number;
    feedback: string[];
  };
}

// Design review workflow
export interface DesignReview {
  id: string;
  messageId: string;
  fileId: string;
  projectId: string;
  reviewType: 'initial' | 'revision' | 'final' | 'approval';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';

  reviewer: MessageUser;
  assignedTo: MessageUser[];

  feedback: {
    overall: string;
    annotations: ImageAnnotation[];
    suggestions: string[];
    approved: boolean;
    rating?: number;
  };

  deadline?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// Consultation session
export interface ConsultationSession {
  id: string;
  title: string;
  description: string;
  type: 'one-on-one' | 'group' | 'workshop' | 'review';

  participants: MessageUser[];
  facilitator: MessageUser;

  scheduledAt: Date;
  duration: number; // minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

  conversationId?: string;
  recordingUrl?: string;
  notes?: string;

  agenda: string[];
  outcomes: string[];
  followUpTasks: string[];

  createdAt: Date;
  updatedAt: Date;
}