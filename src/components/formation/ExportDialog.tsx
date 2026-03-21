/**
 * ExportDialog Component - Flux Studio
 *
 * Dialog for exporting formations to various formats including
 * PDF, images, SVG, and animated formats.
 *
 * Composed from sub-components in ./export/:
 * - ExportFormatSelector: format grid
 * - ExportOptionsPanel: display/PDF/image/animation options
 * - LMSShareSection: Google Classroom / Canvas LMS sharing
 * - ExportProgressView: progress bar during export
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, Check, Loader2, AlertTriangle, Users } from 'lucide-react';
import type { FormationExportOptions, ExportProgress, Performer } from '../../services/formationService';
import { toast } from '../../lib/toast';

import { ExportFormatSelector } from './export/ExportFormatSelector';
import type { ExportFormat } from './export/ExportFormatSelector';
import { ExportOptionsPanel } from './export/ExportOptionsPanel';
import type { ExportOptionsState } from './export/ExportOptionsPanel';
import { LMSShareSection } from './export/LMSShareSection';
import { ExportProgressView } from './export/ExportProgressView';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ExportDialogProps {
  isOpen: boolean;
  formationName: string;
  formationId?: string;
  performers?: Performer[];
  metmapLinked?: boolean;
  hasAudioTrack?: boolean;
  onClose: () => void;
  onExport: (options: FormationExportOptions) => Promise<void>;
  onExportDrillBook?: (performerIds: string[]) => Promise<void>;
  onExportCoordinateSheet?: (performerIds: string[]) => Promise<void>;
  onExportProductionSheet?: (format: 'pdf' | 'csv') => Promise<void>;
  onExportAudioSync?: () => Promise<void>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExportDialog({
  isOpen,
  formationName,
  formationId,
  performers,
  metmapLinked,
  hasAudioTrack,
  onClose,
  onExport,
  onExportDrillBook,
  onExportCoordinateSheet,
  onExportProductionSheet,
  onExportAudioSync,
}: ExportDialogProps) {
  const { t } = useTranslation('common');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; performerName: string } | null>(null);

  const hasPerformers = performers && performers.length > 0;

  // Export options state (consolidated)
  const [options, setOptions] = useState<ExportOptionsState>({
    includeGrid: true,
    includeLabels: true,
    includeTimestamps: true,
    includeFieldOverlay: false,
    includeAudio: true,
    paperSize: 'letter',
    orientation: 'landscape',
    quality: 90,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    selectedResolutionPreset: '1080p',
    selectedPerformerScope: 'all',
    selectedPerformerIds: [],
    selectedSection: '',
    videoOverlayPerformerStyle: 'dots',
    videoOverlayShowTrails: true,
    videoOverlayShowGrid: false,
    videoOverlayTransparent: true,
  });

  const isAnimatedFormat = selectedFormat === 'gif' || selectedFormat === 'video';
  const isImageFormat = selectedFormat === 'png' || selectedFormat === 'jpg';
  const isPdfFormat = selectedFormat === 'pdf';
  const handleOptionsChange = useCallback(<K extends keyof ExportOptionsState>(key: K, value: ExportOptionsState[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFormatChange = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);
    if (format === 'gif') {
      setOptions((prev) => {
        const updates: Partial<ExportOptionsState> = {};
        if (prev.resolution.width > 1280 || prev.resolution.height > 720) {
          updates.resolution = { width: 1280, height: 720 };
          updates.selectedResolutionPreset = '720p';
        }
        if (prev.fps > 15) updates.fps = 15;
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
  }, []);

  const getExportErrorMessage = useCallback((error: unknown, format: ExportFormat): string => {
    const raw = error instanceof Error ? error.message : String(error);

    if (raw.includes('MediaRecorder')) {
      return 'Your browser does not support video recording. Try using Chrome or Edge.';
    }
    if (raw.includes('canvas context') || raw.includes('Could not create canvas')) {
      return 'Could not initialize rendering. Try a lower resolution or close other tabs.';
    }
    if (raw.includes('not found')) {
      return 'One or more selected performers could not be found. Please check your selection.';
    }
    if (raw.includes('No pages generated')) {
      return 'No content was generated. Make sure your formation has keyframes and sets.';
    }

    const formatLabels: Partial<Record<ExportFormat, string>> = {
      pdf: 'PDF', png: 'PNG image', jpg: 'JPEG image', svg: 'SVG',
      gif: 'GIF animation', video: 'video', drill_book: 'drill book',
      coordinate_sheet: 'coordinate sheet', dotbook: 'dot book',
      video_overlay: 'video overlay', production_sheet_pdf: 'production sheet PDF',
      production_sheet_csv: 'production sheet CSV', audio_sync: 'audio sync file',
    };

    return `Failed to export ${formatLabels[format] ?? 'file'}. ${raw}`;
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportError(null);
    setExportProgress(null);
    setBatchProgress(null);

    try {
      if (selectedFormat === 'drill_book' && onExportDrillBook) {
        const ids = options.selectedPerformerScope === 'all' && performers
          ? performers.map(p => p.id)
          : options.selectedPerformerIds;
        // Show batch progress for multi-performer export
        if (ids.length > 1 && performers) {
          for (let i = 0; i < ids.length; i++) {
            const p = performers.find(perf => perf.id === ids[i]);
            setBatchProgress({ current: i + 1, total: ids.length, performerName: p?.name ?? `Performer ${i + 1}` });
          }
        }
        await onExportDrillBook(ids);
      } else if (selectedFormat === 'coordinate_sheet' && onExportCoordinateSheet) {
        const ids = options.selectedPerformerScope === 'all' && performers
          ? performers.map(p => p.id)
          : options.selectedPerformerIds;
        await onExportCoordinateSheet(ids);
      } else if (selectedFormat === 'production_sheet_pdf' && onExportProductionSheet) {
        await onExportProductionSheet('pdf');
      } else if (selectedFormat === 'production_sheet_csv' && onExportProductionSheet) {
        await onExportProductionSheet('csv');
      } else if (selectedFormat === 'audio_sync' && onExportAudioSync) {
        await onExportAudioSync();
      } else {
        const exportOptions: FormationExportOptions = {
          format: selectedFormat as FormationExportOptions['format'],
          includeGrid: options.includeGrid,
          includeLabels: options.includeLabels,
          includeTimestamps: options.includeTimestamps,
          paperSize: isPdfFormat ? options.paperSize : undefined,
          orientation: isPdfFormat ? options.orientation : undefined,
          quality: isImageFormat ? options.quality : undefined,
          fps: isAnimatedFormat ? options.fps : undefined,
          resolution: isAnimatedFormat || isImageFormat ? options.resolution : undefined,
          includeFieldOverlay: isAnimatedFormat ? options.includeFieldOverlay : undefined,
          includeAudio: selectedFormat === 'video' && hasAudioTrack ? options.includeAudio : undefined,
          onProgress: isAnimatedFormat ? (p) => setExportProgress(p) : undefined,
        };

        await onExport(exportOptions);
      }
      setExportSuccess(true);
      setExportProgress(null);

      setTimeout(() => {
        onClose();
        setExportSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      const message = getExportErrorMessage(error, selectedFormat);
      setExportError(message);
      setExportProgress(null);
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedFormat,
    options,
    performers,
    onExportDrillBook,
    onExportCoordinateSheet,
    onExportProductionSheet,
    onExportAudioSync,
    isPdfFormat,
    isImageFormat,
    isAnimatedFormat,
    hasAudioTrack,
    onExport,
    onClose,
    getExportErrorMessage,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('formation.export', 'Export Formation')}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('formation.export', 'Export Formation')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formationName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close export dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!hasPerformers ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('formation.noPerformers', 'No performers yet')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {t('formation.addPerformersBeforeExporting', 'Add performers to your formation before exporting. Exports require at least one performer to generate content.')}
              </p>
            </div>
          ) : (
            <>
              <ExportFormatSelector
                selectedFormat={selectedFormat}
                onFormatChange={(format) => { handleFormatChange(format); setExportError(null); }}
                metmapLinked={metmapLinked}
                t={t}
              />

              <ExportOptionsPanel
                selectedFormat={selectedFormat}
                options={options}
                onOptionsChange={handleOptionsChange}
                performers={performers}
                hasAudioTrack={hasAudioTrack}
                t={t}
              />

              {formationId && (
                <LMSShareSection
                  formationId={formationId}
                  formationName={formationName}
                  isOpen={isOpen}
                />
              )}

              <ExportProgressView exportProgress={exportProgress} />

              {batchProgress && isExporting && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" aria-hidden="true" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Exporting {batchProgress.performerName} ({batchProgress.current}/{batchProgress.total})
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {exportError && !isExporting && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      {t('formation.exportFailed', 'Export failed')}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {exportError}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {t('actions.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !hasPerformers}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium ${
              exportSuccess
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {t('status.exporting', 'Exporting...')}
              </>
            ) : exportSuccess ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                {t('status.exported', 'Exported!')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" aria-hidden="true" />
                {t('formation.export', 'Export')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDialog;
