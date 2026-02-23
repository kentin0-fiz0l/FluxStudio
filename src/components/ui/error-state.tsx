/**
 * ErrorState Component - Flux Design Language
 *
 * A reusable error display component with retry functionality.
 * Used to display error states in dashboard sections and data loading failures.
 *
 * @example
 * <ErrorState
 *   title="Failed to load projects"
 *   description="There was a problem fetching your data."
 *   onRetry={() => refetch()}
 * />
 *
 * <ErrorState
 *   variant="inline"
 *   title="Connection lost"
 *   onRetry={reconnect}
 * />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, RefreshCw, WifiOff, ServerOff, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

const errorStateVariants = cva(
  'flex flex-col items-center justify-center text-center',
  {
    variants: {
      /**
       * Visual variant
       */
      variant: {
        default: 'p-8 rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800',
        inline: 'p-4',
        card: 'p-6 rounded-lg border border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-900/20',
        minimal: 'py-4',
      },

      /**
       * Size variant
       */
      size: {
        sm: 'gap-2',
        md: 'gap-3',
        lg: 'gap-4',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Error type to icon mapping
const errorIcons = {
  default: AlertCircle,
  network: WifiOff,
  server: ServerOff,
  notFound: FileWarning,
} as const;

// Icon size mapping
const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

// Text size mapping
const titleSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const descriptionSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export interface ErrorStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof errorStateVariants> {
  /**
   * Error title
   */
  title: string;

  /**
   * Error description or details
   */
  description?: string;

  /**
   * Type of error (determines icon)
   * @default "default"
   */
  errorType?: keyof typeof errorIcons;

  /**
   * Custom icon to display
   * Overrides errorType icon
   */
  icon?: React.ReactNode;

  /**
   * Callback when retry button is clicked
   * If not provided, retry button is hidden
   */
  onRetry?: () => void;

  /**
   * Whether retry is in progress
   */
  retrying?: boolean;

  /**
   * Custom retry button text
   * @default "Try again"
   */
  retryText?: string;

  /**
   * Additional action button
   */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  };
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      title,
      description,
      errorType = 'default',
      icon,
      onRetry,
      retrying = false,
      retryText = 'Try again',
      action,
      variant,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const IconComponent = errorIcons[errorType];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(errorStateVariants({ variant, size }), className)}
        {...props}
      >
        {/* Icon */}
        <div
          className={cn(
            'text-error-500 dark:text-error-400',
            variant === 'card' && 'text-error-600 dark:text-error-400'
          )}
        >
          {icon || (
            <IconComponent
              className={cn(iconSizes[size || 'md'])}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Text Content */}
        <div className="space-y-1">
          <h3
            className={cn(
              'font-semibold text-neutral-900 dark:text-neutral-100',
              titleSizes[size || 'md']
            )}
          >
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                'text-neutral-600 dark:text-neutral-400 max-w-sm',
                descriptionSizes[size || 'md']
              )}
            >
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(onRetry || action) && (
          <div className="flex items-center gap-2 mt-2">
            {onRetry && (
              <Button
                variant="outline"
                size={size === 'sm' ? 'sm' : 'md'}
                onClick={onRetry}
                disabled={retrying}
                loading={retrying}
                icon={!retrying ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : undefined}
              >
                {retryText}
              </Button>
            )}
            {action && (
              <Button
                variant={action.variant || 'ghost'}
                size={size === 'sm' ? 'sm' : 'md'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

ErrorState.displayName = 'ErrorState';

/**
 * InlineError - Compact inline error message
 */
interface InlineErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  onRetry?: () => void;
}

const InlineError = React.forwardRef<HTMLDivElement, InlineErrorProps>(
  ({ message, onRetry, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'flex items-center gap-2 text-sm text-error-600 dark:text-error-400',
          className
        )}
        {...props}
      >
        <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
);

InlineError.displayName = 'InlineError';

export { ErrorState, InlineError, errorStateVariants };
