/**
 * Performer side panel for FormationCanvas
 */

import React, { ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { List, RowComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import type { Formation } from '../../../services/formationService';

interface PerformerPanelProps {
  formation: Formation;
  selectedPerformerIds: Set<string>;
  onSelectPerformer: (id: string, multi: boolean) => void;
  onAddPerformer: () => void;
  onRemovePerformer: (id: string) => void;
}

const PERFORMER_ROW_HEIGHT = 48;

interface PerformerRowProps {
  performers: Formation['performers'];
  selectedPerformerIds: Set<string>;
  onSelectPerformer: (id: string, multi: boolean) => void;
  onRemovePerformer: (id: string) => void;
}

function PerformerRow({
  index,
  style,
  performers,
  selectedPerformerIds,
  onSelectPerformer,
  onRemovePerformer,
}: RowComponentProps<PerformerRowProps>): ReactElement | null {
  const performer = performers[index];
  if (!performer) return null;

  return (
    <div style={style}>
      <div
        role="button"
        tabIndex={0}
        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
          selectedPerformerIds.has(performer.id)
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        onClick={() => onSelectPerformer(performer.id, false)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPerformer(performer.id, false); } }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: performer.color }}
        >
          {performer.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {performer.name}
          </p>
          {performer.group && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {performer.group}
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemovePerformer(performer.id); }}
          className="p-1 text-gray-400 hover:text-red-500 rounded"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export const PerformerPanel: React.FC<PerformerPanelProps> = ({
  formation, selectedPerformerIds,
  onSelectPerformer, onAddPerformer, onRemovePerformer,
}) => {
  const { t } = useTranslation('common');

  const rowProps = useMemo(() => ({
    performers: formation.performers,
    selectedPerformerIds,
    onSelectPerformer,
    onRemovePerformer,
  }), [formation.performers, selectedPerformerIds, onSelectPerformer, onRemovePerformer]);

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">
          {t('formation.performers', 'Performers')}
        </h3>
        <button
          onClick={onAddPerformer}
          className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
          title={t('formation.addPerformer', 'Add Performer')}
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-2">
        {formation.performers.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            {t('formation.noPerformers', 'No performers yet. Click + to add.')}
          </p>
        ) : (
          <AutoSizer
            renderProp={({ height, width }) => (
              <List
                style={{ height: height ?? 0, width: width ?? 0 }}
                rowComponent={PerformerRow}
                rowCount={formation.performers.length}
                rowHeight={PERFORMER_ROW_HEIGHT}
                rowProps={rowProps}
                overscanCount={5}
              />
            )}
          />
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formation.performers.length} {t('formation.performersCount', 'performers')} •{' '}
          {formation.keyframes.length} {t('formation.keyframesCount', 'keyframes')}
        </p>
      </div>
    </div>
  );
};
