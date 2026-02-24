/* eslint-disable react-refresh/only-export-components */
/**
 * Helper components for ProjectDetail page
 * Extracted from monolithic ProjectDetail.tsx
 */

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
      default: return 'bg-neutral-400 dark:bg-neutral-500';
    }
  };

  return (
    <div className="flex items-center gap-2" role="list" aria-label="Users currently viewing">
      {showLabel && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {users.length} online
        </span>
      )}
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="relative w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-neutral-800 shadow-sm hover:z-10 hover:scale-110 transition-transform cursor-default"
            title={`${user.name}${user.status ? ` (${user.status})` : ''}`}
            role="listitem"
            aria-label={`${user.name} is ${user.status || 'viewing'}`}
          >
            {getInitials(user.name)}
            <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-neutral-800 ${statusColor(user.status)}`} />
          </div>
        ))}
        {users.length > 5 && (
          <div
            className="w-8 h-8 rounded-full bg-neutral-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white dark:border-neutral-800 shadow-sm"
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

// ============================================================================
// TabPresenceIndicator — shows who's viewing each tab
// ============================================================================

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-indigo-500',
];

function getUserColor(userId: string): string {
  const index = userId.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export interface TabUser {
  id: string;
  name: string;
  currentTab?: string;
}

export const TabPresenceIndicator: React.FC<{
  users: TabUser[];
  tabName: string;
}> = ({ users, tabName }) => {
  const tabUsers = users.filter((u) => u.currentTab === tabName);

  if (tabUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex -space-x-1 ml-1" aria-label={`${tabUsers.length} user${tabUsers.length > 1 ? 's' : ''} viewing`}>
            {tabUsers.slice(0, 3).map((user) => (
              <span
                key={user.id}
                className={`inline-block w-4 h-4 rounded-full border border-white dark:border-neutral-800 text-white text-[8px] leading-4 text-center font-bold ${getUserColor(user.id)}`}
                aria-hidden="true"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
            ))}
            {tabUsers.length > 3 && (
              <span className="inline-block w-4 h-4 rounded-full border border-white dark:border-neutral-800 bg-neutral-500 text-white text-[8px] leading-4 text-center" aria-hidden="true">
                +{tabUsers.length - 3}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{tabUsers.map((u) => u.name).join(', ')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
