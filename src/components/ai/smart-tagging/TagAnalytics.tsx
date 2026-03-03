import {
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import type { TagData } from './types';

interface TagAnalyticsProps {
  analytics: {
    totalTags: number;
    aiTags: number;
    customTags: number;
    mostUsed: TagData[];
    trending: TagData[];
  };
}

export function TagAnalytics({ analytics }: TagAnalyticsProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-blue-500" aria-hidden="true" />
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tag Analytics</h4>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.totalTags}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Tags</div>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {analytics.aiTags}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">AI Generated</div>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.customTags}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Custom Tags</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Most Used */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">Most Used</h5>
          </div>
          <div className="space-y-1">
            {analytics.mostUsed.map((tag, index) => (
              <div
                key={tag.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {index + 1}. {tag.name}
                </span>
                <span className="text-gray-500 dark:text-gray-500">{tag.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trending */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" aria-hidden="true" />
            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Trending (7 days)
            </h5>
          </div>
          <div className="space-y-1">
            {analytics.trending.map((tag, index) => (
              <div
                key={tag.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-600 dark:text-gray-400">
                  {index + 1}. {tag.name}
                </span>
                <span className="text-green-600 dark:text-green-400">{tag.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
