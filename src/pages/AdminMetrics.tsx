/**
 * Admin Metrics Dashboard
 *
 * Sprint 40: Phase 5.3 Observability & Analytics
 *
 * Displays server performance metrics, Web Vitals RUM, and top events.
 * Accessible only to admin users at /admin/metrics.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Loader,
  Wifi,
  TrendingDown,
  Globe,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/templates';

const API_URL = import.meta.env.VITE_API_URL || '';

interface ServerMetrics {
  current: { timestamp: string; requests: { total: number; errors: number }; redis: { total: number } };
  summary: {
    period: { minutes: number; from: string; to: string };
    requests: { total: number; errors: number; errorRate: number; avgPerMinute: number };
    latency: { avg: number; max: number };
    system: { currentMemory: number; currentCpu: number };
  } | null;
  history: Array<{
    timestamp: string;
    requests: { total: number; failed: number; latency: { mean: number; p95: number; p99: number } };
    system: { memory: { heapUsed: number }; cpu: { usage: number } };
  }>;
}

interface WebVitalsAgg {
  total_sessions: string;
  avg_lcp: string;
  avg_fcp: string;
  avg_fid: string;
  avg_cls: string;
  avg_ttfb: string;
  avg_score: string;
  lcp_p75: number;
  cls_p75: number;
}

interface TopEvent {
  event_name: string;
  count: string;
}

interface FunnelStage {
  stage: string;
  unique_users: number;
}

interface PerPageVital {
  url: string;
  sessions: string;
  lcp_p75: number;
  cls_p75: number;
  fcp_p75: number;
}

interface MetricsData {
  server: ServerMetrics;
  webVitals: WebVitalsAgg | null;
  perPageVitals: PerPageVital[];
  topEvents: TopEvent[];
  wsConnections: Record<string, number> | null;
  funnel: FunnelStage[] | null;
}

function MetricCard({ label, value, unit, icon: Icon, color = 'text-primary-600' }: {
  label: string; value: string | number; unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-neutral-900 dark:text-white">
        {value}
        {unit && <span className="text-sm font-normal text-neutral-500 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function VitalsBadge({ value, good, poor, unit = 'ms' }: { value: number | null; good: number; poor: number; unit?: string }) {
  if (value === null || value === undefined) return <span className="text-neutral-400">—</span>;
  const num = Number(value);
  let color = 'text-green-600 bg-green-50 dark:bg-green-900/20';
  if (num > poor) color = 'text-red-600 bg-red-50 dark:bg-red-900/20';
  else if (num > good) color = 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';

  return (
    <span className={`px-2 py-0.5 rounded-full text-sm font-semibold ${color}`}>
      {unit === 'ms' ? `${Math.round(num)}ms` : num.toFixed(3)}
    </span>
  );
}

export function AdminMetrics() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/observability/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 403 ? 'Admin access required' : 'Failed to fetch metrics');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading && !data) {
    return (
      <DashboardLayout
        user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Metrics' }]}
        onLogout={() => {}}
      >
        <div className="flex items-center justify-center py-24">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const summary = data?.server.summary;
  const vitals = data?.webVitals;

  return (
    <DashboardLayout
      user={user ? { name: user.name, email: user.email, avatar: user.avatar } : undefined}
      breadcrumbs={[{ label: 'Admin' }, { label: 'Metrics' }]}
      onLogout={() => {}}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">System Metrics</h1>
            <p className="text-neutral-500 text-sm mt-1">Real-time server performance and Web Vitals</p>
          </div>
          <button
            onClick={fetchMetrics}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Server Overview */}
        {summary && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Avg Latency" value={Math.round(summary.latency.avg)} unit="ms" icon={Clock} />
              <MetricCard label="p95 Latency" value={Math.round(summary.latency.max)} unit="ms" icon={Clock} color="text-amber-600" />
              <MetricCard label="Requests/min" value={Math.round(summary.requests.avgPerMinute)} icon={Activity} />
              <MetricCard
                label="Error Rate"
                value={`${summary.requests.errorRate.toFixed(1)}%`}
                icon={AlertTriangle}
                color={summary.requests.errorRate > 5 ? 'text-red-600' : summary.requests.errorRate > 1 ? 'text-amber-600' : 'text-green-600'}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Total Requests" value={summary.requests.total.toLocaleString()} icon={Activity} color="text-primary-600" />
              <MetricCard label="Errors" value={summary.requests.errors} icon={AlertTriangle} color={summary.requests.errors > 0 ? 'text-red-600' : 'text-green-600'} />
              <MetricCard label="Memory" value={summary.system.currentMemory} unit="MB" icon={HardDrive} color="text-amber-600" />
              <MetricCard label="CPU" value={`${summary.system.currentCpu}%`} icon={Cpu} color={summary.system.currentCpu > 80 ? 'text-red-600' : 'text-green-600'} />
            </div>
          </>
        )}

        {/* Web Vitals */}
        {vitals && Number(vitals.total_sessions) > 0 && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Web Vitals (24h RUM)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-neutral-500 mb-1">LCP</p>
                <VitalsBadge value={Number(vitals.avg_lcp)} good={2500} poor={4000} />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">FCP</p>
                <VitalsBadge value={Number(vitals.avg_fcp)} good={1800} poor={3000} />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">FID</p>
                <VitalsBadge value={Number(vitals.avg_fid)} good={100} poor={300} />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">CLS</p>
                <VitalsBadge value={Number(vitals.avg_cls)} good={0.1} poor={0.25} unit="" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">TTFB</p>
                <VitalsBadge value={Number(vitals.avg_ttfb)} good={200} poor={500} />
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Sessions</p>
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">{vitals.total_sessions}</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Events */}
        {data?.topEvents && data.topEvents.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Top Events (24h)</h2>
            </div>
            <div className="space-y-2">
              {data.topEvents.slice(0, 10).map((e) => (
                <div key={e.event_name} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-neutral-700 dark:text-neutral-300 font-mono">{e.event_name}</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{Number(e.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WebSocket Connections */}
        {data?.wsConnections && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wifi className="w-4 h-4 text-green-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">WebSocket Connections</h2>
              <span className="ml-auto text-2xl font-bold text-neutral-900 dark:text-white">{data.wsConnections.total}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(data.wsConnections)
                .filter(([k]) => k !== 'total')
                .map(([ns, count]) => (
                  <div key={ns} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400 truncate">{ns}</span>
                    <span className={`text-sm font-semibold ${(count as number) > 0 ? 'text-green-600' : 'text-neutral-400'}`}>{count as number}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Signup Funnel (30-day) */}
        {data?.funnel && data.funnel.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Signup Funnel (30 days)</h2>
            </div>
            <div className="space-y-2">
              {data.funnel.map((stage, i) => {
                const maxUsers = data.funnel![0]?.unique_users || 1;
                const pct = maxUsers > 0 ? Math.round((stage.unique_users / maxUsers) * 100) : 0;
                const dropoff = i > 0 && data.funnel![i - 1].unique_users > 0
                  ? Math.round(((data.funnel![i - 1].unique_users - stage.unique_users) / data.funnel![i - 1].unique_users) * 100)
                  : null;
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-neutral-500 w-40 truncate">{stage.stage}</span>
                    <div className="flex-1 h-6 bg-neutral-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white w-12 text-right">{stage.unique_users}</span>
                    {dropoff !== null && dropoff > 0 && (
                      <span className="text-xs text-red-500 w-14 text-right">-{dropoff}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-Page Web Vitals */}
        {data?.perPageVitals && data.perPageVitals.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-amber-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Per-Page Web Vitals (24h, p75)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="pb-2 font-medium">Page</th>
                    <th className="pb-2 font-medium">Sessions</th>
                    <th className="pb-2 font-medium">LCP p75</th>
                    <th className="pb-2 font-medium">FCP p75</th>
                    <th className="pb-2 font-medium">CLS p75</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perPageVitals.map((row) => (
                    <tr key={row.url} className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-1.5 text-neutral-700 dark:text-neutral-300 font-mono text-xs truncate max-w-[200px]">{row.url || '/'}</td>
                      <td className="py-1.5">{row.sessions}</td>
                      <td className="py-1.5">
                        <VitalsBadge value={row.lcp_p75} good={2500} poor={4000} />
                      </td>
                      <td className="py-1.5">
                        <VitalsBadge value={row.fcp_p75} good={1800} poor={3000} />
                      </td>
                      <td className="py-1.5">
                        <VitalsBadge value={row.cls_p75} good={0.1} poor={0.25} unit="" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Latency History */}
        {data?.server.history && data.server.history.length > 0 && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Endpoint Latency (last hour)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Requests</th>
                    <th className="pb-2 font-medium">p50</th>
                    <th className="pb-2 font-medium">p95</th>
                    <th className="pb-2 font-medium">p99</th>
                    <th className="pb-2 font-medium">Errors</th>
                    <th className="pb-2 font-medium">CPU</th>
                    <th className="pb-2 font-medium">Mem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.server.history.slice(-15).reverse().map((row, i) => (
                    <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-1.5 text-neutral-600 dark:text-neutral-400">{new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-1.5">{row.requests.total}</td>
                      <td className="py-1.5">{Math.round(row.requests.latency.mean)}ms</td>
                      <td className="py-1.5">{Math.round(row.requests.latency.p95)}ms</td>
                      <td className="py-1.5 font-mono">{Math.round(row.requests.latency.p99)}ms</td>
                      <td className="py-1.5">{row.requests.failed > 0 ? <span className="text-red-500">{row.requests.failed}</span> : '0'}</td>
                      <td className="py-1.5">{row.system.cpu.usage}%</td>
                      <td className="py-1.5">{row.system.memory.heapUsed}MB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminMetrics;
