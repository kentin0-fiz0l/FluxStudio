import {
  MessageSquare,
  Folder,
  FileImage,
  Users,
  CheckCircle,
  AlertCircle,
  Star,
  Activity,
} from 'lucide-react';
import type { ActivityItem, ActivityFilter } from './activity-feed-types';

export const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'message': return MessageSquare;
    case 'project_created':
    case 'project_updated': return Folder;
    case 'file_upload': return FileImage;
    case 'conversation_created': return MessageSquare;
    case 'review_completed': return CheckCircle;
    case 'milestone_reached': return Star;
    case 'user_joined': return Users;
    case 'status_change': return AlertCircle;
    default: return Activity;
  }
};

export const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'message': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    case 'project_created':
    case 'project_updated': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'file_upload': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
    case 'conversation_created': return 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30';
    case 'review_completed': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
    case 'milestone_reached': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'user_joined': return 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30';
    case 'status_change': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
  }
};

export const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const FILTER_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'messages', label: 'Messages' },
  { value: 'projects', label: 'Projects' },
  { value: 'files', label: 'Files' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'milestones', label: 'Milestones' },
];

export const ACTIVITY_TYPE_MAP: Record<Exclude<ActivityFilter, 'all'>, string[]> = {
  messages: ['message'],
  projects: ['project_created', 'project_updated', 'status_change'],
  files: ['file_upload'],
  reviews: ['review_completed'],
  milestones: ['milestone_reached'],
};
