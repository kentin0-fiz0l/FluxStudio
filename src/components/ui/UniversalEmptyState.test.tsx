/**
 * UniversalEmptyState Component Tests
 *
 * Tests for the standardized empty state component that provides
 * consistent UI for empty content scenarios across the app.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { Folder, Search, Users, MessageSquare, FileText } from 'lucide-react';
import { UniversalEmptyState, emptyStateConfigs } from './UniversalEmptyState';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('UniversalEmptyState', () => {
  describe('Basic Rendering', () => {
    test('renders with required props', () => {
      render(
        <UniversalEmptyState
          icon={Folder}
          title="No projects yet"
          description="Create your first project to get started."
        />
      );

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first project to get started.')).toBeInTheDocument();
    });

    test('renders icon correctly', () => {
      render(
        <UniversalEmptyState
          icon={Search}
          title="No results"
          description="Try a different search."
        />
      );

      // The icon should be rendered inside the component
      const container = screen.getByText('No results').closest('div');
      expect(container?.parentElement).toBeInTheDocument();
    });

    test('applies custom className', () => {
      const { container } = render(
        <UniversalEmptyState
          icon={Folder}
          title="Test"
          description="Test description"
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Size Variants', () => {
    test('renders small size variant', () => {
      render(
        <UniversalEmptyState
          icon={Folder}
          title="Small Empty State"
          description="This is a small variant."
          size="sm"
        />
      );

      const title = screen.getByText('Small Empty State');
      expect(title).toHaveClass('text-base');
    });

    test('renders medium size variant (default)', () => {
      render(
        <UniversalEmptyState
          icon={Folder}
          title="Medium Empty State"
          description="This is the default medium variant."
        />
      );

      const title = screen.getByText('Medium Empty State');
      expect(title).toHaveClass('text-lg');
    });

    test('renders large size variant', () => {
      render(
        <UniversalEmptyState
          icon={Folder}
          title="Large Empty State"
          description="This is a large variant."
          size="lg"
        />
      );

      const title = screen.getByText('Large Empty State');
      expect(title).toHaveClass('text-xl');
    });
  });

  describe('Illustration Types', () => {
    test('renders with project illustration', () => {
      const { container } = render(
        <UniversalEmptyState
          icon={Folder}
          title="Projects"
          description="No projects."
          illustration="project"
        />
      );

      // Check that the illustration colors are applied
      expect(container.innerHTML).toContain('from-primary');
    });

    test('renders with file illustration', () => {
      const { container } = render(
        <UniversalEmptyState
          icon={FileText}
          title="Files"
          description="No files."
          illustration="file"
        />
      );

      expect(container.innerHTML).toContain('from-blue');
    });

    test('renders with team illustration', () => {
      const { container } = render(
        <UniversalEmptyState
          icon={Users}
          title="Team"
          description="No team members."
          illustration="team"
        />
      );

      expect(container.innerHTML).toContain('from-green');
    });

    test('renders with message illustration', () => {
      const { container } = render(
        <UniversalEmptyState
          icon={MessageSquare}
          title="Messages"
          description="No messages."
          illustration="message"
        />
      );

      expect(container.innerHTML).toContain('from-purple');
    });

    test('renders with search illustration', () => {
      const { container } = render(
        <UniversalEmptyState
          icon={Search}
          title="Search"
          description="No results."
          illustration="search"
        />
      );

      expect(container.innerHTML).toContain('from-amber');
    });

    test('renders with default illustration', () => {
      const { container } = render(
        <UniversalEmptyState
          icon={Folder}
          title="Default"
          description="Default illustration."
          illustration="default"
        />
      );

      expect(container.innerHTML).toContain('from-neutral');
    });
  });

  describe('Actions', () => {
    test('renders primary action button', () => {
      const handleClick = vi.fn();

      render(
        <UniversalEmptyState
          icon={Folder}
          title="No projects"
          description="Create a project."
          primaryAction={{
            label: 'Create Project',
            onClick: handleClick,
          }}
        />
      );

      const button = screen.getByRole('button', { name: /create project/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('renders primary action with icon', () => {
      const handleClick = vi.fn();

      render(
        <UniversalEmptyState
          icon={Folder}
          title="No projects"
          description="Create a project."
          primaryAction={{
            label: 'Create Project',
            onClick: handleClick,
            icon: <span data-testid="action-icon">+</span>,
          }}
        />
      );

      expect(screen.getByTestId('action-icon')).toBeInTheDocument();
    });

    test('renders secondary action button', () => {
      const handlePrimary = vi.fn();
      const handleSecondary = vi.fn();

      render(
        <UniversalEmptyState
          icon={Folder}
          title="No projects"
          description="Create a project."
          primaryAction={{
            label: 'Create Project',
            onClick: handlePrimary,
          }}
          secondaryAction={{
            label: 'Browse Templates',
            onClick: handleSecondary,
          }}
        />
      );

      const secondaryButton = screen.getByRole('button', { name: /browse templates/i });
      expect(secondaryButton).toBeInTheDocument();

      fireEvent.click(secondaryButton);
      expect(handleSecondary).toHaveBeenCalledTimes(1);
    });

    test('renders secondary action without primary action', () => {
      const handleSecondary = vi.fn();

      render(
        <UniversalEmptyState
          icon={Folder}
          title="No projects"
          description="Learn more."
          secondaryAction={{
            label: 'Learn More',
            onClick: handleSecondary,
          }}
        />
      );

      const button = screen.getByRole('button', { name: /learn more/i });
      expect(button).toBeInTheDocument();
    });

    test('renders without any actions', () => {
      render(
        <UniversalEmptyState
          icon={Folder}
          title="No projects"
          description="No actions available."
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Pre-configured Empty States', () => {
    test('projects config has correct structure', () => {
      expect(emptyStateConfigs.projects).toEqual({
        title: 'No projects yet',
        description: 'Create your first project to start collaborating with your team.',
        illustration: 'project',
      });
    });

    test('files config has correct structure', () => {
      expect(emptyStateConfigs.files).toEqual({
        title: 'No files uploaded',
        description: 'Upload files to organize your designs, documents, and media.',
        illustration: 'file',
      });
    });

    test('assets config has correct structure', () => {
      expect(emptyStateConfigs.assets).toEqual({
        title: 'No assets yet',
        description: 'Assets help organize your design files, logos, and media for easy reuse.',
        illustration: 'file',
      });
    });

    test('team config has correct structure', () => {
      expect(emptyStateConfigs.team).toEqual({
        title: 'No team members',
        description: 'Invite team members to collaborate on projects together.',
        illustration: 'team',
      });
    });

    test('messages config has correct structure', () => {
      expect(emptyStateConfigs.messages).toEqual({
        title: 'No messages yet',
        description: 'Start a conversation with your team to collaborate in real-time.',
        illustration: 'message',
      });
    });

    test('search config has correct structure', () => {
      expect(emptyStateConfigs.search).toEqual({
        title: 'No results found',
        description: 'Try adjusting your search terms or filters.',
        illustration: 'search',
      });
    });

    test('tasks config has correct structure', () => {
      expect(emptyStateConfigs.tasks).toEqual({
        title: 'No tasks yet',
        description: 'Create tasks to track progress and keep your team aligned.',
        illustration: 'project',
      });
    });

    test('notifications config has correct structure', () => {
      expect(emptyStateConfigs.notifications).toEqual({
        title: 'All caught up!',
        description: 'You have no new notifications. Check back later.',
        illustration: 'default',
      });
    });

    test('can use pre-configured config with spread operator', () => {
      const handleClick = vi.fn();

      render(
        <UniversalEmptyState
          icon={Folder}
          {...emptyStateConfigs.projects}
          primaryAction={{
            label: 'Create Project',
            onClick: handleClick,
          }}
        />
      );

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first project to start collaborating with your team.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('title is rendered as heading', () => {
      render(
        <UniversalEmptyState
          icon={Folder}
          title="Accessible Title"
          description="Description text."
        />
      );

      const heading = screen.getByRole('heading', { name: /accessible title/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    test('buttons are focusable', () => {
      render(
        <UniversalEmptyState
          icon={Folder}
          title="Test"
          description="Test"
          primaryAction={{
            label: 'Primary Action',
            onClick: vi.fn(),
          }}
          secondaryAction={{
            label: 'Secondary Action',
            onClick: vi.fn(),
          }}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});
