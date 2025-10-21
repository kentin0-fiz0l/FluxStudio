/**
 * SkipLink Component
 * Provides keyboard navigation to main content (WCAG 2.1 AA requirement)
 *
 * @example
 * <SkipLink href="#main-content" />
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  /** Target element ID (e.g., "#main-content") */
  href: string;
  /** Custom link text */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ href, children = 'Skip to main content', className }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={cn(
          // Hidden by default, visible on focus
          'sr-only focus:not-sr-only',
          // Positioning
          'focus:absolute focus:top-4 focus:left-4 focus:z-50',
          // Styling
          'focus:px-4 focus:py-2',
          'focus:bg-primary focus:text-primary-foreground',
          'focus:rounded-md',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          // Animation
          'focus:transition-all focus:duration-200',
          // Typography
          'font-medium text-sm',
          className
        )}
        onClick={(e) => {
          // Smooth scroll to target
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Set focus to target for screen readers
            (target as HTMLElement).focus({ preventScroll: true });
          }
        }}
      >
        {children}
      </a>
    );
  }
);

SkipLink.displayName = 'SkipLink';
