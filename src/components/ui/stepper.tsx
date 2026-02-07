/**
 * Stepper Component - Flux Design Language
 *
 * A compound component for multi-step forms and wizards.
 * Supports horizontal and vertical orientations with various states.
 *
 * @example
 * <Stepper value={currentStep} onValueChange={setCurrentStep}>
 *   <StepperList>
 *     <StepperItem value={1} title="Account" description="Create account" />
 *     <StepperItem value={2} title="Profile" description="Add details" />
 *     <StepperItem value={3} title="Complete" description="Finish setup" />
 *   </StepperList>
 *   <StepperContent value={1}>Step 1 content</StepperContent>
 *   <StepperContent value={2}>Step 2 content</StepperContent>
 *   <StepperContent value={3}>Step 3 content</StepperContent>
 * </Stepper>
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Context for Stepper state
interface StepperContextValue {
  value: number;
  onValueChange?: (value: number) => void;
  orientation: 'horizontal' | 'vertical';
  size: 'sm' | 'md' | 'lg';
  clickable: boolean;
  stepsWithErrors: Set<number>;
}

const StepperContext = React.createContext<StepperContextValue | undefined>(undefined);

function useStepperContext() {
  const context = React.useContext(StepperContext);
  if (!context) {
    throw new Error('Stepper components must be used within a Stepper');
  }
  return context;
}

// Stepper root
interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Current active step (1-indexed)
   */
  value: number;

  /**
   * Callback when step changes
   */
  onValueChange?: (value: number) => void;

  /**
   * Layout orientation
   * @default "horizontal"
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * Size variant
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether steps are clickable for navigation
   * @default false
   */
  clickable?: boolean;

  /**
   * Steps that have errors (array of step numbers)
   */
  stepsWithErrors?: number[];
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      value,
      onValueChange,
      orientation = 'horizontal',
      size = 'md',
      clickable = false,
      stepsWithErrors = [],
      className,
      children,
      ...props
    },
    ref
  ) => {
    const contextValue = React.useMemo(
      () => ({
        value,
        onValueChange,
        orientation,
        size,
        clickable,
        stepsWithErrors: new Set(stepsWithErrors),
      }),
      [value, onValueChange, orientation, size, clickable, stepsWithErrors]
    );

    return (
      <StepperContext.Provider value={contextValue}>
        <div
          ref={ref}
          data-orientation={orientation}
          className={cn(
            'flex',
            orientation === 'vertical' ? 'flex-col' : 'flex-row',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </StepperContext.Provider>
    );
  }
);

Stepper.displayName = 'Stepper';

// StepperList - container for step items
interface StepperListProps extends React.HTMLAttributes<HTMLDivElement> {}

const StepperList = React.forwardRef<HTMLDivElement, StepperListProps>(
  ({ className, children, ...props }, ref) => {
    const { orientation } = useStepperContext();

    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          'flex',
          orientation === 'horizontal'
            ? 'flex-row items-center justify-between'
            : 'flex-col items-start gap-0',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

StepperList.displayName = 'StepperList';

// Step item variants
const stepItemVariants = cva(
  'flex items-center gap-3',
  {
    variants: {
      orientation: {
        horizontal: 'flex-1',
        vertical: 'w-full',
      },
    },
  }
);

const stepIndicatorVariants = cva(
  'flex items-center justify-center rounded-full font-medium transition-colors',
  {
    variants: {
      size: {
        sm: 'h-6 w-6 text-xs',
        md: 'h-8 w-8 text-sm',
        lg: 'h-10 w-10 text-base',
      },
      state: {
        pending: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
        active: 'bg-primary-600 text-white shadow-md',
        completed: 'bg-success-600 text-white',
        error: 'bg-error-600 text-white',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'pending',
    },
  }
);

// StepperItem - individual step
interface StepperItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Step number (1-indexed)
   */
  value: number;

  /**
   * Step title
   */
  title: string;

  /**
   * Step description
   */
  description?: string;

  /**
   * Whether step is disabled
   */
  disabled?: boolean;
}

const StepperItem = React.forwardRef<HTMLDivElement, StepperItemProps>(
  ({ value: stepValue, title, description, disabled = false, className, ...props }, ref) => {
    const { value, onValueChange, orientation, size, clickable, stepsWithErrors } =
      useStepperContext();

    const isActive = stepValue === value;
    const isCompleted = stepValue < value;
    const hasError = stepsWithErrors.has(stepValue);

    const state = hasError
      ? 'error'
      : isCompleted
      ? 'completed'
      : isActive
      ? 'active'
      : 'pending';

    const handleClick = () => {
      if (clickable && !disabled && onValueChange) {
        onValueChange(stepValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && clickable && !disabled) {
        e.preventDefault();
        onValueChange?.(stepValue);
      }
    };

    return (
      <div
        ref={ref}
        role="tab"
        aria-selected={isActive}
        aria-disabled={disabled}
        tabIndex={clickable && !disabled ? 0 : -1}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          stepItemVariants({ orientation }),
          clickable && !disabled && 'cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {/* Step indicator */}
        <div className={cn(stepIndicatorVariants({ size, state }))}>
          {hasError ? (
            <AlertCircle className={cn(size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} />
          ) : isCompleted ? (
            <Check className={cn(size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')} />
          ) : (
            stepValue
          )}
        </div>

        {/* Step content */}
        <div className={cn('flex-1', orientation === 'vertical' && 'pb-6')}>
          <div
            className={cn(
              'font-medium',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm',
              isActive ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-900 dark:text-neutral-100'
            )}
          >
            {title}
          </div>
          {description && (
            <div
              className={cn(
                'text-neutral-500 dark:text-neutral-400',
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}
            >
              {description}
            </div>
          )}
        </div>

        {/* Connector line (horizontal) */}
        {orientation === 'horizontal' && (
          <div
            className={cn(
              'flex-1 h-0.5 mx-4',
              isCompleted ? 'bg-success-600' : 'bg-neutral-200 dark:bg-neutral-700',
              'last:hidden'
            )}
          />
        )}
      </div>
    );
  }
);

StepperItem.displayName = 'StepperItem';

// StepperContent - content for each step
interface StepperContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Step number this content belongs to
   */
  value: number;

  /**
   * Force content to be rendered even when not active
   */
  forceMount?: boolean;
}

const StepperContent = React.forwardRef<HTMLDivElement, StepperContentProps>(
  ({ value: stepValue, forceMount = false, className, children, ...props }, ref) => {
    const { value } = useStepperContext();
    const isActive = stepValue === value;

    if (!isActive && !forceMount) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        aria-hidden={!isActive}
        className={cn(
          'mt-6',
          !isActive && 'hidden',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

StepperContent.displayName = 'StepperContent';

// StepperNavigation - optional navigation buttons
interface StepperNavigationProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Total number of steps
   */
  totalSteps: number;

  /**
   * Callback when previous button is clicked
   */
  onPrevious?: () => void;

  /**
   * Callback when next button is clicked
   */
  onNext?: () => void;

  /**
   * Callback when finish button is clicked
   */
  onFinish?: () => void;

  /**
   * Labels for buttons
   */
  labels?: {
    previous?: string;
    next?: string;
    finish?: string;
  };

  /**
   * Whether navigation is disabled
   */
  disabled?: boolean;
}

const StepperNavigation = React.forwardRef<HTMLDivElement, StepperNavigationProps>(
  (
    {
      totalSteps,
      onPrevious,
      onNext,
      onFinish,
      labels = {},
      disabled = false,
      className,
      ...props
    },
    ref
  ) => {
    const { value } = useStepperContext();
    const isFirstStep = value === 1;
    const isLastStep = value === totalSteps;

    const { previous = 'Previous', next = 'Next', finish = 'Finish' } = labels;

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between mt-6 pt-6 border-t', className)}
        {...props}
      >
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstStep || disabled}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
          )}
        >
          {previous}
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={onFinish}
            disabled={disabled}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-primary-600 text-white hover:bg-primary-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
            )}
          >
            {finish}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={disabled}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-primary-600 text-white hover:bg-primary-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
            )}
          >
            {next}
          </button>
        )}
      </div>
    );
  }
);

StepperNavigation.displayName = 'StepperNavigation';

export {
  Stepper,
  StepperList,
  StepperItem,
  StepperContent,
  StepperNavigation,
  type StepperProps,
  type StepperItemProps,
  type StepperContentProps,
  type StepperNavigationProps,
};
