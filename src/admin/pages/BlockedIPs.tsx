/**
 * Blocked IPs Management Interface
 * Sprint 13, Day 6: Admin Dashboard UI
 *
 * View, unblock, whitelist, and manage blocked IP addresses
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '../hooks/useAdminAuth';

interface BlockedIP {
  ip: string;
  score: number;
  level: string;
  blockedAt: string;
  reason: string;
  isWhitelisted?: boolean;
}

export function BlockedIPs() {
  const { apiRequest } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [ips, setIps] = useState<BlockedIP[]>([]);
  const [stats, setStats] = useState({ totalBlocked: 0, criticalLevel: 0, highLevel: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterScore, setFilterScore] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBlockedIPs = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '20',
      });

      if (filterScore) {
        params.append('maxScore', filterScore);
      }

      const [ipsData, statsData] = await Promise.all([
        apiRequest<{ ips: BlockedIP[]; pagination?: { totalPages: number } }>(`/api/admin/security/blocked-ips?${params}`),
        apiRequest<{ totalBlocked: number; criticalLevel: number; highLevel: number }>('/api/admin/security/blocked-ips/stats'),
      ]);

      setIps(ipsData.ips || []);
      setTotalPages(ipsData.pagination?.totalPages || 1);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load blocked IPs:', error);
    } finally {
      setLoading(false);
    }
  }, [apiRequest, page, filterScore]);

  useEffect(() => {
    loadBlockedIPs();
  }, [loadBlockedIPs]);

  const handleUnblock = async (ip: string) => {
    if (!confirm(`Are you sure you want to unblock ${ip}?`)) return;

    try {
      setActionLoading(ip);
      await apiRequest(`/api/admin/security/blocked-ips/${ip}/unblock`, {
        method: 'POST',
      });
      await loadBlockedIPs();
    } catch (error) {
      alert(`Failed to unblock IP: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleWhitelist = async (ip: string) => {
    const duration = prompt('Enter whitelist duration in days (leave empty for permanent):', '30');
    if (duration === null) return;

    try {
      setActionLoading(ip);
      await apiRequest(`/api/admin/security/blocked-ips/${ip}/whitelist`, {
        method: 'POST',
        body: JSON.stringify({
          duration: duration ? parseInt(duration) * 24 * 60 * 60 : undefined,
        }),
      });
      await loadBlockedIPs();
    } catch (error) {
      alert(`Failed to whitelist IP: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getLevelBadge = (level: string) => {
    const colors = {
      trusted: 'bg-green-900/20 border-green-500/30 text-green-400',
      neutral: 'bg-gray-900/20 border-gray-500/30 text-gray-400',
      suspicious: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400',
      blocked: 'bg-red-900/20 border-red-500/30 text-red-400',
    };
    return colors[level as keyof typeof colors] || colors.neutral;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Blocked IPs</h1>
          <p className="text-gray-400">Manage blocked and suspicious IP addresses</p>
        </div>
        <button
          onClick={() => loadBlockedIPs()}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Total Blocked</p>
          <p className="text-3xl font-bold text-white">{stats.totalBlocked?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Critical Level</p>
          <p className="text-3xl font-bold text-red-400">{stats.criticalLevel?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">High Risk</p>
          <p className="text-3xl font-bold text-orange-400">{stats.highLevel?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Score</label>
            <select
              value={filterScore}
              onChange={(e) => {
                setFilterScore(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Scores</option>
              <option value="20">Critical (0-20)</option>
              <option value="50">High Risk (20-50)</option>
              <option value="80">Suspicious (50-80)</option>
            </select>
          </div>
        </div>
      </div>

      {/* IP List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Blocked IP Addresses</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading blocked IPs...</p>
          </div>
        ) : ips.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No blocked IPs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Blocked At</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {ips.map((ip) => (
                  <tr key={ip.ip} className="hover:bg-gray-900/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <code className="text-white font-mono">{ip.ip}</code>
                        {ip.isWhitelisted && (
                          <span className="ml-2 px-2 py-1 text-xs bg-green-900/20 border border-green-500/30 text-green-400 rounded">
                            Whitelisted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-lg font-bold ${getScoreColor(ip.score)}`}>
                        {ip.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 border rounded-lg text-xs font-medium capitalize ${getLevelBadge(ip.level)}`}>
                        {ip.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {ip.blockedAt ? new Date(ip.blockedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleUnblock(ip.ip)}
                          disabled={actionLoading === ip.ip}
                          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          Unblock
                        </button>
                        <button
                          onClick={() => handleWhitelist(ip.ip)}
                          disabled={actionLoading === ip.ip}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                        >
                          Whitelist
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
