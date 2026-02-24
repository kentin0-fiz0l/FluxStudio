/**
 * Admin Security Dashboard
 * Sprint 13, Day 6: Admin Dashboard UI
 *
 * Main dashboard with security metrics, charts, and system health
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '../hooks/useAdminAuth';
// Line chart import - uncomment when needed
// import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  blockedIPs: number;
  activeTokens: number;
  securityEvents24h: number;
  systemHealth: 'healthy' | 'degraded' | 'warning';
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: string;
  timestamp: string;
}

export function Dashboard() {
  const { apiRequest } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    blockedIPs: 0,
    activeTokens: 0,
    securityEvents24h: 0,
    systemHealth: 'healthy',
  });
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [performanceData, setPerformanceData] = useState<{
    requests?: { total: number; errorRate?: number };
    latency?: { avg?: number; p95?: number };
    system?: { currentMemory: number; currentCpu?: number };
  } | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Load all dashboard data in parallel
      const [blockedIpsData, tokensData, eventsData, healthData, perfData] = await Promise.all([
        apiRequest('/api/admin/security/blocked-ips/stats'),
        apiRequest('/api/admin/tokens/stats'),
        apiRequest('/api/admin/security/events?perPage=5'),
        apiRequest('/api/admin/health'),
        apiRequest('/api/admin/performance/summary?period=1h'),
      ]);

      setStats({
        blockedIPs: blockedIpsData.totalBlocked || 0,
        activeTokens: tokensData.overview?.active || 0,
        securityEvents24h: eventsData.summary?.totalEvents || 0,
        systemHealth: healthData.health?.status || 'healthy',
      });

      setRecentEvents(eventsData.events || []);
      setPerformanceData(perfData.summary || null);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'HIGH':
        return 'text-orange-400 bg-orange-900/20 border-orange-500/30';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'LOW':
      case 'INFO':
        return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getHealthStatus = () => {
    switch (stats.systemHealth) {
      case 'healthy':
        return { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30', icon: '✓' };
      case 'degraded':
        return { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', icon: '!' };
      case 'warning':
        return { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30', icon: '⚠' };
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-900/20', border: 'border-gray-500/30', icon: '?' };
    }
  };

  const healthStatus = getHealthStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Security Dashboard</h1>
        <p className="text-gray-400">Real-time security monitoring and system health</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Blocked IPs */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-1">Blocked IPs</p>
          <p className="text-3xl font-bold text-white">{stats.blockedIPs.toLocaleString()}</p>
        </div>

        {/* Active Tokens */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-1">Active Tokens</p>
          <p className="text-3xl font-bold text-white">{stats.activeTokens.toLocaleString()}</p>
        </div>

        {/* Security Events (24h) */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-1">Events (24h)</p>
          <p className="text-3xl font-bold text-white">{stats.securityEvents24h.toLocaleString()}</p>
        </div>

        {/* System Health */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${healthStatus.bg} rounded-lg flex items-center justify-center`}>
              <span className={`text-2xl ${healthStatus.color}`}>{healthStatus.icon}</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-1">System Health</p>
          <p className={`text-2xl font-bold capitalize ${healthStatus.color}`}>{stats.systemHealth}</p>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Recent Security Events</h2>
        </div>
        <div className="p-6">
          {recentEvents.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent security events</p>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center flex-1">
                    <div className={`px-3 py-1 rounded-lg border text-xs font-medium mr-4 ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{event.type.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-400">{new Date(event.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      {performanceData && (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Performance Summary (1 hour)</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-2">Total Requests</p>
              <p className="text-2xl font-bold text-white">{performanceData.requests?.total.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                Error Rate: {performanceData.requests?.errorRate?.toFixed(2) || 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Avg Latency</p>
              <p className="text-2xl font-bold text-white">{performanceData.latency?.avg?.toFixed(0) || 0}ms</p>
              <p className="text-sm text-gray-500 mt-1">
                P95: {performanceData.latency?.p95?.toFixed(0) || 0}ms
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Memory Usage</p>
              <p className="text-2xl font-bold text-white">
                {((performanceData.system?.currentMemory ?? 0) / 1024 / 1024).toFixed(0)} MB
              </p>
              <p className="text-sm text-gray-500 mt-1">
                CPU: {performanceData.system?.currentCpu?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
