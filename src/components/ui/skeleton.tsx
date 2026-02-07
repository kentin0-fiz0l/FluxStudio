/**
 * Skeleton Component - Flux Design Language
 *
 * Loading placeholder with shimmer animation and multiple variants.
 * Used to indicate content loading state and improve perceived performance.
 *
 * @example
 * <Skeleton className="h-8 w-48" />
 * <Skeleton variant="text" />
 * <Skeleton variant="avatar" size="lg" />
 * <Skeleton variant="card" />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const skeletonVariants = cva(
  // Base styles with shimmer
  'relative overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-700',
  {
    variants: {
      /**
       * Visual variant for different content types
       */
      variant: {
        default: '',
        text: 'h-4 w-full',
        avatar: 'rounded-full',
        card: 'rounded-lg',
        circular: 'rounded-full aspect-square',
        'table-row': 'h-12 w-full rounded-none',
      },

      /**
       * Size preset (mainly for avatar and circular)
       */
      size: {
        sm: '',
        md: '',
        lg: '',
        xl: '',
      },

      /**
       * Animation style
       */
      animation: {
        pulse: 'animate-pulse',
        shimmer: 'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent',
        none: '',
      },
    },

    compoundVariants: [
      // Avatar sizes
      { variant: 'avatar', size: 'sm', className: 'h-8 w-8' },
      { variant: 'avatar', size: 'md', className: 'h-10 w-10' },
      { variant: 'avatar', size: 'lg', className: 'h-12 w-12' },
      { variant: 'avatar', size: 'xl', className: 'h-16 w-16' },
      // Circular sizes
      { variant: 'circular', size: 'sm', className: 'h-8 w-8' },
      { variant: 'circular', size: 'md', className: 'h-10 w-10' },
      { variant: 'circular', size: 'lg', className: 'h-12 w-12' },
      { variant: 'circular', size: 'xl', className: 'h-16 w-16' },
      // Text sizes
      { variant: 'text', size: 'sm', className: 'h-3' },
      { variant: 'text', size: 'md', className: 'h-4' },
      { variant: 'text', size: 'lg', className: 'h-5' },
      { variant: 'text', size: 'xl', className: 'h-6' },
    ],

    defaultVariants: {
      variant: 'default',
      size: 'md',
      animation: 'pulse',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, animation, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="skeleton"
        className={cn(skeletonVariants({ variant, size, animation }), className)}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonText - Multiple lines of text placeholder
 */
interface SkeletonTextProps extends Omit<SkeletonProps, 'variant'> {
  lines?: number;
  lastLineWidth?: 'full' | 'half' | 'three-quarters';
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, lastLineWidth = 'three-quarters', className, ...props }, ref) => {
    const lastLineWidthClass = {
      full: 'w-full',
      half: 'w-1/2',
      'three-quarters': 'w-3/4',
    };

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={i === lines - 1 ? lastLineWidthClass[lastLineWidth] : undefined}
            {...props}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

/**
 * SkeletonCard - Card-shaped placeholder with header and content
 */
interface SkeletonCardProps extends Omit<SkeletonProps, 'variant'> {
  showHeader?: boolean;
  showFooter?: boolean;
  contentLines?: number;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ showHeader = true, showFooter = false, contentLines = 3, className, animation, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800', className)}
        {...props}
      >
        {showHeader && (
          <div className="mb-4 flex items-center gap-3">
            <Skeleton variant="avatar" size="md" animation={animation} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" size="md" animation={animation} className="w-1/2" />
              <Skeleton variant="text" size="sm" animation={animation} className="w-1/4" />
            </div>
          </div>
        )}
        <SkeletonText lines={contentLines} animation={animation} />
        {showFooter && (
          <div className="mt-4 flex items-center gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Skeleton animation={animation} className="h-8 w-20" />
            <Skeleton animation={animation} className="h-8 w-20" />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

export { Skeleton, SkeletonText, SkeletonCard, skeletonVariants };
