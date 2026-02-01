/**
 * Shared types for task components
 */

import type { Task } from '../../hooks/useTasks';

export type { Task };

export type SortField = 'status' | 'priority' | 'dueDate' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  status: Task['status'][];
  priority: Task['priority'][];
  assignee: string[];
}

export interface EditState {
  taskId: string | null;
  field: keyof Task | null;
  value: string;
}

export interface StatusConfig {
  label: string;
  variant: 'default' | 'info' | 'warning' | 'success' | 'error';
  icon: React.ComponentType<{ className?: string }>;
}

export interface PriorityConfig {
  label: string;
  variant: 'default' | 'info' | 'warning' | 'error';
}

export const STATUS_OPTIONS: { value: Task['status']; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' },
];

export const PRIORITY_OPTIONS: { value: Task['priority']; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];
