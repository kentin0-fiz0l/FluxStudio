/**
 * Security Events Timeline
 * Sprint 13, Day 6: Admin Dashboard UI
 *
 * View, filter, and export security events with timeline visualization
 */

import { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '../hooks/useAdminAuth';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  timestamp: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

interface EventSummary {
  totalEvents: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<string, number>;
}

export function Events() {
  const { apiRequest } = useAdminApi();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    userId: '',
    ipAddress: '',
    fromDate: '',
    toDate: '',
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: '50',
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await apiRequest<{ events?: SecurityEvent[]; summary?: EventSummary | null; pagination?: { totalPages: number } }>(`/api/admin/security/events?${params}`);
      setEvents(response.events || []);
      setSummary(response.summary || null);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [apiRequest, page, filters]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setExportLoading(true);

      const params = new URLSearchParams({ format });
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await apiRequest<string | { events?: SecurityEvent[] }>(`/api/admin/security/events/export?${params}`);

      if (format === 'csv') {
        // Create download link for CSV
        const blob = new Blob([response as string], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Download JSON
        const jsonResponse = response as { events?: SecurityEvent[] };
        const blob = new Blob([JSON.stringify(jsonResponse.events, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-events-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert(`Failed to export events: ${error}`);
    } finally {
      setExportLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-900/20 border-red-500/30 text-red-400';
      case 'HIGH':
        return 'bg-orange-900/20 border-orange-500/30 text-orange-400';
      case 'MEDIUM':
        return 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400';
      case 'LOW':
      case 'INFO':
        return 'bg-blue-900/20 border-blue-500/30 text-blue-400';
      default:
        return 'bg-gray-900/20 border-gray-500/30 text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
      case 'INFO':
        return '🔵';
      default:
        return '⚪';
    }
  };

  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Security Events</h1>
          <p className="text-gray-400">Timeline of security-related events and alerts</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('json')}
            disabled={exportLoading}
            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => loadEvents()}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Total Events</p>
            <p className="text-3xl font-bold text-white">{summary.totalEvents.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Critical</p>
            <p className="text-3xl font-bold text-red-400">{summary.bySeverity.critical.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">High</p>
            <p className="text-3xl font-bold text-orange-400">{summary.bySeverity.high.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Medium</p>
            <p className="text-3xl font-bold text-yellow-400">{summary.bySeverity.medium.toLocaleString()}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm mb-2">Low/Info</p>
            <p className="text-3xl font-bold text-blue-400">{summary.bySeverity.low.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
            <select
              value={filters.type}
              onChange={(e) => {
                setFilters({ ...filters, type: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="failed_login">Failed Login</option>
              <option value="unauthorized_access">Unauthorized Access</option>
              <option value="ip_blocked">IP Blocked</option>
              <option value="token_revoked">Token Revoked</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => {
                setFilters({ ...filters, severity: e.target.value });
                setPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">User ID</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="Filter by user..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">IP Address</label>
            <input
              type="text"
              value={filters.ipAddress}
              onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
              placeholder="Filter by IP..."
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Event Timeline</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No security events found
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEvent(event)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedEvent(event); } }}
                className="flex items-start p-4 bg-gray-900/50 rounded-lg hover:bg-gray-900 cursor-pointer transition-colors border border-transparent hover:border-blue-500/30"
              >
                {/* Timeline Indicator */}
                <div className="flex flex-col items-center mr-4">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(event.severity)} border-2`}></div>
                  <div className="w-0.5 h-full bg-gray-700 mt-2"></div>
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{getSeverityIcon(event.severity)}</span>
                      <h3 className="text-white font-medium">{formatEventType(event.type)}</h3>
                      <span className={`ml-3 px-2 py-0.5 border rounded text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {event.userEmail && (
                      <div>
                        <span className="text-gray-400">User: </span>
                        <span className="text-white">{event.userEmail}</span>
                      </div>
                    )}
                    {event.ipAddress && (
                      <div>
                        <span className="text-gray-400">IP: </span>
                        <code className="text-white font-mono">{event.ipAddress}</code>
                      </div>
                    )}
                  </div>

                  {event.details && (
                    <div className="mt-2 text-xs text-gray-400">
                      Click to view details
                    </div>
                  )}
                </div>
              </div>
            ))}
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

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="presentation" onClick={() => setSelectedEvent(null)}>
          <div role="dialog" aria-label="Event details" className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Event Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Event Type</p>
                <p className="text-white font-medium">{formatEventType(selectedEvent.type)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Severity</p>
                <span className={`px-3 py-1 border rounded-lg text-xs font-medium ${getSeverityColor(selectedEvent.severity)}`}>
                  {selectedEvent.severity}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Timestamp</p>
                <p className="text-white">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
              </div>
              {selectedEvent.userEmail && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">User</p>
                  <p className="text-white">{selectedEvent.userEmail}</p>
                </div>
              )}
              {selectedEvent.ipAddress && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">IP Address</p>
                  <code className="text-white font-mono">{selectedEvent.ipAddress}</code>
                </div>
              )}
              {selectedEvent.userAgent && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">User Agent</p>
                  <p className="text-white text-sm">{selectedEvent.userAgent}</p>
                </div>
              )}
              {selectedEvent.details && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Additional Details</p>
                  <pre className="bg-gray-900 rounded-lg p-4 text-xs text-gray-300 overflow-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
