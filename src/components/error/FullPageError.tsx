import { ErrorInfo } from 'react';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getErrorCategory, getSeverityLevel, isRetryableError } from './errorHelpers';
import { ErrorDetails } from './ErrorDetails';

interface FullPageErrorProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  showDetails: boolean;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onToggleDetails: () => void;
}

export function FullPageError({
  error,
  errorInfo,
  retryCount,
  maxRetries,
  canRetry,
  showDetails,
  onRetry,
  onReload,
  onGoHome,
  onToggleDetails,
}: FullPageErrorProps) {
  const errorCategory = getErrorCategory(error);
  const severity = getSeverityLevel(error);
  const retryable = isRetryableError(error);

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
          {retryable && (
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
              <Button onClick={onRetry} className="flex-1 sm:flex-none">
                <RefreshCw size={16} className="mr-2" aria-hidden="true" />
                Try Again
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onReload}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw size={16} className="mr-2" aria-hidden="true" />
              Reload Page
            </Button>

            <Button
              variant="outline"
              onClick={onGoHome}
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
            onClick={onToggleDetails}
            className="w-full justify-between"
          >
            <span>Technical Details</span>
            {showDetails ?
              <ChevronDown size={16} aria-hidden="true" /> :
              <ChevronRight size={16} aria-hidden="true" />
            }
          </Button>

          {showDetails && <ErrorDetails error={error} errorInfo={errorInfo} />}

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
