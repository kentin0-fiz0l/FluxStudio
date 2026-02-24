/**
 * Token Management Interface
 * Sprint 13, Day 6: Admin Dashboard UI
 *
 * Search, view, and revoke user authentication tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '../hooks/useAdminAuth';

interface Token {
  id: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  expiresAt: string;
  lastUsed: string;
  revoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

interface TokenStats {
  total: number;
  active: number;
  expired: number;
  revoked: number;
}

interface TopUser {
  userId: string;
  email: string;
  tokenCount: number;
}

export function Tokens() {
  const { apiRequest } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<TokenStats>({ total: 0, active: 0, expired: 0, revoked: 0 });
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '20',
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await apiRequest(`/api/admin/tokens/search?${params}`);
      setTokens(response.tokens || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  }, [apiRequest, page, searchQuery, statusFilter]);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiRequest('/api/admin/tokens/stats');
      setStats(response.overview || { total: 0, active: 0, expired: 0, revoked: 0 });
      setTopUsers(response.topUsers || []);
    } catch (error) {
      console.error('Failed to load token stats:', error);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRevokeToken = async (tokenId: string, revokeAll: boolean = false) => {
    const confirmMessage = revokeAll
      ? 'Are you sure you want to revoke ALL tokens for this user?'
      : 'Are you sure you want to revoke this token?';

    const reason = prompt(confirmMessage + '\n\nEnter reason for revocation:', '');
    if (reason === null) return;

    try {
      setActionLoading(tokenId);
      await apiRequest(`/api/admin/tokens/${tokenId}/revoke`, {
        method: 'POST',
        body: JSON.stringify({
          reason,
          revokeAll,
        }),
      });
      await Promise.all([loadTokens(), loadStats()]);
    } catch (error) {
      alert(`Failed to revoke token: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTokens();
  };

  const getStatusColor = (token: Token) => {
    if (token.revoked) return 'bg-red-900/20 border-red-500/30 text-red-400';
    if (new Date(token.expiresAt) < new Date()) return 'bg-gray-900/20 border-gray-500/30 text-gray-400';
    return 'bg-green-900/20 border-green-500/30 text-green-400';
  };

  const getStatusText = (token: Token) => {
    if (token.revoked) return 'Revoked';
    if (new Date(token.expiresAt) < new Date()) return 'Expired';
    return 'Active';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Token Management</h1>
          <p className="text-gray-400">Monitor and manage user authentication tokens</p>
        </div>
        <button
          onClick={() => {
            loadTokens();
            loadStats();
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Total Tokens</p>
          <p className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Active</p>
          <p className="text-3xl font-bold text-green-400">{stats.active.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Expired</p>
          <p className="text-3xl font-bold text-gray-400">{stats.expired.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-sm mb-2">Revoked</p>
          <p className="text-3xl font-bold text-red-400">{stats.revoked.toLocaleString()}</p>
        </div>
      </div>

      {/* Top Users */}
      {topUsers.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Most Active Users</h2>
          <div className="space-y-2">
            {topUsers.slice(0, 5).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.email}</p>
                    <p className="text-xs text-gray-400">ID: {user.userId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{user.tokenCount}</p>
                  <p className="text-xs text-gray-400">tokens</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <form onSubmit={handleSearch} className="flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Search Tokens</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="User email, ID, or token ID..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Token List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Authentication Tokens</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No tokens found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Used</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-gray-900/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{token.userEmail}</p>
                        <p className="text-xs text-gray-400 font-mono">{token.id.substring(0, 16)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 border rounded-lg text-xs font-medium ${getStatusColor(token)}`}>
                        {getStatusText(token)}
                      </span>
                      {token.revoked && token.revocationReason && (
                        <p className="text-xs text-gray-400 mt-1">{token.revocationReason}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(token.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(token.expiresAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {token.lastUsed ? formatDate(token.lastUsed) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {!token.revoked && new Date(token.expiresAt) > new Date() && (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleRevokeToken(token.id, false)}
                            disabled={actionLoading === token.id}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            Revoke
                          </button>
                          <button
                            onClick={() => handleRevokeToken(token.id, true)}
                            disabled={actionLoading === token.id}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            Revoke All
                          </button>
                        </div>
                      )}
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
