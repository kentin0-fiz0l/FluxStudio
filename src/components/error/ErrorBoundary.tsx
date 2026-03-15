/**
 * Comprehensive Error Boundary System
 * Handles errors gracefully with recovery options
 *
 * Integrated with observability layer for error tracking and correlation.
 */

import { Component, ErrorInfo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { observability } from '../../services/observability';
import { createLogger } from '../../lib/logger';

import type { ErrorBoundaryProps, ErrorBoundaryState } from './ErrorBoundary.types';
import { isRetryableError } from './errorHelpers';
import { FullPageError } from './FullPageError';

// Re-export ErrorFallback for convenience
export { ErrorFallback } from '../ErrorFallback';
export type { ErrorFallbackProps } from '../ErrorFallback';

// Re-export extracted components
export { PageErrorFallback } from './fallbacks/PageErrorFallback';
export type { PageErrorFallbackProps } from './fallbacks/PageErrorFallback';
export { InlineErrorFallback } from './fallbacks/InlineErrorFallback';
export type { InlineErrorFallbackProps } from './fallbacks/InlineErrorFallback';
export { RouteErrorBoundary } from './RouteErrorBoundary';

// Re-export new extracted modules for backward compatibility
export type { ErrorBoundaryProps, ErrorBoundaryState } from './ErrorBoundary.types';
export { isRetryableError, getErrorCategory, getSeverityLevel, formatErrorDetails } from './errorHelpers';
export { ErrorDetails } from './ErrorDetails';
export { FullPageError } from './FullPageError';
export {
  MessagingErrorBoundary,
  WorkflowErrorBoundary,
  CollaborationErrorBoundary,
  FilesErrorBoundary,
  ToolsErrorBoundary,
  ProjectsErrorBoundary,
  FormationEditorErrorBoundary,
  Formation3DViewErrorBoundary,
  AudioSyncTimelineErrorBoundary,
  AIErrorBoundary,
  FileUploadErrorBoundary,
  ConnectorsErrorBoundary,
  ChatMessageListErrorBoundary,
  DrillCritiquePanelErrorBoundary,
  FormationVersionHistoryErrorBoundary,
} from './featureBoundaries';

const boundaryLogger = createLogger('ErrorBoundary');

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
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
    boundaryLogger.error('Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
    });

    observability.errors.captureFromBoundary(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });

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
        retryCount: retryCount + 1,
      });

      if (isRetryableError(this.state.error)) {
        const delay = Math.pow(2, retryCount) * 1000;
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

  render() {
    const { hasError, error, errorInfo, retryCount, showDetails } = this.state;
    const { children, fallback, isolateComponent, retryable = true } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

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
        <FullPageError
          error={error}
          errorInfo={errorInfo}
          retryCount={retryCount}
          maxRetries={maxRetries}
          canRetry={canRetry}
          showDetails={showDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          onToggleDetails={() => this.setState({ showDetails: !showDetails })}
        />
      );
    }

    return children;
  }
}

export default ErrorBoundary;
