/**
 * FluxStudio Shared Types
 *
 * Common type definitions used across the application.
 */

// ============================================================================
// USER TYPES
// ============================================================================

export type UserType = "client" | "designer" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  userType: UserType;
  avatarUrl?: string;
  phone?: string;
  timezone: string;
  preferences: Record<string, unknown>;
  oauthProvider?: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends Pick<User, "id" | "name" | "email" | "avatarUrl" | "userType"> {
  color?: string;
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export type OrgRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  settings: Record<string, unknown>;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  permissions: string[];
  invitedById?: string;
  joinedAt: Date;
  isActive: boolean;
}

// ============================================================================
// TEAM TYPES
// ============================================================================

export type TeamRole = "lead" | "member" | "viewer";

export interface Team {
  id: string;
  name: string;
  description?: string;
  slug: string;
  organizationId: string;
  leadId?: string;
  settings: Record<string, unknown>;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  permissions: string[];
  joinedAt: Date;
  isActive: boolean;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export type ProjectStatus = "planning" | "active" | "on-hold" | "completed" | "cancelled";
export type ProjectRole = "manager" | "contributor" | "reviewer" | "viewer";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  organizationId: string;
  teamId?: string;
  managerId: string;
  clientId?: string;
  status: ProjectStatus;
  priority: Priority;
  projectType: string;
  serviceCategory: string;
  serviceTier: string;
  ensembleType: string;
  budget?: number;
  estimatedHours?: number;
  actualHours: number;
  startDate?: Date;
  dueDate?: Date;
  completionDate?: Date;
  metadata: Record<string, unknown>;
  settings: Record<string, unknown>;
  tags: string[];
  isTemplate: boolean;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  permissions: string[];
  hourlyRate?: number;
  joinedAt: Date;
  isActive: boolean;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  dueDate?: Date;
  completedAt?: Date;
  assignedToId?: string;
  orderIndex: number;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// FILE TYPES
// ============================================================================

export type FileCategory = "design" | "reference" | "final" | "feedback" | "other";
export type FileStatus = "draft" | "review" | "approved" | "rejected";
export type PermissionType = "read" | "write" | "delete" | "share";

export interface File {
  id: string;
  name: string;
  originalName: string;
  description?: string;
  filePath: string;
  fileUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
  category: FileCategory;
  status: FileStatus;
  version: number;
  isLatest: boolean;
  parentFileId?: string;
  projectId?: string;
  organizationId: string;
  uploadedById: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilePermission {
  id: string;
  fileId: string;
  userId?: string;
  teamId?: string;
  permissionType: PermissionType;
  grantedById: string;
  grantedAt: Date;
}

// ============================================================================
// MESSAGING TYPES
// ============================================================================

export type ConversationType = "direct" | "group" | "project" | "team";
export type ParticipantRole = "owner" | "admin" | "member";
export type MessageType = "text" | "file" | "image" | "system";
export type MessageStatus = "sent" | "delivered" | "read";

export interface Conversation {
  id: string;
  name?: string;
  description?: string;
  type: ConversationType;
  organizationId?: string;
  projectId?: string;
  teamId?: string;
  createdById: string;
  lastMessageAt?: Date;
  metadata: Record<string, unknown>;
  settings: Record<string, unknown>;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastReadAt?: Date;
  isMuted: boolean;
  isPinned: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  content?: string;
  messageType: MessageType;
  priority: Priority;
  status: MessageStatus;
  replyToId?: string;
  threadId?: string;
  mentions: string[];
  attachments: MessageAttachment[];
  metadata: Record<string, unknown>;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  type: "file" | "image" | "link";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  reaction: string;
  createdAt: Date;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  priority: Priority;
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// REALTIME TYPES
// ============================================================================

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  element?: string;
}

export interface RealtimePresence {
  clientId: number;
  user: PresenceUser;
  cursor?: CursorPosition;
  selection?: unknown;
  lastActive: number;
}
