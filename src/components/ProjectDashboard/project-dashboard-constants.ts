/**
 * Constants for the ProjectDashboard component
 */

export const STATUS_BADGE_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  planning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  default: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export const PRIORITY_BADGE_COLORS: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  design: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  reference: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  final: 'bg-green-500/20 text-green-400 border-green-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const FILE_STATUS_BADGE_COLORS: Record<string, string> = {
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const FILTER_TYPES = ['all', 'design', 'reference', 'final', 'feedback'] as const;
export type FilterType = typeof FILTER_TYPES[number];
