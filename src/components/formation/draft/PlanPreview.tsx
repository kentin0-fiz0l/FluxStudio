import type { ShowPlan } from './formationDraftTypes';

export function PlanPreview({ plan }: { plan: ShowPlan }) {
  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{plan.title}</p>
      <div className="space-y-1">
        {plan.sections.map((section, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-medium text-[10px]">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate block">
                {section.sectionName}
              </span>
              <span className="text-gray-400 truncate block">
                {section.formationConcept} — {section.keyframeCount} keyframe{section.keyframeCount !== 1 ? 's' : ''}
              </span>
            </div>
            <EnergyDot energy={section.energy} />
          </div>
        ))}
      </div>
      <div className="pt-1 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400">
        {plan.totalKeyframes} total keyframes — ~{plan.estimatedTokens?.toLocaleString() || '?'} tokens
      </div>
    </div>
  );
}

function EnergyDot({ energy }: { energy: string }) {
  const colors: Record<string, string> = {
    low: 'bg-blue-400',
    medium: 'bg-green-400',
    high: 'bg-orange-400',
    climax: 'bg-red-400',
  };

  return (
    <div
      className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[energy] || 'bg-gray-400'}`}
      title={energy}
    />
  );
}
