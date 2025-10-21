/**
 * Task Detail Modal - Unit Tests
 *
 * Tests for TaskDetailModal component covering:
 * - Rendering in create/edit modes
 * - Form validation
 * - Keyboard shortcuts
 * - Accessibility features
 * - Save/delete operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDetailModal, Task, TeamMember } from './TaskDetailModal';

// ============================================================================
// Mock Data
// ============================================================================

const mockTeamMembers: TeamMember[] = [
  { id: 'user_1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  { id: 'user_2', name: 'Bob Smith', email: 'bob@fluxstudio.com' },
];

const mockTask: Task = {
  id: 'task_123',
  title: 'Test Task',
  description: '<p>Test description</p>',
  status: 'in-progress',
  priority: 'high',
  assignedTo: 'user_1',
  dueDate: '2025-11-01T00:00:00Z',
  createdBy: 'user_2',
  createdAt: '2025-10-01T10:00:00Z',
  updatedAt: '2025-10-15T14:00:00Z',
  completedAt: null,
};

// ============================================================================
// Test Helpers
// ============================================================================

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  projectId: 'proj_456',
  task: null,
  onSave: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  teamMembers: mockTeamMembers,
};

// ============================================================================
// Tests
// ============================================================================

describe('TaskDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders in create mode when task is null', () => {
      render(<TaskDetailModal {...defaultProps} />);

      expect(screen.getByText('Create Task')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter task title...')).toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('renders in edit mode when task is provided', () => {
      render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<TaskDetailModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create Task')).not.toBeInTheDocument();
    });

    it('populates form fields with task data in edit mode', () => {
      render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2025-11-01')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when title is empty', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      const saveButton = screen.getByText('Create Task');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });

      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('shows error when title exceeds 200 characters', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title...');
      const longTitle = 'a'.repeat(201);

      await user.type(titleInput, longTitle);
      await user.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(screen.getByText('Title must be 200 characters or less')).toBeInTheDocument();
      });
    });

    it('shows error when due date is in the past', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title...');
      await user.type(titleInput, 'Valid Title');

      const dueDateInput = screen.getByLabelText('Due Date');
      await user.type(dueDateInput, '2020-01-01');

      await user.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(screen.getByText(/Due date must be today or in the future/)).toBeInTheDocument();
      });
    });

    it('clears error when field is corrected', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      // Trigger title error
      await user.click(screen.getByText('Create Task'));
      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });

      // Fix title
      const titleInput = screen.getByPlaceholderText('Enter task title...');
      await user.type(titleInput, 'Valid Title');

      await waitFor(() => {
        expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('calls onSave with correct data when creating task', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      // Fill in form
      await user.type(screen.getByPlaceholderText('Enter task title...'), 'New Task');
      await user.type(screen.getByLabelText('Due Date'), '2025-12-01');

      // Submit
      await user.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(
          null,
          expect.objectContaining({
            title: 'New Task',
            dueDate: '2025-12-01',
            status: 'todo',
            priority: 'medium',
          })
        );
      });
    });

    it('calls onSave with task ID when updating existing task', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      // Modify title
      const titleInput = screen.getByDisplayValue('Test Task');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Task');

      // Submit
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(
          'task_123',
          expect.objectContaining({
            title: 'Updated Task',
          })
        );
      });
    });

    it('shows loading state while saving', async () => {
      const user = userEvent.setup();
      const slowSave = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));

      render(<TaskDetailModal {...defaultProps} onSave={slowSave} />);

      await user.type(screen.getByPlaceholderText('Enter task title...'), 'New Task');
      await user.click(screen.getByText('Create Task'));

      // Loading state should appear
      await waitFor(() => {
        expect(screen.getByText('Create Task').closest('button')).toBeDisabled();
      });
    });

    it('closes modal after successful save', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Enter task title...'), 'New Task');
      await user.click(screen.getByText('Create Task'));

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      await user.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Delete Task?')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    it('calls onDelete when confirmed', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      await user.click(screen.getByText('Delete'));

      // Confirm deletion
      const deleteButton = await screen.findByText('Delete Task');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(defaultProps.onDelete).toHaveBeenCalledWith('task_123');
      });
    });

    it('does not delete when cancelled', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      await user.click(screen.getByText('Delete'));

      // Cancel deletion
      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Delete Task?')).not.toBeInTheDocument();
      });

      expect(defaultProps.onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('saves task when Cmd+S is pressed', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      await user.type(screen.getByPlaceholderText('Enter task title...'), 'New Task');

      // Press Cmd+S
      await user.keyboard('{Meta>}s{/Meta}');

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalled();
      });
    });

    it('closes modal when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('focuses title input when modal opens', async () => {
      render(<TaskDetailModal {...defaultProps} />);

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('Enter task title...');
        expect(titleInput).toHaveFocus();
      }, { timeout: 200 });
    });

    it('has proper ARIA labels', () => {
      render(<TaskDetailModal {...defaultProps} />);

      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    });

    it('marks title as required', () => {
      render(<TaskDetailModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title...');
      // Title should be in a field marked as required
      expect(titleInput.closest('div')?.querySelector('.required')).toBeInTheDocument();
    });

    it('provides error feedback via aria-invalid', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      await user.click(screen.getByText('Create Task'));

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('Enter task title...');
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Character Counting', () => {
    it('displays character count for title', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title...');
      await user.type(titleInput, 'Test');

      expect(screen.getByText('4/200')).toBeInTheDocument();
    });

    it('displays character count for description', async () => {
      render(<TaskDetailModal {...defaultProps} />);

      // Character count should be visible (initially 0)
      await waitFor(() => {
        expect(screen.getByText(/\/2000 characters/)).toBeInTheDocument();
      });
    });
  });

  describe('Toggle Complete', () => {
    it('changes status to completed when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      await user.click(screen.getByText('Complete'));

      // Status should update (verify by checking if save would include completed status)
      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(
          'task_123',
          expect.objectContaining({
            status: 'completed',
          })
        );
      });
    });

    it('reopens task when already completed', async () => {
      const user = userEvent.setup();
      const completedTask = { ...mockTask, status: 'completed' as const };

      render(<TaskDetailModal {...defaultProps} task={completedTask} />);

      await user.click(screen.getByText('Reopen'));

      await user.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(
          'task_123',
          expect.objectContaining({
            status: 'in-progress',
          })
        );
      });
    });
  });

  describe('Form State Management', () => {
    it('resets form when modal is reopened', async () => {
      const { rerender } = render(<TaskDetailModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter task title...');
      await userEvent.type(titleInput, 'First Task');

      // Close and reopen modal
      rerender(<TaskDetailModal {...defaultProps} isOpen={false} />);
      rerender(<TaskDetailModal {...defaultProps} isOpen={true} />);

      // Form should be reset
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter task title...')).toHaveValue('');
      });
    });

    it('preserves task data when switching from edit to edit mode', async () => {
      const { rerender } = render(<TaskDetailModal {...defaultProps} task={mockTask} />);

      expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();

      // Switch to different task
      const newTask = { ...mockTask, id: 'task_456', title: 'Different Task' };
      rerender(<TaskDetailModal {...defaultProps} task={newTask} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Different Task')).toBeInTheDocument();
      });
    });
  });
});
