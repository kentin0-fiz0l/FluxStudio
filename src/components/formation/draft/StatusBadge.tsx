import type { DraftStatus } from './formationDraftTypes';

export function StatusBadge({ status }: { status: DraftStatus }) {
  const configs: Record<DraftStatus, { label: string; color: string }> = {
    idle: { label: 'Ready', color: 'text-gray-400' },
    analyzing: { label: 'Analyzing music...', color: 'text-blue-500' },
    planning: { label: 'Planning show...', color: 'text-blue-500' },
    awaiting_approval: { label: 'Awaiting approval', color: 'text-amber-500' },
    generating: { label: 'Generating...', color: 'text-amber-500' },
    smoothing: { label: 'Smoothing...', color: 'text-purple-500' },
    refining: { label: 'Refining...', color: 'text-purple-500' },
    paused: { label: 'Paused', color: 'text-gray-400' },
    done: { label: 'Complete', color: 'text-green-500' },
    error: { label: 'Error', color: 'text-red-500' },
  };

  const cfg = configs[status];

  return (
    <span className={`text-[10px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
