/**
 * Type definitions and constants for the ActivityFeed component
 */

import * as React from 'react';
import {
  Activity as ActivityIcon,
  PlusCircle,
  Edit,
  Trash2,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Flag,
  Check as FlagCheck,
} from 'lucide-react';

export type ActivityType =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.completed'
  | 'comment.created'
  | 'comment.deleted'
  | 'member.added'
  | 'milestone.created'
  | 'milestone.completed';

export interface Activity {
  id: string;
  projectId: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  entityType: 'task' | 'comment' | 'project' | 'milestone' | 'member';
  entityId: string;
  entityTitle?: string;
  action: string;
  metadata?: {
    field?: string;
    oldValue?: string;
    newValue?: string;
    preview?: string;
  };
  timestamp: string;
}

export interface ActivityFeedProps {
  projectId: string;
  maxItems?: number;
  compact?: boolean;
  className?: string;
}

// Icon map defined at module level to avoid recreation during render
export const ACTIVITY_ICON_MAP: Record<ActivityType, React.ElementType> = {
  'task.created': PlusCircle,
  'task.updated': Edit,
  'task.deleted': Trash2,
  'task.completed': CheckCircle2,
  'comment.created': MessageSquare,
  'comment.deleted': Trash2,
  'member.added': UserPlus,
  'milestone.created': Flag,
  'milestone.completed': FlagCheck,
};

// Color map defined at module level to avoid recreation during render
export const ACTIVITY_COLOR_MAP: Record<ActivityType, string> = {
  'task.created': 'text-blue-600 bg-blue-100',
  'task.updated': 'text-purple-600 bg-purple-100',
  'task.deleted': 'text-red-600 bg-red-100',
  'task.completed': 'text-success-600 bg-success-100',
  'comment.created': 'text-accent-600 bg-accent-100',
  'comment.deleted': 'text-red-600 bg-red-100',
  'member.added': 'text-primary-600 bg-primary-100',
  'milestone.created': 'text-secondary-600 bg-secondary-100',
  'milestone.completed': 'text-success-600 bg-success-100',
};

export const getActivityColor = (type: ActivityType): string => {
  return ACTIVITY_COLOR_MAP[type] || 'text-neutral-600 bg-neutral-100';
};

// Dedicated component to render activity type icons
export const ActivityTypeIcon: React.FC<{ type: ActivityType; className?: string }> = ({ type, className }) => {
  const Icon = ACTIVITY_ICON_MAP[type] || ActivityIcon;
  return React.createElement(Icon, { className });
};

// Date Grouping Utilities
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const groupActivitiesByDate = (activities: Activity[]): [string, Activity[]][] => {
  const grouped = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (isSameDay(date, today)) {
      label = 'Today';
    } else if (isSameDay(date, yesterday)) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(activity);
  });

  return Array.from(grouped.entries());
};
