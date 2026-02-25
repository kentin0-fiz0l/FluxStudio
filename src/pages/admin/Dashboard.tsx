/**
 * Admin Dashboard Page - Flux Studio
 *
 * Main admin dashboard with overview metrics, system health, and navigation.
 * Stats and recent activity are fetched from the backend API.
 */

import React, { useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { buildApiUrl } from '@/config/environment';

// Lazy-load chart-heavy admin components to reduce feature-admin chunk size
const SystemHealth = React.lazy(() =>
  import('../../components/admin/SystemHealth').then(m => ({ default: m.SystemHealth }))
);
const UsageCharts = React.lazy(() =>
  import('../../components/admin/UsageCharts').then(m => ({ default: m.UsageCharts }))
);
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  BarChart3,
  FileText,
  Settings,
  CreditCard,
  ChevronRight,
  Shield,
  ArrowUpRight,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

interface StatCard {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  href?: string;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  resource: string;
  details?: string;
  timestamp: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminDashboard() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Fetch admin stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [usersRes, projectsRes] = await Promise.all([
        apiService.get<{ users: { id: string }[]; total?: number }>('/users'),
        apiService.get<{ projects: { id: string }[]; total?: number }>('/projects'),
      ]);

      const usersList = usersRes.success && usersRes.data
        ? (usersRes.data as { users: { id: string }[]; total?: number })
        : { users: [], total: 0 };
      const projectsList = projectsRes.success && projectsRes.data
        ? (projectsRes.data as { projects: { id: string }[]; total?: number })
        : { projects: [], total: 0 };

      return {
        totalUsers: usersList.total ?? usersList.users?.length ?? 0,
        totalProjects: projectsList.total ?? projectsList.projects?.length ?? 0,
      };
    },
  });

  // Fetch recent audit logs
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', { limit: 5 }],
    queryFn: async () => {
      const res = await apiService.get<{ logs: AuditLogEntry[]; pagination: { total: number } }>(
        '/admin/audit-logs',
        { params: { limit: '5' } }
      );
      if (!res.success) throw new Error(res.error || 'Failed to fetch audit logs');
      return res.data as { logs: AuditLogEntry[]; pagination: { total: number } };
    },
  });

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: t('navigation.overview', 'Overview'), icon: <LayoutDashboard className="w-5 h-5" aria-hidden="true" />, href: '/admin' },
    { id: 'users', label: t('navigation.users', 'Users'), icon: <Users className="w-5 h-5" aria-hidden="true" />, href: '/admin/users', badge: 5 },
    { id: 'teams', label: t('navigation.teams', 'Teams'), icon: <Building2 className="w-5 h-5" aria-hidden="true" />, href: '/admin/teams' },
    { id: 'projects', label: t('navigation.projects', 'Projects'), icon: <FolderKanban className="w-5 h-5" aria-hidden="true" />, href: '/admin/projects' },
    { id: 'analytics', label: t('navigation.analytics', 'Analytics'), icon: <BarChart3 className="w-5 h-5" aria-hidden="true" />, href: '/admin/analytics' },
    { id: 'audit', label: t('navigation.auditLogs', 'Audit Logs'), icon: <FileText className="w-5 h-5" aria-hidden="true" />, href: '/admin/audit' },
    { id: 'settings', label: t('navigation.settings', 'Settings'), icon: <Settings className="w-5 h-5" aria-hidden="true" />, href: '/admin/settings' },
    { id: 'billing', label: t('navigation.billing', 'Billing'), icon: <CreditCard className="w-5 h-5" aria-hidden="true" />, href: '/admin/billing' },
  ];

  // Dynamic stats from fetched data
  const stats: StatCard[] = statsLoading
    ? [
        { label: t('overview.totalUsers', 'Total Users'), value: '...', icon: <Users className="w-6 h-6" aria-hidden="true" />, href: '/admin/users' },
        { label: t('overview.totalProjects', 'Total Projects'), value: '...', icon: <FolderKanban className="w-6 h-6" aria-hidden="true" />, href: '/admin/projects' },
      ]
    : [
        {
          label: t('overview.totalUsers', 'Total Users'),
          value: statsData?.totalUsers?.toLocaleString() ?? '0',
          icon: <Users className="w-6 h-6" aria-hidden="true" />,
          href: '/admin/users',
        },
        {
          label: t('overview.totalProjects', 'Total Projects'),
          value: statsData?.totalProjects?.toLocaleString() ?? '0',
          icon: <FolderKanban className="w-6 h-6" aria-hidden="true" />,
          href: '/admin/projects',
        },
      ];

  // Format relative time for audit log entries
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    if (format === 'csv') {
      try {
        const response = await fetch(buildApiUrl('/admin/audit-logs/export'), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!response.ok) throw new Error('Export failed');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-logs.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // Export error — silently fail for now
      }
    }
  };

  // Recent activity from audit logs
  const recentActivity = auditData?.logs ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden lg:block">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-gray-100">
                  {t('title', 'Admin Dashboard')}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.name || 'Administrator'}
                </p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => setActiveSection(item.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('overview.title', 'Dashboard Overview')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {t('overview.description', 'Monitor your platform performance and manage resources.')}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsLoading ? (
              // Loading skeletons
              <>
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))}
              </>
            ) : (
              stats.map((stat, index) => {
                const CardWrapper = stat.href ? 'button' : 'div';
                return (
                  <CardWrapper
                    key={index}
                    {...(stat.href ? { onClick: () => navigate(stat.href!), 'aria-label': `${stat.label}: ${stat.value}` } : {})}
                    className={`w-full text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${
                      stat.href ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">
                        {stat.icon}
                      </div>
                      {stat.change !== undefined && (
                        <span
                          className={`text-sm font-medium ${
                            stat.change >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {stat.change >= 0 ? '+' : ''}
                          {stat.change}%
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {stat.value}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</span>
                      {stat.href && <ArrowUpRight className="w-4 h-4 text-gray-400" aria-hidden="true" />}
                    </div>
                  </CardWrapper>
                );
              })
            )}
          </div>

          {/* System Health */}
          <div className="mb-8">
            <Suspense fallback={<div className="h-48 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />}>
              <SystemHealth />
            </Suspense>
          </div>

          {/* Analytics & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Usage Charts - 2 columns */}
            <div className="lg:col-span-2">
              <Suspense fallback={<div className="h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse" />}>
                <UsageCharts onExport={handleExport} />
              </Suspense>
            </div>

            {/* Recent Activity - 1 column */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {t('overview.recentActivity', 'Recent Activity')}
                </h3>
                <Link
                  to="/admin/audit"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {t('navigation.auditLogs', 'View All')}
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditLoading ? (
                  // Loading skeletons for activity
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
                      </div>
                    ))}
                  </>
                ) : recentActivity.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No recent activity
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {activity.userName || activity.userId}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activity.action}{activity.resource ? ` — ${activity.resource}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
