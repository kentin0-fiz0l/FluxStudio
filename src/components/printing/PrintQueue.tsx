/**
 * PrintQueue Component
 * Print queue management interface with drag-and-drop reordering
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import {
  ListOrdered,
  AlertCircle,
  Trash2,
  Play,
  Clock,
  FileText,
  X,
} from 'lucide-react';
import { PrintQueueProps, QueueItem, QueueJobStatus } from '@/types/printing';
import { cn } from '@/lib/utils';

/**
 * Get badge variant based on job status
 */
const getStatusBadge = (status: QueueJobStatus): { variant: 'success' | 'error' | 'secondary' | 'default'; label: string } => {
  switch (status) {
    case 'printing':
      return { variant: 'success', label: 'Printing' };
    case 'completed':
      return { variant: 'success', label: 'Completed' };
    case 'failed':
      return { variant: 'error', label: 'Failed' };
    case 'cancelled':
      return { variant: 'default', label: 'Cancelled' };
    default:
      return { variant: 'default', label: 'Queued' };
  }
};

/**
 * Format date string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

/**
 * Format estimated time
 */
const formatEstimatedTime = (seconds?: number): string => {
  if (!seconds) return 'Unknown';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

/**
 * Queue Item Component
 */
interface QueueItemProps {
  item: QueueItem;
  onRemove: (id: number) => void;
  onStart: (id: number) => void;
  isRemoving: boolean;
  isStarting: boolean;
}

const QueueItemCard: React.FC<QueueItemProps> = ({
  item,
  onRemove,
  onStart,
  isRemoving,
  isStarting,
}) => {
  const status = getStatusBadge(item.status);
  const isQueued = item.status === 'queued';

  return (
    <div className="group p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Position Number */}
        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full flex items-center justify-center text-sm font-semibold">
          {item.position}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" aria-hidden="true" />
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {item.filename}
                </h4>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {formatDate(item.addedAt)}
                </span>
                {item.estimatedTime && (
                  <span>Est. {formatEstimatedTime(item.estimatedTime)}</span>
                )}
              </div>
            </div>

            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </div>

          {/* Progress Bar (if printing) */}
          {item.status === 'printing' && item.progress !== undefined && (
            <div className="space-y-1">
              <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success-600 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.progress}% complete</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isQueued && item.position === 1 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onStart(item.id)}
                disabled={isStarting}
                loading={isStarting}
                className="text-xs h-7"
              >
                <Play className="h-3 w-3 mr-1" aria-hidden="true" />
                Start
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(item.id)}
              disabled={isRemoving || item.status === 'printing'}
              className="text-xs h-7"
            >
              <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrintQueue: React.FC<PrintQueueProps> = ({
  queue,
  loading = false,
  error = null,
  onRemoveFromQueue,
  onStartJob,
  className = '',
}) => {
  const [removingId, setRemovingId] = React.useState<number | null>(null);
  const [startingId, setStartingId] = React.useState<number | null>(null);
  const [clearingAll, setClearingAll] = React.useState(false);

  const queueItems = queue?.items || [];
  const hasItems = queueItems.length > 0;

  /**
   * Handle remove item
   */
  const handleRemove = async (id: number) => {
    if (!onRemoveFromQueue) return;

    setRemovingId(id);
    try {
      await onRemoveFromQueue(id);
    } catch (err) {
      console.error('Remove error:', err);
    } finally {
      setRemovingId(null);
    }
  };

  /**
   * Handle start job
   */
  const handleStart = async (id: number) => {
    if (!onStartJob) return;

    setStartingId(id);
    try {
      await onStartJob(id);
    } catch (err) {
      console.error('Start error:', err);
    } finally {
      setStartingId(null);
    }
  };

  /**
   * Handle clear all
   */
  const handleClearAll = async () => {
    if (!onRemoveFromQueue || !confirm('Clear all queued items?')) return;

    setClearingAll(true);
    try {
      const queuedItems = queueItems.filter((item) => item.status === 'queued');
      await Promise.all(queuedItems.map((item) => onRemoveFromQueue(item.id)));
    } catch (err) {
      console.error('Clear all error:', err);
    } finally {
      setClearingAll(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" aria-hidden="true" />
            Print Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" aria-hidden="true" />
            Print Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-error-600 dark:text-error-400" role="alert" aria-live="polite">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5" aria-hidden="true" />
            Print Queue
            {hasItems && (
              <Badge variant="default" size="sm">
                {queueItems.length}
              </Badge>
            )}
          </div>
          {hasItems && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={clearingAll}
              className="text-xs h-8"
            >
              <X className="h-3 w-3 mr-1" aria-hidden="true" />
              Clear Queue
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {!hasItems ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <ListOrdered className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Queue Empty</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Add G-code files from the file browser below
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {queueItems.map((item) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onStart={handleStart}
                  isRemoving={removingId === item.id}
                  isStarting={startingId === item.id}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Queue Stats Footer */}
      {queue && hasItems && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 px-6 py-3 bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>Total: {queue.totalJobs}</span>
            <div className="flex gap-4">
              <span className="text-success-600 dark:text-success-400">
                Completed: {queue.completedJobs}
              </span>
              <span className="text-error-600 dark:text-error-400">
                Failed: {queue.failedJobs}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PrintQueue;
