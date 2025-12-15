/**
 * PulseIndicator - Badge showing unseen activity count
 *
 * Displays a visual indicator when there's new activity in the focused project.
 * Clicking opens the Pulse Panel.
 *
 * Features:
 * - Animated pulse effect when new items arrive
 * - Shows count of unseen items
 * - Accessible with ARIA labels
 *
 * Part of Project Pulse: "Here's what's happening and what needs you."
 */

import * as React from 'react';
import { Activity, Bell, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useProjectPulse } from '@/hooks/useProjectPulse';

export interface PulseIndicatorProps {
  /** Callback when indicator is clicked */
  onClick?: () => void;
  /** Whether the pulse panel is currently open */
  isOpen?: boolean;
  /** Custom className */
  className?: string;
  /** Variant: icon-only or with label */
  variant?: 'icon' | 'badge' | 'button';
}

export function PulseIndicator({
  onClick,
  isOpen = false,
  className,
  variant = 'badge',
}: PulseIndicatorProps) {
  const { unseenCount, isAvailable, attentionItems, isLoading, isConnected } = useProjectPulse();
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  // Trigger animation when count increases
  const prevCount = React.useRef(unseenCount);
  React.useEffect(() => {
    if (unseenCount > prevCount.current) {
      setShouldAnimate(true);
      const timer = setTimeout(() => setShouldAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
    prevCount.current = unseenCount;
  }, [unseenCount]);

  // Don't render if no project is focused
  if (!isAvailable) {
    return null;
  }

  const hasUnseen = unseenCount > 0;
  const hasAttention = attentionItems.length > 0;
  const displayCount = unseenCount > 99 ? '99+' : unseenCount;

  const ariaLabel = hasUnseen
    ? `${unseenCount} new updates in project. ${attentionItems.length} items need your attention.`
    : 'View project pulse';

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
          isOpen && 'bg-primary-100 dark:bg-primary-900/30',
          className
        )}
        aria-label={ariaLabel}
        aria-pressed={isOpen}
      >
        <Activity
          className={cn(
            'h-5 w-5',
            hasUnseen
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-500 dark:text-neutral-400'
          )}
        />
        {hasUnseen && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center',
              'rounded-full bg-primary-600 text-[10px] font-bold text-white',
              shouldAnimate && 'animate-pulse'
            )}
          >
            {displayCount}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full',
          'text-sm font-medium transition-all',
          hasUnseen
            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
          isOpen && 'ring-2 ring-primary-500 ring-offset-2',
          shouldAnimate && 'animate-pulse',
          !isConnected && 'opacity-75',
          className
        )}
        aria-label={ariaLabel}
        aria-pressed={isOpen}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Activity className="h-4 w-4" aria-hidden="true" />
        )}
        {hasUnseen ? (
          <>
            <span>{displayCount} new</span>
            {hasAttention && (
              <span className="ml-1 flex h-2 w-2 rounded-full bg-amber-500" />
            )}
          </>
        ) : (
          <span>Pulse</span>
        )}
        {/* Offline indicator */}
        {!isConnected && (
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500"
            title="Offline - real-time updates paused"
          >
            <WifiOff className="h-2 w-2 text-white" />
          </span>
        )}
      </button>
    );
  }

  // Button variant
  return (
    <Button
      variant={hasUnseen ? 'primary' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(shouldAnimate && 'animate-pulse', className)}
      aria-label={ariaLabel}
      aria-pressed={isOpen}
    >
      <Activity className="h-4 w-4 mr-1.5" aria-hidden="true" />
      {hasUnseen ? `${displayCount} new` : 'Pulse'}
      {hasAttention && (
        <span
          className={cn(
            'ml-1.5 flex h-2 w-2 rounded-full',
            hasUnseen ? 'bg-white' : 'bg-amber-500'
          )}
        />
      )}
    </Button>
  );
}

export default PulseIndicator;
