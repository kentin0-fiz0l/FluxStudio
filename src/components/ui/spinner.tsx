/**
 * Spinner Component - Flux Design Language
 *
 * A loading spinner indicator with multiple sizes and colors.
 * Accessible with proper ARIA attributes for screen readers.
 *
 * @example
 * <Spinner size="md" />
 * <Spinner size="lg" color="primary" />
 * <Spinner size="sm" label="Loading data..." />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  // Base styles
  'animate-spin',
  {
    variants: {
      /**
       * Size of the spinner
       */
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },

      /**
       * Color variant
       */
      color: {
        default: 'text-neutral-500',
        primary: 'text-primary-600',
        secondary: 'text-secondary-500',
        success: 'text-success-600',
        warning: 'text-warning-600',
        error: 'text-error-600',
        white: 'text-white',
        current: 'text-current',
      },
    },

    defaultVariants: {
      size: 'md',
      color: 'default',
    },
  }
);

export interface SpinnerProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, 'color'>,
    VariantProps<typeof spinnerVariants> {
  /**
   * Accessible label for screen readers
   * @default "Loading"
   */
  label?: string;
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, color, label = 'Loading', ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        role="status"
        aria-label={label}
        className={cn(spinnerVariants({ size, color }), className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
      </Loader2>
    );
  }
);

Spinner.displayName = 'Spinner';

/**
 * SpinnerOverlay - Full container overlay with centered spinner
 */
interface SpinnerOverlayProps extends SpinnerProps {
  /**
   * Whether to show a backdrop
   */
  backdrop?: boolean;
  /**
   * Message to display below the spinner
   */
  message?: string;
}

const SpinnerOverlay = React.forwardRef<HTMLDivElement, SpinnerOverlayProps>(
  ({ backdrop = true, message, size = 'lg', ...spinnerProps }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center z-50',
          backdrop && 'bg-white/80 dark:bg-neutral-900/80'
        )}
      >
        <Spinner size={size} {...spinnerProps} />
        {message && (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            {message}
          </p>
        )}
      </div>
    );
  }
);

SpinnerOverlay.displayName = 'SpinnerOverlay';

export { Spinner, SpinnerOverlay, spinnerVariants };
