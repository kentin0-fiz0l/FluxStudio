/**
 * Dashboard Skeleton - Loading state for the main dashboard
 */

import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-6" role="status" aria-busy="true" aria-label="Loading dashboard">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton animation="shimmer" className="h-8 w-80" />
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-6 w-16" />
            <Skeleton animation="shimmer" className="h-6 w-20" />
            <Skeleton animation="shimmer" className="h-6 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton animation="shimmer" className="h-10 w-32" />
          <Skeleton animation="shimmer" className="h-10 w-28" />
        </div>
      </div>

      {/* Contextual Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-l-4 border-l-neutral-200 dark:border-l-neutral-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton animation="shimmer" className="w-5 h-5 rounded" />
                  <Skeleton animation="shimmer" className="h-4 w-24" />
                </div>
                <Skeleton animation="shimmer" className="h-5 w-16" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton animation="shimmer" className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Tabs Skeleton */}
            <div className="flex space-x-2">
              {['Activity', 'Workflows', 'AI Assistant', 'Stats'].map((tab) => (
                <Skeleton key={tab} animation="shimmer" className="h-10 w-20" />
              ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <Skeleton animation="shimmer" className="w-8 h-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton animation="shimmer" className="h-4 w-48" />
                        <Skeleton animation="shimmer" className="h-3 w-16" />
                      </div>
                      <Skeleton animation="shimmer" className="h-3 w-full" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton animation="shimmer" className="w-5 h-5 rounded-full" />
                          <Skeleton animation="shimmer" className="h-3 w-20" />
                        </div>
                        <Skeleton animation="shimmer" className="h-6 w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <Skeleton animation="shimmer" className="h-5 w-24" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton animation="shimmer" className="h-4 w-20" />
                        <Skeleton animation="shimmer" className="h-5 w-8" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
