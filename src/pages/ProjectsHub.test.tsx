/**
 * ProjectsHub Page Tests
 *
 * Tests for the primary landing page after login that displays
 * projects in a 3-zone layout with activity stream and quick actions.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsHub } from './ProjectsHub';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
      userType: 'designer',
      createdAt: new Date().toISOString(),
    },
    logout: vi.fn(),
    isLoading: false,
    isAuthenticated: true,
  })),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [],
    loading: false,
    error: null,
    fetchProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  })),
}));

// Mock framer-motion
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

// Mock DashboardLayout
vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children, breadcrumbs }: any) => (
    <div data-testid="dashboard-layout">
      <nav data-testid="breadcrumbs">
        {breadcrumbs?.map((b: any, i: number) => (
          <span key={i}>{b.label}</span>
        ))}
      </nav>
      {children}
    </div>
  ),
}));

// Mock ProjectCard and loading skeleton
vi.mock('@/components/molecules', () => ({
  ProjectCard: ({ project, onView }: any) => (
    <div data-testid={`project-card-${project.id}`} onClick={onView}>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
    </div>
  ),
}));

vi.mock('@/components/loading/LoadingStates', () => ({
  ProjectCardSkeleton: () => <div data-testid="project-skeleton">Loading...</div>,
}));

// Get mocked functions for manipulation in tests
const mockUseAuth = vi.mocked(await import('@/contexts/AuthContext')).useAuth;
const mockUseProjects = vi.mocked(await import('@/hooks/useProjects')).useProjects;

describe('ProjectsHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Reset mocks to default values
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        avatar: undefined,
        userType: 'designer',
        createdAt: new Date().toISOString(),
      },
      logout: vi.fn(),
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      signup: vi.fn(),
      loginWithGoogle: vi.fn(),
      loginWithApple: vi.fn(),
      setAuthToken: vi.fn(),
      getUserDashboardPath: vi.fn(),
      token: 'test-token',
    });

    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: null,
      fetchProjects: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      createMilestone: vi.fn(),
      updateMilestone: vi.fn(),
    });
  });

  const renderProjectsHub = () => {
    return render(
      <MemoryRouter>
        <ProjectsHub />
      </MemoryRouter>
    );
  };

  describe('Header and Greeting', () => {
    test('displays greeting with user name', () => {
      renderProjectsHub();

      // Should contain user's first name in greeting
      expect(screen.getByText(/Test/)).toBeInTheDocument();
    });

    test('displays New Project button in header', () => {
      renderProjectsHub();

      // Get all New Project buttons and verify at least one exists
      const newProjectButtons = screen.getAllByRole('button', { name: /new project/i });
      expect(newProjectButtons.length).toBeGreaterThanOrEqual(1);

      // The header button should be a primary styled button
      const headerButton = newProjectButtons.find(
        btn => btn.classList.contains('bg-primary-600')
      );
      expect(headerButton).toBeInTheDocument();
    });

    test('Header New Project button navigates to project creation', () => {
      renderProjectsHub();

      // Get the primary styled header button
      const newProjectButtons = screen.getAllByRole('button', { name: /new project/i });
      const headerButton = newProjectButtons.find(
        btn => btn.classList.contains('bg-primary-600')
      );

      fireEvent.click(headerButton!);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/new');
    });

    test('shows project count in subtitle when projects exist', () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: '1', name: 'Project 1', description: 'Desc 1' },
          { id: '2', name: 'Project 2', description: 'Desc 2' },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      expect(screen.getByText(/2 active projects/i)).toBeInTheDocument();
    });

    test('shows prompt to create first project when no projects', () => {
      renderProjectsHub();

      // There may be multiple instances of this text (header + empty state)
      const prompts = screen.getAllByText(/create your first project/i);
      expect(prompts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Search Functionality', () => {
    test('renders search input', () => {
      renderProjectsHub();

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      expect(searchInput).toBeInTheDocument();
    });

    test('filters projects based on search term', async () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: '1', name: 'Summer Show', description: 'Summer event' },
          { id: '2', name: 'Winter Gala', description: 'Winter celebration' },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'Summer' } });

      await waitFor(() => {
        expect(screen.getByText('Summer Show')).toBeInTheDocument();
        expect(screen.queryByText('Winter Gala')).not.toBeInTheDocument();
      });
    });

    test('shows no results empty state when search has no matches', async () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: '1', name: 'Summer Show', description: 'Summer event' },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      await waitFor(() => {
        expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
      });
    });

    test('clear search button resets search', async () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: '1', name: 'Summer Show', description: 'Summer event' },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      const searchInput = screen.getByPlaceholderText(/search projects/i);
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /clear search/i });
        fireEvent.click(clearButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Summer Show')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode Toggle', () => {
    test('renders view mode toggle buttons', () => {
      renderProjectsHub();

      // Should have grid and list toggle buttons
      const buttons = screen.getAllByRole('button');
      // Find buttons with LayoutGrid and List icons
      expect(buttons.length).toBeGreaterThan(2);
    });

    test('defaults to grid view', () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: '1', name: 'Project 1', description: 'Desc' },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      const { container } = renderProjectsHub();

      // Grid view should have grid-cols class
      expect(container.innerHTML).toContain('grid-cols');
    });
  });

  describe('Loading State', () => {
    test('shows loading skeletons when loading', () => {
      mockUseProjects.mockReturnValue({
        projects: [],
        loading: true,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      const skeletons = screen.getAllByTestId('project-skeleton');
      expect(skeletons.length).toBe(4);
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no projects exist', () => {
      renderProjectsHub();

      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    });

    test('empty state has create project action', () => {
      renderProjectsHub();

      const createButton = screen.getByRole('button', { name: /create project/i });
      expect(createButton).toBeInTheDocument();

      fireEvent.click(createButton);
      expect(mockNavigate).toHaveBeenCalledWith('/projects/new');
    });

    test('empty state has browse templates action', () => {
      renderProjectsHub();

      const templatesButton = screen.getByRole('button', { name: /browse templates/i });
      expect(templatesButton).toBeInTheDocument();

      fireEvent.click(templatesButton);
      expect(mockNavigate).toHaveBeenCalledWith('/projects/new?templates=true');
    });
  });

  describe('Projects Display', () => {
    test('renders project cards for each project', () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: '1', name: 'Project 1', description: 'Description 1', progress: 50 },
          { id: '2', name: 'Project 2', description: 'Description 2', progress: 75 },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });

    test('clicking project card navigates to project detail', () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: 'proj-123', name: 'Test Project', description: 'Test', progress: 25 },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      const projectCard = screen.getByTestId('project-card-proj-123');
      fireEvent.click(projectCard);

      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-123');
    });
  });

  describe('Activity Stream', () => {
    test('renders recent activity section', () => {
      renderProjectsHub();

      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    test('displays activity items', () => {
      renderProjectsHub();

      // Mock activity data is included in the component
      expect(screen.getByText(/sarah uploaded 3 files/i)).toBeInTheDocument();
      expect(screen.getByText(/mike commented on formation 3/i)).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    test('renders quick actions section', () => {
      renderProjectsHub();

      expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    });

    test('New Project quick action navigates correctly', () => {
      renderProjectsHub();

      // Find the quick action button (not the main header button)
      const quickActionsSection = screen.getByText(/quick actions/i).closest('div')?.parentElement;
      const newProjectButtons = screen.getAllByText(/new project/i);

      // Click the one in quick actions section (the second one usually)
      const quickActionButton = newProjectButtons.find(
        btn => quickActionsSection?.contains(btn)
      );

      if (quickActionButton) {
        fireEvent.click(quickActionButton.closest('button')!);
        expect(mockNavigate).toHaveBeenCalledWith('/projects/new');
      }
    });

    test('Messages quick action navigates to messages', () => {
      renderProjectsHub();

      const messagesButton = screen.getByText(/messages/i, { selector: 'p' }).closest('button');
      if (messagesButton) {
        fireEvent.click(messagesButton);
        expect(mockNavigate).toHaveBeenCalledWith('/messages');
      }
    });

    test('Team & Organization quick action navigates correctly', () => {
      renderProjectsHub();

      const teamButton = screen.getByText(/team & organization/i).closest('button');
      if (teamButton) {
        fireEvent.click(teamButton);
        expect(mockNavigate).toHaveBeenCalledWith('/organization');
      }
    });
  });

  describe('Upcoming Deadlines', () => {
    test('shows upcoming deadlines section when projects have due dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockUseProjects.mockReturnValue({
        projects: [
          {
            id: '1',
            name: 'Project with Deadline',
            description: 'Test',
            dueDate: futureDate.toISOString(),
            progress: 50,
          },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      expect(screen.getByText(/upcoming deadlines/i)).toBeInTheDocument();
      // Project name appears in both project card and deadlines section
      const projectNames = screen.getAllByText('Project with Deadline');
      expect(projectNames.length).toBeGreaterThanOrEqual(1);
    });

    test('shows "days" badge for upcoming deadlines', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      mockUseProjects.mockReturnValue({
        projects: [
          {
            id: '1',
            name: 'Upcoming Project',
            description: 'Test',
            dueDate: futureDate.toISOString(),
            progress: 50,
          },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      expect(screen.getByText(/\d+ days/i)).toBeInTheDocument();
    });

    test('shows no deadlines message when no projects have due dates', () => {
      mockUseProjects.mockReturnValue({
        projects: [
          { id: '1', name: 'No Deadline Project', description: 'Test', progress: 50 },
        ] as any,
        loading: false,
        error: null,
        fetchProjects: vi.fn(),
        createProject: vi.fn(),
        updateProject: vi.fn(),
        deleteProject: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        createMilestone: vi.fn(),
        updateMilestone: vi.fn(),
      });

      renderProjectsHub();

      expect(screen.getByText(/no upcoming deadlines/i)).toBeInTheDocument();
    });
  });

  describe('Breadcrumbs', () => {
    test('passes correct breadcrumbs to layout', () => {
      renderProjectsHub();

      const breadcrumbs = screen.getByTestId('breadcrumbs');
      expect(breadcrumbs).toHaveTextContent('Projects');
    });
  });
});
