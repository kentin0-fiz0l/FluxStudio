/**
 * Workflow Skeleton - Loading state for workflow templates
 */

import { Skeleton, SkeletonCard } from '../ui/skeleton';

export function WorkflowSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading workflows">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton animation="shimmer" className="h-8 w-48" />
          <Skeleton animation="shimmer" className="h-4 w-80" />
        </div>
        <Skeleton animation="shimmer" className="h-10 w-32" />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton animation="shimmer" className="h-10 flex-1" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} animation="shimmer" className="h-8 w-20" />
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} animation="shimmer" contentLines={2} showFooter />
        ))}
      </div>
    </div>
  );
}
