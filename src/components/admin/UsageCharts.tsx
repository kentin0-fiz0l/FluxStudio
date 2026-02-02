/**
 * UsageCharts Component - Flux Studio Admin
 *
 * Displays usage metrics and analytics visualizations.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Users,
  Eye,
  Clock,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
}

interface ChartData {
  labels: string[];
  values: number[];
}

interface UsageChartsProps {
  onExport?: (format: 'csv' | 'pdf' | 'excel') => void;
}

// ============================================================================
// SIMPLE BAR CHART
// ============================================================================

function SimpleBarChart({ data, height = 200 }: { data: ChartData; height?: number }) {
  const maxValue = Math.max(...data.values);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.values.map((value, index) => {
        const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all duration-300 hover:bg-blue-600 dark:hover:bg-blue-500"
              style={{ height: `${barHeight}%`, minHeight: value > 0 ? 4 : 0 }}
              title={`${data.labels[index]}: ${value}`}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">
              {data.labels[index]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UsageCharts({ onExport }: UsageChartsProps) {
  const { t } = useTranslation('admin');
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Mock data - in production, this would come from an API
  const metrics: MetricCard[] = useMemo(() => [
    {
      label: t('analytics.metrics.pageViews', 'Page Views'),
      value: '124,532',
      change: 12.5,
      changeLabel: t('analytics.dateRange.month', 'vs last month'),
      icon: <Eye className="w-5 h-5" />,
    },
    {
      label: t('analytics.metrics.sessions', 'Sessions'),
      value: '18,429',
      change: 8.2,
      changeLabel: t('analytics.dateRange.month', 'vs last month'),
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: t('analytics.metrics.activeUsers', 'Active Users'),
      value: '2,847',
      change: -3.1,
      changeLabel: t('analytics.dateRange.month', 'vs last month'),
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: t('analytics.metrics.newUsers', 'New Users'),
      value: '428',
      change: 15.8,
      changeLabel: t('analytics.dateRange.month', 'vs last month'),
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ], [t]);

  // Generate mock chart data based on date range
  const chartData = useMemo((): ChartData => {
    switch (dateRange) {
      case 'today':
        return {
          labels: ['12am', '4am', '8am', '12pm', '4pm', '8pm'],
          values: [120, 45, 890, 1250, 980, 450],
        };
      case 'week':
        return {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          values: [4200, 5100, 4800, 5300, 6200, 3100, 2800],
        };
      case 'month':
        return {
          labels: ['W1', 'W2', 'W3', 'W4'],
          values: [28500, 32100, 29800, 34100],
        };
      case 'quarter':
        return {
          labels: ['Jan', 'Feb', 'Mar'],
          values: [95000, 102000, 124500],
        };
      case 'year':
        return {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          values: [280000, 320000, 350000, 390000],
        };
      default:
        return { labels: [], values: [] };
    }
  }, [dateRange]);

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: 'today', label: t('analytics.dateRange.today', 'Today') },
    { value: 'week', label: t('analytics.dateRange.week', 'This Week') },
    { value: 'month', label: t('analytics.dateRange.month', 'This Month') },
    { value: 'quarter', label: t('analytics.dateRange.quarter', 'This Quarter') },
    { value: 'year', label: t('analytics.dateRange.year', 'This Year') },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400">{metric.icon}</span>
              {metric.change !== undefined && (
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    metric.change >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {metric.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(metric.change)}%
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metric.value}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.usage', 'Usage Statistics')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    dateRange === option.value
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Download className="w-4 h-4" />
                {t('analytics.export.title', 'Export')}
              </button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => onExport?.('csv')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('analytics.export.csv', 'Export as CSV')}
                </button>
                <button
                  onClick={() => onExport?.('pdf')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('analytics.export.pdf', 'Export as PDF')}
                </button>
                <button
                  onClick={() => onExport?.('excel')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('analytics.export.excel', 'Export as Excel')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="p-6">
          <SimpleBarChart data={chartData} height={250} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Session Duration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.metrics.avgSessionDuration', 'Average Session Duration')}
            </h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            8m 42s
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4" />
            +12% {t('analytics.dateRange.month', 'vs last month')}
          </div>
        </div>

        {/* Bounce Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t('analytics.metrics.bounceRate', 'Bounce Rate')}
            </h3>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            32.4%
          </div>
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <TrendingDown className="w-4 h-4" />
            -5.2% {t('analytics.dateRange.month', 'vs last month')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsageCharts;
