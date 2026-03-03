/**
 * Project Skeletons - Loading states for project cards and detail pages
 */

import { Skeleton, SkeletonCard } from '../ui/skeleton';

/**
 * Project Card Skeleton - For project list loading
 */
export function ProjectCardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading project">
      <SkeletonCard animation="shimmer" showHeader showFooter contentLines={2} />
    </div>
  );
}

/**
 * Project Detail Skeleton - For project detail page loading
 */
export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col h-full" role="status" aria-busy="true" aria-label="Loading project details">
      {/* Header Skeleton */}
      <div className="bg-white dark:bg-neutral-900 border-b px-6 py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
              <Skeleton animation="shimmer" className="h-7 w-64" />
            </div>
            <div className="flex items-center gap-3 ml-12">
              <Skeleton animation="shimmer" className="h-6 w-20 rounded-full" />
              <Skeleton animation="shimmer" className="h-6 w-28 rounded-full" />
              <Skeleton animation="shimmer" className="h-6 w-24" />
              <Skeleton animation="shimmer" className="h-6 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-9 w-20" />
            <Skeleton animation="shimmer" className="h-9 w-24" />
            <Skeleton animation="shimmer" className="h-9 w-9" />
          </div>
        </div>
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="border-b px-6 py-2">
        <div className="flex gap-1">
          {['Overview', 'Tasks', 'Documents', 'Files', 'Assets', 'Boards', 'Messages'].map((tab) => (
            <Skeleton key={tab} animation="shimmer" className="h-10 w-24" />
          ))}
        </div>
      </div>

      {/* Content Area Skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton animation="shimmer" className="h-6 w-48" />
        <Skeleton animation="shimmer" className="h-4 w-full" />
        <Skeleton animation="shimmer" className="h-4 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} animation="shimmer" contentLines={3} showFooter />
          ))}
        </div>
      </div>
    </div>
  );
}
