/**
 * Comprehensive Error Boundary System
 * Handles errors gracefully with recovery options
 *
 * Integrated with observability layer for error tracking and correlation.
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Bug,
  Mail,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { observability } from '../../services/observability';
import { createLogger } from '../../lib/logger';

// Re-export ErrorFallback for convenience
export { ErrorFallback } from '../ErrorFallback';
export type { ErrorFallbackProps } from '../ErrorFallback';

const boundaryLogger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolateComponent?: boolean;
  retryable?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logError(error, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    // Log to structured logger
    boundaryLogger.error('Error Boundary caught an error', error, { componentStack: errorInfo.componentStack });

    // Send to observability layer for tracking and correlation
    observability.errors.captureFromBoundary(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });

    // Mark in session for replay correlation
    observability.session.mark('error_boundary_triggered', {
      errorName: error.name,
      errorMessage: error.message,
      url: window.location.href,
    });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });

      // Auto-retry with exponential backoff for certain errors
      if (this.isRetryableError()) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        this.retryTimeoutId = window.setTimeout(() => {
          this.forceUpdate();
        }, delay);
      }
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private copyErrorDetails = async () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Browser: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      // Show toast notification
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  private isRetryableError = (): boolean => {
    const { error } = this.state;
    if (!error) return false;

    // Retry for network errors, chunk loading errors, etc.
    const retryablePatterns = [
      /ChunkLoadError/,
      /Loading chunk \d+ failed/,
      /Failed to fetch/,
      /NetworkError/,
      /TypeError: Failed to fetch/
    ];

    return retryablePatterns.some(pattern =>
      pattern.test(error.message) || pattern.test(error.name)
    );
  };

  private getErrorCategory = (): string => {
    const { error } = this.state;
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
  };

  private getSeverityLevel = (): 'low' | 'medium' | 'high' | 'critical' => {
    const { error } = this.state;
    if (!error) return 'medium';

    if (this.isRetryableError()) return 'low';
    if (error.name === 'TypeError' || error.name === 'ReferenceError') return 'high';

    return 'medium';
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, showDetails } = this.state;

    if (!showDetails) return null;

    return (
      <div className="mt-4 space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">Error Message</h4>
          <code className="text-xs text-red-600 break-all">
            {error?.message}
          </code>
        </div>

        {error?.stack && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Stack Trace</h4>
            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-32">
              {error.stack}
            </pre>
          </div>
        )}

        {errorInfo?.componentStack && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Component Stack</h4>
            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-32">
              {errorInfo.componentStack}
            </pre>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={this.copyErrorDetails}
          className="w-full"
        >
          <Copy size={14} className="mr-2" aria-hidden="true" />
          Copy Error Details
        </Button>
      </div>
    );
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, isolateComponent, retryable = true } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const errorCategory = this.getErrorCategory();
      const severity = this.getSeverityLevel();
      const isRetryable = this.isRetryableError();
      const maxRetries = 3;
      const canRetry = retryable && retryCount < maxRetries;

      // For isolated components, show minimal error UI
      if (isolateComponent) {
        return (
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Component Error</AlertTitle>
            <AlertDescription>
              This component encountered an error. {canRetry && 'Trying to recover...'}
            </AlertDescription>
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="mt-2"
              >
                <RefreshCw size={14} className="mr-2" aria-hidden="true" />
                Retry
              </Button>
            )}
          </Alert>
        );
      }

      // Full error page
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    severity === 'critical' && "bg-red-100 text-red-600",
                    severity === 'high' && "bg-orange-100 text-orange-600",
                    severity === 'medium' && "bg-yellow-100 text-yellow-600",
                    severity === 'low' && "bg-blue-100 text-blue-600"
                  )}>
                    <AlertTriangle size={24} aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Oops! Something went wrong
                    </CardTitle>
                    <p className="text-gray-600 mt-1">
                      We encountered an unexpected error. Don't worry, we're on it!
                    </p>
                  </div>
                </div>
                <Badge variant={severity === 'critical' ? 'error' : 'secondary'}>
                  {errorCategory}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Summary */}
              <Alert>
                <Bug className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription>
                  {error?.message || 'An unknown error occurred'}
                  {retryCount > 0 && (
                    <span className="text-sm text-gray-500 block mt-1">
                      Retry attempt: {retryCount}/{maxRetries}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Auto-recovery info */}
              {isRetryable && (
                <Alert>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Auto Recovery</AlertTitle>
                  <AlertDescription>
                    This appears to be a temporary issue. The system will automatically attempt to recover.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="flex-1 sm:flex-none">
                    <RefreshCw size={16} className="mr-2" aria-hidden="true" />
                    Try Again
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw size={16} className="mr-2" aria-hidden="true" />
                  Reload Page
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1 sm:flex-none"
                >
                  <Home size={16} className="mr-2" aria-hidden="true" />
                  Go Home
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => window.open('mailto:support@fluxstudio.com?subject=Error Report')}
                  className="flex-1 sm:flex-none"
                >
                  <Mail size={16} className="mr-2" aria-hidden="true" />
                  Report Issue
                </Button>
              </div>

              {/* Toggle Details */}
              <Button
                variant="ghost"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="w-full justify-between"
              >
                <span>Technical Details</span>
                {this.state.showDetails ?
                  <ChevronDown size={16} aria-hidden="true" /> :
                  <ChevronRight size={16} aria-hidden="true" />
                }
              </Button>

              {this.renderErrorDetails()}

              {/* Help Text */}
              <div className="text-center text-sm text-gray-500 pt-4 border-t">
                <p>
                  If this problem persists, please{' '}
                  <a
                    href="mailto:support@fluxstudio.com"
                    className="text-blue-600 hover:underline"
                  >
                    contact our support team
                  </a>
                  {' '}with the error details above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Specialized error boundaries for different features
export function MessagingErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      onError={(error) => {
        boundaryLogger.error('Messaging error', error);
        // Log messaging-specific metrics
      }}
      fallback={
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Messaging Unavailable</AlertTitle>
          <AlertDescription>
            Unable to load messaging. Please refresh the page or try again later.
          </AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function WorkflowErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      onError={(error) => {
        boundaryLogger.error('Workflow error', error);
        // Log workflow-specific metrics
      }}
      fallback={
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Workflow Engine Error</AlertTitle>
          <AlertDescription>
            Workflow features are temporarily unavailable. Core functionality remains accessible.
          </AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function CollaborationErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable={true}
      onError={(error) => {
        boundaryLogger.error('Collaboration error', error);
        // Log collaboration-specific metrics
      }}
      fallback={
        <Alert>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Collaboration Features Limited</AlertTitle>
          <AlertDescription>
            Real-time collaboration is temporarily unavailable. You can continue working normally.
          </AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// Page-level error boundaries for route isolation
export function FilesErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        boundaryLogger.error('Files page error', error);
      }}
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Files Unavailable</h3>
              <p className="text-gray-600 mb-4">
                We're having trouble loading your files. Please try again.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reload
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/projects'}>
                  <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                  Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function ToolsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        boundaryLogger.error('Tools page error', error);
      }}
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Tools Unavailable</h3>
              <p className="text-gray-600 mb-4">
                We're having trouble loading this tool. Please try again.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reload
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/tools'}>
                  All Tools
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function ProjectsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        boundaryLogger.error('Projects page error', error);
      }}
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Projects Unavailable</h3>
              <p className="text-gray-600 mb-4">
                We're having trouble loading your projects. Please try again.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reload
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function FormationEditorErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => {
        boundaryLogger.error('Formation editor error', error);
      }}
      fallback={
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-orange-500 mb-3" aria-hidden="true" />
          <h4 className="font-semibold text-neutral-900 dark:text-white mb-1">Formation Editor Error</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            The canvas encountered an error. Your work has been preserved.
          </p>
          <Button size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Reload Editor
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function AIErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => {
        boundaryLogger.error('AI panel error', error);
      }}
      fallback={
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" aria-hidden="true" />
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">AI Assistant Unavailable</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            The AI features encountered an error. Please try again.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export function FileUploadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      isolateComponent
      retryable
      onError={(error) => {
        boundaryLogger.error('File upload error', error);
      }}
      fallback={
        <Alert>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>
            File upload failed. Please try uploading again.
          </AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * RouteErrorBoundary - for use with React Router's errorElement
 * Catches errors during route rendering/loading and shows a recovery UI.
 */
export function RouteErrorBoundary() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let routeError: any = null;
  try {
    // Dynamic import to avoid hard dependency when component is used outside router
    // useRouteError is only available inside a RouterProvider context
    const { useRouteError } = require('react-router-dom');
    routeError = useRouteError();
  } catch {
    // Not inside a router context
  }

  const error = routeError instanceof Error ? routeError : new Error(String(routeError ?? 'Unknown route error'));
  const is404 = routeError && typeof routeError === 'object' && 'status' in routeError && routeError.status === 404;

  if (is404) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Page Not Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.history.back()}>Go Back</Button>
              <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }}>
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Something went wrong
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error.message || 'An unexpected error occurred while loading this page.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Reload
            </Button>
            <Button variant="outline" onClick={() => { window.location.href = '/dashboard'; }}>
              <Home className="h-4 w-4 mr-2" aria-hidden="true" />
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ConnectorsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error) => {
        boundaryLogger.error('Connectors page error', error);
      }}
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mx-auto mb-4 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-neutral-900 dark:text-white">Integrations Unavailable</h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                We're having trouble loading your integrations. Your connected services are not affected.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reload
                </Button>
                <Button variant="outline" onClick={() => { window.location.href = '/projects'; }}>
                  <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                  Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;