/**
 * ProjectHealthDashboard — Health gauge, score breakdown, burndown chart, velocity chart.
 *
 * Sprint 35: Phase 3.2 Predictive Analytics.
 * Uses recharts for data visualization.
 */

import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  useProjectHealth,
  useProjectBurndown,
  useProjectVelocity,
  type ProjectHealth,
} from '../../hooks/useProjectAnalytics';
import { MetricCard, MetricValue, MetricLabel, MetricGroup } from '@/components/ui/MetricCard';

interface ProjectHealthDashboardProps {
  projectId: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#eab308'; // yellow-500
  if (score >= 40) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Attention';
  return 'At Risk';
}

// ==================== Sub-components ====================

const HealthScoreGauge = React.memo(function HealthScoreGauge({ health }: { health: ProjectHealth }) {
  const color = scoreColor(health.score);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (health.score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{health.score}</span>
          <span className="text-[10px] text-neutral-500">{scoreLabel(health.score)}</span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="text-neutral-500">
          {health.taskStats.completed}/{health.taskStats.total} tasks completed
        </div>
        {health.taskStats.blocked > 0 && (
          <div className="text-red-600">{health.taskStats.blocked} blocked</div>
        )}
        {health.taskStats.overdue > 0 && (
          <div className="text-orange-600">{health.taskStats.overdue} overdue</div>
        )}
      </div>
    </div>
  );
});

const ScoreBreakdown = React.memo(function ScoreBreakdown({ health }: { health: ProjectHealth }) {
  const items = [
    { label: 'Completion', score: health.completionScore, detail: health.breakdown.completion.detail },
    { label: 'Velocity', score: health.velocityScore, detail: health.breakdown.velocity.detail },
    { label: 'Momentum', score: health.momentumScore, detail: health.breakdown.momentum.detail },
    { label: 'On-Time', score: health.overdueScore, detail: health.breakdown.overdue.detail },
  ];

  return (
    <MetricGroup columns={2}>
      {items.map(item => (
        <MetricCard key={item.label} size="sm">
          <div className="flex items-center justify-between mb-1">
            <MetricLabel>{item.label}</MetricLabel>
            <MetricValue value={item.score} size="sm" colorClassName={`font-semibold`} />
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${item.score}%`, backgroundColor: scoreColor(item.score) }}
            />
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">{item.detail}</div>
        </MetricCard>
      ))}
    </MetricGroup>
  );
});

const BurndownChart = React.memo(function BurndownChart({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectBurndown(projectId);

  const chartData = useMemo(() => {
    if (!data?.burndown) return [];
    return data.burndown.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      remaining: p.remaining,
    }));
  }, [data]);

  if (isLoading) return <LoadingPlaceholder height={160} />;
  if (!chartData.length) return <EmptyState text="No burndown data yet" />;

  return (
    <div>
      <h4 className="text-xs font-medium text-neutral-600 mb-2">Burndown (30 days)</h4>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={30} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="remaining"
            stroke="#6366f1"
            fill="#eef2ff"
            strokeWidth={2}
            name="Remaining"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

const VelocityChart = React.memo(function VelocityChart({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectVelocity(projectId);

  const chartData = useMemo(() => {
    if (!data?.weeklyVelocity) return [];
    const now = new Date();
    return data.weeklyVelocity.map((v, i) => {
      const weekDate = new Date(now.getTime() - (7 - i) * 7 * 24 * 60 * 60 * 1000);
      return {
        week: `W${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        completed: v,
      };
    });
  }, [data]);

  if (isLoading) return <LoadingPlaceholder height={140} />;
  if (!chartData.length) return <EmptyState text="No velocity data yet" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-neutral-600">Weekly Velocity</h4>
        {data && (
          <div className="flex items-center gap-3 text-[10px] text-neutral-500">
            <span>Cycle: {data.avgCycleTimeDays}d avg</span>
            <span>Accuracy: {data.estimationAccuracy}%</span>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={20} allowDecimals={false} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={i === chartData.length - 1 ? '#6366f1' : '#c7d2fe'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

function LoadingPlaceholder({ height }: { height: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
      <div className="flex items-end gap-1 h-[calc(100%-24px)]">
        {[40, 60, 35, 75, 55, 80, 45, 65, 50, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-6 text-xs text-neutral-400">
      {text}
    </div>
  );
}

// ==================== Main Component ====================

export const ProjectHealthDashboard = React.memo(function ProjectHealthDashboard({
  projectId,
}: ProjectHealthDashboardProps) {
  const { data: health, isLoading } = useProjectHealth(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Gauge skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-28 h-28 rounded-full border-8 border-neutral-200 dark:border-neutral-700" />
          <div className="space-y-2">
            <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        </div>
        {/* Breakdown skeleton */}
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded" />)}
        </div>
      </div>
    );
  }

  if (!health) {
    return <EmptyState text="No analytics data available" />;
  }

  return (
    <div className="space-y-5">
      {/* Health Score + Breakdown */}
      <MetricCard>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">Project Health</h3>
        <HealthScoreGauge health={health} />
        <div className="mt-4">
          <ScoreBreakdown health={health} />
        </div>
      </MetricCard>

      {/* Burndown Chart */}
      <MetricCard>
        <BurndownChart projectId={projectId} />
      </MetricCard>

      {/* Velocity Chart */}
      <MetricCard>
        <VelocityChart projectId={projectId} />
      </MetricCard>
    </div>
  );
});
