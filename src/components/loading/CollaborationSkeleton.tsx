/**
 * Collaboration Skeleton - Loading state for the collaboration panel
 */

import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function CollaborationSkeleton() {
  return (
    <div className="absolute top-4 right-4" role="status" aria-busy="true" aria-label="Loading collaboration panel">
      <Card className="w-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton animation="shimmer" className="w-4 h-4" />
              <Skeleton animation="shimmer" className="h-4 w-32" />
            </div>
            <Skeleton animation="shimmer" className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Skeleton animation="shimmer" variant="avatar" size="sm" />
                    <Skeleton animation="shimmer" className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton animation="shimmer" className="h-3 w-20" />
                    <Skeleton animation="shimmer" className="h-2 w-16" />
                  </div>
                </div>
                <Skeleton animation="shimmer" className="h-5 w-12" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <Skeleton animation="shimmer" className="h-8 flex-1" />
            <Skeleton animation="shimmer" className="h-8 flex-1" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
