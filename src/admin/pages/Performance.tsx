/**
 * Performance Metrics Dashboard
 * Sprint 13, Day 6: Admin Dashboard UI
 *
 * Real-time system performance monitoring with charts and metrics
 */

import React, { useState, useEffect } from 'react';
import { useAdminApi } from '../hooks/useAdminAuth';
import { Line, Bar } from 'react-chartjs-2';

interface PerformanceMetrics {
  requests: {
    total: number;
    errors: number;
    errorRate: number;
    avgPerMinute: number;
  };
  latency: {
    avg: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  system: {
    currentMemory: number;
    maxMemory: number;
    avgMemory: number;
    currentCpu: number;
    maxCpu: number;
    avgCpu: number;
  };
  endpoints: Record<string, any>;
}

interface SystemHealth {
  status: string;
  components: {
    redis: { status: string; latency: number | null };
    database: { status: string };
  };
  system: {
    memory: { heapUsed: number; heapTotal: number; rss: number };
    cpu: { cores: number; loadAvg1m: number; usage: number };
    uptime: number;
  };
}

export function Performance() {
  const { apiRequest } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [period, setPeriod] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadPerformanceData();

    if (autoRefresh) {
      const interval = setInterval(loadPerformanceData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [period, autoRefresh]);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);

      const [metricsData, healthData] = await Promise.all([
        apiRequest(`/api/admin/performance/summary?period=${period}`),
        apiRequest('/api/admin/health'),
      ]);

      setMetrics(metricsData.summary);
      setHealth(healthData.health);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'degraded':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'warning':
      case 'unhealthy':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Performance Metrics</h1>
          <p className="text-gray-400">Real-time system performance and health monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="autoRefresh" className="ml-2 text-sm text-gray-300">
              Auto-refresh (30s)
            </label>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={loadPerformanceData}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Status */}
      {health && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">System Health</h2>
            <span className={`px-4 py-2 border rounded-lg text-sm font-medium capitalize ${getHealthColor(health.status)}`}>
              {health.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Redis Status */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Redis Cache</span>
                <span className={`px-2 py-1 border rounded text-xs font-medium ${getHealthColor(health.components.redis.status)}`}>
                  {health.components.redis.status}
                </span>
              </div>
              {health.components.redis.latency !== null && (
                <p className="text-white text-sm">Latency: {health.components.redis.latency}ms</p>
              )}
            </div>

            {/* Database Status */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Database</span>
                <span className={`px-2 py-1 border rounded text-xs font-medium ${getHealthColor(health.components.database.status)}`}>
                  {health.components.database.status}
                </span>
              </div>
            </div>

            {/* Uptime */}
            <div className="bg-gray-900/50 rounded-lg p-4">
              <span className="text-gray-400 text-sm block mb-2">System Uptime</span>
              <p className="text-white text-lg font-semibold">{formatUptime(health.system.uptime)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Request Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Total Requests</p>
              <p className="text-3xl font-bold text-white">{metrics.requests.total.toLocaleString()}</p>
              <p className="text-sm text-gray-400 mt-1">{metrics.requests.avgPerMinute.toFixed(1)}/min avg</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Error Rate</p>
              <p className="text-3xl font-bold text-red-400">{metrics.requests.errorRate.toFixed(2)}%</p>
              <p className="text-sm text-gray-400 mt-1">{metrics.requests.errors} errors</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Avg Latency</p>
              <p className="text-3xl font-bold text-blue-400">{metrics.latency.avg.toFixed(0)}ms</p>
              <p className="text-sm text-gray-400 mt-1">P95: {metrics.latency.p95.toFixed(0)}ms</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Max Latency</p>
              <p className="text-3xl font-bold text-yellow-400">{metrics.latency.max.toFixed(0)}ms</p>
              <p className="text-sm text-gray-400 mt-1">P99: {metrics.latency.p99.toFixed(0)}ms</p>
            </div>
          </div>

          {/* System Resources */}
          {health && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Memory Usage */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Memory Usage</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Heap Used</span>
                      <span className="text-white font-mono">{formatBytes(health.system.memory.heapUsed)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(health.system.memory.heapUsed / health.system.memory.heapTotal) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">Heap Total</span>
                      <span className="text-white font-mono">{formatBytes(health.system.memory.heapTotal)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">RSS</span>
                      <span className="text-white font-mono">{formatBytes(health.system.memory.rss)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400 block">Current</span>
                        <span className="text-white font-semibold">{formatBytes(metrics.system.currentMemory)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Average</span>
                        <span className="text-white font-semibold">{formatBytes(metrics.system.avgMemory)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CPU Usage */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">CPU Usage</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">CPU Load</span>
                      <span className="text-white font-mono">{health.system.cpu.usage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${health.system.cpu.usage > 80 ? 'bg-red-500' : health.system.cpu.usage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${health.system.cpu.usage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block">CPU Cores</span>
                      <span className="text-white font-mono">{health.system.cpu.cores}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Load Avg (1m)</span>
                      <span className="text-white font-mono">{health.system.cpu.loadAvg1m.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400 block">Current CPU</span>
                        <span className="text-white font-semibold">{metrics.system.currentCpu.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Average CPU</span>
                        <span className="text-white font-semibold">{metrics.system.avgCpu.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Endpoint Performance */}
          {metrics.endpoints && Object.keys(metrics.endpoints).length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Endpoint Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Requests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Latency</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P95</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {Object.entries(metrics.endpoints)
                      .sort(([, a]: any, [, b]: any) => b.count - a.count)
                      .slice(0, 10)
                      .map(([endpoint, stats]: [string, any]) => (
                        <tr key={endpoint} className="hover:bg-gray-900/30">
                          <td className="px-6 py-4 text-sm text-white font-mono">{endpoint}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{stats.count?.toLocaleString() || 0}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{stats.mean?.toFixed(0) || 0}ms</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{stats.p95?.toFixed(0) || 0}ms</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
