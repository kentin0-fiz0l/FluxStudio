/**
 * Feature Skeletons - Loading states for formation editor, settings, and widgets
 */

import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

/**
 * Formation Editor Skeleton - canvas + toolbar + timeline
 */
export function FormationEditorSkeleton() {
  return (
    <div className="flex flex-col h-full" role="status" aria-busy="true" aria-label="Loading formation editor">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 p-3 border-b border-neutral-200 dark:border-neutral-700">
        <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
        <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
        <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
        <div className="flex-1" />
        <Skeleton animation="shimmer" className="h-8 w-24 rounded" />
        <Skeleton animation="shimmer" className="h-8 w-20 rounded" />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative bg-neutral-100 dark:bg-neutral-800">
        {/* Grid lines hint */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Skeleton animation="shimmer" className="h-32 w-32 rounded-lg mx-auto" />
            <Skeleton animation="shimmer" className="h-4 w-40 mx-auto" />
          </div>
        </div>
        {/* Fake performer dots */}
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton
            key={i}
            animation="shimmer"
            className="absolute w-6 h-6 rounded-full"
            style={{
              top: `${20 + i * 12}%`,
              left: `${15 + i * 14}%`,
            }}
          />
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="h-16 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-3 px-4">
        <Skeleton animation="shimmer" className="h-8 w-8 rounded-full" />
        <Skeleton animation="shimmer" className="h-2 flex-1 rounded-full" />
        <Skeleton animation="shimmer" className="h-4 w-16" />
      </div>
    </div>
  );
}

/**
 * Settings Skeleton - form sections with toggles and inputs
 */
export function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6" role="status" aria-busy="true" aria-label="Loading settings">
      {/* Profile section */}
      <Card>
        <CardHeader>
          <Skeleton animation="shimmer" className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton animation="shimmer" className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton animation="shimmer" className="h-4 w-48" />
              <Skeleton animation="shimmer" className="h-3 w-32" />
            </div>
          </div>
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Notifications section */}
      <Card>
        <CardHeader>
          <Skeleton animation="shimmer" className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Skeleton animation="shimmer" className="h-4 w-36" />
                <Skeleton animation="shimmer" className="h-3 w-56" />
              </div>
              <Skeleton animation="shimmer" className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Appearance section */}
      <Card>
        <CardHeader>
          <Skeleton animation="shimmer" className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
          <Skeleton animation="shimmer" className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Widget Skeleton - lightweight placeholder for lazy-loaded analytics widgets.
 * Matches the rough dimensions of ProjectHealthDashboard, DeadlineRiskPanel,
 * and TeamWorkloadPanel to minimize layout shift during code-split loading.
 */
export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('space-y-3 animate-pulse', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading widget"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <Skeleton animation="shimmer" className="h-4 w-28" />
        <Skeleton animation="shimmer" className="h-4 w-16" />
      </div>
      {/* Content block */}
      <Skeleton animation="shimmer" className="h-32 w-full rounded-lg" />
      {/* Secondary content */}
      <div className="grid grid-cols-2 gap-2">
        <Skeleton animation="shimmer" className="h-14 rounded" />
        <Skeleton animation="shimmer" className="h-14 rounded" />
      </div>
    </div>
  );
}
