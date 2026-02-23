/**
 * TaskMobileCard Component
 * Mobile-responsive card view for a single task
 */

import React from 'react';
import { Edit2, Trash2, Check, AlertCircle } from 'lucide-react';
import { Button, Badge } from '../ui';
import { getStatusDisplay, getPriorityDisplay } from './TaskFilterPanel';
import type { Task } from './types';

interface TaskMobileCardProps {
  task: Task;
  isLoading: boolean;
  onToggleComplete: (task: Task) => void;
  onOpenEditModal: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

/**
 * Format date for display
 */
const formatDate = (dateString: string | null): string => {
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
const isOverdue = (dueDate: string | null, status: Task['status']): boolean => {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate) < new Date();
};

export const TaskMobileCard: React.FC<TaskMobileCardProps> = ({
  task,
  isLoading,
  onToggleComplete,
  onOpenEditModal,
  onDelete,
}) => {
  const statusDisplay = getStatusDisplay(task.status);
  const priorityDisplay = getPriorityDisplay(task.priority);
  const StatusIcon = statusDisplay.icon;
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-3"
      role="listitem"
      aria-label={`Task: ${task.title}`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleComplete(task)}
              disabled={isLoading}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                task.status === 'completed'
                  ? 'bg-success-600 border-success-600'
                  : 'border-neutral-300 dark:border-neutral-600'
              }`}
              aria-label={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
              aria-pressed={task.status === 'completed'}
            >
              {task.status === 'completed' && (
                <Check className="w-3 h-3 text-white" aria-hidden="true" />
              )}
            </button>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{task.title}</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusDisplay.variant} size="sm">
              <StatusIcon className="w-3 h-3" aria-hidden="true" />
              {statusDisplay.label}
            </Badge>
            <Badge variant={priorityDisplay.variant} size="sm">
              {priorityDisplay.label}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenEditModal(task)}
            icon={<Edit2 className="w-4 h-4" aria-hidden="true" />}
            aria-label={`Edit ${task.title}`}
            className="h-9 w-9 p-0"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task.id)}
            icon={<Trash2 className="w-4 h-4" aria-hidden="true" />}
            aria-label={`Delete ${task.title}`}
            className="h-9 w-9 p-0"
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm">
        {task.assignedTo && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 dark:text-neutral-400 w-20">Assignee:</span>
            <span className="text-neutral-900 dark:text-neutral-100">{task.assignedTo}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 dark:text-neutral-400 w-20">Due Date:</span>
            <span className={overdue ? 'text-error-600 dark:text-error-400 font-medium' : 'text-neutral-900 dark:text-neutral-100'}>
              {formatDate(task.dueDate)}
              {overdue && <AlertCircle className="w-4 h-4 inline-block ml-1" aria-hidden="true" />}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
