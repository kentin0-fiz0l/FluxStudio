/**
 * Notification Skeleton - Loading state for the notification panel
 */

import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function NotificationSkeleton() {
  return (
    <Card className="w-full max-w-96 max-h-[600px]" role="status" aria-busy="true" aria-label="Loading notifications">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="w-5 h-5" />
            <Skeleton animation="shimmer" className="h-5 w-24" />
            <Skeleton animation="shimmer" className="h-5 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-8 w-8" />
            <Skeleton animation="shimmer" className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {['All', 'Unread', 'Actionable'].map((filter) => (
            <Skeleton key={filter} animation="shimmer" className="h-7 w-16" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex gap-3">
                <Skeleton animation="shimmer" className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <Skeleton animation="shimmer" className="h-4 w-48" />
                    <Skeleton animation="shimmer" variant="circular" className="w-2 h-2" />
                  </div>
                  <Skeleton animation="shimmer" className="h-3 w-full" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton animation="shimmer" className="h-3 w-12" />
                      <Skeleton animation="shimmer" className="h-3 w-16" />
                    </div>
                    <Skeleton animation="shimmer" className="h-6 w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
