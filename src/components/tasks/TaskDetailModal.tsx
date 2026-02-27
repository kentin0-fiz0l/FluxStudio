/**
 * Task Detail Modal Component - Flux Studio Sprint 2
 *
 * A comprehensive view/edit interface for tasks with rich text editing (TipTap),
 * form validation, keyboard shortcuts, and full WCAG 2.1 Level A accessibility.
 *
 * Features:
 * - Rich text editor with toolbar (TipTap)
 * - Status and priority dropdowns
 * - Assignee selector
 * - Due date picker
 * - Auto-save on blur
 * - Form validation with inline errors
 * - Focus trap and keyboard navigation
 * - Loading and error states
 * - Delete confirmation dialog
 *
 * @example
 * <TaskDetailModal
 *   isOpen={true}
 *   onClose={() => {}}
 *   projectId="proj_123"
 *   task={task}
 *   onSave={handleSave}
 *   onDelete={handleDelete}
 *   teamMembers={members}
 * />
 */

import * as React from 'react';
import {
  Save,
  Trash2,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TaskDescriptionEditor = React.lazy(() =>
  import('./TaskDescriptionEditor').then(m => ({ default: m.TaskDescriptionEditor }))
);

// ============================================================================
// Type Definitions
// ============================================================================

// Import Task from the canonical source
import type { Task } from '../../hooks/useTasks';
export type { Task };

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  task: Task | null; // null = create mode, Task = edit mode
  onSave: (taskId: string | null, taskData: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  teamMembers: TeamMember[];
}

// ============================================================================
// Validation
// ============================================================================

interface ValidationErrors {
  title?: string;
  description?: string;
  dueDate?: string;
}

function validateTask(
  title: string,
  description: string,
  dueDate: string | null
): ValidationErrors {
  const errors: ValidationErrors = {};

  // Title validation: required, 1-200 characters
  if (!title || title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (title.length > 200) {
    errors.title = 'Title must be 200 characters or less';
  }

  // Description validation: max 2000 characters
  if (description.length > 2000) {
    errors.description = 'Description must be 2000 characters or less';
  }

  // Due date validation: must be future date
  if (dueDate) {
    const date = new Date(dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    if (date < now) {
      errors.dueDate = 'Due date must be today or in the future';
    }
  }

  return errors;
}

// ============================================================================
// Main Component
// ============================================================================

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  projectId: _projectId, // Used by parent component for API calls, not used internally
  task,
  onSave,
  onDelete,
  teamMembers,
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<Task['status']>('todo');
  const [priority, setPriority] = React.useState<Task['priority']>('medium');
  const [assignedTo, setAssignedTo] = React.useState<string | null>(null);
  const [dueDate, setDueDate] = React.useState<string>('');

  const [errors, setErrors] = React.useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [characterCount, setCharacterCount] = React.useState(0);

  // Refs for focus management
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // ============================================================================
  // Initialize Form Data from Task
  // ============================================================================

  React.useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit mode - populate from existing task
        setTitle(task.title || '');
        setDescription(task.description || '');
        setStatus(task.status || 'todo');
        setPriority(task.priority || 'medium');
        setAssignedTo(task.assignedTo || null);
        setDueDate(
          task.dueDate ? task.dueDate.split('T')[0] : ''
        );

      } else {
        // Create mode - reset to defaults
        setTitle('');
        setDescription('');
        setStatus('todo');
        setPriority('medium');
        setAssignedTo(null);
        setDueDate('');
      }

      // Clear errors
      setErrors({});

      // Focus title input when modal opens
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, task]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleClose = React.useCallback(() => {
    if (!isSaving && !isDeleting) {
      onClose();
    }
  }, [isSaving, isDeleting, onClose]);

  const handleSave = React.useCallback(async () => {
    // Validate form
    const validationErrors = validateTask(title, description, dueDate || null);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus first field with error
      if (validationErrors.title) {
        titleInputRef.current?.focus();
      }
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const taskData: Partial<Task> = {
        title: title.trim(),
        description,
        status,
        priority,
        assignedTo: assignedTo || null,
        dueDate: dueDate || null,
      };

      await onSave(task?.id || null, taskData);

      // Announce success to screen readers
      const message = task ? 'Task updated successfully' : 'Task created successfully';
      announceToScreenReader(message);

      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      setErrors({ title: 'Failed to save task. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }, [title, description, status, priority, assignedTo, dueDate, task, onSave, onClose]);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S / Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Escape to close (if not in a contenteditable editor)
      if (e.key === 'Escape') {
        const active = document.activeElement;
        const isInEditor = active?.closest('.ProseMirror') !== null;
        if (!isInEditor) {
          handleClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleClose, handleSave]);

  const handleDelete = async () => {
    if (!task) return;

    setIsDeleting(true);

    try {
      await onDelete(task.id);
      announceToScreenReader('Task deleted successfully');
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      setErrors({ title: 'Failed to delete task. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleComplete = () => {
    if (status === 'completed') {
      setStatus('in_progress');
    } else {
      setStatus('completed');
    }
  };

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          aria-describedby="task-detail-description"
        >
          <DialogHeader>
            <DialogTitle>
              {task ? 'Edit Task' : 'Create Task'}
            </DialogTitle>
            <p id="task-detail-description" className="sr-only">
              {task
                ? 'Edit task details including title, description, status, priority, assignee, and due date'
                : 'Create a new task with title, description, status, priority, assignee, and due date'}
            </p>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-6"
          >
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
                  // Clear title error on change
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
                    // Clear due date error on change
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

            {/* Metadata (Read-only) */}
            {task && (
              <div className="pt-4 border-t border-neutral-200">
                <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{' '}
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </div>
                  {task.completedAt && (
                    <div className="col-span-2">
                      <span className="font-medium">Completed:</span>{' '}
                      {new Date(task.completedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {/* Delete button (left side on desktop) */}
              {task && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isSaving || isDeleting}
                  className="sm:mr-auto"
                  icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                >
                  Delete
                </Button>
              )}

              {/* Right side actions */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {/* Toggle Complete */}
                {task && (
                  <Button
                    type="button"
                    variant={status === 'completed' ? 'secondary' : 'success'}
                    onClick={handleToggleComplete}
                    disabled={isSaving || isDeleting}
                    icon={<Check className="h-4 w-4" aria-hidden="true" />}
                  >
                    {status === 'completed' ? 'Reopen' : 'Complete'}
                  </Button>
                )}

                {/* Cancel */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </Button>

                {/* Save */}
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSaving}
                  disabled={isDeleting}
                  icon={!isSaving ? <Save className="h-4 w-4" aria-hidden="true" /> : undefined}
                >
                  {task ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                'bg-error-600 hover:bg-error-700',
                isDeleting && 'opacity-50 pointer-events-none'
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  Deleting...
                </>
              ) : (
                'Delete Task'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskDetailModal;
