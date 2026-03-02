import type { DraftStatus } from './formationDraftTypes';

export function ProgressBar({
  percent,
  status,
  currentSection,
  totalSections,
  currentKeyframe,
  totalKeyframes,
}: {
  percent: number;
  status: DraftStatus;
  currentSection: number;
  totalSections: number;
  currentKeyframe: number;
  totalKeyframes: number;
}) {
  const statusLabels: Partial<Record<DraftStatus, string>> = {
    analyzing: 'Analyzing music structure...',
    planning: 'Creating show plan...',
    generating: `Section ${currentSection + 1}/${totalSections} — Keyframe ${currentKeyframe}/${totalKeyframes}`,
    smoothing: 'Smoothing transitions...',
    refining: 'Applying refinements...',
    paused: 'Paused',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {statusLabels[status] || status}
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{percent}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Generation progress">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
