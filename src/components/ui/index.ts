/**
 * Flux Design Language - UI Components Index
 *
 * Central export for all atomic UI components.
 * These are the foundational building blocks for the FluxStudio interface.
 */

// Button
export { Button, buttonVariants, type ButtonProps } from './button';

// Input
export { Input, inputVariants, type InputProps } from './input';

// Card
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
  type CardProps,
} from './card';

// Badge
export { Badge, badgeVariants, type BadgeProps } from './badge';

// Dialog/Modal
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

// Accessibility Components
export { SkipLink, type SkipLinkProps } from './SkipLink';

// Empty State
export { EmptyState, type EmptyStateProps } from './EmptyState';

// Skeleton
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  skeletonVariants,
  type SkeletonProps,
} from './skeleton';

// Spinner
export {
  Spinner,
  SpinnerOverlay,
  spinnerVariants,
  type SpinnerProps,
} from './spinner';

// Circular Progress
export {
  CircularProgress,
  circularProgressVariants,
  type CircularProgressProps,
} from './circular-progress';

// Stepper
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
} from './stepper';

// Form Field
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
} from './form-field';

// Error State
export {
  ErrorState,
  InlineError,
  errorStateVariants,
  type ErrorStateProps,
} from './error-state';

// Progress Toast
export {
  ProgressToastContent,
  showProgressToast,
  updateProgressToast,
  dismissProgressToast,
  showUploadToast,
  showBulkOperationToast,
  type ProgressToastOptions,
} from './progress-toast';
