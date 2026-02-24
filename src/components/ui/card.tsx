/* eslint-disable react-refresh/only-export-components */
/**
 * Card Component - Flux Design Language
 *
 * A flexible card container with variants for different use cases.
 * Supports interactive states, different padding sizes, and custom styling.
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Project Title</CardTitle>
 *     <CardDescription>Project description here</CardDescription>
 *   </CardHeader>
 *   <CardContent>Main content</CardContent>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Card variants
const cardVariants = cva(
  'rounded-lg border bg-white dark:bg-neutral-800 transition-all',
  {
    variants: {
      // Visual variants
      variant: {
        default: 'border-neutral-200 dark:border-neutral-700 shadow-card',
        elevated: 'border-neutral-200 dark:border-neutral-700 shadow-3',
        outline: 'border-neutral-300 dark:border-neutral-600 shadow-none',
        ghost: 'border-transparent shadow-none',
      },

      // Padding sizes
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },

      // Interactive state
      interactive: {
        true: 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:shadow-card-active active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      },
    },

    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Make card clickable with hover effects
   */
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, role, tabIndex, onKeyDown, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive, className }))}
      role={interactive ? role || 'button' : role}
      tabIndex={interactive ? (tabIndex ?? 0) : tabIndex}
      onKeyDown={interactive ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).click();
        }
        onKeyDown?.(e);
      } : onKeyDown}
      {...props}
    />
  )
);
Card.displayName = 'Card';

// Card Header
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xl font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-100', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('pt-0', className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
