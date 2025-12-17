/**
 * Application Error Class
 *
 * Provides a consistent error type with:
 * - Error codes for programmatic handling
 * - User-friendly messages
 * - Context for debugging
 * - Serialization for logging
 *
 * @see DEBT-019: Implement Consistent Error Handling
 */

import { ErrorCode, ErrorOptions, ErrorContext, SerializedError } from './types';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode?: number;
  readonly recoverable: boolean;
  readonly userAction?: string;
  readonly context?: ErrorContext;
  readonly timestamp: Date;

  constructor(message: string, options: ErrorOptions) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.recoverable = options.recoverable ?? true;
    this.userAction = options.userAction;
    this.context = options.context;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (options.cause && options.cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }

    // Set prototype explicitly for instanceof to work
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Create a user-friendly error message
   */
  get userMessage(): string {
    switch (this.code) {
      case ErrorCode.AUTH_REQUIRED:
        return 'Please sign in to continue.';
      case ErrorCode.AUTH_EXPIRED:
        return 'Your session has expired. Please sign in again.';
      case ErrorCode.AUTH_INVALID:
        return 'Invalid credentials. Please try again.';
      case ErrorCode.AUTH_FORBIDDEN:
        return "You don't have permission to perform this action.";
      case ErrorCode.VALIDATION_FAILED:
      case ErrorCode.INVALID_INPUT:
        return this.message;
      case ErrorCode.MISSING_REQUIRED:
        return 'Please fill in all required fields.';
      case ErrorCode.NETWORK_ERROR:
        return 'Unable to connect. Please check your internet connection.';
      case ErrorCode.TIMEOUT:
        return 'The request took too long. Please try again.';
      case ErrorCode.SERVER_ERROR:
        return 'Something went wrong on our end. Please try again later.';
      case ErrorCode.NOT_FOUND:
      case ErrorCode.RESOURCE_NOT_FOUND:
        return 'The requested item was not found.';
      case ErrorCode.RATE_LIMITED:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'This service is temporarily unavailable. Please try again later.';
      case ErrorCode.RESOURCE_CONFLICT:
        return 'This item has been modified by someone else. Please refresh and try again.';
      case ErrorCode.RESOURCE_LOCKED:
        return 'This item is currently being edited by someone else.';
      case ErrorCode.CANCELLED:
        return 'The operation was cancelled.';
      case ErrorCode.OFFLINE:
        return "You're offline. Some features may be unavailable.";
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Serialize error for logging/transmission
   */
  serialize(): SerializedError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      recoverable: this.recoverable,
      userAction: this.userAction,
      context: this.context,
      stack: this.stack,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Create from HTTP response
   */
  static fromResponse(response: Response, body?: { message?: string; error?: string }): AppError {
    const message = body?.message || body?.error || response.statusText || 'Request failed';
    const code = this.statusToCode(response.status);

    return new AppError(message, {
      code,
      statusCode: response.status,
      recoverable: response.status < 500,
      context: {
        location: response.url,
      },
    });
  }

  /**
   * Create from unknown error
   */
  static from(error: unknown, context?: ErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific error types
      if (error.name === 'AbortError') {
        return new AppError('Request was cancelled', {
          code: ErrorCode.CANCELLED,
          cause: error,
          context,
        });
      }

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return new AppError('Network request failed', {
          code: ErrorCode.NETWORK_ERROR,
          cause: error,
          context,
        });
      }

      return new AppError(error.message, {
        code: ErrorCode.UNKNOWN,
        cause: error,
        context,
      });
    }

    if (typeof error === 'string') {
      return new AppError(error, {
        code: ErrorCode.UNKNOWN,
        context,
      });
    }

    return new AppError('An unknown error occurred', {
      code: ErrorCode.UNKNOWN,
      context: {
        ...context,
        metadata: { originalError: String(error) },
      },
    });
  }

  /**
   * Map HTTP status to error code
   */
  private static statusToCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.INVALID_INPUT;
      case 401:
        return ErrorCode.AUTH_REQUIRED;
      case 403:
        return ErrorCode.AUTH_FORBIDDEN;
      case 404:
        return ErrorCode.NOT_FOUND;
      case 409:
        return ErrorCode.RESOURCE_CONFLICT;
      case 422:
        return ErrorCode.VALIDATION_FAILED;
      case 423:
        return ErrorCode.RESOURCE_LOCKED;
      case 429:
        return ErrorCode.RATE_LIMITED;
      case 500:
      case 502:
      case 503:
        return ErrorCode.SERVER_ERROR;
      case 504:
        return ErrorCode.TIMEOUT;
      default:
        return status >= 500 ? ErrorCode.SERVER_ERROR : ErrorCode.API_ERROR;
    }
  }
}
