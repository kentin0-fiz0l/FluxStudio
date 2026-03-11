/**
 * AlignmentToolbar - Floating toolbar for multi-select alignment, distribution, and shape distribution
 * Appears when 2+ performers are selected.
 */

import React, { useState } from 'react';
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
  Shapes,
  ChevronDown,
  Grid,
  LayoutTemplate,
} from 'lucide-react';
import type { AlignmentType, DistributionType } from '../../../utils/drillGeometry';
import { getTemplatesByCategory } from '../../../services/formationTemplates';

export type ShapeDistributionType = 'line' | 'arc' | 'circle' | 'grid';

interface AlignmentToolbarProps {
  selectedCount: number;
  onAlign: (type: AlignmentType) => void;
  onDistribute: (type: DistributionType) => void;
  onDistributeInShape?: (shape: ShapeDistributionType) => void;
  onOptimizeSpacing?: () => void;
  onApplyTemplate?: (templateId: string) => void;
}

export const AlignmentToolbar: React.FC<AlignmentToolbarProps> = ({
  selectedCount,
  onAlign,
  onDistribute,
  onDistributeInShape,
  onOptimizeSpacing,
  onApplyTemplate,
}) => {
  const { t } = useTranslation('common');
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const templatesByCategory = React.useMemo(() => getTemplatesByCategory(), []);

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
          <AlignStartVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={() => onAlign('center')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignCenter', 'Align Center')}
        >
          <AlignCenterVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={() => onAlign('right')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignRight', 'Align Right')}
        >
          <AlignEndVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />

        <button
          onClick={() => onAlign('top')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignTop', 'Align Top')}
        >
          <AlignStartHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={() => onAlign('middle')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignMiddle', 'Align Middle')}
        >
          <AlignCenterHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={() => onAlign('bottom')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          title={t('formation.alignBottom', 'Align Bottom')}
        >
          <AlignEndHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
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
              <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDistribute('vertical')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title={t('formation.distributeVertical', 'Distribute Vertically')}
            >
              <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onDistribute('equal')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title={t('formation.distributeEqual', 'Equal Spacing')}
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {onOptimizeSpacing && (
              <button
                onClick={onOptimizeSpacing}
                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                title={t('formation.smartSpacing', 'Smart Spacing (auto-detect shape)')}
              >
                <Grid className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Shape distribution dropdown */}
          {onDistributeInShape && (
            <>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />
              <div className="relative">
                <button
                  onClick={() => setShowShapeMenu(!showShapeMenu)}
                  className="flex items-center gap-0.5 p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  title="Distribute in Shape"
                >
                  <Shapes className="w-3.5 h-3.5" aria-hidden="true" />
                  <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" />
                </button>
                {showShapeMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                    {(['line', 'arc', 'circle', 'grid'] as const).map((shape) => (
                      <button
                        key={shape}
                        onClick={() => {
                          onDistributeInShape(shape);
                          setShowShapeMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        {shape.charAt(0).toUpperCase() + shape.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Templates dropdown */}
      {onApplyTemplate && (
        <>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5" />
          <div className="relative">
            <button
              onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowShapeMenu(false); }}
              className="flex items-center gap-0.5 p-1.5 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              title="Snap to Template"
            >
              <LayoutTemplate className="w-3.5 h-3.5" aria-hidden="true" />
              <ChevronDown className="w-2.5 h-2.5" aria-hidden="true" />
            </button>
            {showTemplateMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-[160px] max-h-[300px] overflow-y-auto">
                {Array.from(templatesByCategory.entries()).map(([category, templates]) => (
                  <div key={category}>
                    <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {category}
                    </p>
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          onApplyTemplate(template.id);
                          setShowTemplateMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300"
                      >
                        <svg width="16" height="16" viewBox="0 0 40 40" className="flex-shrink-0">
                          <path d={template.thumbnail} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {template.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
