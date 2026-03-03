/**
 * Data Skeletons - Loading states for charts, metrics, tables, and activity feeds
 */

import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

/**
 * Chart Skeleton - For dashboard charts
 */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton animation="shimmer" className="h-5 w-32" />
        <Skeleton animation="shimmer" className="h-8 w-24" />
      </div>
      <Skeleton animation="shimmer" className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

/**
 * Metric Card Skeleton - For stat cards
 */
export function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton animation="shimmer" className="h-4 w-20" />
            <Skeleton animation="shimmer" className="h-8 w-16" />
          </div>
          <Skeleton animation="shimmer" className="h-12 w-12 rounded-lg" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Skeleton animation="shimmer" className="h-4 w-12" />
          <Skeleton animation="shimmer" className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Table Skeleton - For table loading states
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} animation="shimmer" className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b last:border-0">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} animation="shimmer" className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Activity Feed Skeleton - For activity list loading
 */
export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading activity feed">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton animation="shimmer" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton animation="shimmer" className="h-4 w-3/4" />
              <Skeleton animation="shimmer" className="h-3 w-12" />
            </div>
            <Skeleton animation="shimmer" className="h-3 w-full" />
            <div className="flex items-center gap-2">
              <Skeleton animation="shimmer" variant="avatar" size="sm" className="w-5 h-5" />
              <Skeleton animation="shimmer" className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
