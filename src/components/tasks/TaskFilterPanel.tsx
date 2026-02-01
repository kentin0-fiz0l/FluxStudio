/**
 * TaskFilterPanel Component
 * Status, priority, and assignee filter controls for task lists
 */

import React from 'react';
import { Circle, Clock, Eye, CheckCircle2 } from 'lucide-react';
import type { Task, FilterState } from './types';

interface TaskFilterPanelProps {
  filters: FilterState;
  uniqueAssignees: string[];
  onToggleFilter: <K extends keyof FilterState>(key: K, value: FilterState[K][number]) => void;
}

/**
 * Get badge variant and icon for task status
 */
export const getStatusDisplay = (status: Task['status']) => {
  const config = {
    todo: {
      label: 'To Do',
      variant: 'default' as const,
      icon: Circle,
    },
    'in_progress': {
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

/**
 * Get badge variant for task priority
 */
export const getPriorityDisplay = (priority: Task['priority']) => {
  const config = {
    low: { label: 'Low', variant: 'default' as const },
    medium: { label: 'Medium', variant: 'info' as const },
    high: { label: 'High', variant: 'warning' as const },
    critical: { label: 'Critical', variant: 'error' as const },
  };
  return config[priority];
};

export const TaskFilterPanel: React.FC<TaskFilterPanelProps> = ({
  filters,
  uniqueAssignees,
  onToggleFilter,
}) => {
  return (
    <div
      className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4"
      role="region"
      aria-label="Task filters"
    >
      {/* Status Filters */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {(['todo', 'in_progress', 'review', 'completed'] as Task['status'][]).map(status => {
            const { label, icon: Icon } = getStatusDisplay(status);
            const isActive = filters.status.includes(status);

            return (
              <button
                key={status}
                onClick={() => onToggleFilter('status', status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                }`}
                aria-pressed={isActive}
                aria-label={`Filter by ${label} status`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority Filters */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Priority
        </label>
        <div className="flex flex-wrap gap-2">
          {(['low', 'medium', 'high', 'critical'] as Task['priority'][]).map(priority => {
            const { label } = getPriorityDisplay(priority);
            const isActive = filters.priority.includes(priority);

            return (
              <button
                key={priority}
                onClick={() => onToggleFilter('priority', priority)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                }`}
                aria-pressed={isActive}
                aria-label={`Filter by ${label} priority`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignee Filters */}
      {uniqueAssignees.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Assignee
          </label>
          <div className="flex flex-wrap gap-2">
            {uniqueAssignees.map(assignee => {
              const isActive = filters.assignee.includes(assignee);

              return (
                <button
                  key={assignee}
                  onClick={() => onToggleFilter('assignee', assignee)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50'
                  }`}
                  aria-pressed={isActive}
                  aria-label={`Filter by assignee ${assignee}`}
                >
                  {assignee}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
