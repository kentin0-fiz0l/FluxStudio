/**
 * PrintingDashboard Component
 * Phase 2: Native Component Integration
 * Phase 2.5: Database Integration with Print History
 *
 * Main dashboard layout component integrating all native FluxPrint components.
 * Replaces the iframe-based approach with native React components for better
 * performance, customization, and user experience.
 * Phase 2.5 adds print history display and project linking.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Printer, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { usePrinterStatus } from '@/hooks/usePrinterStatus';
import { apiService } from '@/services/apiService';
import PrinterStatusCard from './PrinterStatusCard';
import TemperatureMonitor from './TemperatureMonitor';
import CameraFeed from './CameraFeed';
import PrintQueue from './PrintQueue';
import FileBrowser from './FileBrowser';
import PrintHistory from './PrintHistory';
import WebSocketStatus from './WebSocketStatus';
import { cn } from '@/lib/utils';

interface PrintingDashboardProps {
  className?: string;
}

export const PrintingDashboard: React.FC<PrintingDashboardProps> = ({ className = '' }) => {
  // Use the centralized printer status hook (Phase 3A: with WebSocket support)
  const {
    status,
    queue,
    files,
    temperature,
    loading,
    statusError,
    queueError,
    filesError,
    refetch,
    refetchStatus,
    addToQueue,
    removeFromQueue,
    startJob,
    uploadFile,
    deleteFile,
    isServiceAvailable,
    webSocketStatus, // Phase 3A: WebSocket connection status
  } = usePrinterStatus({
    enableWebSocket: true,  // Phase 3A: Enable real-time updates
    enablePolling: true,    // Keep as fallback
    statusInterval: 30000,  // 30 seconds (fallback only)
    jobInterval: 5000,      // 5 seconds when printing (fallback only)
    queueInterval: 30000,   // 30 seconds
    filesInterval: 60000,   // 60 seconds
  });

  /**
   * Handle preheat command
   */
  const handlePreheat = async (target: 'bed' | 'hotend', temperature: number) => {
    try {
      const endpoint =
        target === 'bed'
          ? '/printing/temperature/bed'
          : '/printing/temperature/hotend';

      await apiService.post(endpoint, { target: temperature });

      // Refresh status
      await refetchStatus();
    } catch (err) {
      console.error('Preheat error:', err);
      alert(`Failed to set ${target} temperature`);
    }
  };

  /**
   * Handle open external FluxPrint
   */
  const handleOpenExternal = () => {
    window.open('http://localhost:5001', '_blank');
  };

  /**
   * Global loading state (initial load)
   */
  if (loading && !status && !queue && !files) {
    return (
      <div className={cn('h-screen flex flex-col bg-gray-50', className)}>
        {/* Header Skeleton */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <Skeleton className="h-full rounded-lg" />
            <Skeleton className="h-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-screen flex flex-col bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Printer className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">3D Printing</h1>
              <p className="text-sm text-gray-600">Manage print jobs and monitor printer status</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Phase 3A: WebSocket Connection Status */}
            <WebSocketStatus status={webSocketStatus} />

            <Badge variant={isServiceAvailable ? 'success' : 'error'} dot>
              {isServiceAvailable ? 'Service Online' : 'Service Offline'}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
              Open External
            </Button>
          </div>
        </div>
      </div>

      {/* Service Offline Banner */}
      {!isServiceAvailable && (
        <div className="px-6 pt-6 flex-shrink-0">
          <Alert variant="destructive">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <AlertTitle>FluxPrint Service Unavailable</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>Unable to connect to the FluxPrint service. Please check the following:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Ensure the FluxPrint Flask server is running on port 5001</li>
                <li>Check that FLUXPRINT_ENABLED=true in your environment configuration</li>
                <li>Verify network connectivity to localhost:5001</li>
              </ul>
              <div className="flex space-x-2 mt-3">
                <Button onClick={refetch} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Retry Connection
                </Button>
                <Button
                  onClick={() => window.open('http://localhost:5001', '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                  Test Direct Connection
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-min">
          {/* Row 1: Status + Temperature */}
          <div className="h-[400px]">
            <PrinterStatusCard
              status={status}
              loading={false}
              error={statusError}
              onRefresh={refetchStatus}
            />
          </div>

          <div className="h-[400px]">
            <TemperatureMonitor
              status={status}
              history={temperature || undefined}
              loading={false}
              error={statusError}
              showChart={true}
              onPreheat={handlePreheat}
            />
          </div>

          {/* Row 2: Camera + Queue */}
          <div className="h-[500px]">
            <CameraFeed
              loading={false}
              error={null}
              onSnapshot={(_snapshot) => {
              }}
            />
          </div>

          <div className="h-[500px]">
            <PrintQueue
              queue={queue}
              loading={false}
              error={queueError}
              onAddToQueue={addToQueue}
              onRemoveFromQueue={removeFromQueue}
              onStartJob={startJob}
            />
          </div>

          {/* Row 3: File Browser (Full Width) */}
          <div className="lg:col-span-2 h-[600px]">
            <FileBrowser
              files={files}
              loading={false}
              error={filesError}
              onUpload={async (fileList) => {
                await uploadFile(fileList);
              }}
              onDelete={deleteFile}
              onAddToQueue={async (filename) => {
                await addToQueue(filename, 'normal');
              }}
            />
          </div>

          {/* Row 4: Print History (Full Width) - Phase 2.5 */}
          <div className="lg:col-span-2 h-[600px]">
            <PrintHistory limit={20} />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>FluxPrint Integration v2.5</span>
            <span>•</span>
            <span>Phase 2.5: Database Integration</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Backend:</span>
            <code className="bg-gray-100 px-2 py-1 rounded">localhost:3001</code>
            <span>•</span>
            <span>FluxPrint:</span>
            <code className="bg-gray-100 px-2 py-1 rounded">localhost:5001</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingDashboard;
