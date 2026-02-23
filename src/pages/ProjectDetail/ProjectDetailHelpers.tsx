/**
 * Helper components for ProjectDetail page
 * Extracted from monolithic ProjectDetail.tsx
 */

import * as React from 'react';
import type { Task } from '@/hooks/useTasks';

// ============================================================================
// QuickStats
// ============================================================================

export const QuickStats: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const stats = React.useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const review = tasks.filter((t) => t.status === 'review').length;
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, review, todo, completionRate };
  }, [tasks]);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
      <h2 className="text-lg font-semibold mb-4 text-neutral-900">Quick Stats</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">Total Tasks</span>
          <span className="font-semibold text-lg text-neutral-900">{stats.total}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">Completed</span>
          <span className="font-semibold text-success-600">{stats.completed}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">In Progress</span>
          <span className="font-semibold text-blue-600">{stats.inProgress}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">In Review</span>
          <span className="font-semibold text-purple-600">{stats.review}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600 text-sm">To Do</span>
          <span className="font-semibold text-neutral-600">{stats.todo}</span>
        </div>
        <div className="pt-3 border-t border-neutral-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-neutral-600 text-sm font-medium">Completion Rate</span>
            <span className="font-semibold text-neutral-900">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-success-600 h-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
              role="progressbar"
              aria-valuenow={stats.completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${stats.completionRate}% completion rate`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PresenceIndicators
// ============================================================================

export const PresenceIndicators: React.FC<{
  users: Array<{ id: string; name: string; email?: string; status?: 'online' | 'away' | 'offline' }>;
  showLabel?: boolean;
}> = ({ users, showLabel = false }) => {
  if (users.length === 0) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const statusColor = (status?: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-2" role="list" aria-label="Users currently viewing">
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {users.length} online
        </span>
      )}
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="relative w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800 shadow-sm hover:z-10 hover:scale-110 transition-transform cursor-default"
            title={`${user.name}${user.status ? ` (${user.status})` : ''}`}
            role="listitem"
            aria-label={`${user.name} is ${user.status || 'viewing'}`}
          >
            {getInitials(user.name)}
            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-800 ${statusColor(user.status)}`} />
          </div>
        ))}
        {users.length > 5 && (
          <div
            className="w-8 h-8 rounded-full bg-neutral-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800 shadow-sm"
            title={`${users.length - 5} more user${users.length - 5 > 1 ? 's' : ''}`}
            role="listitem"
          >
            +{users.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Status/Priority Badge Variants
// ============================================================================

export const statusVariants = {
  planning: 'info',
  in_progress: 'warning',
  on_hold: 'default',
  completed: 'success',
  cancelled: 'error',
} as const;

export const priorityVariants = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
} as const;
