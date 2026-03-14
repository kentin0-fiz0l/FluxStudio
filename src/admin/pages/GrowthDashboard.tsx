/**
 * Growth Dashboard — Phase 5
 *
 * Shows key growth metrics: MAU, active trials, trial conversion, MRR, recent signups.
 * Uses the existing funnel endpoint for conversion chart data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '../hooks/useAdminAuth';
import { Bar } from 'react-chartjs-2';

interface GrowthMetrics {
  mau: number;
  activeTrials: number;
  trialConversion: { total: number; converted: number; rate: number };
  mrr: number;
  recentSignups: number;
}

interface FunnelStage {
  stage: string;
  unique_users: number;
}

export function GrowthDashboard() {
  const { apiRequest } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [growthData, funnelResponse] = await Promise.all([
        apiRequest<{ metrics: GrowthMetrics }>('/api/analytics/admin/growth'),
        apiRequest<{ funnel: FunnelStage[] }>('/api/analytics/funnel'),
      ]);
      setMetrics(growthData.metrics);
      setFunnelData(funnelResponse.funnel || []);
    } catch (error) {
      console.error('Failed to load growth data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400">Loading growth metrics...</p>
        </div>
      </div>
    );
  }

  const stageLabels: Record<string, string> = {
    signup_started: 'Signup Started',
    signup_completed: 'Signup Completed',
    email_verified: 'Email Verified',
    trial_started: 'Trial Started',
    first_project_created: 'First Project',
    first_collaboration: 'First Collab',
    day_7_return: 'Day 7 Return',
  };

  const chartData = {
    labels: funnelData.map((s) => stageLabels[s.stage] || s.stage),
    datasets: [
      {
        label: 'Unique Users',
        data: funnelData.map((s) => s.unique_users),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#9ca3af', stepSize: 1 },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      x: {
        ticks: { color: '#9ca3af', maxRotation: 45 },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Growth Dashboard</h1>
        <p className="text-gray-400">Q1 Target: 50 MAU, 10 paying customers, $190+ MRR</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="MAU (30d)"
          value={metrics?.mau ?? 0}
          target={50}
          color="blue"
        />
        <MetricCard
          label="Active Trials"
          value={metrics?.activeTrials ?? 0}
          color="purple"
        />
        <MetricCard
          label="Trial Conversion"
          value={`${metrics?.trialConversion.rate ?? 0}%`}
          subtitle={`${metrics?.trialConversion.converted ?? 0} / ${metrics?.trialConversion.total ?? 0}`}
          color="green"
        />
        <MetricCard
          label="MRR"
          value={`$${((metrics?.mrr ?? 0) / 100).toFixed(0)}`}
          target={190}
          color="emerald"
        />
        <MetricCard
          label="Signups (7d)"
          value={metrics?.recentSignups ?? 0}
          color="amber"
        />
      </div>

      {/* Funnel Chart */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Conversion Funnel (30d)</h2>
        </div>
        <div className="p-6" style={{ height: 320 }}>
          {funnelData.length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <p className="text-gray-400 text-center py-12">No funnel data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  target,
  color,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  target?: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600/20 text-blue-400',
    purple: 'bg-purple-600/20 text-purple-400',
    green: 'bg-green-600/20 text-green-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
    amber: 'bg-amber-600/20 text-amber-400',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
      {target !== undefined && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={colorMap[color] || 'text-gray-400'}>
              Target: {typeof value === 'number' ? `${value}/${target}` : target}
            </span>
          </div>
          {typeof value === 'number' && (
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  color === 'blue' ? 'bg-blue-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-gray-500'
                }`}
                style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
