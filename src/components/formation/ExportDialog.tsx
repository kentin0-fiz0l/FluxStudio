/**
 * ExportDialog Component - Flux Studio
 *
 * Dialog for exporting formations to various formats including
 * PDF, images, SVG, and animated formats.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Download,
  FileImage,
  FileText,
  Film,
  Image,
  Code,
  Check,
  Loader2,
  Grid,
  Tag,
  Clock,
} from 'lucide-react';
import { FormationExportOptions } from '../../services/formationService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ExportDialogProps {
  isOpen: boolean;
  formationName: string;
  onClose: () => void;
  onExport: (options: FormationExportOptions) => Promise<void>;
}

type ExportFormat = FormationExportOptions['format'];

interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'static' | 'animated';
}

// ============================================================================
// FORMAT OPTIONS
// ============================================================================

const formatOptions: FormatOption[] = [
  {
    value: 'pdf',
    label: 'PDF Document',
    description: 'Print-ready document with all formations',
    icon: <FileText className="w-5 h-5" />,
    category: 'static',
  },
  {
    value: 'png',
    label: 'PNG Image',
    description: 'High-quality image with transparency',
    icon: <FileImage className="w-5 h-5" />,
    category: 'static',
  },
  {
    value: 'jpg',
    label: 'JPEG Image',
    description: 'Compressed image for web use',
    icon: <Image className="w-5 h-5" />,
    category: 'static',
  },
  {
    value: 'svg',
    label: 'SVG Vector',
    description: 'Scalable vector graphics',
    icon: <Code className="w-5 h-5" />,
    category: 'static',
  },
  {
    value: 'gif',
    label: 'Animated GIF',
    description: 'Looping animation of formations',
    icon: <Film className="w-5 h-5" />,
    category: 'animated',
  },
  {
    value: 'video',
    label: 'MP4 Video',
    description: 'Full video export with transitions',
    icon: <Film className="w-5 h-5" />,
    category: 'animated',
  },
];

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
// MAIN COMPONENT
// ============================================================================

export function ExportDialog({
  isOpen,
  formationName,
  onClose,
  onExport,
}: ExportDialogProps) {
  const { t } = useTranslation('common');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Export options state
  const [includeGrid, setIncludeGrid] = useState(true);
  const [includeLabels, setIncludeLabels] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [paperSize, setPaperSize] = useState<'letter' | 'a4' | 'tabloid'>('letter');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [quality, setQuality] = useState(90);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });
  const [selectedResolutionPreset, setSelectedResolutionPreset] = useState('1080p');

  const selectedFormatOption = formatOptions.find((f) => f.value === selectedFormat);
  const isAnimatedFormat = selectedFormatOption?.category === 'animated';
  const isImageFormat = selectedFormat === 'png' || selectedFormat === 'jpg';
  const isPdfFormat = selectedFormat === 'pdf';

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const options: FormationExportOptions = {
        format: selectedFormat,
        includeGrid,
        includeLabels,
        includeTimestamps,
        paperSize: isPdfFormat ? paperSize : undefined,
        orientation: isPdfFormat ? orientation : undefined,
        quality: isImageFormat ? quality : undefined,
        fps: isAnimatedFormat ? fps : undefined,
        resolution: isAnimatedFormat || isImageFormat ? resolution : undefined,
      };

      await onExport(options);
      setExportSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
        setExportSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedFormat,
    includeGrid,
    includeLabels,
    includeTimestamps,
    paperSize,
    orientation,
    quality,
    fps,
    resolution,
    isPdfFormat,
    isImageFormat,
    isAnimatedFormat,
    onExport,
    onClose,
  ]);

  const handleResolutionPresetChange = (preset: string) => {
    setSelectedResolutionPreset(preset);
    const presetOption = resolutionPresets.find((r) => r.value === preset);
    if (presetOption && presetOption.value !== 'custom') {
      setResolution({ width: presetOption.width, height: presetOption.height });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Format Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('formation.exportFormat', 'Export Format')}
            </h3>
            <div
              className="grid grid-cols-3 gap-3"
              role="radiogroup"
              aria-label={t('formation.exportFormat', 'Export Format')}
              onKeyDown={(e) => {
                const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
                const delta = keys[e.key];
                if (delta !== undefined) {
                  e.preventDefault();
                  const idx = formatOptions.findIndex((f) => f.value === selectedFormat);
                  const next = (idx + delta + formatOptions.length) % formatOptions.length;
                  setSelectedFormat(formatOptions[next].value);
                  // Move focus to the newly selected button
                  const container = e.currentTarget;
                  const buttons = container.querySelectorAll<HTMLElement>('[role="radio"]');
                  buttons[next]?.focus();
                }
              }}
            >
              {formatOptions.map((format) => (
                <button
                  key={format.value}
                  role="radio"
                  aria-checked={selectedFormat === format.value}
                  tabIndex={selectedFormat === format.value ? 0 : -1}
                  onClick={() => setSelectedFormat(format.value)}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800 ${
                    selectedFormat === format.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div
                    className={`mb-2 ${
                      selectedFormat === format.value
                        ? 'text-blue-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {format.icon}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      selectedFormat === format.value
                        ? 'text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {format.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {format.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Common Options */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t('formation.displayOptions', 'Display Options')}
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGrid}
                  onChange={(e) => setIncludeGrid(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <Grid className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('formation.includeGrid', 'Include grid lines')}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLabels}
                  onChange={(e) => setIncludeLabels(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('formation.includeLabels', 'Include performer labels')}
                </span>
              </label>

              {isAnimatedFormat && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTimestamps}
                    onChange={(e) => setIncludeTimestamps(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t('formation.includeTimestamps', 'Include timestamps')}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* PDF Options */}
          {isPdfFormat && (
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
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as typeof paperSize)}
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
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as typeof orientation)}
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
                  {t('formation.quality', 'Quality')}: {quality}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
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
                    value={selectedResolutionPreset}
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
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value={15}>15 FPS</option>
                    <option value={24}>24 FPS</option>
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                  </select>
                </div>
              </div>

              {selectedResolutionPreset === 'custom' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('formation.width', 'Width')}
                    </label>
                    <input
                      type="number"
                      value={resolution.width}
                      onChange={(e) =>
                        setResolution((r) => ({ ...r, width: Number(e.target.value) }))
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
                      value={resolution.height}
                      onChange={(e) =>
                        setResolution((r) => ({ ...r, height: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}
            </div>
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
            disabled={isExporting}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium ${
              exportSuccess
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('status.exporting', 'Exporting...')}
              </>
            ) : exportSuccess ? (
              <>
                <Check className="w-4 h-4" />
                {t('status.exported', 'Exported!')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
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
