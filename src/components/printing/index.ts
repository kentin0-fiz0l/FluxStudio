/**
 * FluxStudio Printing Components
 * Phase 2: Native Component Integration
 * Phase 2.5: Database Integration Components
 * Phase 3D: Project Integration Components
 * Phase 4A: Designer-First Foundation
 *
 * Centralized export for all printing-related components.
 */

export { default as PrintingDashboard } from './PrintingDashboard';
export { default as PrinterStatusCard } from './PrinterStatusCard';
export { default as TemperatureMonitor } from './TemperatureMonitor';
export { default as CameraFeed } from './CameraFeed';
export { default as PrintQueue } from './PrintQueue';
export { default as FileBrowser } from './FileBrowser';
export { default as PrintHistory } from './PrintHistory';
export { default as ProjectPrintStats } from './ProjectPrintStats';
export { QuickPrintDialog } from './QuickPrintDialog';

// Re-export types for convenience
export type {
  PrinterStatusCardProps,
  TemperatureMonitorProps,
  CameraFeedProps,
  PrintQueueProps,
  FileBrowserProps,
  PrintJobRecord,
  PrintJobHistoryItem,
  ActivePrintJob,
  ProjectPrintStats,
  PrintJobStatus,
  QuickPrintDialogProps,
  QuickPrintConfig,
  MaterialType,
  QualityPreset,
  PrintEstimate,
} from '@/types/printing';
