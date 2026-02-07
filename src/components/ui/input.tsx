/**
 * Input Component - Flux Design Language
 *
 * A versatile input component with validation states, icons, and helper text.
 * Supports text, email, password, number, and other HTML input types.
 *
 * @example
 * <Input placeholder="Enter your name" />
 * <Input type="email" error="Invalid email" />
 * <Input icon={<Search />} placeholder="Search..." />
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Input variants
const inputVariants = cva(
  // Base styles
  'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 transition-all focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      // Validation states
      state: {
        default:
          'border-neutral-300 focus-visible:border-primary-500 focus-visible:ring-3 focus-visible:ring-primary-500/20',
        error:
          'border-error-500 focus-visible:border-error-600 focus-visible:ring-3 focus-visible:ring-error-500/20',
        success:
          'border-success-500 focus-visible:border-success-600 focus-visible:ring-3 focus-visible:ring-success-500/20',
        warning:
          'border-warning-500 focus-visible:border-warning-600 focus-visible:ring-3 focus-visible:ring-warning-500/20',
      },

      // Size variants
      size: {
        sm: 'h-8 text-sm px-2',
        md: 'h-10 text-base px-3',
        lg: 'h-12 text-lg px-4',
      },
    },

    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * Error message to display
   */
  error?: string;

  /**
   * Success message to display
   */
  success?: string;

  /**
   * Helper text to display below input
   */
  helperText?: string;

  /**
   * Label for the input
   */
  label?: string;

  /**
   * Icon to display at the start of the input
   */
  icon?: React.ReactNode;

  /**
   * Icon to display at the end of the input
   */
  iconRight?: React.ReactNode;

  /**
   * Wrapper class name
   */
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      state: stateProp,
      size,
      type = 'text',
      error,
      success,
      helperText,
      label,
      icon,
      iconRight,
      wrapperClassName,
      id,
      ...props
    },
    ref
  ) => {
    // Generate ID unconditionally (React hooks must not be called conditionally)
    const generatedId = React.useId();

    // Determine state based on props
    const state = error ? 'error' : success ? 'success' : stateProp;

    // Use provided ID or fall back to generated ID
    const inputId = id || generatedId;
    const descriptionId = `${inputId}-description`;
    const hasDescription = !!(error || success || helperText);

    return (
      <div className={cn('w-full space-y-1.5', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700"
          >
            {label}
          </label>
        )}

        {/* Input wrapper (for icons) */}
        <div className="relative">
          {/* Leading icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {icon}
            </div>
          )}

          {/* Input element */}
          <input
            type={type}
            id={inputId}
            aria-describedby={hasDescription ? descriptionId : undefined}
            aria-invalid={!!error}
            className={cn(
              inputVariants({ state, size }),
              icon && 'pl-10',
              iconRight && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />

          {/* Trailing icon */}
          {iconRight && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {iconRight}
            </div>
          )}
        </div>

        {/* Helper text / Error / Success messages */}
        {hasDescription && (
          <p
            id={descriptionId}
            role={error ? 'alert' : undefined}
            aria-live={error ? 'polite' : undefined}
            className={cn(
              'text-sm',
              error && 'text-error-600',
              success && 'text-success-600',
              !error && !success && 'text-neutral-500'
            )}
          >
            {error || success || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
