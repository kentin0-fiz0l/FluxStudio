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
  users: Array<{ id: string; name: string; email?: string }>;
}> = ({ users }) => {
  if (users.length === 0) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex -space-x-2" role="list" aria-label="Users currently viewing">
      {users.slice(0, 5).map((user) => (
        <div
          key={user.id}
          className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm"
          title={user.name}
          role="listitem"
          aria-label={`${user.name} is viewing`}
        >
          {getInitials(user.name)}
        </div>
      ))}
      {users.length > 5 && (
        <div
          className="w-8 h-8 rounded-full bg-neutral-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white shadow-sm"
          title={`${users.length - 5} more user${users.length - 5 > 1 ? 's' : ''}`}
          role="listitem"
        >
          +{users.length - 5}
        </div>
      )}
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
