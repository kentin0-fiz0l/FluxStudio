/**
 * usePrinterStatus Hook
 * Phase 2: Native Component Integration
 * Phase 3A: WebSocket Real-Time Updates
 *
 * Central data management hook for 3D printer status, jobs, queue, and files.
 * Provides real-time data updates via WebSocket with REST API fallback.
 *
 * Features:
 * - WebSocket real-time updates (status, temperature, progress)
 * - Automatic fallback to REST polling on WebSocket disconnect
 * - Centralized error handling
 * - Optimistic UI updates
 * - Request deduplication
 * - Automatic retry logic
 * - Service availability detection
 * - Connection status tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/services/apiService';
import { buildApiUrl } from '@/config/environment';
import { usePrintWebSocket } from './usePrintWebSocket';
import {
  PrinterStatus,
  JobStatus,
  PrintQueue,
  FileList,
  TemperatureHistory,
  QueuePriority,
  QueueItem,
  FileUploadResponse,
  UsePrinterStatusReturn,
  POLLING_INTERVALS,
  TemperatureReading,
} from '../types/printing';

/**
 * Configuration options for the hook
 */
interface UsePrinterStatusOptions {
  /**
   * Enable WebSocket real-time updates
   * @default true
   */
  enableWebSocket?: boolean;

  /**
   * Enable automatic polling (used as fallback when WebSocket disconnected)
   * @default true
   */
  enablePolling?: boolean;

  /**
   * Polling interval for status updates (ms) - only used when WebSocket disabled
   * @default 30000
   */
  statusInterval?: number;

  /**
   * Polling interval for job updates (ms) - only used when WebSocket disabled
   * @default 5000 when printing, 30000 otherwise
   */
  jobInterval?: number;

  /**
   * Polling interval for queue updates (ms)
   * @default 30000
   */
  queueInterval?: number;

  /**
   * Polling interval for file list updates (ms)
   * @default 60000
   */
  filesInterval?: number;

  /**
   * Maximum temperature history readings to keep
   * @default 100
   */
  maxTempReadings?: number;

  /**
   * Auto-retry failed requests
   * @default true
   */
  autoRetry?: boolean;

  /**
   * Maximum retry attempts
   * @default 3
   */
  maxRetries?: number;
}

const DEFAULT_OPTIONS: Required<UsePrinterStatusOptions> = {
  enableWebSocket: true, // Phase 3A: Enable WebSocket by default
  enablePolling: true,
  statusInterval: POLLING_INTERVALS.STATUS,
  jobInterval: POLLING_INTERVALS.JOB,
  queueInterval: POLLING_INTERVALS.QUEUE,
  filesInterval: POLLING_INTERVALS.FILES,
  maxTempReadings: 100,
  autoRetry: true,
  maxRetries: 3,
};

/**
 * Custom hook for managing 3D printer data and operations
 */
export function usePrinterStatus(options: UsePrinterStatusOptions = {}): UsePrinterStatusReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Phase 3A: WebSocket connection hook
  const {
    connectionStatus: wsConnectionStatus,
    data: wsData,
    requestStatus: _wsRequestStatus,
  } = usePrintWebSocket({
    enabled: opts.enableWebSocket,
    autoReconnect: true,
    onJobComplete: (_event) => {
      // Refresh queue and job data
      fetchQueue();
      fetchJob();
    },
    onJobFailed: (event) => {
      console.warn('Print job failed:', event.filename, event.reason);
      // Refresh queue and job data
      fetchQueue();
      fetchJob();
    },
    onConnectionChange: (event) => {
      setIsServiceAvailable(event.connected);
    },
  });

  // State management
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [queue, setQueue] = useState<PrintQueue | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [temperature, setTemperature] = useState<TemperatureHistory | null>(null);

  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [jobLoading, setJobLoading] = useState<boolean>(false);
  const [queueLoading, setQueueLoading] = useState<boolean>(false);
  const [filesLoading, setFilesLoading] = useState<boolean>(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);

  // Service availability
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean>(false);

  // Refs for polling intervals
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queueIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const filesIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Retry counters
  const retryCountRef = useRef<Record<string, number>>({
    status: 0,
    job: 0,
    queue: 0,
    files: 0,
  });

  // ============================================================================
  // Fetch Functions
  // ============================================================================

  /**
   * Fetch printer status
   */
  const fetchStatus = useCallback(async (): Promise<void> => {
    try {
      setStatusLoading(true);
      setStatusError(null);

      const response = await apiService.get<PrinterStatus>('/printing/status');

      if (!response.success) {
        setIsServiceAvailable(false);
        throw new Error(response.error || 'FluxPrint service unavailable');
      }

      const data = response.data as PrinterStatus;
      setStatus(data);
      setIsServiceAvailable(true);
      retryCountRef.current.status = 0;

      // Update temperature history
      if (data.temperature) {
        setTemperature((prev) => {
          const newReading: TemperatureReading = {
            time: Date.now(),
            bed: data.temperature.bed,
            tool0: data.temperature.tool0,
            tool1: data.temperature.tool1,
          };

          const readings = prev ? [...prev.readings, newReading] : [newReading];

          // Keep only the last N readings
          if (readings.length > opts.maxTempReadings) {
            readings.shift();
          }

          return {
            readings,
            interval: opts.statusInterval / 1000,
            maxReadings: opts.maxTempReadings,
          };
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch printer status';
      setStatusError(errorMessage);
      setIsServiceAvailable(false);

      // Retry logic
      if (opts.autoRetry && retryCountRef.current.status < opts.maxRetries) {
        retryCountRef.current.status++;
        setTimeout(fetchStatus, 2000 * retryCountRef.current.status);
      }
    } finally {
      setStatusLoading(false);
    }
  }, [opts.autoRetry, opts.maxRetries, opts.maxTempReadings, opts.statusInterval]);

  /**
   * Fetch current print job
   */
  const fetchJob = useCallback(async (): Promise<void> => {
    try {
      setJobLoading(true);
      setJobError(null);

      const response = await apiService.get<JobStatus>('/printing/job');

      if (!response.success) {
        throw new Error(response.error || 'FluxPrint service unavailable');
      }

      const data = response.data as JobStatus;
      setJob(data);
      retryCountRef.current.job = 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job status';
      setJobError(errorMessage);

      // Retry logic
      if (opts.autoRetry && retryCountRef.current.job < opts.maxRetries) {
        retryCountRef.current.job++;
        setTimeout(fetchJob, 2000 * retryCountRef.current.job);
      }
    } finally {
      setJobLoading(false);
    }
  }, [opts.autoRetry, opts.maxRetries]);

  /**
   * Fetch print queue
   */
  const fetchQueue = useCallback(async (): Promise<void> => {
    try {
      setQueueLoading(true);
      setQueueError(null);

      const response = await apiService.get<PrintQueue>('/printing/queue');

      if (!response.success) {
        throw new Error(response.error || 'FluxPrint service unavailable');
      }

      const data = response.data as PrintQueue;
      setQueue(data);
      retryCountRef.current.queue = 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch print queue';
      setQueueError(errorMessage);

      // Retry logic
      if (opts.autoRetry && retryCountRef.current.queue < opts.maxRetries) {
        retryCountRef.current.queue++;
        setTimeout(fetchQueue, 2000 * retryCountRef.current.queue);
      }
    } finally {
      setQueueLoading(false);
    }
  }, [opts.autoRetry, opts.maxRetries]);

  /**
   * Fetch file list
   */
  const fetchFiles = useCallback(async (): Promise<void> => {
    try {
      setFilesLoading(true);
      setFilesError(null);

      const response = await apiService.get<FileList>('/printing/files');

      if (!response.success) {
        throw new Error(response.error || 'FluxPrint service unavailable');
      }

      const data = response.data as FileList;
      setFiles(data);
      retryCountRef.current.files = 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch file list';
      setFilesError(errorMessage);

      // Retry logic
      if (opts.autoRetry && retryCountRef.current.files < opts.maxRetries) {
        retryCountRef.current.files++;
        setTimeout(fetchFiles, 2000 * retryCountRef.current.files);
      }
    } finally {
      setFilesLoading(false);
    }
  }, [opts.autoRetry, opts.maxRetries]);

  /**
   * Refetch all data
   */
  const refetch = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchStatus(),
        fetchJob(),
        fetchQueue(),
        fetchFiles(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch printer data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchStatus, fetchJob, fetchQueue, fetchFiles]);

  // ============================================================================
  // Queue Operations
  // ============================================================================

  /**
   * Add file to print queue
   */
  const addToQueue = useCallback(
    async (filename: string, priority: QueuePriority = 'normal'): Promise<void> => {
      try {
        const response = await apiService.post('/printing/queue', { filename, priority });

        if (!response.success) {
          throw new Error(response.error || 'Failed to add to queue');
        }

        // Optimistic update: refetch queue
        await fetchQueue();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add to queue';
        setQueueError(errorMessage);
        throw err;
      }
    },
    [fetchQueue]
  );

  /**
   * Remove job from queue
   */
  const removeFromQueue = useCallback(
    async (id: number): Promise<void> => {
      try {
        const response = await apiService.delete(`/printing/queue/${id}`);

        if (!response.success) {
          throw new Error(response.error || 'Failed to remove from queue');
        }

        // Optimistic update: refetch queue
        await fetchQueue();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove from queue';
        setQueueError(errorMessage);
        throw err;
      }
    },
    [fetchQueue]
  );

  /**
   * Reorder queue items
   */
  const reorderQueue = useCallback(
    async (items: QueueItem[]): Promise<void> => {
      try {
        const response = await apiService.makeRequest(buildApiUrl('/printing/queue/reorder'), {
          method: 'PUT',
          body: JSON.stringify({ items }),
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to reorder queue');
        }

        // Optimistic update: refetch queue
        await fetchQueue();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reorder queue';
        setQueueError(errorMessage);
        throw err;
      }
    },
    [fetchQueue]
  );

  /**
   * Start a queued job
   */
  const startJob = useCallback(
    async (id: number): Promise<void> => {
      try {
        const response = await apiService.post(`/printing/queue/${id}/start`);

        if (!response.success) {
          throw new Error(response.error || 'Failed to start job');
        }

        // Optimistic update: refetch queue and job
        await Promise.all([fetchQueue(), fetchJob()]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start job';
        setQueueError(errorMessage);
        throw err;
      }
    },
    [fetchQueue, fetchJob]
  );

  // ============================================================================
  // File Operations
  // ============================================================================

  /**
   * Upload G-code files
   */
  const uploadFile = useCallback(
    async (files: File[]): Promise<FileUploadResponse> => {
      try {
        const formData = new FormData();

        for (const file of files) {
          formData.append('files', file);
        }

        const response = await apiService.post<FileUploadResponse>('/printing/files/upload', formData);

        if (!response.success) {
          throw new Error(response.error || 'Failed to upload files');
        }

        const result = response.data as FileUploadResponse;

        // Refetch file list after upload
        await fetchFiles();

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
        setFilesError(errorMessage);
        throw err;
      }
    },
    [fetchFiles]
  );

  /**
   * Delete a G-code file
   */
  const deleteFile = useCallback(
    async (filename: string): Promise<void> => {
      try {
        const response = await apiService.delete(`/printing/files/${encodeURIComponent(filename)}`);

        if (!response.success) {
          throw new Error(response.error || 'Failed to delete file');
        }

        // Optimistic update: refetch files
        await fetchFiles();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setFilesError(errorMessage);
        throw err;
      }
    },
    [fetchFiles]
  );

  // ============================================================================
  // Phase 3A: WebSocket Data Synchronization
  // ============================================================================

  /**
   * Synchronize WebSocket data to local state
   * Updates status and temperature from real-time WebSocket data
   */
  useEffect(() => {
    if (!opts.enableWebSocket || !wsConnectionStatus.connected) {
      return;
    }

    // Update status from WebSocket
    if (wsData.status) {
      setStatus(wsData.status);
      setIsServiceAvailable(true);
      setStatusError(null);
    }

    // Update temperature history from WebSocket
    if (wsData.temperature) {
      const newReading = wsData.temperature;
      setTemperature((prev): TemperatureHistory => {
        const readings = prev ? [...prev.readings, newReading] : [newReading];

        // Keep only the last N readings
        if (readings.length > opts.maxTempReadings) {
          readings.shift();
        }

        return {
          readings,
          interval: 2, // WebSocket updates every 2 seconds
          maxReadings: opts.maxTempReadings,
        };
      });
    }

    // Update progress from WebSocket (stored in job state)
    if (wsData.progress !== null && job) {
      setJob((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          progress: {
            ...prev.progress,
            completion: wsData.progress || 0,
          },
        };
      });
    }
  }, [
    opts.enableWebSocket,
    opts.maxTempReadings,
    wsConnectionStatus.connected,
    wsData.status,
    wsData.temperature,
    wsData.progress,
    job,
  ]);

  // ============================================================================
  // Polling Setup
  // ============================================================================

  /**
   * Set up automatic polling for status updates
   * Only poll when WebSocket is disconnected (fallback mode)
   */
  useEffect(() => {
    // If WebSocket is connected, skip polling for status/job (files/queue still poll)
    const shouldPollStatus = opts.enablePolling && (!opts.enableWebSocket || !wsConnectionStatus.connected);

    if (!shouldPollStatus && !opts.enablePolling) return;

    // Initial fetch
    refetch();

    // Status polling (only if WebSocket not connected)
    if (shouldPollStatus) {
      statusIntervalRef.current = setInterval(fetchStatus, opts.statusInterval);

      // Job polling (use shorter interval when printing)
      const jobInterval = status?.state.flags.printing ? 5000 : opts.jobInterval;
      jobIntervalRef.current = setInterval(fetchJob, jobInterval);
    }

    // Queue and Files polling (always poll, WebSocket doesn't handle these)
    queueIntervalRef.current = setInterval(fetchQueue, opts.queueInterval);
    filesIntervalRef.current = setInterval(fetchFiles, opts.filesInterval);

    // Cleanup
    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (jobIntervalRef.current) clearInterval(jobIntervalRef.current);
      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
      if (filesIntervalRef.current) clearInterval(filesIntervalRef.current);
    };
  }, [
    opts.enablePolling,
    opts.enableWebSocket,
    opts.statusInterval,
    opts.jobInterval,
    opts.queueInterval,
    opts.filesInterval,
    wsConnectionStatus.connected,
    status?.state.flags.printing,
    refetch,
    fetchStatus,
    fetchJob,
    fetchQueue,
    fetchFiles,
  ]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // Data
    status,
    job,
    queue,
    files,
    temperature,

    // Loading states
    loading,
    statusLoading,
    jobLoading,
    queueLoading,
    filesLoading,

    // Error states
    error,
    statusError,
    jobError,
    queueError,
    filesError,

    // Refetch functions
    refetch,
    refetchStatus: fetchStatus,
    refetchJob: fetchJob,
    refetchQueue: fetchQueue,
    refetchFiles: fetchFiles,

    // Queue operations
    addToQueue,
    removeFromQueue,
    reorderQueue,
    startJob,

    // File operations
    uploadFile,
    deleteFile,

    // Service status
    isServiceAvailable,

    // Phase 3A: WebSocket connection status
    webSocketStatus: wsConnectionStatus,
  };
}

export default usePrinterStatus;
