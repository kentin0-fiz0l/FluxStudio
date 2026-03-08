/**
 * ExportOptionsPanel - Display options, PDF/image/animation settings, performer selection
 */

import { Grid, Tag, Clock, Music } from 'lucide-react';
import type { Performer } from '../../../services/formationService';
import type { ExportFormat } from './ExportFormatSelector';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptionsState {
  includeGrid: boolean;
  includeLabels: boolean;
  includeTimestamps: boolean;
  includeFieldOverlay: boolean;
  includeAudio: boolean;
  paperSize: 'letter' | 'a4' | 'tabloid';
  orientation: 'portrait' | 'landscape';
  quality: number;
  fps: number;
  resolution: { width: number; height: number };
  selectedResolutionPreset: string;
  selectedPerformerScope: 'all' | 'selected';
  selectedPerformerIds: string[];
}

export interface ExportOptionsPanelProps {
  selectedFormat: ExportFormat;
  options: ExportOptionsState;
  onOptionsChange: <K extends keyof ExportOptionsState>(key: K, value: ExportOptionsState[K]) => void;
  performers?: Performer[];
  hasAudioTrack?: boolean;
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string;
}

// ============================================================================
// Constants
// ============================================================================

const paperSizes = [
  { value: 'letter', label: 'Letter (8.5" × 11")' },
  { value: 'a4', label: 'A4 (210mm × 297mm)' },
  { value: 'tabloid', label: 'Tabloid (11" × 17")' },
];

const resolutionPresets = [
  { value: '720p', label: '720p (1280×720)', width: 1280, height: 720 },
  { value: '1080p', label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { value: '4k', label: '4K (3840×2160)', width: 3840, height: 2160 },
  { value: 'custom', label: 'Custom', width: 0, height: 0 },
];

// ============================================================================
// Component
// ============================================================================

export function ExportOptionsPanel({
  selectedFormat,
  options,
  onOptionsChange,
  performers,
  hasAudioTrack,
  t,
}: ExportOptionsPanelProps) {
  const isAnimatedFormat = selectedFormat === 'gif' || selectedFormat === 'video';
  const isImageFormat = selectedFormat === 'png' || selectedFormat === 'jpg';
  const isPdfFormat = selectedFormat === 'pdf';
  const isDrillFormat = selectedFormat === 'drill_book' || selectedFormat === 'coordinate_sheet';

  const handleResolutionPresetChange = (preset: string) => {
    onOptionsChange('selectedResolutionPreset', preset);
    const presetOption = resolutionPresets.find((r) => r.value === preset);
    if (presetOption && presetOption.value !== 'custom') {
      onOptionsChange('resolution', { width: presetOption.width, height: presetOption.height });
    }
  };

  return (
    <>
      {/* Common Display Options */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          {t('formation.displayOptions', 'Display Options')}
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeGrid}
              onChange={(e) => onOptionsChange('includeGrid', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <Grid className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('formation.includeGrid', 'Include grid lines')}
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeLabels}
              onChange={(e) => onOptionsChange('includeLabels', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <Tag className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('formation.includeLabels', 'Include performer labels')}
            </span>
          </label>

          {isAnimatedFormat && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeTimestamps}
                onChange={(e) => onOptionsChange('includeTimestamps', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('formation.includeTimestamps', 'Include timestamps')}
              </span>
            </label>
          )}

          {isAnimatedFormat && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeFieldOverlay}
                onChange={(e) => onOptionsChange('includeFieldOverlay', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <Grid className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('formation.includeFieldOverlay', 'Include field overlay')}
              </span>
            </label>
          )}

          {selectedFormat === 'video' && hasAudioTrack && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeAudio}
                onChange={(e) => onOptionsChange('includeAudio', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <Music className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('formation.includeAudio', 'Include audio track')}
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Drill Format: Performer Selector */}
      {isDrillFormat && performers && performers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t('formation.performerSelection', 'Performer Selection')}
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={options.selectedPerformerScope === 'all'}
                onChange={() => onOptionsChange('selectedPerformerScope', 'all')}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('formation.allPerformers', 'All performers ({{count}})', { count: performers.length })}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={options.selectedPerformerScope === 'selected'}
                onChange={() => onOptionsChange('selectedPerformerScope', 'selected')}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('formation.selectedPerformersOnly', 'Selected performers only')}
              </span>
            </label>
            {options.selectedPerformerScope === 'selected' && (
              <div className="ml-6 max-h-32 overflow-y-auto space-y-1 border rounded-lg p-2 bg-gray-50 dark:bg-gray-700/50">
                {performers.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={options.selectedPerformerIds.includes(p.id)}
                      onChange={(e) => {
                        const newIds = e.target.checked
                          ? [...options.selectedPerformerIds, p.id]
                          : options.selectedPerformerIds.filter((id) => id !== p.id);
                        onOptionsChange('selectedPerformerIds', newIds);
                      }}
                      className="w-3.5 h-3.5 rounded text-blue-500"
                    />
                    {p.name} {p.drillNumber ? `(#${p.drillNumber})` : ''}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Options (also show orientation for coordinate_sheet) */}
      {(isPdfFormat || selectedFormat === 'coordinate_sheet') && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t('formation.pdfOptions', 'PDF Options')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('formation.paperSize', 'Paper Size')}
              </label>
              <select
                value={options.paperSize}
                onChange={(e) => onOptionsChange('paperSize', e.target.value as ExportOptionsState['paperSize'])}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              >
                {paperSizes.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('formation.orientation', 'Orientation')}
              </label>
              <select
                value={options.orientation}
                onChange={(e) => onOptionsChange('orientation', e.target.value as ExportOptionsState['orientation'])}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              >
                <option value="landscape">{t('formation.landscape', 'Landscape')}</option>
                <option value="portrait">{t('formation.portrait', 'Portrait')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Image Options */}
      {isImageFormat && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t('formation.imageOptions', 'Image Options')}
          </h3>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('formation.quality', 'Quality')}: {options.quality}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={options.quality}
              onChange={(e) => onOptionsChange('quality', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Animation Options */}
      {isAnimatedFormat && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t('formation.animationOptions', 'Animation Options')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('formation.resolution', 'Resolution')}
              </label>
              <select
                value={options.selectedResolutionPreset}
                onChange={(e) => handleResolutionPresetChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              >
                {resolutionPresets.map((res) => (
                  <option key={res.value} value={res.value}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('formation.fps', 'Frame Rate')}
              </label>
              <select
                value={options.fps}
                onChange={(e) => onOptionsChange('fps', Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              >
                <option value={15}>15 FPS</option>
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </div>
          </div>

          {options.selectedResolutionPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('formation.width', 'Width')}
                </label>
                <input
                  type="number"
                  value={options.resolution.width}
                  onChange={(e) =>
                    onOptionsChange('resolution', { ...options.resolution, width: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('formation.height', 'Height')}
                </label>
                <input
                  type="number"
                  value={options.resolution.height}
                  onChange={(e) =>
                    onOptionsChange('resolution', { ...options.resolution, height: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
