import { Bell } from 'lucide-react';
import type { NotificationType, Priority } from './types';
import { iconMap, priorityLabels } from './constants';

export const NotificationIcon = ({ type }: { type: NotificationType }) => {
  const Icon = iconMap[type] || Bell;
  return <Icon size={16} aria-hidden="true" />;
};

export const PriorityIndicator = ({ priority }: { priority: Priority }) => {
  const colors = {
    critical: 'bg-red-500 dark:bg-red-400',
    high: 'bg-orange-500 dark:bg-orange-400',
    medium: 'bg-yellow-500 dark:bg-yellow-400',
    low: 'bg-blue-500 dark:bg-blue-400',
  };

  return (
    <div
      className={`w-2 h-2 rounded-full ${colors[priority]} flex-shrink-0`}
      role="img"
      aria-label={priorityLabels[priority]}
    />
  );
};

export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid date';

  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};
