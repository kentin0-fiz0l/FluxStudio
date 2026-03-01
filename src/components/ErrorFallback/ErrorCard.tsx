import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AccentColorConfig } from './error-fallback-types';

interface ErrorCardProps {
  title: string;
  message: string;
  error?: Error | null;
  showDetails: boolean;
  detailsExpanded: boolean;
  setDetailsExpanded: (expanded: boolean) => void;
  handleRetry: () => void;
  handleGoHome: () => void;
  copyErrorDetails: () => void;
  colors: AccentColorConfig;
  className?: string;
}

export function ErrorCard({
  title, message, error, showDetails, detailsExpanded, setDetailsExpanded,
  handleRetry, handleGoHome, copyErrorDetails, colors, className,
}: ErrorCardProps) {
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
