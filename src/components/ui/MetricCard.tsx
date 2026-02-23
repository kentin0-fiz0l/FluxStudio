/**
 * MetricCard — Reusable analytics metric display component
 *
 * Provides a consistent way to display KPIs, stats, and metrics across
 * analytics dashboards. Supports trend indicators, badges, and sparklines.
 *
 * Sprint 56: Unified metric display component
 */

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// MetricCard
// ============================================================================

export interface MetricCardProps {
  /** Main content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Background accent color */
  accent?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const accentStyles: Record<string, string> = {
  default: 'border-neutral-200 dark:border-neutral-700',
  success: 'border-l-4 border-l-green-500 border-neutral-200 dark:border-neutral-700',
  warning: 'border-l-4 border-l-yellow-500 border-neutral-200 dark:border-neutral-700',
  error: 'border-l-4 border-l-red-500 border-neutral-200 dark:border-neutral-700',
  info: 'border-l-4 border-l-blue-500 border-neutral-200 dark:border-neutral-700',
};

const sizeStyles: Record<string, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function MetricCard({
  children,
  className,
  size = 'md',
  accent = 'default',
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-lg border shadow-sm',
        accentStyles[accent],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// MetricValue
// ============================================================================

export interface MetricValueProps {
  /** The metric value to display */
  value: string | number;
  /** Optional unit suffix (e.g., "%", "tasks", "hrs") */
  unit?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom color class */
  colorClassName?: string;
  /** Additional CSS classes */
  className?: string;
}

const valueSizes: Record<string, string> = {
  sm: 'text-lg font-semibold',
  md: 'text-2xl font-bold',
  lg: 'text-4xl font-bold',
};

export function MetricValue({
  value,
  unit,
  size = 'md',
  colorClassName,
  className,
}: MetricValueProps) {
  return (
    <div
      className={cn(
        valueSizes[size],
        colorClassName || 'text-neutral-900 dark:text-neutral-100',
        className
      )}
    >
      {value}
      {unit && (
        <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400 ml-1">
          {unit}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// MetricLabel
// ============================================================================

export interface MetricLabelProps {
  /** Label text */
  children: React.ReactNode;
  /** Optional description below the label */
  description?: string;
  /** Additional CSS classes */
  className?: string;
}

export function MetricLabel({ children, description, className }: MetricLabelProps) {
  return (
    <div className={cn('space-y-0.5', className)}>
      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        {children}
      </div>
      {description && (
        <div className="text-xs text-neutral-400 dark:text-neutral-500">
          {description}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MetricTrend
// ============================================================================

export interface MetricTrendProps {
  /** Trend direction */
  direction: 'up' | 'down' | 'flat';
  /** Change value (e.g., "12%", "+5") */
  value: string;
  /** Whether up is positive (green) or negative (red) */
  upIsGood?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function MetricTrend({
  direction,
  value,
  upIsGood = true,
  className,
}: MetricTrendProps) {
  const isPositive =
    direction === 'flat' ? null :
    (direction === 'up') === upIsGood;

  const colorClass =
    isPositive === null
      ? 'text-neutral-500 dark:text-neutral-400'
      : isPositive
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400';

  const Icon =
    direction === 'up' ? TrendingUp :
    direction === 'down' ? TrendingDown :
    Minus;

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', colorClass, className)}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {value}
    </span>
  );
}

// ============================================================================
// MetricBadge
// ============================================================================

export interface MetricBadgeProps {
  /** Badge text */
  children: React.ReactNode;
  /** Variant */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  /** Additional CSS classes */
  className?: string;
}

const badgeVariants: Record<string, string> = {
  success: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  warning: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  error: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  neutral: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300',
};

export function MetricBadge({
  children,
  variant = 'neutral',
  className,
}: MetricBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================================
// MetricGroup — Horizontal row of metrics
// ============================================================================

export interface MetricGroupProps {
  children: React.ReactNode;
  /** Number of columns (auto-fits if not specified) */
  columns?: 2 | 3 | 4;
  className?: string;
}

const columnStyles: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

export function MetricGroup({ children, columns, className }: MetricGroupProps) {
  return (
    <div
      className={cn(
        'grid gap-3',
        columns ? columnStyles[columns] : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}
