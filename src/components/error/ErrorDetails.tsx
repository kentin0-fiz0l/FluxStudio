import { ErrorInfo } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { formatErrorDetails } from './errorHelpers';

interface ErrorDetailsProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export function ErrorDetails({ error, errorInfo }: ErrorDetailsProps) {
  const copyErrorDetails = async () => {
    const details = formatErrorDetails(error, errorInfo?.componentStack);
    try {
      await navigator.clipboard.writeText(details);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

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
        onClick={copyErrorDetails}
        className="w-full"
      >
        <Copy size={14} className="mr-2" aria-hidden="true" />
        Copy Error Details
      </Button>
    </div>
  );
}
