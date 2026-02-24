/* eslint-disable react-refresh/only-export-components */
/**
 * ProgressToast Component - Flux Design Language
 *
 * Toast variant with progress bar for long-running operations.
 * Integrates with sonner toast library for file uploads, bulk operations, etc.
 *
 * @example
 * import { showProgressToast, updateProgressToast, dismissProgressToast } from '@/components/ui/progress-toast';
 *
 * const toastId = showProgressToast({
 *   title: 'Uploading files',
 *   description: '3 files remaining',
 *   progress: 0,
 * });
 *
 * // Update progress
 * updateProgressToast(toastId, { progress: 50, description: '2 files remaining' });
 *
 * // Complete
 * updateProgressToast(toastId, { progress: 100, title: 'Upload complete' });
 * dismissProgressToast(toastId);
 */

import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressToastOptions {
  /**
   * Toast title
   */
  title: string;

  /**
   * Description or status message
   */
  description?: string;

  /**
   * Progress value (0-100)
   */
  progress?: number;

  /**
   * Whether operation is complete
   */
  complete?: boolean;

  /**
   * Whether operation failed
   */
  error?: boolean;

  /**
   * Error message when operation fails
   */
  errorMessage?: string;

  /**
   * Whether the toast can be dismissed
   * @default true
   */
  dismissible?: boolean;

  /**
   * Auto-dismiss duration in ms (only when complete or error)
   * @default 3000
   */
  duration?: number;

  /**
   * Cancel callback
   */
  onCancel?: () => void;
}

/**
 * ProgressToastContent - The actual toast content component
 */
interface ProgressToastContentProps extends ProgressToastOptions {
  toastId: string | number;
}

export function ProgressToastContent({
  title,
  description,
  progress = 0,
  complete = false,
  error = false,
  errorMessage,
  dismissible = true,
  onCancel,
  toastId,
}: ProgressToastContentProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isInProgress = !complete && !error;

  return (
    <div className="flex items-start gap-3 w-full">
      {/* Status Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {error ? (
          <XCircle className="h-5 w-5 text-error-500" aria-hidden="true" />
        ) : complete ? (
          <CheckCircle2 className="h-5 w-5 text-success-500" aria-hidden="true" />
        ) : (
          <Loader2 className="h-5 w-5 text-primary-500 animate-spin" aria-hidden="true" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {title}
            </p>
            {(description || errorMessage) && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {error ? errorMessage : description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {isInProgress && onCancel && (
              <button
                type="button"
                onClick={() => {
                  onCancel();
                  toast.dismiss(toastId);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {dismissible && !isInProgress && (
              <button
                type="button"
                onClick={() => toast.dismiss(toastId)}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isInProgress && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span>Progress</span>
              <span>{Math.round(clampedProgress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300 ease-out',
                  'bg-primary-500'
                )}
                style={{ width: `${clampedProgress}%` }}
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Show a progress toast
 * Returns toast ID for updating/dismissing
 */
export function showProgressToast(options: ProgressToastOptions): string | number {
  const toastId = toast.custom(
    (id) => <ProgressToastContent {...options} toastId={id} />,
    {
      duration: Infinity, // Don't auto-dismiss during progress
      dismissible: false, // We handle dismiss ourselves
    }
  );

  return toastId;
}

/**
 * Update an existing progress toast
 */
export function updateProgressToast(
  toastId: string | number,
  options: Partial<ProgressToastOptions>
): void {
  const isComplete = options.complete || options.error;
  const duration = isComplete ? (options.duration ?? 3000) : Infinity;

  toast.custom(
    (id) => <ProgressToastContent {...options} title={options.title || 'Processing'} toastId={id} />,
    {
      id: toastId,
      duration,
      dismissible: isComplete,
    }
  );
}

/**
 * Dismiss a progress toast
 */
export function dismissProgressToast(toastId: string | number): void {
  toast.dismiss(toastId);
}

/**
 * Convenience function for file upload toasts
 */
export function showUploadToast(options: {
  fileName: string;
  onCancel?: () => void;
}): {
  toastId: string | number;
  updateProgress: (progress: number, description?: string) => void;
  complete: (message?: string) => void;
  error: (message: string) => void;
} {
  const toastId = showProgressToast({
    title: `Uploading ${options.fileName}`,
    description: 'Starting upload...',
    progress: 0,
    onCancel: options.onCancel,
  });

  return {
    toastId,
    updateProgress: (progress, description) => {
      updateProgressToast(toastId, {
        title: `Uploading ${options.fileName}`,
        description: description || `${Math.round(progress)}% complete`,
        progress,
      });
    },
    complete: (message) => {
      updateProgressToast(toastId, {
        title: message || `${options.fileName} uploaded`,
        complete: true,
      });
    },
    error: (message) => {
      updateProgressToast(toastId, {
        title: `Upload failed`,
        error: true,
        errorMessage: message || `Failed to upload ${options.fileName}`,
      });
    },
  };
}

/**
 * Convenience function for bulk operation toasts
 */
export function showBulkOperationToast(options: {
  operation: string;
  totalItems: number;
  onCancel?: () => void;
}): {
  toastId: string | number;
  updateProgress: (completedItems: number) => void;
  complete: (message?: string) => void;
  error: (message: string) => void;
} {
  const toastId = showProgressToast({
    title: options.operation,
    description: `0 of ${options.totalItems} items`,
    progress: 0,
    onCancel: options.onCancel,
  });

  return {
    toastId,
    updateProgress: (completedItems) => {
      const progress = (completedItems / options.totalItems) * 100;
      updateProgressToast(toastId, {
        title: options.operation,
        description: `${completedItems} of ${options.totalItems} items`,
        progress,
      });
    },
    complete: (message) => {
      updateProgressToast(toastId, {
        title: message || `${options.operation} complete`,
        description: `${options.totalItems} items processed`,
        complete: true,
      });
    },
    error: (message) => {
      updateProgressToast(toastId, {
        title: `${options.operation} failed`,
        error: true,
        errorMessage: message,
      });
    },
  };
}
