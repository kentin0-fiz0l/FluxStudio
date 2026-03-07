/**
 * ExportProgressView - Progress bar during export rendering/encoding
 */

import { useTranslation } from 'react-i18next';
import type { ExportProgress } from '../../../services/formationService';

// ============================================================================
// Types
// ============================================================================

export interface ExportProgressViewProps {
  exportProgress: ExportProgress | null;
}

// ============================================================================
// Component
// ============================================================================

export function ExportProgressView({ exportProgress }: ExportProgressViewProps) {
  const { t } = useTranslation('common');
  if (!exportProgress || exportProgress.phase === 'done') return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {exportProgress.phase === 'rendering' ? t('formation.exportProgress.rendering', 'Rendering frames...') : t('formation.exportProgress.encoding', 'Encoding...')}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {exportProgress.percent}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-200"
          style={{ width: `${exportProgress.percent}%` }}
        />
      </div>
    </div>
  );
}
