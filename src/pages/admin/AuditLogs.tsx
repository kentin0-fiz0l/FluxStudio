/**
 * Admin Audit Logs Page - Flux Studio
 *
 * View and filter audit logs for security and compliance.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'invite' | 'remove';
type AuditCategory = 'all' | 'auth' | 'users' | 'projects' | 'settings' | 'security';

interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  action: AuditAction;
  category: AuditCategory;
  resource: string;
  resourceId?: string;
  details: string;
  ip: string;
  userAgent?: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

// Map resource_type → category for filtering
function resourceToCategory(resourceType: string): AuditCategory {
  if (['user', 'session'].includes(resourceType)) return 'auth';
  if (['project'].includes(resourceType)) return 'projects';
  if (['organization', 'role'].includes(resourceType)) return 'settings';
  return 'security';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminAuditLogs() {
  const { t } = useTranslation('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(pageSize) });
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter !== 'all') params.set('resource', categoryFilter);
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end + 'T23:59:59Z');

      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      setLogs(
        (data.logs || []).map((log: Record<string, unknown>) => ({
          id: log.id as string,
          timestamp: log.timestamp as string,
          user: {
            id: (log.userId as string) || '',
            name: (log.userName as string) || 'System',
            email: (log.userEmail as string) || '',
          },
          action: log.action as AuditAction,
          category: resourceToCategory(log.resourceType as string),
          resource: log.resourceType as string,
          resourceId: log.resourceId as string,
          details: typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || ''),
          ip: (log.ip as string) || '',
          userAgent: log.userAgent as string,
        }))
      );
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentPage, searchQuery, categoryFilter, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side filtering on fetched data
  const filteredLogs = useMemo(() => logs, [logs]);

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedLogs = filteredLogs;

  const handleRefresh = () => fetchLogs();

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    if (format !== 'csv') return;
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const params = new URLSearchParams();
    if (categoryFilter !== 'all') params.set('resource', categoryFilter);
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end) params.set('endDate', dateRange.end + 'T23:59:59Z');

    const res = await fetch(`${API_URL}/api/admin/audit-logs/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionIcon = (action: AuditAction) => {
    switch (action) {
      case 'login':
        return <LogIn className="w-4 h-4 text-green-500" />;
      case 'logout':
        return <LogOut className="w-4 h-4 text-gray-500" />;
      case 'create':
        return <Plus className="w-4 h-4 text-blue-500" />;
      case 'update':
        return <Edit className="w-4 h-4 text-yellow-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'invite':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'remove':
        return <UserMinus className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryBadge = (category: AuditCategory) => {
    const colors: Record<AuditCategory, string> = {
      all: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      auth: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      users: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      projects: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      settings: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      security: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[category]}`}>
        {t(`auditLogs.filters.${category}`, category)}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link to="/admin" className="hover:text-gray-700 dark:hover:text-gray-300">
            {t('title', 'Admin')}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-gray-100">{t('auditLogs.title', 'Audit Logs')}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('auditLogs.title', 'Audit Logs')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('auditLogs.description', 'Track all activities and changes across your organization.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('auditLogs.search', 'Search logs...')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as AuditCategory)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">{t('auditLogs.filters.all', 'All Events')}</option>
              <option value="auth">{t('auditLogs.filters.auth', 'Authentication')}</option>
              <option value="users">{t('auditLogs.filters.users', 'User Changes')}</option>
              <option value="projects">{t('auditLogs.filters.projects', 'Project Changes')}</option>
              <option value="settings">{t('auditLogs.filters.settings', 'Settings Changes')}</option>
              <option value="security">{t('auditLogs.filters.security', 'Security Events')}</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('auditLogs.columns.timestamp', 'Timestamp')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('auditLogs.columns.user', 'User')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('auditLogs.columns.action', 'Action')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('auditLogs.columns.resource', 'Resource')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('auditLogs.columns.details', 'Details')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('auditLogs.columns.ip', 'IP Address')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedLogs.map((log) => {
              const { date, time } = formatTimestamp(log.timestamp);
              return (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{date}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
                        {log.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {log.user.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{log.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {t(`auditLogs.actions.${log.action}`, log.action)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(log.category)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">{log.resource}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {log.details}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{log.ip}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded-lg ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAuditLogs;
