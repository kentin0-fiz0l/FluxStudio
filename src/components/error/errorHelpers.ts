/**
 * Pure helper functions for error classification and formatting.
 */

const RETRYABLE_PATTERNS = [
  /ChunkLoadError/,
  /Loading chunk \d+ failed/,
  /Failed to fetch/,
  /NetworkError/,
  /TypeError: Failed to fetch/,
];

export function isRetryableError(error: Error | null): boolean {
  if (!error) return false;

  return RETRYABLE_PATTERNS.some(
    (pattern) => pattern.test(error.message) || pattern.test(error.name)
  );
}

export function getErrorCategory(error: Error | null): string {
  if (!error) return 'Unknown';

  if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
    return 'Loading Error';
  }
  if (error.message.includes('Network') || error.message.includes('fetch')) {
    return 'Network Error';
  }
  if (error.name === 'TypeError') {
    return 'Type Error';
  }
  if (error.name === 'ReferenceError') {
    return 'Reference Error';
  }

  return 'Application Error';
}

export function getSeverityLevel(
  error: Error | null
): 'low' | 'medium' | 'high' | 'critical' {
  if (!error) return 'medium';

  if (isRetryableError(error)) return 'low';
  if (error.name === 'TypeError' || error.name === 'ReferenceError') return 'high';

  return 'medium';
}

export function formatErrorDetails(
  error: Error | null,
  componentStack: string | null | undefined
): string {
  return `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${componentStack}
Browser: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
  `.trim();
}
