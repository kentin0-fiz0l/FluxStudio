/* eslint-disable react-refresh/only-export-components */
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
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Validation state for a form field */
export type FieldValidationState = 'idle' | 'validating' | 'valid' | 'warning' | 'error';

// Context for FormField state
interface FormFieldContextValue {
  id: string;
  name?: string;
  error?: string;
  /** Success message when field is valid */
  successMessage?: string;
  /** Current validation state */
  validationState?: FieldValidationState;
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
   * Success message when field is valid
   */
  successMessage?: string;

  /**
   * Current validation state (auto-derived from error/successMessage if not set)
   */
  validationState?: FieldValidationState;

  /**
   * Whether field is disabled
   */
  disabled?: boolean;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ name, error, successMessage, validationState: validationStateProp, disabled, className, children, ...props }, ref) => {
    const [id] = React.useState(generateFieldId);

    // Auto-derive validation state from error/successMessage if not explicitly set
    const validationState: FieldValidationState = validationStateProp
      ?? (error ? 'error' : successMessage ? 'valid' : 'idle');

    const contextValue = React.useMemo(
      () => ({ id, name, error, successMessage, validationState, disabled }),
      [id, name, error, successMessage, validationState, disabled]
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
interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show inline validation icon inside the input area */
  showValidationIcon?: boolean;
}

const validationRingClasses: Record<FieldValidationState, string> = {
  idle: '',
  validating: '',
  valid: '[&_input]:ring-1 [&_input]:ring-green-500 [&_textarea]:ring-1 [&_textarea]:ring-green-500 [&_select]:ring-1 [&_select]:ring-green-500',
  warning: '[&_input]:ring-1 [&_input]:ring-yellow-500 [&_textarea]:ring-1 [&_textarea]:ring-yellow-500 [&_select]:ring-1 [&_select]:ring-yellow-500',
  error: '[&_input]:ring-1 [&_input]:ring-red-500 [&_textarea]:ring-1 [&_textarea]:ring-red-500 [&_select]:ring-1 [&_select]:ring-red-500',
};

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ showValidationIcon = true, className, children, ...props }, ref) => {
    const context = useFormFieldContextOptional();
    const state = context?.validationState ?? 'idle';

    // Clone children to add proper IDs and aria attributes
    const enhancedChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;

      const childProps: Record<string, unknown> = {
        id: context?.id,
        'aria-describedby': context?.error
          ? `${context.id}-error`
          : context?.successMessage
          ? `${context.id}-success`
          : context?.id
          ? `${context.id}-description`
          : undefined,
        'aria-invalid': context?.error ? true : undefined,
        disabled: context?.disabled || (child.props as { disabled?: boolean })?.disabled,
      };

      return React.cloneElement(child, childProps);
    });

    return (
      <div
        ref={ref}
        className={cn('relative', validationRingClasses[state], className)}
        {...props}
      >
        {enhancedChildren}
        {showValidationIcon && state !== 'idle' && state !== 'validating' && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {state === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" aria-hidden="true" />}
            {state === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" aria-hidden="true" />}
            {state === 'error' && <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />}
          </div>
        )}
      </div>
    );
  }
);

FormControl.displayName = 'FormControl';

// FormDescription - hint text below input
type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

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

// FormMessage - error/success message display
interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /**
   * Error message to display
   * Falls back to context error if not provided
   */
  error?: string;
  /**
   * Success message to display (shown when no error)
   * Falls back to context successMessage if not provided
   */
  success?: string;
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ error: errorProp, success: successProp, className, children, ...props }, ref) => {
    const context = useFormFieldContextOptional();
    const error = errorProp ?? context?.error;
    const success = successProp ?? context?.successMessage;

    // Show error first, then success, then children
    if (!error && !success && !children) {
      return null;
    }

    if (error) {
      return (
        <p
          ref={ref}
          id={context ? `${context.id}-error` : undefined}
          role="alert"
          aria-live="polite"
          className={cn('text-sm text-error-600 dark:text-error-400', className)}
          {...props}
        >
          {error}
        </p>
      );
    }

    if (success) {
      return (
        <p
          ref={ref}
          id={context ? `${context.id}-success` : undefined}
          aria-live="polite"
          className={cn('text-sm text-green-600 dark:text-green-400', className)}
          {...props}
        >
          {success}
        </p>
      );
    }

    return (
      <p
        ref={ref}
        id={context ? `${context.id}-error` : undefined}
        role="alert"
        aria-live="polite"
        className={cn('text-sm text-error-600 dark:text-error-400', className)}
        {...props}
      >
        {children}
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
