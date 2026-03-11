/**
 * ExportFormatSelector - Format grid for the export dialog
 */

import React, { useCallback } from 'react';
import {
  FileImage,
  FileText,
  Film,
  Image,
  Code,
  Table,
  Sheet,
  Music,
  BookOpen,
} from 'lucide-react';
import type { FormationExportOptions } from '../../../services/formationService';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat =
  | FormationExportOptions['format']
  | 'drill_book'
  | 'coordinate_sheet'
  | 'dotbook'
  | 'video_overlay'
  | 'production_sheet_pdf'
  | 'production_sheet_csv'
  | 'audio_sync';

export interface FormatOption {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'static' | 'animated';
}

export interface ExportFormatSelectorProps {
  selectedFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  metmapLinked?: boolean;
  t: (key: string, fallback: string, options?: Record<string, unknown>) => string;
}

// ============================================================================
// Constants
// ============================================================================

export const formatOptions: FormatOption[] = [
  {
    value: 'pdf',
    label: 'PDF Document',
    description: 'Print-ready document with all formations',
    icon: <FileText className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'png',
    label: 'PNG Image',
    description: 'High-quality image with transparency',
    icon: <FileImage className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'jpg',
    label: 'JPEG Image',
    description: 'Compressed image for web use',
    icon: <Image className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'svg',
    label: 'SVG Vector',
    description: 'Scalable vector graphics',
    icon: <Code className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'gif',
    label: 'Animated GIF',
    description: 'Looping animation of formations',
    icon: <Film className="w-5 h-5" aria-hidden="true" />,
    category: 'animated',
  },
  {
    value: 'video',
    label: 'Video',
    description: 'WebM video export with transitions',
    icon: <Film className="w-5 h-5" aria-hidden="true" />,
    category: 'animated',
  },
  {
    value: 'drill_book' as ExportFormat,
    label: 'Drill Book',
    description: 'Per-performer drill book with charts & coordinates',
    icon: <FileText className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'coordinate_sheet' as ExportFormat,
    label: 'Coordinate Sheet',
    description: 'Printable coordinate table per performer',
    icon: <FileText className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'dotbook' as ExportFormat,
    label: 'Dot Books',
    description: 'Per-performer dot books with field diagrams & coordinates',
    icon: <BookOpen className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'video_overlay' as ExportFormat,
    label: 'Video Overlay',
    description: 'Transparent video overlay of formation animation',
    icon: <Film className="w-5 h-5" aria-hidden="true" />,
    category: 'animated',
  },
  {
    value: 'production_sheet_pdf' as ExportFormat,
    label: 'Production Sheet (PDF)',
    description: 'Formatted production sheet with music data',
    icon: <Table className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'production_sheet_csv' as ExportFormat,
    label: 'Production Sheet (CSV)',
    description: 'Spreadsheet-compatible production sheet',
    icon: <Sheet className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
  {
    value: 'audio_sync' as ExportFormat,
    label: 'Audio Sync File (.fxs)',
    description: 'JSON timing data for audio synchronization',
    icon: <Music className="w-5 h-5" aria-hidden="true" />,
    category: 'static',
  },
];

export const MUSIC_LINKED_FORMATS: ExportFormat[] = [
  'production_sheet_pdf',
  'production_sheet_csv',
  'audio_sync',
];

// ============================================================================
// Component
// ============================================================================

export function ExportFormatSelector({
  selectedFormat,
  onFormatChange,
  metmapLinked,
  t,
}: ExportFormatSelectorProps) {
  const visibleFormatOptions = formatOptions.filter(
    (f) => !MUSIC_LINKED_FORMATS.includes(f.value) || metmapLinked
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      const delta = keys[e.key];
      if (delta !== undefined) {
        e.preventDefault();
        const idx = visibleFormatOptions.findIndex((f) => f.value === selectedFormat);
        const next = (idx + delta + visibleFormatOptions.length) % visibleFormatOptions.length;
        onFormatChange(visibleFormatOptions[next].value);
        const container = e.currentTarget;
        const buttons = container.querySelectorAll<HTMLElement>('[role="radio"]');
        buttons[next]?.focus();
      }
    },
    [visibleFormatOptions, selectedFormat, onFormatChange]
  );

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
        {t('formation.exportFormat', 'Export Format')}
      </h3>
      <div
        className="grid grid-cols-3 gap-3"
        role="radiogroup"
        aria-label={t('formation.exportFormat', 'Export Format')}
        onKeyDown={handleKeyDown}
      >
        {visibleFormatOptions.map((format) => (
          <button
            key={format.value}
            role="radio"
            aria-checked={selectedFormat === format.value}
            tabIndex={selectedFormat === format.value ? 0 : -1}
            onClick={() => onFormatChange(format.value)}
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
  );
}
