import {
  Circle,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
} from 'lucide-react';
import { Task, DueDateFilter, SortOption } from '@/hooks/useTaskSearch';

export const getStatusDisplay = (status: Task['status']) => {
  const config = {
    todo: {
      label: 'To Do',
      variant: 'default' as const,
      icon: Circle,
    },
    in_progress: {
      label: 'In Progress',
      variant: 'info' as const,
      icon: Clock,
    },
    review: {
      label: 'Review',
      variant: 'warning' as const,
      icon: Eye,
    },
    completed: {
      label: 'Completed',
      variant: 'success' as const,
      icon: CheckCircle2,
    },
  };
  return config[status];
};

export const getPriorityDisplay = (priority: Task['priority']) => {
  const config = {
    low: { label: 'Low', variant: 'default' as const },
    medium: { label: 'Medium', variant: 'info' as const },
    high: { label: 'High', variant: 'warning' as const },
    critical: { label: 'Critical', variant: 'error' as const },
  };
  return config[priority];
};

export const getDueDateDisplay = (filter: DueDateFilter) => {
  const config = {
    overdue: { label: 'Overdue', icon: AlertCircle },
    today: { label: 'Today', icon: Calendar },
    'this-week': { label: 'This Week', icon: Calendar },
    'this-month': { label: 'This Month', icon: Calendar },
    'no-date': { label: 'No Date', icon: X },
  };
  return filter ? config[filter] : null;
};

export const getSortDisplay = (sort: SortOption) => {
  const config = {
    recent: 'Recent',
    'title-asc': 'Title A-Z',
    'title-desc': 'Title Z-A',
    'due-date': 'Due Date',
    priority: 'Priority',
    status: 'Status',
  };
  return config[sort];
};
