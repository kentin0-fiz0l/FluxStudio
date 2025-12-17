/**
 * Error Types
 * Centralized error type definitions
 */

export enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',

  // Validation errors (2xxx)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED = 'MISSING_REQUIRED',

  // Network errors (3xxx)
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',

  // API errors (4xxx)
  API_ERROR = 'API_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Resource errors (5xxx)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',

  // Client errors (6xxx)
  UNKNOWN = 'UNKNOWN',
  CANCELLED = 'CANCELLED',
  OFFLINE = 'OFFLINE',
}

export interface ErrorContext {
  /** Where the error occurred */
  location?: string;
  /** User action that triggered the error */
  action?: string;
  /** Related entity ID */
  entityId?: string;
  /** Related entity type */
  entityType?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ErrorOptions {
  /** Error code for programmatic handling */
  code: ErrorCode;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Whether the error is recoverable */
  recoverable?: boolean;
  /** Suggested user action */
  userAction?: string;
  /** Original error if wrapping */
  cause?: Error;
  /** Additional context */
  context?: ErrorContext;
}

export interface SerializedError {
  name: string;
  message: string;
  code: ErrorCode;
  statusCode?: number;
  recoverable: boolean;
  userAction?: string;
  context?: ErrorContext;
  stack?: string;
  timestamp: string;
}
