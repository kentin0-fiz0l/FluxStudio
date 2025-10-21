/**
 * Flux Design Language - UI Components Index
 *
 * Central export for all atomic UI components.
 * These are the foundational building blocks for the FluxStudio interface.
 */

// Button
export { Button, buttonVariants, type ButtonProps } from './Button';

// Input
export { Input, inputVariants, type InputProps } from './Input';

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
} from './Card';

// Badge
export { Badge, badgeVariants, type BadgeProps } from './Badge';

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
} from './Dialog';

// Accessibility Components
export { SkipLink, type SkipLinkProps } from './SkipLink';

// Empty State
export { EmptyState, type EmptyStateProps } from './EmptyState';
