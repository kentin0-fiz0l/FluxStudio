import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { FileStats } from './types';
import { QUALITY_COLORS } from './types';

interface QualityPanelProps {
  stats: FileStats;
}

export const QualityPanel: React.FC<QualityPanelProps> = ({ stats }) => {
  const qualityData = Object.entries(stats.byQualityScore).map(([quality, count]) => ({
    name: quality,
    value: count,
    color: QUALITY_COLORS[quality] || '#6B7280',
  }));

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quality Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsPieChart>
            <Pie
              data={qualityData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {qualityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quality Breakdown
        </h3>
        <div className="space-y-4">
          {Object.entries(stats.byQualityScore).map(([quality, count]) => (
            <div key={quality} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {quality}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{count} files</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / stats.totalFiles) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-2 rounded-full"
                  style={{
                    backgroundColor: QUALITY_COLORS[quality] || '#6B7280',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Quality Insights
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>
                  • {Math.round((stats.byQualityScore.excellent / stats.totalFiles) * 100)}% of files are excellent quality
                </li>
                <li>
                  • Consider improving {stats.byQualityScore.poor} low-quality files
                </li>
                <li>• Average AI confidence: {Math.round(stats.avgConfidence * 100)}%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
