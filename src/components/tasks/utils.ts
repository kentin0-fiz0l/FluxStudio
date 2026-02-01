/**
 * Utility functions for task components
 */

import { Circle, Clock, Eye, CheckCircle2 } from 'lucide-react';
import type { Task, SortField, SortDirection, StatusConfig, PriorityConfig } from './types';

/**
 * Get badge variant and icon for task status
 */
export const getStatusDisplay = (status: Task['status']): StatusConfig => {
  const config: Record<Task['status'], StatusConfig> = {
    todo: {
      label: 'To Do',
      variant: 'default',
      icon: Circle,
    },
    'in_progress': {
      label: 'In Progress',
      variant: 'info',
      icon: Clock,
    },
    review: {
      label: 'Review',
      variant: 'warning',
      icon: Eye,
    },
    completed: {
      label: 'Completed',
      variant: 'success',
      icon: CheckCircle2,
    },
  };
  return config[status];
};

/**
 * Get badge variant for task priority
 */
export const getPriorityDisplay = (priority: Task['priority']): PriorityConfig => {
  const config: Record<Task['priority'], PriorityConfig> = {
    low: { label: 'Low', variant: 'default' },
    medium: { label: 'Medium', variant: 'info' },
    high: { label: 'High', variant: 'warning' },
    critical: { label: 'Critical', variant: 'error' },
  };
  return config[priority];
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Check if task is overdue
 */
export const isOverdue = (dueDate: string | null, status: Task['status']): boolean => {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate) < new Date();
};

/**
 * Sort tasks by field and direction
 */
export const sortTasks = (tasks: Task[], field: SortField, direction: SortDirection): Task[] => {
  return [...tasks].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (field) {
      case 'status':
        const statusOrder = { todo: 0, 'in_progress': 1, review: 2, completed: 3 };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
        break;
      case 'priority':
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      case 'dueDate':
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        break;
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};
