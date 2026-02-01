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
      className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3"
      role="listitem"
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
                  : 'border-neutral-300'
              }`}
              aria-label={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
            >
              {task.status === 'completed' && (
                <Check className="w-3 h-3 text-white" />
              )}
            </button>
            <h3 className="font-semibold text-neutral-900">{task.title}</h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={statusDisplay.variant} size="sm">
              <StatusIcon className="w-3 h-3" />
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
            icon={<Edit2 className="w-4 h-4" />}
            aria-label={`Edit ${task.title}`}
            className="h-9 w-9 p-0"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task.id)}
            icon={<Trash2 className="w-4 h-4" />}
            aria-label={`Delete ${task.title}`}
            className="h-9 w-9 p-0"
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1 text-sm">
        {task.assignedTo && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 w-20">Assignee:</span>
            <span className="text-neutral-900">{task.assignedTo}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 w-20">Due Date:</span>
            <span className={overdue ? 'text-error-600 font-medium' : 'text-neutral-900'}>
              {formatDate(task.dueDate)}
              {overdue && <AlertCircle className="w-4 h-4 inline-block ml-1" />}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
