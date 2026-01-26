import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  HardDrive,
  Zap,
  Activity,
  PieChart,
  BarChart3,
  Eye,
  Download,
  Share2,
  CheckCircle,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Types
interface FileStats {
  totalFiles: number;
  totalSize: number;
  byCategory: Record<string, number>;
  bySizeRange: Record<string, number>;
  byQualityScore: Record<string, number>;
  uploadTrend: { date: string; count: number }[];
  aiAnalyzed: number;
  avgConfidence: number;
  topTags: { name: string; count: number }[];
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'upload' | 'analysis' | 'tag' | 'share';
  description: string;
  timestamp: Date;
  fileId?: string;
  fileName?: string;
}

interface CategoryStats {
  category: string;
  count: number;
  size: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

interface ContentInsightsProps {
  projectId?: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  showDetailedMetrics?: boolean;
}

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

const CATEGORY_COLORS: Record<string, string> = {
  design: '#3B82F6',
  image: '#10B981',
  video: '#EF4444',
  audio: '#F59E0B',
  document: '#8B5CF6',
  code: '#06B6D4',
  archive: '#6B7280',
  data: '#EC4899',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  design: <PieChart className="w-5 h-5" />,
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  audio: <Music className="w-5 h-5" />,
  document: <FileText className="w-5 h-5" />,
  code: <Code className="w-5 h-5" />,
  archive: <Archive className="w-5 h-5" />,
  data: <BarChart3 className="w-5 h-5" />,
};

export const ContentInsights: React.FC<ContentInsightsProps> = ({
  projectId,
  timeRange = '30d',
  showDetailedMetrics = true,
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
      icon: CATEGORY_ICONS[category] || <FileText className="w-5 h-5" />,
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

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Get activity icon
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'upload':
        return <Download className="w-4 h-4 text-blue-500" />;
      case 'analysis':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'tag':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'share':
        return <Share2 className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  // Quality score data for pie chart
  const qualityData = Object.entries(stats.byQualityScore).map(([quality, count]) => ({
    name: quality,
    value: count,
    color:
      quality === 'excellent'
        ? '#10B981'
        : quality === 'good'
        ? '#3B82F6'
        : quality === 'fair'
        ? '#F59E0B'
        : '#EF4444',
  }));

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
          <h2 className="text-2xl font-bold text-gray-900">Content Insights</h2>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered analytics for your content library
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <FileText className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
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
            <HardDrive className="w-8 h-8 opacity-80" />
            <Activity className="w-5 h-5 opacity-60" />
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
            <Sparkles className="w-8 h-8 opacity-80" />
            <Zap className="w-5 h-5 opacity-60" />
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
            <CheckCircle className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-5 h-5 opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">
            {Math.round(stats.avgConfidence * 100)}%
          </div>
          <div className="text-sm opacity-80">Avg Confidence</div>
        </motion.div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['overview', 'trends', 'quality'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view)}
            className={`
              px-4 py-2 text-sm font-medium capitalize transition-colors
              ${
                selectedView === view
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {cat.category}
                        </span>
                        <span className="text-sm text-gray-600">{cat.count} files</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </motion.div>
                ))}
            </div>
          </div>

          {/* File Size Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Tags</h3>
            <div className="space-y-3">
              {stats.topTags.map((tag, index) => (
                <div key={tag.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {tag.name}
                      </span>
                      <span className="text-sm text-gray-600">{tag.count} files</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    {activity.fileName && (
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {activity.fileName}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trends View */}
      {selectedView === 'trends' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Trends</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={stats.uploadTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
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
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quality View */}
      {selectedView === 'quality' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
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

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quality Breakdown
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.byQualityScore).map(([quality, count]) => (
                <div key={quality} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {quality}
                    </span>
                    <span className="text-sm text-gray-600">{count} files</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / stats.totalFiles) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-2 rounded-full"
                      style={{
                        backgroundColor:
                          quality === 'excellent'
                            ? '#10B981'
                            : quality === 'good'
                            ? '#3B82F6'
                            : quality === 'fair'
                            ? '#F59E0B'
                            : '#EF4444',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Quality Insights
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1">
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
      )}
    </div>
  );
};

export default ContentInsights;
