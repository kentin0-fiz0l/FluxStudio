/**
 * Integration Tests - Project Creation Flow
 *
 * Tests project creation with form validation, state management,
 * and API interaction via mocked services.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/utils';

// Mock apiService
const mockPost = vi.fn();
const mockGet = vi.fn();
vi.mock('@/services/apiService', () => ({
  apiService: {
    post: mockPost,
    get: mockGet,
  },
}));

// A simple project creation form component for integration testing
function ProjectCreationForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Record<string, string>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('planning');
  const [priority, setPriority] = React.useState('medium');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Project name is required';
    if (name.length > 100) newErrors.name = 'Name must be under 100 characters';
    if (description.length > 500) newErrors.description = 'Description must be under 500 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name, description, status, priority });
      setIsSuccess(true);
      setName('');
      setDescription('');
    } catch {
      setErrors({ form: 'Failed to create project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="project-form">
      <div>
        <label htmlFor="name">Project Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          aria-invalid={!!errors.name}
        />
        {errors.name && <span role="alert">{errors.name}</span>}
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
        />
        {errors.description && <span role="alert">{errors.description}</span>}
      </div>

      <div>
        <label htmlFor="status">Status</label>
        <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="planning">Planning</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div>
        <label htmlFor="priority">Priority</label>
        <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {errors.form && <div role="alert">{errors.form}</div>}
      {isSuccess && <div role="status">Project created successfully!</div>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Project'}
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

import React from 'react';

describe('Project Creation Integration', () => {
  const mockSubmit = vi.fn();
  const mockCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmit.mockResolvedValue(undefined);
  });

  describe('Form rendering', () => {
    it('should render all form fields', () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Create Project')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should have default values for status and priority', () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      expect(screen.getByLabelText('Status')).toHaveValue('planning');
      expect(screen.getByLabelText('Priority')).toHaveValue('medium');
    });
  });

  describe('Form validation', () => {
    it('should show error when name is empty', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Project name is required');
      });
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should show error when name exceeds 100 characters', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      const longName = 'a'.repeat(101);
      await userEvent.type(screen.getByLabelText('Project Name'), longName);
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Name must be under 100 characters');
      });
    });

    it('should show error when description exceeds 500 characters', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Valid Name');
      const longDesc = 'a'.repeat(501);
      await userEvent.type(screen.getByLabelText('Description'), longDesc);
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Description must be under 500 characters');
      });
    });

    it('should clear errors when form is corrected and resubmitted', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      // Submit empty form
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Fill in name and resubmit
      await userEvent.type(screen.getByLabelText('Project Name'), 'My Project');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.queryByText('Project name is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Successful submission', () => {
    it('should submit form with all fields', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'New Design Project');
      await userEvent.type(screen.getByLabelText('Description'), 'A brand redesign project');
      await userEvent.selectOptions(screen.getByLabelText('Status'), 'in_progress');
      await userEvent.selectOptions(screen.getByLabelText('Priority'), 'high');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          name: 'New Design Project',
          description: 'A brand redesign project',
          status: 'in_progress',
          priority: 'high',
        });
      });
    });

    it('should show success message after creation', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Test Project');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Project created successfully!');
      });
    });

    it('should clear form after successful submission', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Test Project');
      await userEvent.type(screen.getByLabelText('Description'), 'Some description');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByLabelText('Project Name')).toHaveValue('');
        expect(screen.getByLabelText('Description')).toHaveValue('');
      });
    });

    it('should show loading state during submission', async () => {
      let resolveSubmit: () => void;
      mockSubmit.mockImplementation(() => new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      }));

      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Test');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
        expect(screen.getByText('Creating...')).toBeDisabled();
      });

      // Resolve the submission
      resolveSubmit!();

      await waitFor(() => {
        expect(screen.getByText('Create Project')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should show error message on submission failure', async () => {
      mockSubmit.mockRejectedValue(new Error('Network error'));

      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Test Project');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to create project');
      });
    });

    it('should re-enable submit button after error', async () => {
      mockSubmit.mockRejectedValue(new Error('Server error'));

      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Test');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(screen.getByText('Create Project')).not.toBeDisabled();
      });
    });
  });

  describe('Cancel flow', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.click(screen.getByText('Cancel'));

      expect(mockCancel).toHaveBeenCalled();
    });

    it('should not submit form when cancel is clicked', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Test');
      await userEvent.click(screen.getByText('Cancel'));

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Status and priority selection', () => {
    it('should allow changing project status', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      const statusSelect = screen.getByLabelText('Status');
      await userEvent.selectOptions(statusSelect, 'review');
      expect(statusSelect).toHaveValue('review');
    });

    it('should allow changing project priority', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      const prioritySelect = screen.getByLabelText('Priority');
      await userEvent.selectOptions(prioritySelect, 'critical');
      expect(prioritySelect).toHaveValue('critical');
    });

    it('should submit with selected status and priority', async () => {
      render(<ProjectCreationForm onSubmit={mockSubmit} onCancel={mockCancel} />);

      await userEvent.type(screen.getByLabelText('Project Name'), 'Urgent Fix');
      await userEvent.selectOptions(screen.getByLabelText('Status'), 'in_progress');
      await userEvent.selectOptions(screen.getByLabelText('Priority'), 'critical');
      await userEvent.click(screen.getByText('Create Project'));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'in_progress',
            priority: 'critical',
          })
        );
      });
    });
  });
});
