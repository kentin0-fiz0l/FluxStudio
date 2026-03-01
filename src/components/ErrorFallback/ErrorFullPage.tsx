import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AccentColorConfig } from './error-fallback-types';

interface ErrorFullPageProps {
  title: string;
  message: string;
  error?: Error | null;
  componentStack?: string | null;
  showDetails: boolean;
  detailsExpanded: boolean;
  setDetailsExpanded: (expanded: boolean) => void;
  handleRetry: () => void;
  handleGoHome: () => void;
  copyErrorDetails: () => void;
  colors: AccentColorConfig;
  className?: string;
}

export function ErrorFullPage({
  title, message, error, componentStack, showDetails,
  detailsExpanded, setDetailsExpanded, handleRetry, handleGoHome,
  copyErrorDetails, colors, className,
}: ErrorFullPageProps) {
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
          {error && (
            <Alert>
              <Bug className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription className="font-mono text-sm">
                {error.message || 'An unknown error occurred'}
              </AlertDescription>
            </Alert>
          )}

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

          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
            <p>
              If this problem persists, please{' '}
              <a href="mailto:support@fluxstudio.com" className="text-blue-600 dark:text-blue-400 hover:underline">
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
