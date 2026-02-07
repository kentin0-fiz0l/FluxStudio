/**
 * CircularProgress Component - Flux Design Language
 *
 * SVG-based circular progress indicator with determinate and indeterminate modes.
 * Accessible with proper ARIA attributes for screen readers.
 *
 * @example
 * <CircularProgress value={75} />
 * <CircularProgress indeterminate />
 * <CircularProgress value={50} size="lg" color="success" showLabel />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const circularProgressVariants = cva(
  // Base styles
  '',
  {
    variants: {
      /**
       * Size of the progress indicator
       */
      size: {
        xs: 'h-4 w-4',
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
      },

      /**
       * Color variant
       */
      color: {
        default: '',
        primary: '',
        secondary: '',
        success: '',
        warning: '',
        error: '',
      },
    },

    defaultVariants: {
      size: 'md',
      color: 'primary',
    },
  }
);

// Color mapping for SVG stroke
const colorMap = {
  default: 'stroke-neutral-600',
  primary: 'stroke-primary-600',
  secondary: 'stroke-secondary-500',
  success: 'stroke-success-600',
  warning: 'stroke-warning-600',
  error: 'stroke-error-600',
};

// Track color (background circle)
const trackColorMap = {
  default: 'stroke-neutral-200 dark:stroke-neutral-700',
  primary: 'stroke-primary-100 dark:stroke-primary-900/30',
  secondary: 'stroke-secondary-100 dark:stroke-secondary-900/30',
  success: 'stroke-success-100 dark:stroke-success-900/30',
  warning: 'stroke-warning-100 dark:stroke-warning-900/30',
  error: 'stroke-error-100 dark:stroke-error-900/30',
};

// Size to stroke width mapping
const strokeWidthMap = {
  xs: 2,
  sm: 2.5,
  md: 3,
  lg: 4,
  xl: 5,
};

// Size to font size mapping for label
const labelSizeMap = {
  xs: 'text-[6px]',
  sm: 'text-[8px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
};

export interface CircularProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof circularProgressVariants> {
  /**
   * The progress value (0-100)
   * Ignored when indeterminate is true
   */
  value?: number;

  /**
   * Whether the progress is indeterminate
   */
  indeterminate?: boolean;

  /**
   * Whether to show the value label in the center
   */
  showLabel?: boolean;

  /**
   * Custom label to display
   * Overrides the default percentage display
   */
  label?: React.ReactNode;

  /**
   * Accessible label for screen readers
   */
  ariaLabel?: string;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      className,
      size = 'md',
      color = 'primary',
      value = 0,
      indeterminate = false,
      showLabel = false,
      label,
      ariaLabel,
      ...props
    },
    ref
  ) => {
    // SVG calculations
    const viewBoxSize = 100;
    const center = viewBoxSize / 2;
    const strokeWidth = strokeWidthMap[size || 'md'];
    const radius = (viewBoxSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Clamp value between 0 and 100
    const clampedValue = Math.min(100, Math.max(0, value));
    const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

    const colorClass = colorMap[color || 'primary'];
    const trackColorClass = trackColorMap[color || 'primary'];
    const labelSizeClass = labelSizeMap[size || 'md'];

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || (indeterminate ? 'Loading' : `${clampedValue}% complete`)}
        className={cn(
          'relative inline-flex',
          circularProgressVariants({ size }),
          className
        )}
        {...props}
      >
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className={cn('transform -rotate-90', indeterminate && 'animate-spin')}
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={trackColorClass}
          />

          {/* Progress indicator */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={indeterminate ? circumference * 0.75 : strokeDashoffset}
            className={cn(colorClass, 'transition-all duration-300')}
          />
        </svg>

        {/* Center label */}
        {showLabel && !indeterminate && (
          <div className={cn(
            'absolute inset-0 flex items-center justify-center font-medium',
            labelSizeClass,
            color === 'default' ? 'text-neutral-700 dark:text-neutral-300' : colorClass.replace('stroke-', 'text-')
          )}>
            {label ?? `${Math.round(clampedValue)}%`}
          </div>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

export { CircularProgress, circularProgressVariants };
