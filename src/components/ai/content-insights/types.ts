import React from 'react';
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  PieChart,
  BarChart3,
} from 'lucide-react';

export interface FileStats {
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

export interface ActivityItem {
  id: string;
  type: 'upload' | 'analysis' | 'tag' | 'share';
  description: string;
  timestamp: Date;
  fileId?: string;
  fileName?: string;
}

export interface CategoryStats {
  category: string;
  count: number;
  size: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

export interface ContentInsightsProps {
  projectId?: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  showDetailedMetrics?: boolean;
}

export const CATEGORY_COLORS: Record<string, string> = {
  design: '#3B82F6',
  image: '#10B981',
  video: '#EF4444',
  audio: '#F59E0B',
  document: '#8B5CF6',
  code: '#06B6D4',
  archive: '#6B7280',
  data: '#EC4899',
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  design: React.createElement(PieChart, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  image: React.createElement(Image, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  video: React.createElement(Video, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  audio: React.createElement(Music, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  document: React.createElement(FileText, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  code: React.createElement(Code, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  archive: React.createElement(Archive, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
  data: React.createElement(BarChart3, { className: 'w-5 h-5', 'aria-hidden': 'true' }),
};

export const QUALITY_COLORS: Record<string, string> = {
  excellent: '#10B981',
  good: '#3B82F6',
  fair: '#F59E0B',
  poor: '#EF4444',
};
