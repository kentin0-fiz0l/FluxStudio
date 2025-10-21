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
