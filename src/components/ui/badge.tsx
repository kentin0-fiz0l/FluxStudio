/**
 * Badge Component - Flux Design Language
 *
 * A small status indicator or label component with multiple color variants and sizes.
 * Perfect for tags, statuses, categories, and notifications.
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error" size="sm">Failed</Badge>
 * <Badge variant="primary">New Feature</Badge>
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Badge variants
const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full font-medium transition-colors',
  {
    variants: {
      // Color variants
      variant: {
        default: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
        primary: 'bg-primary-100 text-primary-700 border border-primary-200',
        secondary: 'bg-secondary-100 text-secondary-700 border border-secondary-200',
        accent: 'bg-accent-100 text-accent-700 border border-accent-200',
        success: 'bg-success-100 text-success-700 border border-success-200',
        warning: 'bg-warning-100 text-warning-700 border border-warning-200',
        error: 'bg-error-100 text-error-700 border border-error-200',
        info: 'bg-info-100 text-info-700 border border-info-200',

        // Solid variants
        solidPrimary: 'bg-primary-600 text-white',
        solidSecondary: 'bg-secondary-600 text-white',
        solidAccent: 'bg-accent-600 text-white',
        solidSuccess: 'bg-success-600 text-white',
        solidWarning: 'bg-warning-600 text-white',
        solidError: 'bg-error-600 text-white',
        solidInfo: 'bg-info-600 text-white',

        // Outline variants
        outline: 'bg-transparent border-2 border-neutral-300 text-neutral-700',
        outlinePrimary: 'bg-transparent border-2 border-primary-600 text-primary-600',
        outlineSuccess: 'bg-transparent border-2 border-success-600 text-success-600',
        outlineError: 'bg-transparent border-2 border-error-600 text-error-600',
      },

      // Size variants
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },

      // Dot indicator
      dot: {
        true: 'pl-1.5',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Show dot indicator
   */
  dot?: boolean;

  /**
   * Icon to display before text
   */
  icon?: React.ReactNode;

  /**
   * Icon to display after text
   */
  iconRight?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, icon, iconRight, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, dot, className }))}
        {...props}
      >
        {/* Dot indicator */}
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              variant === 'success' && 'bg-success-600',
              variant === 'error' && 'bg-error-600',
              variant === 'warning' && 'bg-warning-600',
              variant === 'info' && 'bg-info-600',
              variant === 'primary' && 'bg-primary-600',
              variant === 'secondary' && 'bg-secondary-600',
              variant === 'accent' && 'bg-accent-600',
              !variant && 'bg-neutral-600'
            )}
          />
        )}

        {/* Leading icon */}
        {icon && <span className="inline-flex">{icon}</span>}

        {/* Content */}
        {children}

        {/* Trailing icon */}
        {iconRight && <span className="inline-flex">{iconRight}</span>}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
