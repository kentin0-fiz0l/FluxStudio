import React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Sparkles,
  CheckCircle,
  Share2,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CategoryStats, FileStats, ActivityItem } from './types';

interface OverviewPanelProps {
  categoryStats: CategoryStats[];
  sizeData: { range: string; count: number }[];
  stats: FileStats;
  formatTimeAgo: (date: Date) => string;
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'upload':
      return <Download className="w-4 h-4 text-blue-500" aria-hidden="true" />;
    case 'analysis':
      return <Sparkles className="w-4 h-4 text-purple-500" aria-hidden="true" />;
    case 'tag':
      return <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />;
    case 'share':
      return <Share2 className="w-4 h-4 text-orange-500" aria-hidden="true" />;
    default:
      return <Activity className="w-4 h-4 text-gray-500" aria-hidden="true" />;
  }
}

export const OverviewPanel: React.FC<OverviewPanelProps> = ({
  categoryStats,
  sizeData,
  stats,
  formatTimeAgo,
}) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Category Distribution */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Files by Category
        </h3>
        <div className="space-y-3">
          {categoryStats
            .sort((a, b) => b.count - a.count)
            .map((cat) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <div style={{ color: cat.color }}>{cat.icon}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {cat.category}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{cat.count} files</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {cat.percentage.toFixed(1)}%
                </span>
              </motion.div>
            ))}
        </div>
      </div>

      {/* File Size Distribution */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Size Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sizeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="range"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              stroke="#E5E7EB"
            />
            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} stroke="#E5E7EB" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Tags */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Tags</h3>
        <div className="space-y-3">
          {stats.topTags.map((tag, index) => (
            <div key={tag.name} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {tag.name}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{tag.count} files</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {stats.recentActivity.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">{activity.description}</p>
                {activity.fileName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {activity.fileName}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatTimeAgo(activity.timestamp)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
