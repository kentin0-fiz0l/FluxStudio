/**
 * PrintPreview - WYSIWYG print preview modal for drill formations.
 *
 * Renders a paginated preview of formation sets with field layout,
 * performer positions, labels, and transition arrows.
 * Supports single-set-per-page and multi-up layouts.
 */

import { useState, useMemo, useCallback } from 'react';
import { X, Printer, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { Formation, Position, FieldConfig } from '../../services/formationTypes';
import { NCAA_FOOTBALL_FIELD } from '../../services/fieldConfigService';

interface PrintPreviewProps {
  formation: Formation;
  fieldConfig?: FieldConfig;
  onClose: () => void;
  onExportPdf?: () => void;
}

type PageLayout = '1-up' | '2-up' | '4-up';

interface PreviewPage {
  pageNumber: number;
  sets: Array<{
    index: number;
    name: string;
    positions: Map<string, Position>;
    counts: number;
  }>;
}

export function PrintPreview({
  formation,
  fieldConfig = NCAA_FOOTBALL_FIELD,
  onClose,
  onExportPdf,
}: PrintPreviewProps) {
  const [layout, setLayout] = useState<PageLayout>('1-up');
  const [currentPage, setCurrentPage] = useState(0);

  const setsPerPage = layout === '1-up' ? 1 : layout === '2-up' ? 2 : 4;

  const pages: PreviewPage[] = useMemo(() => {
    const result: PreviewPage[] = [];
    const keyframes = formation.keyframes;

    for (let i = 0; i < keyframes.length; i += setsPerPage) {
      const pageSets = keyframes.slice(i, i + setsPerPage).map((kf, j) => ({
        index: i + j,
        name: `Set ${i + j + 1}`,
        positions: kf.positions,
        counts: 8,
      }));
      result.push({ pageNumber: result.length + 1, sets: pageSets });
    }

    return result.length > 0 ? result : [{ pageNumber: 1, sets: [] }];
  }, [formation.keyframes, setsPerPage]);

  const totalPages = pages.length;
  const page = pages[currentPage] ?? pages[0];

  const handlePrevPage = useCallback(() => {
    setCurrentPage(p => Math.max(0, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(p => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Print Preview &mdash; {formation.name}
          </h2>
          <div className="flex items-center gap-3">
            {/* Layout selector */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 text-xs">
              {(['1-up', '2-up', '4-up'] as PageLayout[]).map((l) => (
                <button
                  key={l}
                  onClick={() => { setLayout(l); setCurrentPage(0); }}
                  className={`px-3 py-1 rounded ${layout === l ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            {/* Actions */}
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg">
              <Printer className="w-4 h-4" />
              Print
            </button>
            {onExportPdf && (
              <button onClick={onExportPdf} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                <Download className="w-4 h-4" />
                PDF
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100 dark:bg-gray-900 flex items-start justify-center">
          <div
            className="bg-white shadow-lg rounded"
            style={{
              width: '100%',
              maxWidth: '800px',
              aspectRatio: '8.5 / 11',
              padding: '32px',
            }}
          >
            {/* Page header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-300">
              <span className="text-sm font-bold text-gray-800">{formation.name}</span>
              <span className="text-xs text-gray-500">Page {page.pageNumber} of {totalPages}</span>
            </div>

            {/* Sets grid */}
            <div
              className="grid gap-4 h-full"
              style={{
                gridTemplateColumns: layout === '4-up' ? 'repeat(2, 1fr)' : '1fr',
                gridTemplateRows: layout === '1-up' ? '1fr' : 'repeat(2, 1fr)',
              }}
            >
              {page.sets.map((set) => (
                <SetPreview
                  key={set.index}
                  set={set}
                  performers={formation.performers}
                  fieldConfig={fieldConfig}
                  compact={layout !== '1-up'}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer pagination */}
        <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="p-1.5 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1}
            className="p-1.5 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mini field with performer dots for a single set */
function SetPreview({
  set,
  performers,
  compact,
}: {
  set: { index: number; name: string; positions: Map<string, Position>; counts: number };
  performers: Formation['performers'];
  fieldConfig?: FieldConfig;
  compact: boolean;
}) {
  const fieldWidth = 300;
  const fieldHeight = compact ? 120 : 180;

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-1">
        <span className={`font-semibold text-gray-800 ${compact ? 'text-xs' : 'text-sm'}`}>
          {set.name}
        </span>
        <span className="text-xs text-gray-500">{set.counts} counts</span>
      </div>
      <svg
        viewBox={`0 0 ${fieldWidth} ${fieldHeight}`}
        className="w-full border border-gray-300 rounded bg-green-50"
        style={{ maxHeight: compact ? 120 : 200 }}
      >
        {/* Yard lines */}
        {Array.from({ length: 11 }, (_, i) => {
          const x = (i / 10) * fieldWidth;
          return (
            <line
              key={`yl-${i}`}
              x1={x} y1={0} x2={x} y2={fieldHeight}
              stroke="#9ca3af" strokeWidth={0.5}
            />
          );
        })}
        {/* Hash marks */}
        <line x1={0} y1={fieldHeight * 0.33} x2={fieldWidth} y2={fieldHeight * 0.33} stroke="#9ca3af" strokeWidth={0.3} strokeDasharray="2 4" />
        <line x1={0} y1={fieldHeight * 0.67} x2={fieldWidth} y2={fieldHeight * 0.67} stroke="#9ca3af" strokeWidth={0.3} strokeDasharray="2 4" />

        {/* Performers */}
        {performers.map((p) => {
          const pos = set.positions.get(p.id);
          if (!pos) return null;
          const cx = (pos.x / 100) * fieldWidth;
          const cy = (pos.y / 100) * fieldHeight;
          const r = compact ? 3 : 4;
          return (
            <g key={p.id}>
              <circle cx={cx} cy={cy} r={r} fill={p.color} stroke="white" strokeWidth={0.5} />
              {!compact && (
                <text
                  x={cx}
                  y={cy + r + 8}
                  textAnchor="middle"
                  fontSize={6}
                  fill="#374151"
                  fontWeight="bold"
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default PrintPreview;
