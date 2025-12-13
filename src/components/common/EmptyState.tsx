/**
 * EmptyState Component
 *
 * A reusable empty state display for lists and collections.
 * Creative Studio tone: warm, clear, non-corporate.
 *
 * @example
 * <EmptyState
 *   icon={FolderOpen}
 *   title="No projects yet."
 *   description="Projects are where creative work takes shape."
 *   primaryCtaLabel="Create Project"
 *   onPrimaryCta={() => navigate('/projects/new')}
 * />
 */

import * as React from 'react';
import { LucideIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Icon to display (Lucide icon component) */
  icon?: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text below title */
  description: string;
  /** Primary CTA button label */
  primaryCtaLabel?: string;
  /** Primary CTA click handler */
  onPrimaryCta?: () => void;
  /** Secondary CTA button label (optional) */
  secondaryCtaLabel?: string;
  /** Secondary CTA click handler */
  onSecondaryCta?: () => void;
  /** Learn more content (shown in collapsible accordion) */
  learnMoreItems?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryCtaLabel,
  onPrimaryCta,
  secondaryCtaLabel,
  onSecondaryCta,
  learnMoreItems,
  className,
  size = 'md',
}: EmptyStateProps) {
  const [isLearnMoreOpen, setIsLearnMoreOpen] = React.useState(false);

  const sizeClasses = {
    sm: {
      container: 'py-8 px-4',
      icon: 'h-10 w-10',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12 px-6',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        classes.container,
        className
      )}
    >
      {/* Icon */}
      {Icon && (
        <div className="mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 p-4">
          <Icon
            className={cn(
              'text-neutral-400 dark:text-neutral-500',
              classes.icon
            )}
          />
        </div>
      )}

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-neutral-900 dark:text-neutral-100',
          classes.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'mt-2 text-neutral-500 dark:text-neutral-400 max-w-md',
          classes.description
        )}
      >
        {description}
      </p>

      {/* CTAs */}
      {(primaryCtaLabel || secondaryCtaLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryCtaLabel && onPrimaryCta && (
            <Button onClick={onPrimaryCta} variant="primary">
              {primaryCtaLabel}
            </Button>
          )}
          {secondaryCtaLabel && onSecondaryCta && (
            <Button onClick={onSecondaryCta} variant="outline">
              {secondaryCtaLabel}
            </Button>
          )}
        </div>
      )}

      {/* Learn More Accordion */}
      {learnMoreItems && learnMoreItems.length > 0 && (
        <div className="mt-6 w-full max-w-sm">
          <button
            type="button"
            onClick={() => setIsLearnMoreOpen(!isLearnMoreOpen)}
            className="flex items-center justify-center gap-1 w-full text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            <span>Learn more</span>
            {isLearnMoreOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {isLearnMoreOpen && (
            <ul className="mt-3 space-y-2 text-left">
              {learnMoreItems.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400"
                >
                  <span className="text-primary-500 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states with Creative Studio copy
export const emptyStateConfigs = {
  projects: {
    title: 'No projects yet.',
    description:
      'Projects are where creative work takes shape — conversations, files, tools, and boards all connect here.',
    primaryCtaLabel: 'Create Project',
    learnMoreItems: [
      'Keep context close',
      'Share with collaborators',
      'Return anytime',
    ],
  },
  messages: {
    title: 'No conversations yet.',
    description:
      'Start a conversation to brainstorm, give feedback, or plan next steps — everything stays connected to your work.',
    primaryCtaLabel: 'New Conversation',
    learnMoreItems: [
      'Keep context close',
      'Share with collaborators',
      'Return anytime',
    ],
  },
  files: {
    title: 'No files here yet.',
    description:
      'Upload references, drafts, audio, or exports so your work and discussions stay in sync.',
    primaryCtaLabel: 'Upload File',
    learnMoreItems: [
      'Keep context close',
      'Share with collaborators',
      'Return anytime',
    ],
  },
  boards: {
    title: 'No boards yet.',
    description:
      'Design boards are for visual thinking — sketch ideas, layouts, and concepts collaboratively.',
    primaryCtaLabel: 'New Board',
    learnMoreItems: [
      'Keep context close',
      'Share with collaborators',
      'Return anytime',
    ],
  },
} as const;

export default EmptyState;
