export interface ErrorFallbackProps {
  /** Error that was caught */
  error?: Error | null;
  /** Component stack trace */
  componentStack?: string | null;
  /** Variant of the error display */
  variant?: 'inline' | 'card' | 'fullpage';
  /** Custom title */
  title?: string;
  /** Custom message */
  message?: string;
  /** Called when retry is clicked */
  onRetry?: () => void;
  /** Called when reset is clicked */
  onReset?: () => void;
  /** Show technical details toggle */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accent color for the variant */
  accentColor?: 'red' | 'orange' | 'yellow' | 'blue' | 'purple';
}

export type AccentColorKey = 'red' | 'orange' | 'yellow' | 'blue' | 'purple';

export interface AccentColorConfig {
  bg: string;
  icon: string;
  border: string;
}

export const accentColors: Record<AccentColorKey, AccentColorConfig> = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    icon: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    icon: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    icon: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    icon: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    icon: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
};
