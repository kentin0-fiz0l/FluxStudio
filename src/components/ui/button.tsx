/**
 * Button Component - Flux Design Language
 *
 * A versatile button component with multiple variants, sizes, and states.
 * Built with Radix UI Slot for composition and class-variance-authority for variants.
 *
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="secondary" size="sm" disabled>Disabled</Button>
 * <Button variant="danger" size="lg" loading>Loading...</Button>
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Button variants using class-variance-authority
const buttonVariants = cva(
  // Base styles (always applied)
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-500/20 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      // Visual variants
      variant: {
        // Primary - Main call-to-action
        primary:
          'bg-primary-600 text-white shadow-button hover:bg-primary-700 hover:shadow-button-hover active:bg-primary-800 active:shadow-button-active',

        // Secondary - Secondary actions
        secondary:
          'bg-secondary-500 text-white shadow-button hover:bg-secondary-600 hover:shadow-button-hover active:bg-secondary-700 active:shadow-button-active',

        // Tertiary - Subtle actions
        tertiary:
          'bg-neutral-100 text-neutral-900 shadow-button hover:bg-neutral-200 hover:shadow-button-hover active:bg-neutral-300 active:shadow-button-active',

        // Outline - Ghost-like with border
        outline:
          'border-2 border-primary-600 bg-transparent text-primary-600 hover:bg-primary-50 active:bg-primary-100',

        // Ghost - Minimal, text-only style
        ghost:
          'bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',

        // Danger - Destructive actions
        danger:
          'bg-error-600 text-white shadow-button hover:bg-error-700 hover:shadow-button-hover active:bg-error-800 active:shadow-button-active',

        // Success - Positive actions
        success:
          'bg-success-600 text-white shadow-button hover:bg-success-700 hover:shadow-button-hover active:bg-success-800 active:shadow-button-active',

        // Link - Looks like a link
        link: 'text-primary-600 underline-offset-4 hover:underline active:text-primary-700',
      },

      // Size variants
      size: {
        sm: 'h-11 md:h-9 px-4 md:px-3 text-sm min-h-[44px] md:min-h-0', // Mobile-first: 44px min
        md: 'h-11 px-5 text-base min-h-[44px]', // Mobile-first: 44px min
        lg: 'h-12 px-6 text-lg min-h-[48px]',
        xl: 'h-14 px-8 text-xl min-h-[56px]',
        icon: 'h-11 w-11 md:h-10 md:w-10 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0', // Mobile-first: 44x44px
      },

      // Full width option
      fullWidth: {
        true: 'w-full',
      },
    },

    // Default variants
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Render as child component (uses Radix UI Slot)
   */
  asChild?: boolean;

  /**
   * Show loading spinner
   */
  loading?: boolean;

  /**
   * Icon to display before text
   */
  icon?: React.ReactNode;

  /**
   * Icon to display after text
   */
  iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      disabled,
      icon,
      iconRight,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {children}
          </>
        ) : (
          <>
            {icon && <span className="inline-flex" aria-hidden="true">{icon}</span>}
            {children}
            {iconRight && <span className="inline-flex" aria-hidden="true">{iconRight}</span>}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
