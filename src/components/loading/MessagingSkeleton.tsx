/**
 * Messaging Skeleton - Loading state for the messaging/chat interface
 */

import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

export function MessagingSkeleton() {
  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden" role="status" aria-busy="true" aria-label="Loading messages">
      {/* Sidebar */}
      <div className="w-80 border-r bg-neutral-50 dark:bg-neutral-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton animation="shimmer" className="h-6 w-24" />
          <Skeleton animation="shimmer" variant="circular" size="sm" />
        </div>
        <Skeleton animation="shimmer" className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton animation="shimmer" variant="avatar" size="md" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Skeleton animation="shimmer" className="h-4 w-20" />
                  <Skeleton animation="shimmer" className="h-3 w-8" />
                </div>
                <Skeleton animation="shimmer" className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-white dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton animation="shimmer" variant="avatar" size="sm" />
              <div className="space-y-1">
                <Skeleton animation="shimmer" className="h-4 w-32" />
                <Skeleton animation="shimmer" className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
              <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={cn(
              "flex gap-3",
              i % 2 === 0 ? "flex-row-reverse" : ""
            )}>
              <Skeleton animation="shimmer" variant="avatar" size="sm" />
              <div className={cn(
                "max-w-xs space-y-1",
                i % 2 === 0 ? "items-end" : "items-start"
              )}>
                <Skeleton animation="shimmer" className="h-3 w-16" />
                <Skeleton animation="shimmer" className={cn(
                  "h-8 rounded-lg",
                  i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-32" : "w-56"
                )} />
                <Skeleton animation="shimmer" className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2">
            <Skeleton animation="shimmer" className="h-8 w-8 rounded" />
            <Skeleton animation="shimmer" className="h-10 flex-1" />
            <Skeleton animation="shimmer" className="h-10 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
