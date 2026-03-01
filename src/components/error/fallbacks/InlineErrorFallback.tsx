/**
 * InlineErrorFallback - Reusable inline Alert-based error fallback.
 */

import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { AlertTriangle } from 'lucide-react';

export interface InlineErrorFallbackProps {
  title: string;
  message: string;
  variant?: 'destructive' | 'default';
}

export function InlineErrorFallback({
  title,
  message,
  variant = 'destructive',
}: InlineErrorFallbackProps) {
  return (
    <Alert variant={variant}>
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
