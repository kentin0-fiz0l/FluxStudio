import * as React from 'react';
import { Activity as ActivityIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const ActivityFeedSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-3 px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-neutral-100 p-4 mb-4">
      <ActivityIcon className="h-8 w-8 text-neutral-400" aria-hidden="true" />
    </div>
    <h3 className="text-lg font-semibold text-neutral-900 mb-2">No activity yet</h3>
    <p className="text-sm text-neutral-600 max-w-sm">
      Project activity will appear here once team members start creating tasks, adding comments, or
      making updates.
    </p>
  </div>
);
