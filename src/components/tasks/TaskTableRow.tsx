/**
 * TaskTableRow Component
 * Single task row with inline editing and actions
 */

import React from 'react';
import { Edit2, Trash2, Check, AlertCircle } from 'lucide-react';
import { Button, Badge } from '../ui';
import { EditableCell } from './EditableCell';
import { getStatusDisplay, getPriorityDisplay } from './TaskFilterPanel';
import type { Task } from './types';

interface TaskTableRowProps {
  task: Task;
  index: number;
  isEditing: (taskId: string, field: keyof Task) => boolean;
  isLoading: (taskId: string) => boolean;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  deleteConfirm: string | null;
  onStartEdit: (taskId: string, field: keyof Task, currentValue: string) => void;
  onEditValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
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

export const TaskTableRow: React.FC<TaskTableRowProps> = ({
  task,
  index,
  isEditing,
  isLoading,
  editValue,
  editInputRef,
  deleteConfirm,
  onStartEdit,
  onEditValueChange,
  onSaveEdit,
  onCancelEdit,
  onEditKeyDown,
  onToggleComplete,
  onOpenEditModal,
  onDelete,
}) => {
  const statusDisplay = getStatusDisplay(task.status);
  const priorityDisplay = getPriorityDisplay(task.priority);
  const StatusIcon = statusDisplay.icon;
  const overdue = isOverdue(task.dueDate, task.status);
  const loading = isLoading(task.id);

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  return (
    <tr
      className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
        index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'
      }`}
      role="row"
    >
      {/* Complete Checkbox */}
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleComplete(task)}
          disabled={loading}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
            task.status === 'completed'
              ? 'bg-success-600 border-success-600'
              : 'border-neutral-300 hover:border-primary-500'
          }`}
          aria-label={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
          aria-pressed={task.status === 'completed'}
        >
          {task.status === 'completed' && (
            <Check className="w-3 h-3 text-white" />
          )}
        </button>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <EditableCell
          task={task}
          field="status"
          display={
            <Badge variant={statusDisplay.variant} size="sm" className="w-fit">
              <StatusIcon className="w-3 h-3" />
              {statusDisplay.label}
            </Badge>
          }
          editType="select"
          options={statusOptions}
          isEditing={isEditing(task.id, 'status')}
          isLoading={loading}
          editValue={editValue}
          editInputRef={editInputRef}
          onStartEdit={onStartEdit}
          onEditValueChange={onEditValueChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onKeyDown={onEditKeyDown}
        />
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <EditableCell
          task={task}
          field="title"
          display={<span className="font-medium text-neutral-900">{task.title}</span>}
          isEditing={isEditing(task.id, 'title')}
          isLoading={loading}
          editValue={editValue}
          editInputRef={editInputRef}
          onStartEdit={onStartEdit}
          onEditValueChange={onEditValueChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onKeyDown={onEditKeyDown}
        />
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <EditableCell
          task={task}
          field="priority"
          display={
            <Badge variant={priorityDisplay.variant} size="sm" className="w-fit">
              {priorityDisplay.label}
            </Badge>
          }
          editType="select"
          options={priorityOptions}
          isEditing={isEditing(task.id, 'priority')}
          isLoading={loading}
          editValue={editValue}
          editInputRef={editInputRef}
          onStartEdit={onStartEdit}
          onEditValueChange={onEditValueChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onKeyDown={onEditKeyDown}
        />
      </td>

      {/* Assignee */}
      <td className="px-4 py-3">
        <EditableCell
          task={task}
          field="assignedTo"
          display={
            task.assignedTo ? (
              <span className="text-neutral-700">{task.assignedTo}</span>
            ) : (
              <span className="text-neutral-400 italic">Unassigned</span>
            )
          }
          isEditing={isEditing(task.id, 'assignedTo')}
          isLoading={loading}
          editValue={editValue}
          editInputRef={editInputRef}
          onStartEdit={onStartEdit}
          onEditValueChange={onEditValueChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onKeyDown={onEditKeyDown}
        />
      </td>

      {/* Due Date */}
      <td className="px-4 py-3">
        <EditableCell
          task={task}
          field="dueDate"
          display={
            <span className={overdue ? 'text-error-600 font-medium' : 'text-neutral-700'}>
              {formatDate(task.dueDate)}
              {overdue && (
                <AlertCircle className="w-4 h-4 inline-block ml-1" aria-label="Overdue" />
              )}
            </span>
          }
          isEditing={isEditing(task.id, 'dueDate')}
          isLoading={loading}
          editValue={editValue}
          editInputRef={editInputRef}
          onStartEdit={onStartEdit}
          onEditValueChange={onEditValueChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onKeyDown={onEditKeyDown}
        />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenEditModal(task)}
            icon={<Edit2 className="w-4 h-4" />}
            aria-label={`Edit ${task.title}`}
            className="h-8 px-2"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task.id)}
            icon={<Trash2 className="w-4 h-4" />}
            aria-label={deleteConfirm === task.id ? `Confirm delete ${task.title}` : `Delete ${task.title}`}
            className={`h-8 px-2 ${
              deleteConfirm === task.id ? 'text-error-600 hover:text-error-700' : ''
            }`}
          />
        </div>
      </td>
    </tr>
  );
};
