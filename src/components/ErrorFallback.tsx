/**
 * ErrorFallback Component
 * Reusable error fallback UI for error boundaries
 *
 * Provides three variants:
 * - inline: Compact error for component-level failures
 * - card: Medium-sized card for section-level failures
 * - fullpage: Full-screen error for route-level failures
 *
 * @example
 * <ErrorBoundary fallback={<ErrorFallback variant="inline" />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface ErrorFallbackProps {
  /** Error that was caught */
  error?: Error | null;
  /** Component stack trace */
  componentStack?: string | null;
  /** Variant of the error display */
  variant?: 'inline' | 'card' | 'fullpage';
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Called when retry is clicked */
  onRetry?: () => void;
  /** Called when reset is clicked */
  onReset?: () => void;
  /** Show technical details toggle */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accent color for the variant */
  accentColor?: 'red' | 'orange' | 'yellow' | 'blue' | 'purple';
}

const accentColors = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    icon: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    icon: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    icon: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    icon: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    icon: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
};

export function ErrorFallback({
  error,
  componentStack,
  variant = 'card',
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  onReset,
  showDetails = true,
  className,
  accentColor = 'red',
}: ErrorFallbackProps) {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  const colors = accentColors[accentColor];

  const copyErrorDetails = async () => {
    const errorDetails = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${componentStack || 'No component stack'}
Browser: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
    } catch {
      // Clipboard write failed silently
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onReset) {
      onReset();
    } else {
      window.location.href = '/projects';
    }
  };

  // Inline variant - minimal, for component-level errors
  if (variant === 'inline') {
    return (
      <Alert variant="destructive" className={cn('my-2', className)}>
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={handleRetry} className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Card variant - medium-sized, for section-level errors
  if (variant === 'card') {
    return (
      <Card className={cn('w-full max-w-md mx-auto', colors.border, className)}>
        <CardContent className="p-6 text-center">
          <div className={cn('w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center', colors.icon)}>
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>

          <div className="flex gap-3 justify-center">
            <Button onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleGoHome}>
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Go Home
            </Button>
          </div>

          {showDetails && error && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="text-gray-500"
                aria-expanded={detailsExpanded}
              >
                {detailsExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" aria-hidden="true" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" aria-hidden="true" />
                    Show Details
                  </>
                )}
              </Button>

              {detailsExpanded && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-left">
                  <code className="text-xs text-red-600 dark:text-red-400 break-all">
                    {error.message}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyErrorDetails}
                    className="w-full mt-2"
                  >
                    <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
                    Copy Error Details
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fullpage variant - for route-level errors
  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4', colors.bg, className)}>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', colors.icon)}>
              <AlertTriangle size={24} aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{message}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Summary */}
          {error && (
            <Alert>
              <Bug className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription className="font-mono text-sm">
                {error.message || 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRetry} className="flex-1 sm:flex-none">
              <RefreshCw size={16} className="mr-2" aria-hidden="true" />
              Try Again
            </Button>

            <Button variant="outline" onClick={handleGoHome} className="flex-1 sm:flex-none">
              <Home size={16} className="mr-2" aria-hidden="true" />
              Go Home
            </Button>

            {error && showDetails && (
              <Button variant="ghost" onClick={copyErrorDetails} className="flex-1 sm:flex-none">
                <Copy size={16} className="mr-2" aria-hidden="true" />
                Copy Error
              </Button>
            )}
          </div>

          {/* Technical Details */}
          {showDetails && error && (
            <>
              <Button
                variant="ghost"
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="w-full justify-between"
                aria-expanded={detailsExpanded}
              >
                <span>Technical Details</span>
                {detailsExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              </Button>

              {detailsExpanded && (
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Error Message</h4>
                    <code className="text-xs text-red-600 dark:text-red-400 break-all">
                      {error.message}
                    </code>
                  </div>

                  {error.stack && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <h4 className="text-sm font-medium mb-2">Stack Trace</h4>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {componentStack && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <h4 className="text-sm font-medium mb-2">Component Stack</h4>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap max-h-32">
                        {componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
            <p>
              If this problem persists, please{' '}
              <a
                href="mailto:support@fluxstudio.com"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                contact our support team
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorFallback;
