/**
 * UniversalEmptyState - Standardized empty state component
 *
 * Every empty state has: icon, title, description, primary action, optional secondary action.
 * No dead ends - users always have a path forward.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
}

export interface UniversalEmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title explaining what's missing */
  title: string;
  /** Description explaining why this matters or what to do */
  description: string;
  /** Primary action button */
  primaryAction?: EmptyStateAction;
  /** Optional secondary action */
  secondaryAction?: EmptyStateAction;
  /** Illustration type for visual variety */
  illustration?: 'project' | 'file' | 'team' | 'message' | 'search' | 'default';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const illustrationColors = {
  project: 'from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30',
  file: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
  team: 'from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30',
  message: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30',
  search: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30',
  default: 'from-neutral-100 to-neutral-200 dark:from-neutral-800/50 dark:to-neutral-700/50',
};

const iconColors = {
  project: 'text-primary-600 dark:text-primary-400',
  file: 'text-blue-600 dark:text-blue-400',
  team: 'text-green-600 dark:text-green-400',
  message: 'text-purple-600 dark:text-purple-400',
  search: 'text-amber-600 dark:text-amber-400',
  default: 'text-neutral-500 dark:text-neutral-400',
};

const sizeClasses = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-10 h-10',
    iconContainer: 'w-16 h-16',
    title: 'text-base',
    description: 'text-sm',
    button: 'sm' as const,
  },
  md: {
    container: 'py-12 px-6',
    icon: 'w-12 h-12',
    iconContainer: 'w-20 h-20',
    title: 'text-lg',
    description: 'text-sm',
    button: 'md' as const,
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-16 h-16',
    iconContainer: 'w-24 h-24',
    title: 'text-xl',
    description: 'text-base',
    button: 'lg' as const,
  },
};

export function UniversalEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  illustration = 'default',
  size = 'md',
  className,
}: UniversalEmptyStateProps) {
  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {/* Icon with gradient background */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={cn(
          'rounded-2xl bg-gradient-to-br flex items-center justify-center mb-6',
          illustrationColors[illustration],
          sizes.iconContainer
        )}
      >
        <Icon className={cn(sizes.icon, iconColors[illustration])} />
      </motion.div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-neutral-900 dark:text-white mb-2',
          sizes.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-neutral-600 dark:text-neutral-400 max-w-sm mb-6',
          sizes.description
        )}
      >
        {description}
      </p>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              size={sizes.button}
              className="gap-2"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
              size={sizes.button}
              className="gap-2"
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// Pre-configured empty states for common scenarios
export const emptyStateConfigs = {
  projects: {
    title: 'No projects yet',
    description: 'Create your first project to start collaborating with your team.',
    illustration: 'project' as const,
  },
  files: {
    title: 'No files uploaded',
    description: 'Upload files to organize your designs, documents, and media.',
    illustration: 'file' as const,
  },
  assets: {
    title: 'No assets yet',
    description: 'Assets help organize your design files, logos, and media for easy reuse.',
    illustration: 'file' as const,
  },
  team: {
    title: 'No team members',
    description: 'Invite team members to collaborate on projects together.',
    illustration: 'team' as const,
  },
  messages: {
    title: 'No messages yet',
    description: 'Start a conversation with your team to collaborate in real-time.',
    illustration: 'message' as const,
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
    illustration: 'search' as const,
  },
  tasks: {
    title: 'No tasks yet',
    description: 'Create tasks to track progress and keep your team aligned.',
    illustration: 'project' as const,
  },
  notifications: {
    title: 'All caught up!',
    description: 'You have no new notifications. Check back later.',
    illustration: 'default' as const,
  },
};

export default UniversalEmptyState;
