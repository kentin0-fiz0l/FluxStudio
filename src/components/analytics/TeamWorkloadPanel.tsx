/**
 * TeamWorkloadPanel — Per-member workload heatmap + bottleneck list.
 *
 * Sprint 35: Phase 3.2 Predictive Analytics.
 */

import React from 'react';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { LazyImage } from '../LazyImage';
import { useTeamWorkload, type TeamMemberWorkload, type Bottleneck } from '../../hooks/useTeamAnalytics';

interface TeamWorkloadPanelProps {
  teamId: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#6366f1',
  low: '#94a3b8',
};

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  overloaded: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', label: 'Overloaded' },
  balanced: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', label: 'Balanced' },
  idle: { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-500 dark:text-neutral-400', label: 'Idle' },
};

// ==================== Sub-components ====================

const WorkloadBar = React.memo(function WorkloadBar({ member }: { member: TeamMemberWorkload }) {
  const total = member.activeTasks;
  const badge = STATUS_BADGES[member.status] || STATUS_BADGES.balanced;
  const priorities = [
    { key: 'critical', count: member.tasksByPriority.critical },
    { key: 'high', count: member.tasksByPriority.high },
    { key: 'medium', count: member.tasksByPriority.medium },
    { key: 'low', count: member.tasksByPriority.low },
  ];

  return (
    <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {member.avatar ? (
            <LazyImage src={member.avatar} alt="" width={24} height={24} className="rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <User className="w-3 h-3 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            </div>
          )}
          <div>
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{member.name}</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-1.5">{member.role}</span>
          </div>
        </div>
        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Stacked priority bar */}
      {total > 0 ? (
        <div className="flex h-3 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700" role="progressbar" aria-label={`${member.name} workload: ${total} tasks`}>
          {priorities.map(p => p.count > 0 ? (
            <div
              key={p.key}
              className="h-full transition-all duration-300"
              style={{
                width: `${(p.count / total) * 100}%`,
                backgroundColor: PRIORITY_COLORS[p.key],
              }}
              title={`${p.count} ${p.key}`}
            />
          ) : null)}
        </div>
      ) : (
        <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-700" />
      )}

      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
        <span>{total} active</span>
        <span>{member.estimatedHoursRemaining}h remaining</span>
        {member.overdueTasks > 0 && (
          <span className="text-orange-600">{member.overdueTasks} overdue</span>
        )}
        {member.blockedTasks > 0 && (
          <span className="text-red-600">{member.blockedTasks} blocked</span>
        )}
      </div>
    </div>
  );
});

const BottleneckItem = React.memo(function BottleneckItem({ task }: { task: Bottleneck }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded border border-neutral-100 dark:border-neutral-700">
      {task.status === 'blocked' ? (
        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{task.title}</div>
        <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
          <span className={`px-1 py-0.5 rounded ${
            task.status === 'blocked' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
          }`}>
            {task.status === 'blocked' ? 'Blocked' : `${task.daysOverdue}d overdue`}
          </span>
          <span className="capitalize">{task.priority}</span>
          {task.assignedTo && <span>{task.assignedTo}</span>}
        </div>
      </div>
    </div>
  );
});

// ==================== Main Component ====================

export const TeamWorkloadPanel = React.memo(function TeamWorkloadPanel({
  teamId,
}: TeamWorkloadPanelProps) {
  const { data, isLoading } = useTeamWorkload(teamId);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse" role="status" aria-label="Loading team workload">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
            <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.members.length === 0) {
    return (
      <div className="text-xs text-neutral-400 text-center py-6">
        <span className="dark:text-neutral-500">No team members found</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Workload Distribution */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Team Workload</h3>
          <div className="flex items-center gap-2 text-[10px]">
            {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-neutral-500 capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {data.members.map(m => (
            <WorkloadBar key={m.userId} member={m} />
          ))}
        </div>
      </div>

      {/* Bottlenecks */}
      {data.bottlenecks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
            Bottlenecks
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
              {data.bottlenecks.length}
            </span>
          </h3>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {data.bottlenecks.map(b => (
              <BottleneckItem key={b.id} task={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
