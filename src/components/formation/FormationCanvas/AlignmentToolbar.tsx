/**
 * AlignmentToolbar - Floating toolbar for multi-select alignment and distribution
 * Appears when 2+ performers are selected.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  ArrowRightLeft,
  ArrowUpDown,
  Maximize2,
} from 'lucide-react';
import type { AlignmentType, DistributionType } from '../../../utils/drillGeometry';

interface AlignmentToolbarProps {
  selectedCount: number;
  onAlign: (type: AlignmentType) => void;
  onDistribute: (type: DistributionType) => void;
}

export const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({
  selectedCount,
  onAlign,
  onDistribute,
}) => {
  const { t } = useTranslation('common');

  if (selectedCount < 2) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <span className="text-xs text-gray-500 mr-2">
        {selectedCount} {t('formation.selected', 'selected')}
      </span>

      {/* Alignment buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onAlign('left')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignLeft', 'Align Left')}
        >
          <AlignStartVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onAlign('center')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignCenter', 'Align Center')}
        >
          <AlignCenterVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onAlign('right')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignRight', 'Align Right')}
        >
          <AlignEndVertical className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        <button
          onClick={() => onAlign('top')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignTop', 'Align Top')}
        >
          <AlignStartHorizontal className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onAlign('middle')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignMiddle', 'Align Middle')}
        >
          <AlignCenterHorizontal className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onAlign('bottom')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignBottom', 'Align Bottom')}
        >
          <AlignEndHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Distribution buttons (only when 3+ selected) */}
      {selectedCount >= 3 && (
        <>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onDistribute('horizontal')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title={t('formation.distributeHorizontal', 'Distribute Horizontally')}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDistribute('vertical')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title={t('formation.distributeVertical', 'Distribute Vertically')}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDistribute('equal')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title={t('formation.distributeEqual', 'Equal Spacing')}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
