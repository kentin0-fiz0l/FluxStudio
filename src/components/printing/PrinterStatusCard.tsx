/**
 * PrinterStatusCard Component
 * Displays real-time printer connection and job status
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import {
  Printer,
  Circle,
  AlertCircle,
  Pause,
  Play,
  X,
  Clock,
  RefreshCw
} from 'lucide-react';
import { PrinterStatusCardProps, PrinterState } from '@/types/printing';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/apiService';


/**
 * Get badge variant based on printer state
 */
const getBadgeVariant = (state: PrinterState): 'success' | 'warning' | 'error' | 'default' => {
  switch (state) {
    case 'Operational':
    case 'Printing':
      return 'success';
    case 'Paused':
    case 'Pausing':
      return 'warning';
    case 'Error':
    case 'Cancelling':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
const formatTime = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) return '--:--';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const PrinterStatusCard: React.FC<PrinterStatusCardProps> = ({
  status,
  loading = false,
  error = null,
  onRefresh,
  className = '',
}) => {
  const [isPausing, setIsPausing] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  const isPrinting = status?.state.flags.printing ?? false;
  const isPaused = status?.state.flags.paused ?? false;
  const printerState = status?.state.text ?? 'Unknown';
  const isConnected = status?.state.flags.operational ?? false;

  /**
   * Handle pause/resume button click
   */
  const handlePauseResume = async () => {
    if (!status) return;

    setIsPausing(true);
    try {
      const endpoint = isPaused ? '/api/printing/job/resume' : '/api/printing/job/pause';
      await apiService.post(endpoint);

      onRefresh?.();
    } catch (err) {
      console.error('Pause/Resume error:', err);
    } finally {
      setIsPausing(false);
    }
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = async () => {
    if (!status || !confirm('Are you sure you want to cancel this print job?')) return;

    setIsCancelling(true);
    try {
      await apiService.post('/api/printing/job/cancel');

      onRefresh?.();
    } catch (err) {
      console.error('Cancel error:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" aria-hidden="true" />
            Printer Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
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
            <Printer className="h-5 w-5" aria-hidden="true" />
            Printer Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-error-600">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm">{error}</p>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!status) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" aria-hidden="true" />
            Printer Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">No printer data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5" aria-hidden="true" />
            Printer Status
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-8 w-8"
              aria-label="Refresh status"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Circle
              className={cn(
                'h-3 w-3 fill-current',
                isConnected ? 'text-success-600' : 'text-error-600'
              )}
              aria-label={isConnected ? 'Connected' : 'Disconnected'}
            />
            <span className="text-sm font-medium text-neutral-700">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <Badge variant={getBadgeVariant(printerState)}>
            {printerState}
          </Badge>
        </div>

        {/* Print Job Progress (only show when printing or paused) */}
        {(isPrinting || isPaused) && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700">Current Job</span>
                <span className="text-neutral-500">0%</span>
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-neutral-500 truncate">
                No job name available
              </p>
            </div>

            {/* Time Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-xs font-medium">Elapsed</span>
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  {formatTime(0)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-xs font-medium">Remaining</span>
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  {formatTime(null)}
                </p>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant={isPaused ? 'primary' : 'tertiary'}
                size="sm"
                onClick={handlePauseResume}
                disabled={isPausing || isCancelling}
                loading={isPausing}
                className="flex-1"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" aria-hidden="true" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancel}
                disabled={isPausing || isCancelling}
                loading={isCancelling}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" aria-hidden="true" />
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Idle state message */}
        {!isPrinting && !isPaused && isConnected && (
          <div className="text-center py-4">
            <p className="text-sm text-neutral-500">
              Printer ready. No active jobs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrinterStatusCard;
