/**
 * TaskSearch Component - Tests
 *
 * Comprehensive test suite for the TaskSearch component and useTaskSearch hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TaskSearch } from './TaskSearch';
import { useTaskSearch, Task, TeamMember } from '@/hooks/useTaskSearch';
import { renderHook, act } from '@testing-library/react';

// ============================================================================
// TEST DATA
// ============================================================================

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Design homepage mockups',
    description: 'Create initial design concepts for the new homepage',
    status: 'in_progress',
    priority: 'high',
    assignedTo: 'user-1',
    dueDate: '2025-10-20',
    createdBy: 'user-2',
    createdAt: '2025-10-15T10:00:00Z',
    updatedAt: '2025-10-17T14:30:00Z',
    completedAt: null,
  },
  {
    id: '2',
    title: 'Implement authentication system',
    description: 'Build JWT-based authentication with refresh tokens',
    status: 'todo',
    priority: 'critical',
    assignedTo: 'user-2',
    dueDate: '2025-10-18',
    createdBy: 'user-1',
    createdAt: '2025-10-14T09:00:00Z',
    updatedAt: '2025-10-14T09:00:00Z',
    completedAt: null,
  },
  {
    id: '3',
    title: 'Write unit tests',
    description: 'Add comprehensive test coverage for API endpoints',
    status: 'review',
    priority: 'medium',
    assignedTo: 'user-1',
    dueDate: '2025-10-25',
    createdBy: 'user-2',
    createdAt: '2025-10-16T11:00:00Z',
    updatedAt: '2025-10-17T16:00:00Z',
    completedAt: null,
  },
  {
    id: '4',
    title: 'Deploy to production',
    description: 'Deploy the application to production environment',
    status: 'completed',
    priority: 'low',
    assignedTo: 'user-1',
    dueDate: null,
    createdBy: 'user-1',
    createdAt: '2025-10-10T08:00:00Z',
    updatedAt: '2025-10-16T18:00:00Z',
    completedAt: '2025-10-16T18:00:00Z',
  },
];

const mockTeamMembers: TeamMember[] = [
  { id: 'user-1', name: 'Alice Johnson', email: 'alice@fluxstudio.com' },
  { id: 'user-2', name: 'Bob Smith', email: 'bob@fluxstudio.com' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Wrapper for renderHook with Router context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// ============================================================================
// HOOK TESTS
// ============================================================================

describe('useTaskSearch Hook', () => {
  it('should initialize with default filters', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    expect(result.current.filters.query).toBe('');
    expect(result.current.filters.status).toEqual([]);
    expect(result.current.filters.priority).toEqual([]);
    expect(result.current.filters.sortBy).toBe('recent');
    expect(result.current.filteredTasks).toHaveLength(4);
  });

  it('should filter by search query', async () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.updateFilter('query', 'authentication');
    });

    // Wait for debounce
    await waitFor(
      () => {
        expect(result.current.filteredTasks).toHaveLength(1);
        expect(result.current.filteredTasks[0].title).toBe(
          'Implement authentication system'
        );
      },
      { timeout: 500 }
    );
  });

  it('should filter by status', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.toggleFilter('status', 'in_progress');
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].status).toBe('in_progress');
  });

  it('should filter by multiple statuses', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.toggleFilter('status', 'in_progress');
      result.current.toggleFilter('status', 'todo');
    });

    expect(result.current.filteredTasks).toHaveLength(2);
  });

  it('should filter by priority', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.toggleFilter('priority', 'high');
      result.current.toggleFilter('priority', 'critical');
    });

    expect(result.current.filteredTasks).toHaveLength(2);
  });

  it('should filter by assignee', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.toggleFilter('assignedTo', 'user-1');
    });

    expect(result.current.filteredTasks).toHaveLength(3);
    expect(
      result.current.filteredTasks.every(task => task.assignedTo === 'user-1')
    ).toBe(true);
  });

  it('should sort tasks by title ascending', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.updateFilter('sortBy', 'title-asc');
    });

    expect(result.current.filteredTasks[0].title).toBe('Deploy to production');
    expect(result.current.filteredTasks[1].title).toBe('Design homepage mockups');
  });

  it('should sort tasks by priority', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.updateFilter('sortBy', 'priority');
    });

    expect(result.current.filteredTasks[0].priority).toBe('critical');
    expect(result.current.filteredTasks[1].priority).toBe('high');
  });

  it('should calculate active filter count correctly', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    expect(result.current.activeFilterCount).toBe(0);

    act(() => {
      result.current.toggleFilter('status', 'in_progress');
      result.current.toggleFilter('priority', 'high');
    });

    expect(result.current.activeFilterCount).toBe(2);
  });

  it('should clear all filters', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.toggleFilter('status', 'in_progress');
      result.current.toggleFilter('priority', 'high');
      result.current.updateFilter('query', 'test');
    });

    expect(result.current.activeFilterCount).toBeGreaterThan(0);

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.filters.query).toBe('');
    expect(result.current.filteredTasks).toHaveLength(4);
  });

  it('should apply "my tasks" preset', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.applyPreset('my-tasks');
    });

    expect(result.current.filters.assignedTo).toEqual(['user-1']);
    expect(result.current.filters.status).toContain('in_progress');
  });

  it('should apply "high priority" preset', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.applyPreset('high-priority');
    });

    expect(result.current.filters.priority).toEqual(['high', 'critical']);
  });

  it('should combine multiple filters', () => {
    const { result } = renderHook(
      () => useTaskSearch(mockTasks, mockTeamMembers, 'user-1', { syncWithURL: false }),
      { wrapper }
    );

    act(() => {
      result.current.toggleFilter('status', 'in_progress');
      result.current.toggleFilter('priority', 'high');
    });

    expect(result.current.filteredTasks).toHaveLength(1);
    expect(result.current.filteredTasks[0].id).toBe('1');
  });
});

// ============================================================================
// COMPONENT TESTS
// ============================================================================

describe('TaskSearch Component', () => {
  const mockOnFilteredTasks = vi.fn();

  beforeEach(() => {
    mockOnFilteredTasks.mockClear();
  });

  it('should render search input', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument();
  });

  it('should render filter button', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('should render sort dropdown', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    expect(screen.getByLabelText(/sort tasks by/i)).toBeInTheDocument();
  });

  it('should show results count', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    // Text is split across elements: <span>4</span> tasks found
    // Use a custom text matcher to find it
    const resultsRegion = screen.getByRole('status');
    expect(resultsRegion).toHaveTextContent(/4.*tasks found/i);
  });

  it('should open filter panel when filter button is clicked', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    // Filter panel should be visible with filter options
    const filterPanel = document.getElementById('filter-panel');
    expect(filterPanel).toBeInTheDocument();

    // Check filter sections exist by their aria-label attributes
    expect(screen.getByLabelText(/filter by to do status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by low priority/i)).toBeInTheDocument();
  });

  it('should update search query on input', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search tasks/i);
    fireEvent.change(searchInput, { target: { value: 'authentication' } });

    expect(searchInput).toHaveValue('authentication');
  });

  it('should show clear button when search has text', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search tasks/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const clearButton = screen.getByLabelText(/clear search/i);
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
  });

  it('should render preset filters when enabled', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
        showPresets={true}
      />
    );

    expect(screen.getByText(/my tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/high priority/i)).toBeInTheDocument();
  });

  it('should not render preset filters when disabled', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
        showPresets={false}
      />
    );

    expect(screen.queryByText(/quick filters:/i)).not.toBeInTheDocument();
  });

  it('should call onFilteredTasks when filters change', async () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    // Open filter panel
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    // Click a status filter
    const inProgressButton = screen.getByLabelText(/filter by in progress status/i);
    fireEvent.click(inProgressButton);

    await waitFor(() => {
      expect(mockOnFilteredTasks).toHaveBeenCalled();
    });
  });

  it('should show active filter count badge', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    // Open filter panel
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    // Apply a filter
    const inProgressButton = screen.getByLabelText(/filter by in progress status/i);
    fireEvent.click(inProgressButton);

    // Check badge appears - find by the filter button having the badge count
    // The badge is inside the Filters button when active filters exist
    expect(filterButton).toHaveTextContent(/1/);
  });

  it('should render in compact mode', () => {
    const { container } = renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
        compact={true}
      />
    );

    // Compact mode should have specific styling
    expect(container.querySelector('.flex-col.sm\\:flex-row')).toBeInTheDocument();
  });

  it('should update sort option', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    const sortSelect = screen.getByLabelText(/sort tasks by/i) as HTMLSelectElement;
    fireEvent.change(sortSelect, { target: { value: 'priority' } });

    expect(sortSelect.value).toBe('priority');
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

describe('TaskSearch Accessibility', () => {
  const mockOnFilteredTasks = vi.fn();

  it('should have proper ARIA labels', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByLabelText(/search tasks by title or description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort tasks by/i)).toBeInTheDocument();
  });

  it('should have live region for results', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('should have proper button aria-pressed states', () => {
    renderWithRouter(
      <TaskSearch
        tasks={mockTasks}
        onFilteredTasks={mockOnFilteredTasks}
        teamMembers={mockTeamMembers}
        currentUserId="user-1"
        syncWithURL={false}
      />
    );

    // Open filter panel
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    const statusButton = screen.getByLabelText(/filter by in progress status/i);
    expect(statusButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(statusButton);
    expect(statusButton).toHaveAttribute('aria-pressed', 'true');
  });
});
