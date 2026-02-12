/**
 * Admin Dashboard Page - Flux Studio
 *
 * Main admin dashboard with overview metrics, system health, and navigation.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SystemHealth } from '../../components/admin/SystemHealth';
import { UsageCharts } from '../../components/admin/UsageCharts';
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
  Activity,
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

// ============================================================================
// COMPONENT
// ============================================================================

export function AdminDashboard() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Navigation items
  const navItems: NavItem[] = [
    { id: 'overview', label: t('navigation.overview', 'Overview'), icon: <LayoutDashboard className="w-5 h-5" />, href: '/admin' },
    { id: 'users', label: t('navigation.users', 'Users'), icon: <Users className="w-5 h-5" />, href: '/admin/users', badge: 5 },
    { id: 'teams', label: t('navigation.teams', 'Teams'), icon: <Building2 className="w-5 h-5" />, href: '/admin/teams' },
    { id: 'projects', label: t('navigation.projects', 'Projects'), icon: <FolderKanban className="w-5 h-5" />, href: '/admin/projects' },
    { id: 'analytics', label: t('navigation.analytics', 'Analytics'), icon: <BarChart3 className="w-5 h-5" />, href: '/admin/analytics' },
    { id: 'audit', label: t('navigation.auditLogs', 'Audit Logs'), icon: <FileText className="w-5 h-5" />, href: '/admin/audit' },
    { id: 'settings', label: t('navigation.settings', 'Settings'), icon: <Settings className="w-5 h-5" />, href: '/admin/settings' },
    { id: 'billing', label: t('navigation.billing', 'Billing'), icon: <CreditCard className="w-5 h-5" />, href: '/admin/billing' },
  ];

  // Overview stats
  const stats: StatCard[] = [
    {
      label: t('overview.totalUsers', 'Total Users'),
      value: '2,847',
      change: 12.5,
      icon: <Users className="w-6 h-6" />,
      href: '/admin/users',
    },
    {
      label: t('overview.activeUsers', 'Active Users'),
      value: '1,423',
      change: -3.2,
      icon: <Activity className="w-6 h-6" />,
    },
    {
      label: t('overview.totalProjects', 'Total Projects'),
      value: '846',
      change: 8.1,
      icon: <FolderKanban className="w-6 h-6" />,
      href: '/admin/projects',
    },
    {
      label: t('overview.activeProjects', 'Active Projects'),
      value: '312',
      change: 15.7,
      icon: <Activity className="w-6 h-6" />,
    },
  ];

  // Recent activity mock data
  const recentActivity = [
    { id: 1, user: 'John Doe', action: t('auditLogs.actions.login', 'User login'), time: '2 minutes ago' },
    { id: 2, user: 'Jane Smith', action: t('auditLogs.actions.create', 'Created project'), time: '15 minutes ago' },
    { id: 3, user: 'Mike Johnson', action: t('auditLogs.actions.update', 'Updated settings'), time: '1 hour ago' },
    { id: 4, user: 'Sarah Wilson', action: t('auditLogs.actions.invite', 'Invited team member'), time: '2 hours ago' },
    { id: 5, user: 'Admin', action: t('auditLogs.actions.update', 'System update'), time: '3 hours ago' },
  ];

  const handleExport = (_format: 'csv' | 'pdf' | 'excel') => {
    // Implementation would go here
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden lg:block">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
            {stats.map((stat, index) => (
              <div
                key={index}
                onClick={() => stat.href && navigate(stat.href)}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${
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
                  {stat.href && <ArrowUpRight className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
            ))}
          </div>

          {/* System Health */}
          <div className="mb-8">
            <SystemHealth />
          </div>

          {/* Analytics & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Usage Charts - 2 columns */}
            <div className="lg:col-span-2">
              <UsageCharts onExport={handleExport} />
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
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {activity.user}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
