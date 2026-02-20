/**
 * DeadlineRiskPanel — Risk indicator, at-risk tasks, completion forecast.
 *
 * Sprint 35: Phase 3.2 Predictive Analytics.
 */

import React from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useProjectRisks, type RiskData } from '../../hooks/useProjectAnalytics';

interface DeadlineRiskPanelProps {
  projectId: string;
}

const RISK_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  'on-track': {
    color: 'text-green-700', bg: 'bg-green-50',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    label: 'On Track',
  },
  'at-risk': {
    color: 'text-yellow-700', bg: 'bg-yellow-50',
    icon: <Clock className="w-5 h-5 text-yellow-600" />,
    label: 'At Risk',
  },
  'behind': {
    color: 'text-red-700', bg: 'bg-red-50',
    icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    label: 'Behind Schedule',
  },
  'no-data': {
    color: 'text-neutral-500', bg: 'bg-neutral-50',
    icon: <TrendingUp className="w-5 h-5 text-neutral-400" />,
    label: 'Insufficient Data',
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ==================== Sub-components ====================

const RiskIndicator = React.memo(function RiskIndicator({ data }: { data: RiskData }) {
  const risk = RISK_CONFIG[data.forecast.riskLevel] || RISK_CONFIG['no-data'];

  return (
    <div className={`p-4 rounded-lg border ${risk.bg}`}>
      <div className="flex items-center gap-3">
        {risk.icon}
        <div>
          <div className={`text-sm font-semibold ${risk.color}`}>{risk.label}</div>
          <div className="text-xs text-neutral-600 mt-0.5">
            {data.remainingTasks} tasks remaining
            {data.forecast.avgVelocity > 0 && (
              <span> &middot; {data.forecast.avgVelocity} tasks/week avg</span>
            )}
          </div>
        </div>
      </div>

      {/* Date comparison */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="p-2 bg-white/60 rounded">
          <div className="text-[10px] text-neutral-500 uppercase">Due Date</div>
          <div className="text-xs font-medium text-neutral-800">
            {data.dueDate ? formatDate(data.dueDate) : 'Not set'}
          </div>
        </div>
        <div className="p-2 bg-white/60 rounded">
          <div className="text-[10px] text-neutral-500 uppercase">Projected</div>
          <div className={`text-xs font-medium ${
            data.forecast.riskLevel === 'behind' ? 'text-red-700' :
            data.forecast.riskLevel === 'at-risk' ? 'text-yellow-700' : 'text-neutral-800'
          }`}>
            {data.forecast.projectedDate
              ? formatDate(data.forecast.projectedDate)
              : 'Needs velocity data'}
          </div>
        </div>
      </div>
    </div>
  );
});

const AtRiskTaskList = React.memo(function AtRiskTaskList({ tasks }: { tasks: RiskData['atRiskTasks'] }) {
  if (tasks.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-medium text-neutral-600 mb-2">
        At-Risk Tasks
        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-orange-50 text-orange-700">
          {tasks.length}
        </span>
      </h4>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-2 p-2 bg-neutral-50 rounded border border-neutral-100">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
              task.riskType === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-neutral-800 truncate">{task.title}</div>
              <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                {task.riskType === 'overdue' ? (
                  <span className="text-red-600">{task.daysOverdue}d overdue</span>
                ) : (
                  <span className="text-yellow-600">Due soon</span>
                )}
                <span className="capitalize">{task.priority}</span>
                {task.assignedTo && <span>{task.assignedTo}</span>}
                {task.estimatedHours > 0 && <span>{task.estimatedHours}h est</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const HealthTrend = React.memo(function HealthTrend({ history }: { history: RiskData['healthHistory'] }) {
  if (history.length < 2) return null;

  const min = Math.min(...history.map(h => h.score));
  const max = Math.max(...history.map(h => h.score));
  const range = Math.max(max - min, 10);

  // Simple sparkline using SVG
  const width = 200;
  const height = 32;
  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((h.score - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const trend = latest.score - previous.score;

  return (
    <div className="flex items-center gap-3">
      <div>
        <div className="text-[10px] text-neutral-500">Health Trend (30d)</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}
          </span>
          <span className="text-[10px] text-neutral-400">last snapshot</span>
        </div>
      </div>
      <svg width={width} height={height} className="flex-1">
        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

// ==================== Main Component ====================

export const DeadlineRiskPanel = React.memo(function DeadlineRiskPanel({
  projectId,
}: DeadlineRiskPanelProps) {
  const { data, isLoading } = useProjectRisks(projectId);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-24 bg-neutral-100 rounded-lg" />
        <div className="h-32 bg-neutral-100 rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-xs text-neutral-400 text-center py-6">
        No risk data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Risk Indicator */}
      <RiskIndicator data={data} />

      {/* Health Trend sparkline */}
      {data.healthHistory.length >= 2 && (
        <div className="p-3 bg-white rounded-lg border border-neutral-200">
          <HealthTrend history={data.healthHistory} />
        </div>
      )}

      {/* At-Risk Tasks */}
      <AtRiskTaskList tasks={data.atRiskTasks} />
    </div>
  );
});
