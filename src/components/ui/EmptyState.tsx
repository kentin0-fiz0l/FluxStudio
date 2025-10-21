/**
 * EmptyState Component
 * Displays helpful guidance when no content is available
 *
 * @example
 * // Basic usage (no screen reader announcements)
 * <EmptyState
 *   icon={<Briefcase />}
 *   title="No projects yet"
 *   description="Create your first project to start collaborating"
 *   action={<Button onClick={handleCreate}>Create Project</Button>}
 * />
 *
 * @example
 * // With ARIA live region (for first-time visitors or critical empty states)
 * <EmptyState
 *   icon={<Briefcase />}
 *   title="No projects yet"
 *   description="Create your first project to start collaborating"
 *   action={<Button onClick={handleCreate}>Create Project</Button>}
 *   enableLiveRegion={true}
 *   liveRegionPoliteness="polite"
 * />
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Icon to display (Lucide React icon component) */
  icon?: React.ReactNode;
  /** Main heading */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Optional CTA button or action element */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Custom icon background color */
  iconBgColor?: string;
  /** Custom icon color */
  iconColor?: string;
  /** Enable ARIA live region for screen reader announcements (default: false to prevent announcement fatigue) */
  enableLiveRegion?: boolean;
  /** ARIA live region politeness level (default: 'polite') */
  liveRegionPoliteness?: 'polite' | 'assertive' | 'off';
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      className,
      iconBgColor = 'bg-neutral-100 dark:bg-neutral-800',
      iconColor = 'text-neutral-400 dark:text-neutral-500',
      enableLiveRegion = false,
      liveRegionPoliteness = 'polite',
    },
    ref
  ) => {
    // Compute ARIA attributes based on enableLiveRegion prop
    const ariaAttributes = enableLiveRegion
      ? {
          role: 'status' as const,
          'aria-live': liveRegionPoliteness,
        }
      : {};

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center',
          'text-center',
          'py-12 px-4',
          className
        )}
        {...ariaAttributes}
      >
        {/* Icon */}
        {icon && (
          <div
            className={cn(
              'w-16 h-16 rounded-full',
              'flex items-center justify-center',
              'mb-4',
              iconBgColor
            )}
          >
            <div className={cn('w-8 h-8', iconColor)}>
              {icon}
            </div>
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-200 max-w-md mb-6">
            {description}
          </p>
        )}

        {/* Action */}
        {action && (
          <div className="flex gap-3">
            {action}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
