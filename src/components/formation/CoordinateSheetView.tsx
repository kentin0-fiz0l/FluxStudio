/**
 * CoordinateSheetView - Interactive coordinate sheet table
 *
 * Displays a sortable, print-optimized table of coordinate entries for
 * a single performer. Click any row to navigate to that set on the canvas.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Table, Printer, ArrowUpDown } from 'lucide-react';
import type { CoordinateEntry } from '../../services/formationTypes';

// ============================================================================
// TYPES
// ============================================================================

interface CoordinateSheetViewProps {
  entries: CoordinateEntry[];
  performerName: string;
  onNavigateToSet: (setId: string) => void;
}

type SortKey = 'set' | 'counts' | 'sideToSide' | 'frontToBack' | 'stepSize' | 'direction' | 'difficulty';
type SortDirection = 'asc' | 'desc';

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, moderate: 1, hard: 2 };

// ============================================================================
// HELPERS
// ============================================================================

function getDifficultyBadge(difficulty: 'easy' | 'moderate' | 'hard') {
  const styles: Record<string, string> = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[difficulty]}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}

function getSortValue(entry: CoordinateEntry, key: SortKey): string | number {
  switch (key) {
    case 'set':
      return entry.set.sortOrder;
    case 'counts':
      return entry.set.counts;
    case 'sideToSide':
      return entry.coordinateDetails.sideToSide;
    case 'frontToBack':
      return entry.coordinateDetails.frontToBack;
    case 'stepSize':
      return entry.stepToNext?.stepSize ?? Infinity;
    case 'direction':
      return entry.stepToNext?.directionLabel ?? '';
    case 'difficulty':
      return DIFFICULTY_ORDER[entry.stepToNext?.difficulty ?? 'easy'] ?? 0;
    default:
      return 0;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CoordinateSheetView: React.FC<CoordinateSheetViewProps> = ({
  entries,
  performerName,
  onNavigateToSet,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('set');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);

      let cmp: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [entries, sortKey, sortDirection]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleRowClick = useCallback(
    (setId: string) => {
      onNavigateToSet(setId);
    },
    [onNavigateToSet],
  );

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: 'set', label: 'Set' },
    { key: 'counts', label: 'Counts' },
    { key: 'sideToSide', label: 'Side-to-Side' },
    { key: 'frontToBack', label: 'Front-to-Back' },
    { key: 'stepSize', label: 'Step Size' },
    { key: 'direction', label: 'Direction' },
    { key: 'difficulty', label: 'Difficulty' },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 print:border-black">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-blue-500 print:text-black" aria-hidden="true" />
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white print:text-black">
              Coordinate Sheet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-700">
              {performerName}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg print:hidden"
          aria-label="Print coordinate sheet"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          Print
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 print:bg-white">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 print:text-black print:cursor-default"
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown
                      className={`w-3 h-3 print:hidden ${
                        sortKey === col.key ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 print:divide-gray-300">
            {sortedEntries.map((entry) => (
              <tr
                key={entry.set.id}
                onClick={() => handleRowClick(entry.set.id)}
                className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors print:hover:bg-transparent print:cursor-default"
                tabIndex={0}
                aria-label={`Navigate to ${entry.set.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(entry.set.id);
                  }
                }}
              >
                {/* Set */}
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white print:text-black whitespace-nowrap">
                  {entry.set.name}
                  {entry.set.rehearsalMark && (
                    <span className="ml-1.5 text-xs text-blue-500 dark:text-blue-400 print:text-gray-600">
                      [{entry.set.rehearsalMark}]
                    </span>
                  )}
                </td>

                {/* Counts */}
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 print:text-black text-center">
                  {entry.set.counts}
                </td>

                {/* Side-to-Side */}
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 print:text-black">
                  {entry.coordinateDetails.sideToSide}
                </td>

                {/* Front-to-Back */}
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 print:text-black">
                  {entry.coordinateDetails.frontToBack}
                </td>

                {/* Step Size */}
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 print:text-black whitespace-nowrap">
                  {entry.stepToNext ? entry.stepToNext.stepSizeLabel : '\u2014'}
                </td>

                {/* Direction */}
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 print:text-black">
                  {entry.stepToNext ? entry.stepToNext.directionLabel : '\u2014'}
                </td>

                {/* Difficulty */}
                <td className="px-3 py-2">
                  {entry.stepToNext
                    ? getDifficultyBadge(entry.stepToNext.difficulty)
                    : <span className="text-gray-400">{'\u2014'}</span>
                  }
                </td>
              </tr>
            ))}

            {entries.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No coordinate entries to display
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          /* Show only the coordinate sheet and its children */
          .coordinate-sheet-print,
          .coordinate-sheet-print * {
            visibility: visible;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
          }

          th, td {
            border: 1px solid #ccc;
            padding: 4px 8px;
          }

          th {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          tr:nth-child(even) {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Difficulty badges */
          .bg-green-100 {
            background-color: #dcfce7 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-yellow-100 {
            background-color: #fef9c3 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-red-100 {
            background-color: #fee2e2 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default CoordinateSheetView;
