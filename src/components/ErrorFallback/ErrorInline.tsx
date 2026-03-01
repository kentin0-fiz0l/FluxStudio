import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ErrorInlineProps {
  title: string;
  message: string;
  onRetry?: () => void;
  handleRetry: () => void;
  className?: string;
}

export function ErrorInline({ title, message, onRetry, handleRetry, className }: ErrorInlineProps) {
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
