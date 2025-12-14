/**
 * useApiError Hook
 *
 * Provides consistent API error handling across the app.
 * Handles 401/403/500/network errors with appropriate UI feedback.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { ErrorType, getErrorType } from '@/components/common/ErrorState';

export interface ApiErrorState {
  hasError: boolean;
  errorType: ErrorType;
  errorMessage: string;
}

const initialState: ApiErrorState = {
  hasError: false,
  errorType: 'generic',
  errorMessage: '',
};

/**
 * Hook for handling API errors consistently
 *
 * @example
 * const { error, handleError, clearError, isRetrying, retry } = useApiError();
 *
 * const fetchData = async () => {
 *   try {
 *     const data = await api.getData();
 *   } catch (err) {
 *     handleError(err);
 *   }
 * };
 *
 * if (error.hasError) {
 *   return <ErrorState type={error.errorType} onRetry={retry(fetchData)} />;
 * }
 */
export function useApiError() {
  const navigate = useNavigate();
  const [error, setError] = useState<ApiErrorState>(initialState);
  const [isRetrying, setIsRetrying] = useState(false);

  const clearError = useCallback(() => {
    setError(initialState);
    setIsRetrying(false);
  }, []);

  const handleError = useCallback((err: unknown, options?: {
    showToast?: boolean;
    redirectOn401?: boolean;
  }) => {
    const { showToast = true, redirectOn401 = true } = options || {};
    const errorType = getErrorType(err);
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';

    // Handle 401 - redirect to login
    if (errorType === 'unauthorized' && redirectOn401) {
      localStorage.removeItem('auth_token');
      if (showToast) {
        toast.error('Session expired', 'Please sign in again to continue.');
      }
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    // Handle 403 - show forbidden
    if (errorType === 'forbidden') {
      if (showToast) {
        toast.error('Access denied', "You don't have permission to view this.");
      }
    }

    // Handle 500 - server error
    if (errorType === 'server_error') {
      if (showToast) {
        toast.error('Server error', "We're having technical difficulties. Please try again.");
      }
    }

    // Handle network error
    if (errorType === 'network') {
      if (showToast) {
        toast.error('Connection issue', 'Please check your internet connection.');
      }
    }

    // Handle timeout
    if (errorType === 'timeout') {
      if (showToast) {
        toast.error('Request timed out', 'Please try again.');
      }
    }

    setError({
      hasError: true,
      errorType,
      errorMessage,
    });

    return errorType;
  }, [navigate]);

  /**
   * Wrap a retry function with loading state management
   */
  const retry = useCallback((retryFn: () => Promise<void>) => {
    return async () => {
      setIsRetrying(true);
      clearError();
      try {
        await retryFn();
      } catch (err) {
        handleError(err);
      } finally {
        setIsRetrying(false);
      }
    };
  }, [clearError, handleError]);

  return {
    error,
    handleError,
    clearError,
    isRetrying,
    retry,
  };
}

/**
 * Helper to determine if an error is recoverable via retry
 */
export function isRetryableError(errorType: ErrorType): boolean {
  return ['server_error', 'network', 'timeout', 'generic'].includes(errorType);
}

/**
 * Extract status code from various error formats
 */
export function getStatusFromError(error: unknown): number | null {
  if (!error) return null;

  // Check for fetch Response
  if (error instanceof Response) {
    return error.status;
  }

  // Check for object with status
  if (typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status;
  }

  // Check error message for status codes
  if (error instanceof Error) {
    const match = error.message.match(/\b(401|403|404|500|502|503|504)\b/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

export default useApiError;
