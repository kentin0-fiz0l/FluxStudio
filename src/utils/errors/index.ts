/**
 * Error Handling Module
 *
 * Provides consistent error handling across the application.
 *
 * @example
 * // Wrap async operations
 * const [result, error] = await tryCatch(fetchUser(id));
 * if (error) {
 *   showToast({ type: 'error', message: error.userMessage });
 *   return;
 * }
 *
 * // Create typed errors
 * throw createError('User not found', ErrorCode.NOT_FOUND);
 *
 * @see DEBT-019: Implement Consistent Error Handling
 */

export { AppError } from './AppError';
export { ErrorCode } from './types';
export type { ErrorContext, ErrorOptions, SerializedError } from './types';

import { AppError } from './AppError';
import { ErrorCode, ErrorContext } from './types';

/**
 * Result type for tryCatch
 */
export type Result<T, E = AppError> = [T, null] | [null, E];

/**
 * Wrap async operations with error handling
 *
 * @example
 * const [user, error] = await tryCatch(api.getUser(id));
 */
export async function tryCatch<T>(
  promise: Promise<T>,
  context?: ErrorContext
): Promise<Result<T>> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    return [null, AppError.from(error, context)];
  }
}

/**
 * Wrap sync operations with error handling
 */
export function tryCatchSync<T>(fn: () => T, context?: ErrorContext): Result<T> {
  try {
    const result = fn();
    return [result, null];
  } catch (error) {
    return [null, AppError.from(error, context)];
  }
}

/**
 * Create a typed AppError
 */
export function createError(
  message: string,
  code: ErrorCode,
  options?: Partial<Omit<import('./types').ErrorOptions, 'code'>>
): AppError {
  return new AppError(message, { code, ...options });
}

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.recoverable;
  }
  return true;
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof AppError && error.code === code;
}

/**
 * Check if error requires authentication
 */
export function requiresAuth(error: unknown): boolean {
  if (error instanceof AppError) {
    return [ErrorCode.AUTH_REQUIRED, ErrorCode.AUTH_EXPIRED, ErrorCode.AUTH_INVALID].includes(
      error.code
    );
  }
  return false;
}

/**
 * Check if error is a network issue
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT, ErrorCode.OFFLINE].includes(error.code);
  }
  return false;
}

/**
 * Get user-friendly message from any error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * Assert condition or throw error
 */
export function assertOrThrow(
  condition: boolean,
  message: string,
  code: ErrorCode = ErrorCode.VALIDATION_FAILED
): asserts condition {
  if (!condition) {
    throw new AppError(message, { code });
  }
}

/**
 * Assert value is defined or throw error
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string,
  code: ErrorCode = ErrorCode.NOT_FOUND
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AppError(message, { code });
  }
}

// Default export
export default {
  AppError,
  ErrorCode,
  tryCatch,
  tryCatchSync,
  createError,
  isRecoverable,
  isErrorCode,
  requiresAuth,
  isNetworkError,
  getUserMessage,
  assertOrThrow,
  assertDefined,
};
