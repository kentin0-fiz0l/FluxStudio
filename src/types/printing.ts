/**
 * FluxStudio 3D Printing - Type Definitions
 * Phase 2: Native Component Integration
 * Phase 2.5: Database Integration Types
 *
 * Comprehensive TypeScript types for the FluxPrint integration.
 * Defines interfaces for printer status, jobs, queue, files, and temperature data.
 * Phase 2.5 adds database integration types for print job tracking and analytics.
 */

// ============================================================================
// Printer Status Types
// ============================================================================

/**
 * Printer operational states as reported by OctoPrint
 */
export type PrinterState =
  | 'Operational'       // Ready to print
  | 'Printing'          // Currently printing
  | 'Paused'            // Print paused
  | 'Pausing'           // Transitioning to paused
  | 'Cancelling'        // Cancelling print
  | 'Error'             // Error state
  | 'Offline'           // Printer disconnected
  | 'Closed'            // Connection closed
  | 'Detecting'         // Detecting printer
  | 'Unknown';          // Unknown state

/**
 * Temperature data for a heating element (hotend or bed)
 */
export interface TemperatureData {
  actual: number;       // Current temperature (°C)
  target: number;       // Target temperature (°C)
  offset: number;       // Temperature offset
}

/**
 * Complete printer status information
 */
export interface PrinterStatus {
  state: {
    text: PrinterState;
    flags: {
      operational: boolean;
      printing: boolean;
      cancelling: boolean;
      paused: boolean;
      ready: boolean;
      error: boolean;
      closedOrError: boolean;
    };
  };
  temperature: {
    bed: TemperatureData;
    tool0: TemperatureData;
    tool1?: TemperatureData;  // Optional second extruder
  };
}

// ============================================================================
// Print Job Types
// ============================================================================

/**
 * Information about the G-code file being printed
 */
export interface JobFile {
  name: string;
  display?: string;
  path?: string;
  origin: 'local' | 'sdcard';
  size?: number;
  date?: number;
}

/**
 * Filament usage data
 */
export interface FilamentData {
  length: number;       // Length in mm
  volume: number;       // Volume in cm³
}

/**
 * Print job information
 */
export interface PrintJob {
  file: JobFile;
  estimatedPrintTime: number | null;  // Seconds
  averagePrintTime: number | null;    // Seconds
  lastPrintTime: number | null;       // Seconds
  filament?: {
    tool0?: FilamentData;
    tool1?: FilamentData;
  };
}

/**
 * Print progress information
 */
export interface PrintProgress {
  completion: number;           // Percentage (0-100)
  filepos: number;              // Current position in file
  printTime: number;            // Elapsed time (seconds)
  printTimeLeft: number | null; // Estimated time remaining (seconds)
  printTimeLeftOrigin: string | null; // Origin of estimate
}

/**
 * Combined job and progress data
 */
export interface JobStatus {
  job: PrintJob;
  progress: PrintProgress;
  state: PrinterState;
}

// ============================================================================
// Queue Types
// ============================================================================

/**
 * Priority levels for queued print jobs
 */
export type QueuePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Status of a queued print job
 */
export type QueueJobStatus = 'queued' | 'printing' | 'completed' | 'failed' | 'cancelled';

/**
 * A single item in the print queue
 */
export interface QueueItem {
  id: number;
  filename: string;
  position: number;
  priority: QueuePriority;
  status: QueueJobStatus;
  addedAt: string;          // ISO 8601 timestamp
  startedAt?: string;       // ISO 8601 timestamp
  completedAt?: string;     // ISO 8601 timestamp
  estimatedTime?: number;   // Seconds
  progress?: number;        // Percentage (0-100)
  metadata?: {
    projectId?: string;
    fileId?: string;
    addedBy?: string;
    notes?: string;
  };
}

/**
 * Complete queue state
 */
export interface PrintQueue {
  items: QueueItem[];
  currentJob?: QueueItem;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
}

// ============================================================================
// File Management Types
// ============================================================================

/**
 * G-code file information
 */
export interface GCodeFile {
  name: string;
  display?: string;
  path: string;
  origin: 'local' | 'sdcard';
  size: number;
  date: number;             // Unix timestamp
  thumbnail?: string;       // Base64 or URL
  gcodeAnalysis?: {
    estimatedPrintTime?: number;
    filament?: {
      tool0?: FilamentData;
    };
    dimensions?: {
      depth: number;
      height: number;
      width: number;
    };
  };
}

/**
 * File list response
 */
export interface FileList {
  files: GCodeFile[];
  free: number;             // Free space in bytes
  total: number;            // Total space in bytes
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  files: {
    [key: string]: {
      done: boolean;
      name: string;
      path: string;
      size: number;
    };
  };
  done: boolean;
}

// ============================================================================
// Temperature History Types
// ============================================================================

/**
 * Single temperature reading at a point in time
 */
export interface TemperatureReading {
  time: number;             // Unix timestamp
  bed: TemperatureData;
  tool0: TemperatureData;
  tool1?: TemperatureData;
}

/**
 * Temperature history for charting
 */
export interface TemperatureHistory {
  readings: TemperatureReading[];
  interval: number;         // Sampling interval in seconds
  maxReadings: number;      // Maximum readings to keep
}

// ============================================================================
// Camera Types
// ============================================================================

/**
 * Camera stream configuration
 */
export interface CameraConfig {
  streamUrl: string;
  snapshotUrl?: string;
  flipH: boolean;
  flipV: boolean;
  rotate90: boolean;
}

/**
 * Camera snapshot
 */
export interface CameraSnapshot {
  image: string;            // Base64 encoded image
  timestamp: number;        // Unix timestamp
  mimeType: string;         // e.g., 'image/jpeg'
}

// ============================================================================
// Database Integration Types (Phase 1 Schema)
// ============================================================================

/**
 * Print job record in FluxStudio database
 */
export interface PrintJobRecord {
  id: string;                   // UUID
  projectId?: string;           // FK to projects
  fileId?: string;              // FK to files
  fluxprintQueueId?: number;    // Reference to FluxPrint queue
  fileName: string;
  status: PrintJobStatus;
  progress: number;             // 0.00 to 100.00
  queuedAt: string;             // ISO 8601
  startedAt?: string;           // ISO 8601
  completedAt?: string;         // ISO 8601
  estimatedTime?: number;       // Seconds
  actualTime?: number;          // Seconds
  printerName: string;
  printSettings?: Record<string, unknown>;
  materialType?: string;
  materialColor?: string;
  materialUsed?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;            // ISO 8601
  updatedAt: string;            // ISO 8601
}

/**
 * Print job statistics by project
 */
export interface PrintJobStats {
  projectId: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalPrintTime: number;       // Seconds
  averagePrintTime: number;     // Seconds
  materialUsed: number;
  successRate: number;          // Percentage
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Error response from API
 */
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  timestamp?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for PrinterStatusCard component
 */
export interface PrinterStatusCardProps {
  status: PrinterStatus | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Props for TemperatureMonitor component
 */
export interface TemperatureMonitorProps {
  status: PrinterStatus | null;
  history?: TemperatureHistory;
  loading?: boolean;
  error?: string | null;
  showChart?: boolean;
  onPreheat?: (target: 'bed' | 'hotend', temperature: number) => void;
  className?: string;
}

/**
 * Props for CameraFeed component
 */
export interface CameraFeedProps {
  config?: CameraConfig;
  loading?: boolean;
  error?: string | null;
  onSnapshot?: (snapshot: CameraSnapshot) => void;
  className?: string;
}

/**
 * Props for PrintQueue component
 */
export interface PrintQueueProps {
  queue: PrintQueue | null;
  loading?: boolean;
  error?: string | null;
  onAddToQueue?: (filename: string, priority?: QueuePriority) => Promise<void>;
  onRemoveFromQueue?: (id: number) => Promise<void>;
  onReorderQueue?: (items: QueueItem[]) => Promise<void>;
  onStartJob?: (id: number) => Promise<void>;
  className?: string;
}

/**
 * Props for FileBrowser component
 */
export interface FileBrowserProps {
  files: FileList | null;
  loading?: boolean;
  error?: string | null;
  onUpload?: (files: File[]) => Promise<void>;
  onDelete?: (filename: string) => Promise<void>;
  onAddToQueue?: (filename: string) => Promise<void>;
  className?: string;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * WebSocket connection status (Phase 3A)
 */
export interface WebSocketConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Return type for usePrinterStatus hook
 */
export interface UsePrinterStatusReturn {
  // Printer data
  status: PrinterStatus | null;
  job: JobStatus | null;
  queue: PrintQueue | null;
  files: FileList | null;
  temperature: TemperatureHistory | null;

  // Loading states
  loading: boolean;
  statusLoading: boolean;
  jobLoading: boolean;
  queueLoading: boolean;
  filesLoading: boolean;

  // Error states
  error: string | null;
  statusError: string | null;
  jobError: string | null;
  queueError: string | null;
  filesError: string | null;

  // Actions
  refetch: () => Promise<void>;
  refetchStatus: () => Promise<void>;
  refetchJob: () => Promise<void>;
  refetchQueue: () => Promise<void>;
  refetchFiles: () => Promise<void>;

  // Queue operations
  addToQueue: (filename: string, priority?: QueuePriority) => Promise<void>;
  removeFromQueue: (id: number) => Promise<void>;
  reorderQueue: (items: QueueItem[]) => Promise<void>;
  startJob: (id: number) => Promise<void>;

  // File operations
  uploadFile: (files: File[]) => Promise<FileUploadResponse>;
  deleteFile: (filename: string) => Promise<void>;

  // Service status
  isServiceAvailable: boolean;

  // Phase 3A: WebSocket connection status
  webSocketStatus: WebSocketConnectionStatus;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filter parameters for file browser
 */
export interface FileFilters {
  search?: string;
  origin?: 'local' | 'sdcard';
  sortBy?: 'name' | 'date' | 'size';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Time formatting options
 */
export interface TimeFormatOptions {
  format: 'short' | 'long' | 'relative';
  includeSeconds?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default polling intervals (milliseconds)
 */
export const POLLING_INTERVALS = {
  STATUS: 30000,      // 30 seconds
  JOB: 5000,          // 5 seconds (when printing)
  TEMPERATURE: 10000, // 10 seconds
  QUEUE: 30000,       // 30 seconds
  FILES: 60000,       // 60 seconds
} as const;

/**
 * Timeout values (milliseconds)
 */
export const TIMEOUTS = {
  DEFAULT: 30000,     // 30 seconds
  UPLOAD: 60000,      // 60 seconds
  STREAM: 120000,     // 120 seconds
} as const;

/**
 * Temperature presets (°C)
 */
export const TEMPERATURE_PRESETS = {
  PLA: {
    hotend: 200,
    bed: 60,
  },
  ABS: {
    hotend: 240,
    bed: 100,
  },
  PETG: {
    hotend: 230,
    bed: 80,
  },
  TPU: {
    hotend: 220,
    bed: 50,
  },
} as const;

/**
 * File size limits (bytes)
 */
export const FILE_LIMITS = {
  MAX_UPLOAD_SIZE: 100 * 1024 * 1024, // 100 MB
  MAX_FILES_PER_UPLOAD: 10,
} as const;

/**
 * Queue limits
 */
export const QUEUE_LIMITS = {
  MAX_QUEUE_SIZE: 50,
  MAX_PRIORITY_JOBS: 10,
} as const;

// ============================================================================
// Phase 2.5: Database Integration Types
// ============================================================================

/**
 * Database-tracked print job status
 */
export type PrintJobStatus = 'queued' | 'printing' | 'completed' | 'failed' | 'canceled';

/**
 * Print job record from database (snake_case for raw DB rows)
 */
export interface PrintJobDatabaseRecord {
  id: string;                           // cuid/cuid2
  project_id: string | null;            // FluxStudio project ID
  file_id: string | null;               // FluxStudio file ID
  fluxprint_queue_id: number | null;    // FluxPrint queue ID
  file_name: string;
  file_path: string | null;
  status: PrintJobStatus;
  progress: number;                     // 0-100
  queued_at: string;                    // ISO timestamp
  started_at: string | null;            // ISO timestamp
  completed_at: string | null;          // ISO timestamp
  canceled_at: string | null;           // ISO timestamp
  estimated_time: number | null;        // seconds
  actual_time: number | null;           // seconds
  printer_name: string | null;
  printer_status: string | null;
  print_settings: Record<string, unknown> | null;
  material_type: string | null;
  material_color: string | null;
  material_used: number | null;         // grams or meters
  error_message: string | null;
  error_timestamp: string | null;       // ISO timestamp
  metadata: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;                   // ISO timestamp
  updated_at: string;                   // ISO timestamp
}

/**
 * Active print job (from view)
 */
export interface ActivePrintJob extends PrintJobRecord {
  elapsed_seconds: number | null;
  project_name: string | null;
  file_original_name: string | null;
  project_owner_email: string | null;
}

/**
 * Print job history item (from view)
 */
export interface PrintJobHistoryItem extends PrintJobRecord {
  duration_seconds: number | null;
  project_name: string | null;
  project_owner_email: string | null;
}

/**
 * Project print statistics
 */
export interface ProjectPrintStats {
  project_id: string;
  project_name: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  canceled_jobs: number;
  active_jobs: number;
  total_material_used: number | null;    // grams or meters
  avg_print_time: number | null;         // seconds
  last_print_completed: string | null;   // ISO timestamp
}

/**
 * Link job to project request
 */
export interface LinkJobRequest {
  project_id: string;
  file_id?: string;
}

/**
 * Update job status request
 */
export interface UpdateJobStatusRequest {
  status: PrintJobStatus;
  progress?: number;
  error_message?: string;
}

/**
 * Sync job from FluxPrint request
 */
export interface SyncJobRequest {
  status: PrintJobStatus;
  progress?: number;
}

// ============================================================================
// Phase 4A: Designer-First UI Types
// ============================================================================

/**
 * Material types with designer-friendly names and properties
 */
export type MaterialType = 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'NYLON';

/**
 * Material information for selection
 */
export interface MaterialInfo {
  id: MaterialType;
  name: string;
  description: string;
  color?: string;
  properties: string[];
  costPerGram: number;
  hotendTemp: number;
  bedTemp: number;
  icon?: string;
}

/**
 * Quality preset levels
 */
export type QualityPreset = 'draft' | 'standard' | 'high' | 'ultra';

/**
 * Quality preset information
 */
export interface QualityPresetInfo {
  id: QualityPreset;
  name: string;
  description: string;
  layerHeight: number;
  infillPercentage: number;
  speedMultiplier: number;
  timeMultiplier: number;
  recommended: boolean;
}

/**
 * Print configuration for quick print
 */
export interface QuickPrintConfig {
  material: MaterialType;
  quality: QualityPreset;
  copies: number;
  supports: boolean;
  infill: number;
  notes?: string;
}

/**
 * Print estimate information
 */
export interface PrintEstimate {
  timeHours: number;
  timeMinutes: number;
  materialGrams: number;
  materialCost: number;
  totalCost: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * File printability analysis
 */
export interface PrintabilityAnalysis {
  score: number; // 0-100
  issues: PrintabilityIssue[];
  warnings: string[];
  suggestions: string[];
  canPrint: boolean;
}

/**
 * Printability issue
 */
export interface PrintabilityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'overhang' | 'thin-wall' | 'small-feature' | 'size' | 'manifold' | 'other';
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

/**
 * Props for QuickPrintDialog
 */
export interface QuickPrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  fileSize?: number;
  onPrint: (config: QuickPrintConfig) => Promise<void>;
  projectId?: string;
  estimate?: PrintEstimate;
  analysis?: PrintabilityAnalysis;
}

/**
 * Print status badge variant
 */
export type PrintStatusBadgeVariant = 'idle' | 'queued' | 'printing' | 'completed' | 'failed';
