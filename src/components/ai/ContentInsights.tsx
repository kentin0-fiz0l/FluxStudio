import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  FileText,
  HardDrive,
  Zap,
  Activity,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { OverviewPanel } from './content-insights/OverviewPanel';
import { TrendsPanel } from './content-insights/TrendsPanel';
import { QualityPanel } from './content-insights/QualityPanel';
import type { FileStats, CategoryStats, ContentInsightsProps } from './content-insights/types';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './content-insights/types';

// Mock data
const mockStats: FileStats = {
  totalFiles: 248,
  totalSize: 1024 * 1024 * 450, // 450 MB
  byCategory: {
    design: 87,
    image: 62,
    video: 23,
    audio: 15,
    document: 41,
    code: 12,
    archive: 5,
    data: 3,
  },
  bySizeRange: {
    '0-1MB': 145,
    '1-10MB': 72,
    '10-50MB': 23,
    '50MB+': 8,
  },
  byQualityScore: {
    excellent: 94,
    good: 108,
    fair: 38,
    poor: 8,
  },
  uploadTrend: [
    { date: '10/08', count: 12 },
    { date: '10/09', count: 18 },
    { date: '10/10', count: 24 },
    { date: '10/11', count: 16 },
    { date: '10/12', count: 31 },
    { date: '10/13', count: 28 },
    { date: '10/14', count: 35 },
    { date: '10/15', count: 22 },
  ],
  aiAnalyzed: 186,
  avgConfidence: 0.87,
  topTags: [
    { name: 'design', count: 145 },
    { name: 'client-work', count: 98 },
    { name: 'ui-design', count: 87 },
    { name: 'branding', count: 62 },
    { name: 'high-priority', count: 43 },
  ],
  recentActivity: [
    {
      id: '1',
      type: 'upload',
      description: 'Uploaded 5 design files',
      timestamp: new Date('2024-10-15T10:30:00'),
      fileName: 'hero-banner.png',
    },
    {
      id: '2',
      type: 'analysis',
      description: 'AI analyzed logo-variants.sketch',
      timestamp: new Date('2024-10-15T09:15:00'),
      fileName: 'logo-variants.sketch',
    },
    {
      id: '3',
      type: 'tag',
      description: 'Added tags to brand-guidelines.pdf',
      timestamp: new Date('2024-10-15T08:45:00'),
      fileName: 'brand-guidelines.pdf',
    },
    {
      id: '4',
      type: 'share',
      description: 'Shared mockups folder with team',
      timestamp: new Date('2024-10-14T16:20:00'),
    },
  ],
};

export const ContentInsights: React.FC<ContentInsightsProps> = ({
  projectId: _projectId,
  timeRange = '30d',
  showDetailedMetrics: _showDetailedMetrics = true,
}) => {
  const [stats] = useState<FileStats>(mockStats);
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'quality'>(
    'overview'
  );

  // Calculate category stats
  const categoryStats: CategoryStats[] = useMemo(() => {
    return Object.entries(stats.byCategory).map(([category, count]) => ({
      category,
      count,
      size: (stats.totalSize / stats.totalFiles) * count,
      percentage: (count / stats.totalFiles) * 100,
      color: CATEGORY_COLORS[category] || '#6B7280',
      icon: CATEGORY_ICONS[category] || <FileText className="w-5 h-5" aria-hidden="true" />,
    }));
  }, [stats]);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Store current time on mount for stable time ago calculations
  const [mountTime] = useState(() => Date.now());

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((mountTime - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Size range data
  const sizeData = Object.entries(stats.bySizeRange).map(([range, count]) => ({
    range,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Content Insights</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered analytics for your content library
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            aria-label="Select time range"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 opacity-80" aria-hidden="true" />
            <TrendingUp className="w-5 h-5 opacity-60" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.totalFiles}</div>
          <div className="text-sm opacity-80">Total Files</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <HardDrive className="w-8 h-8 opacity-80" aria-hidden="true" />
            <Activity className="w-5 h-5 opacity-60" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold mb-1">{formatBytes(stats.totalSize)}</div>
          <div className="text-sm opacity-80">Total Size</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Sparkles className="w-8 h-8 opacity-80" aria-hidden="true" />
            <Zap className="w-5 h-5 opacity-60" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold mb-1">{stats.aiAnalyzed}</div>
          <div className="text-sm opacity-80">AI Analyzed</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 opacity-80" aria-hidden="true" />
            <TrendingUp className="w-5 h-5 opacity-60" aria-hidden="true" />
          </div>
          <div className="text-3xl font-bold mb-1">
            {Math.round(stats.avgConfidence * 100)}%
          </div>
          <div className="text-sm opacity-80">Avg Confidence</div>
        </motion.div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Content insights views">
        {(['overview', 'trends', 'quality'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view)}
            role="tab"
            aria-selected={selectedView === view}
            className={`
              px-4 py-2 text-sm font-medium capitalize transition-colors
              ${
                selectedView === view
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <OverviewPanel
          categoryStats={categoryStats}
          sizeData={sizeData}
          stats={stats}
          formatTimeAgo={formatTimeAgo}
        />
      )}

      {/* Trends View */}
      {selectedView === 'trends' && (
        <TrendsPanel uploadTrend={stats.uploadTrend} />
      )}

      {/* Quality View */}
      {selectedView === 'quality' && (
        <QualityPanel stats={stats} />
      )}
    </div>
  );
};

export default ContentInsights;
