/**
 * FormField Component - Flux Design Language
 *
 * A compound component for form fields with labels, descriptions, and error messages.
 * Designed to work with react-hook-form but also works standalone.
 *
 * @example
 * <FormField>
 *   <FormLabel required>Email</FormLabel>
 *   <FormControl>
 *     <Input type="email" placeholder="you@example.com" />
 *   </FormControl>
 *   <FormDescription>We'll never share your email.</FormDescription>
 *   <FormMessage error={errors.email?.message} />
 * </FormField>
 *
 * // With react-hook-form
 * <FormField
 *   control={form.control}
 *   name="email"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>Email</FormLabel>
 *       <FormControl>
 *         <Input {...field} />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 */

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

// Context for FormField state
interface FormFieldContextValue {
  id: string;
  name?: string;
  error?: string;
  disabled?: boolean;
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(undefined);

function useFormFieldContext() {
  const context = React.useContext(FormFieldContext);
  if (!context) {
    throw new Error('FormField components must be used within a FormField');
  }
  return context;
}

// Hook to check if we're inside a FormField (doesn't throw)
function useFormFieldContextOptional() {
  return React.useContext(FormFieldContext);
}

// Generate stable IDs
let fieldIdCounter = 0;
function generateFieldId() {
  return `form-field-${++fieldIdCounter}`;
}

// FormField - root wrapper
interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Field name (for form integration)
   */
  name?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Whether field is disabled
   */
  disabled?: boolean;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ name, error, disabled, className, children, ...props }, ref) => {
    const [id] = React.useState(generateFieldId);

    const contextValue = React.useMemo(
      () => ({ id, name, error, disabled }),
      [id, name, error, disabled]
    );

    return (
      <FormFieldContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn('space-y-2', className)}
          {...props}
        >
          {children}
        </div>
      </FormFieldContext.Provider>
    );
  }
);

FormField.displayName = 'FormField';

// FormItem - alternative name for FormField (for react-hook-form compatibility)
const FormItem = FormField;
FormItem.displayName = 'FormItem';

// FormLabel - accessible label with required indicator
interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Whether the field is optional (shows optional text)
   */
  optional?: boolean;
}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ required, optional, className, children, ...props }, ref) => {
    const context = useFormFieldContextOptional();

    return (
      <LabelPrimitive.Root
        ref={ref}
        htmlFor={context?.id}
        className={cn(
          'text-sm font-medium text-neutral-900 dark:text-neutral-100',
          context?.error && 'text-error-600 dark:text-error-400',
          context?.disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-error-500 ml-1" aria-hidden="true">
            *
          </span>
        )}
        {optional && (
          <span className="text-neutral-500 dark:text-neutral-400 ml-1 font-normal">
            (optional)
          </span>
        )}
      </LabelPrimitive.Root>
    );
  }
);

FormLabel.displayName = 'FormLabel';

// FormControl - wrapper that connects input to field context
interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {}

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, children, ...props }, ref) => {
    const context = useFormFieldContextOptional();

    // Clone children to add proper IDs and aria attributes
    const enhancedChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      const childProps: Record<string, unknown> = {
        id: context?.id,
        'aria-describedby': context?.error
          ? `${context.id}-error`
          : context?.id
          ? `${context.id}-description`
          : undefined,
        'aria-invalid': context?.error ? true : undefined,
        disabled: context?.disabled || (child.props as { disabled?: boolean })?.disabled,
      };

      return React.cloneElement(child, childProps);
    });

    return (
      <div ref={ref} className={cn(className)} {...props}>
        {enhancedChildren}
      </div>
    );
  }
);

FormControl.displayName = 'FormControl';

// FormDescription - hint text below input
interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    const context = useFormFieldContextOptional();

    return (
      <p
        ref={ref}
        id={context ? `${context.id}-description` : undefined}
        className={cn(
          'text-sm text-neutral-500 dark:text-neutral-400',
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

FormDescription.displayName = 'FormDescription';

// FormMessage - error message display
interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /**
   * Error message to display
   * Falls back to context error if not provided
   */
  error?: string;
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ error: errorProp, className, children, ...props }, ref) => {
    const context = useFormFieldContextOptional();
    const error = errorProp ?? context?.error;

    if (!error && !children) {
      return null;
    }

    return (
      <p
        ref={ref}
        id={context ? `${context.id}-error` : undefined}
        role="alert"
        aria-live="polite"
        className={cn(
          'text-sm text-error-600 dark:text-error-400',
          className
        )}
        {...props}
      >
        {error || children}
      </p>
    );
  }
);

FormMessage.displayName = 'FormMessage';

// FormHint - success message or additional info
interface FormHintProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /**
   * Variant style
   */
  variant?: 'default' | 'success' | 'warning';
}

const FormHint = React.forwardRef<HTMLParagraphElement, FormHintProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const variantClasses = {
      default: 'text-neutral-500 dark:text-neutral-400',
      success: 'text-success-600 dark:text-success-400',
      warning: 'text-warning-600 dark:text-warning-400',
    };

    return (
      <p
        ref={ref}
        className={cn('text-sm', variantClasses[variant], className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

FormHint.displayName = 'FormHint';

// FormSection - group related fields
interface FormSectionProps extends React.HTMLAttributes<HTMLFieldSetElement> {
  /**
   * Section title
   */
  title?: string;

  /**
   * Section description
   */
  description?: string;
}

const FormSection = React.forwardRef<HTMLFieldSetElement, FormSectionProps>(
  ({ title, description, className, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn('space-y-4 border-none p-0', className)}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <legend className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </legend>
            )}
            {description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </fieldset>
    );
  }
);

FormSection.displayName = 'FormSection';

export {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormHint,
  FormSection,
  useFormFieldContext,
  type FormFieldProps,
  type FormLabelProps,
  type FormControlProps,
  type FormDescriptionProps,
  type FormMessageProps,
  type FormHintProps,
  type FormSectionProps,
};
