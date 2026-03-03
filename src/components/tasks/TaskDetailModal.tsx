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
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Import Task from the canonical source
import type { Task } from '../../hooks/useTasks';
export type { Task };

import type { ValidationErrors } from './task-detail/types';

import { TaskFormFields } from './task-detail/TaskFormFields';
import { TaskMetadata } from './task-detail/TaskMetadata';
import { DeleteConfirmDialog } from './task-detail/DeleteConfirmDialog';

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
            <TaskFormFields
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              status={status}
              setStatus={setStatus}
              priority={priority}
              setPriority={setPriority}
              assignedTo={assignedTo}
              setAssignedTo={setAssignedTo}
              dueDate={dueDate}
              setDueDate={setDueDate}
              errors={errors}
              setErrors={setErrors}
              characterCount={characterCount}
              setCharacterCount={setCharacterCount}
              isSaving={isSaving}
              isDeleting={isDeleting}
              teamMembers={teamMembers}
              titleInputRef={titleInputRef}
            />

            {/* Metadata (Read-only) */}
            {task && <TaskMetadata task={task} />}

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
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        taskTitle={task?.title || ''}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default TaskDetailModal;
