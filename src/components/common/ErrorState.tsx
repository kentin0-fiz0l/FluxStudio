/**
 * ErrorState Component
 *
 * A reusable error state display for API failures and service unavailability.
 * Creative Studio tone: calm, reassuring, actionable.
 *
 * @example
 * <ErrorState
 *   type="network"
 *   onRetry={() => refetch()}
 * />
 */

import * as React from 'react';
import {
  AlertTriangle,
  WifiOff,
  Lock,
  ServerCrash,
  RefreshCw,
  Home,
  LogIn,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export type ErrorType =
  | 'unauthorized' // 401 - session expired
  | 'forbidden' // 403 - no access
  | 'not_found' // 404 - resource not found
  | 'server_error' // 500 - server error
  | 'network' // Network/connection error
  | 'timeout' // Request timeout
  | 'generic'; // Unknown error

export interface ErrorStateProps {
  /** Type of error */
  type?: ErrorType;
  /** Custom title (overrides default) */
  title?: string;
  /** Custom description (overrides default) */
  description?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Show retry button */
  showRetry?: boolean;
  /** Show go home button */
  showGoHome?: boolean;
  /** Show login button (for 401) */
  showLogin?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Is currently retrying */
  isRetrying?: boolean;
}

// Error configurations
const errorConfigs: Record<ErrorType, {
  icon: React.ElementType;
  title: string;
  description: string;
  iconColor: string;
  bgColor: string;
}> = {
  unauthorized: {
    icon: Lock,
    title: 'Session expired',
    description: 'Your session has ended. Please sign in again to continue.',
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  forbidden: {
    icon: ShieldAlert,
    title: 'Access denied',
    description: "You don't have permission to view this content. Contact your team admin if you think this is a mistake.",
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  not_found: {
    icon: AlertTriangle,
    title: 'Not found',
    description: "We couldn't find what you're looking for. It may have been moved or deleted.",
    iconColor: 'text-neutral-500',
    bgColor: 'bg-neutral-100 dark:bg-neutral-800',
  },
  server_error: {
    icon: ServerCrash,
    title: 'Something went wrong',
    description: "Our servers are having a moment. We're working on it — try again in a few seconds.",
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  network: {
    icon: WifiOff,
    title: 'Connection issue',
    description: "Can't reach our servers. Check your internet connection and try again.",
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  timeout: {
    icon: Clock,
    title: 'Request timed out',
    description: 'The request took too long. Please try again.',
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  generic: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    iconColor: 'text-neutral-500',
    bgColor: 'bg-neutral-100 dark:bg-neutral-800',
  },
};

export function ErrorState({
  type = 'generic',
  title,
  description,
  onRetry,
  showRetry = true,
  showGoHome = true,
  showLogin = false,
  className,
  size = 'md',
  isRetrying = false,
}: ErrorStateProps) {
  const config = errorConfigs[type];
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      container: 'py-8 px-4',
      icon: 'h-10 w-10',
      iconWrapper: 'p-3',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12 px-6',
      icon: 'h-12 w-12',
      iconWrapper: 'p-4',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'h-16 w-16',
      iconWrapper: 'p-5',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  const handleGoHome = () => {
    window.location.href = '/projects';
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  // Auto show login for unauthorized
  const shouldShowLogin = showLogin || type === 'unauthorized';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        classes.container,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={cn('mb-4 rounded-full', config.bgColor, classes.iconWrapper)}>
        <Icon className={cn(config.iconColor, classes.icon)} />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-neutral-900 dark:text-neutral-100',
          classes.title
        )}
      >
        {title || config.title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'mt-2 text-neutral-500 dark:text-neutral-400 max-w-md',
          classes.description
        )}
      >
        {description || config.description}
      </p>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="primary"
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-2', isRetrying && 'animate-spin')}
            />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}

        {shouldShowLogin && (
          <Button onClick={handleLogin} variant="primary">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        )}

        {showGoHome && !shouldShowLogin && (
          <Button onClick={handleGoHome} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            Go to Projects
          </Button>
        )}
      </div>
    </div>
  );
}

// Pre-configured error states for common scenarios
export function UnauthorizedState({ onLogin }: { onLogin?: () => void }) {
  return (
    <ErrorState
      type="unauthorized"
      showRetry={false}
      showGoHome={false}
      showLogin
    />
  );
}

export function ForbiddenState() {
  return (
    <ErrorState
      type="forbidden"
      showRetry={false}
      showGoHome
    />
  );
}

export function ServerErrorState({ onRetry, isRetrying }: { onRetry?: () => void; isRetrying?: boolean }) {
  return (
    <ErrorState
      type="server_error"
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  );
}

export function NetworkErrorState({ onRetry, isRetrying }: { onRetry?: () => void; isRetrying?: boolean }) {
  return (
    <ErrorState
      type="network"
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  );
}

export function NotFoundState() {
  return (
    <ErrorState
      type="not_found"
      showRetry={false}
      showGoHome
    />
  );
}

// Helper to determine error type from status code or error
export function getErrorType(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'unauthorized';
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return 'forbidden';
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'not_found';
    }
    if (message.includes('500') || message.includes('server')) {
      return 'server_error';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
      return 'network';
    }
    if (message.includes('timeout') || message.includes('aborted')) {
      return 'timeout';
    }
  }

  // Check if it's a response with status
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    if (status >= 500) return 'server_error';
  }

  return 'generic';
}

export default ErrorState;
