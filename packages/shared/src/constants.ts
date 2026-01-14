/**
 * FluxStudio Shared Constants
 *
 * Common constants used across the application.
 */

// ============================================================================
// USER ROLES & TYPES
// ============================================================================

export const USER_TYPES = {
  CLIENT: "client",
  DESIGNER: "designer",
  ADMIN: "admin",
} as const;

export const ORG_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export const TEAM_ROLES = {
  LEAD: "lead",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export const PROJECT_ROLES = {
  MANAGER: "manager",
  CONTRIBUTOR: "contributor",
  REVIEWER: "reviewer",
  VIEWER: "viewer",
} as const;

// ============================================================================
// PROJECT STATUS & PRIORITY
// ============================================================================

export const PROJECT_STATUSES = {
  PLANNING: "planning",
  ACTIVE: "active",
  ON_HOLD: "on-hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PRIORITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

export const PRIORITY_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
} as const;

// ============================================================================
// FILE CATEGORIES & STATUS
// ============================================================================

export const FILE_CATEGORIES = {
  DESIGN: "design",
  REFERENCE: "reference",
  FINAL: "final",
  FEEDBACK: "feedback",
  OTHER: "other",
} as const;

export const FILE_STATUSES = {
  DRAFT: "draft",
  REVIEW: "review",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const PERMISSION_TYPES = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
  SHARE: "share",
} as const;

// ============================================================================
// MESSAGING
// ============================================================================

export const CONVERSATION_TYPES = {
  DIRECT: "direct",
  GROUP: "group",
  PROJECT: "project",
  TEAM: "team",
} as const;

export const MESSAGE_TYPES = {
  TEXT: "text",
  FILE: "file",
  IMAGE: "image",
  SYSTEM: "system",
} as const;

export const MESSAGE_STATUSES = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
} as const;

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================

export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  TRIALING: "trialing",
} as const;

// ============================================================================
// INVOICE STATUS
// ============================================================================

export const INVOICE_STATUSES = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

// ============================================================================
// ENSEMBLE TYPES
// ============================================================================

export const ENSEMBLE_TYPES = {
  MARCHING_BAND: "marching_band",
  DRUM_CORPS: "drum_corps",
  WINTER_GUARD: "winter_guard",
  INDOOR_PERCUSSION: "indoor_percussion",
  WIND_ENSEMBLE: "wind_ensemble",
  SYMPHONY_ORCHESTRA: "symphony_orchestra",
  JAZZ_ENSEMBLE: "jazz_ensemble",
  CONCERT_CHOIR: "concert_choir",
  SHOW_CHOIR: "show_choir",
  OTHER: "other",
} as const;

// ============================================================================
// SERVICE CATEGORIES
// ============================================================================

export const SERVICE_CATEGORIES = {
  DRILL_DESIGN: "drill_design",
  MUSIC_ARRANGEMENT: "music_arrangement",
  VISUAL_DESIGN: "visual_design",
  COSTUME_DESIGN: "costume_design",
  PROPS_DESIGN: "props_design",
  FLAG_DESIGN: "flag_design",
  CONSULTATION: "consultation",
  FULL_SHOW_PACKAGE: "full_show_package",
} as const;

export const SERVICE_TIERS = {
  BASIC: "basic",
  STANDARD: "standard",
  PREMIUM: "premium",
  CUSTOM: "custom",
} as const;

// ============================================================================
// COLORS
// ============================================================================

export const BRAND_COLORS = {
  PRIMARY: "#6366f1",
  SECONDARY: "#8b5cf6",
  ACCENT: "#f59e0b",
  SUCCESS: "#10b981",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  INFO: "#3b82f6",
} as const;

export const PRESENCE_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
] as const;

export const STATUS_COLORS = {
  planning: "#6366f1",
  active: "#22c55e",
  "on-hold": "#f59e0b",
  completed: "#10b981",
  cancelled: "#6b7280",
} as const;

export const PRIORITY_COLORS = {
  low: "#6b7280",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
} as const;

// ============================================================================
// LIMITS
// ============================================================================

export const LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_AVATAR_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ATTACHMENTS: 10,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_PROJECT_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_SLUG_LENGTH: 100,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS: 20,
  PAGINATION_DEFAULT: 20,
  PAGINATION_MAX: 100,
} as const;

// ============================================================================
// MIME TYPES
// ============================================================================

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
] as const;

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  AUTH: "/api/auth",
  USERS: "/api/users",
  ORGANIZATIONS: "/api/organizations",
  TEAMS: "/api/teams",
  PROJECTS: "/api/projects",
  FILES: "/api/files",
  MESSAGES: "/api/messages",
  CONVERSATIONS: "/api/conversations",
  NOTIFICATIONS: "/api/notifications",
  INVOICES: "/api/invoices",
  TIME_ENTRIES: "/api/time-entries",
} as const;

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

export const WS_EVENTS = {
  // Connection
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Document
  DOC_SYNC: "doc:sync",
  DOC_UPDATE: "doc:update",

  // Presence
  PRESENCE_UPDATE: "presence:update",
  CURSOR_UPDATE: "cursor:update",
  SELECTION_UPDATE: "selection:update",

  // Messages
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATE: "message:update",
  MESSAGE_DELETE: "message:delete",
  MESSAGE_REACTION: "message:reaction",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Notifications
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_READ: "notification:read",
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Authentication
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED: "MISSING_REQUIRED",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate Limiting
  RATE_LIMITED: "RATE_LIMITED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",

  // File
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  UPLOAD_FAILED: "UPLOAD_FAILED",
} as const;
