import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Task } from '../../../hooks/useTasks';
import type { TeamMember, ValidationErrors } from './types';

const TaskDescriptionEditor = React.lazy(() =>
  import('../TaskDescriptionEditor').then(m => ({ default: m.TaskDescriptionEditor }))
);

export interface TaskFormFieldsProps {
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  status: Task['status'];
  setStatus: (status: Task['status']) => void;
  priority: Task['priority'];
  setPriority: (priority: Task['priority']) => void;
  assignedTo: string | null;
  setAssignedTo: (assignedTo: string | null) => void;
  dueDate: string;
  setDueDate: (dueDate: string) => void;
  errors: ValidationErrors;
  setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  characterCount: number;
  setCharacterCount: (count: number) => void;
  isSaving: boolean;
  isDeleting: boolean;
  teamMembers: TeamMember[];
  titleInputRef: React.RefObject<HTMLInputElement>;
}

export const TaskFormFields: React.FC<TaskFormFieldsProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  status,
  setStatus,
  priority,
  setPriority,
  assignedTo,
  setAssignedTo,
  dueDate,
  setDueDate,
  errors,
  setErrors,
  characterCount,
  setCharacterCount,
  isSaving,
  isDeleting,
  teamMembers,
  titleInputRef,
}) => {
  return (
    <>
      {/* Title Input */}
      <div>
        <Label htmlFor="task-title" className="required">
          Title
        </Label>
        <Input
          ref={titleInputRef}
          id="task-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) {
              setErrors((prev) => ({ ...prev, title: undefined }));
            }
          }}
          placeholder="Enter task title..."
          maxLength={200}
          error={errors.title}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className="text-lg font-semibold"
          disabled={isSaving || isDeleting}
        />
        <div className="flex justify-between mt-1">
          <span id="title-error" className="sr-only">
            {errors.title}
          </span>
          <span className="text-xs text-neutral-500 ml-auto">
            {title.length}/200
          </span>
        </div>
      </div>

      {/* Rich Text Editor */}
      <div>
        <Label htmlFor="task-description">Description</Label>
        <React.Suspense fallback={<div className="h-32 bg-neutral-100 animate-pulse rounded-lg" />}>
          <TaskDescriptionEditor
            content={description}
            onContentChange={(html) => setDescription(html)}
            onCharacterCountChange={setCharacterCount}
            disabled={isSaving || isDeleting}
            error={errors.description}
          />
        </React.Suspense>
        <div className="flex justify-between mt-1">
          {errors.description ? (
            <span id="description-error" className="text-sm text-error-600">
              {errors.description}
            </span>
          ) : null}
          <span
            id="description-count"
            className={cn(
              'text-xs ml-auto',
              characterCount > 2000
                ? 'text-error-600 font-semibold'
                : 'text-neutral-500'
            )}
          >
            {characterCount}/2000 characters
          </span>
        </div>
      </div>

      {/* Status and Priority Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <Label htmlFor="task-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as Task['status'])}
            disabled={isSaving || isDeleting}
          >
            <SelectTrigger id="task-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as Task['priority'])}
            disabled={isSaving || isDeleting}
          >
            <SelectTrigger id="task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assignee and Due Date Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Assignee */}
        <div>
          <Label htmlFor="task-assignee">Assignee</Label>
          <Select
            value={assignedTo || 'unassigned'}
            onValueChange={(value) =>
              setAssignedTo(value === 'unassigned' ? null : value)
            }
            disabled={isSaving || isDeleting}
          >
            <SelectTrigger id="task-assignee">
              <SelectValue placeholder="Select assignee..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div>
          <Label htmlFor="task-due-date">Due Date</Label>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (errors.dueDate) {
                setErrors((prev) => ({ ...prev, dueDate: undefined }));
              }
            }}
            error={errors.dueDate}
            aria-invalid={!!errors.dueDate}
            aria-describedby={errors.dueDate ? 'due-date-error' : undefined}
            disabled={isSaving || isDeleting}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>
    </>
  );
};
