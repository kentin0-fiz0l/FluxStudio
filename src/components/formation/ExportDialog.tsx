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
import { X, Download, Check, Loader2 } from 'lucide-react';
import type { FormationExportOptions, ExportProgress, Performer } from '../../services/formationService';

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
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

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

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);
    setExportProgress(null);

    try {
      if (selectedFormat === 'drill_book' && onExportDrillBook) {
        const ids = options.selectedPerformerScope === 'all' && performers
          ? performers.map(p => p.id)
          : options.selectedPerformerIds;
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
      setExportProgress(null);
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
          <ExportFormatSelector
            selectedFormat={selectedFormat}
            onFormatChange={handleFormatChange}
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
            disabled={isExporting}
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
