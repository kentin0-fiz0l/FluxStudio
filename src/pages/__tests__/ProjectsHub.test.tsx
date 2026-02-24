/**
 * ProjectsHub Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [
      { id: '1', name: 'Project Alpha', description: 'First project', status: 'active' },
      { id: '2', name: 'Project Beta', description: 'Second project', status: 'completed' },
    ],
    loading: false,
  })),
}));

vi.mock('@/hooks/useActivities', () => ({
  useDashboardActivities: vi.fn(() => ({
    data: { activities: [] },
    isLoading: false,
  })),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock DashboardLayout
vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

// Mock ProjectCard
vi.mock('@/components/molecules', () => ({
  ProjectCard: ({ project }: any) => <div data-testid={`project-card-${project.id}`}>{project.name}</div>,
}));

// Mock loading states
vi.mock('@/components/loading/LoadingStates', () => ({
  ProjectCardSkeleton: () => <div data-testid="project-skeleton" />,
}));

// Mock empty state
vi.mock('@/components/ui/UniversalEmptyState', () => ({
  UniversalEmptyState: () => <div data-testid="empty-state" />,
  emptyStateConfigs: { projects: {} },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
}));

import { ProjectsHub } from '../ProjectsHub';

describe('ProjectsHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProjectsHub = () => {
    return render(
      <MemoryRouter>
        <ProjectsHub />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderProjectsHub();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays project cards', () => {
    renderProjectsHub();
    expect(screen.getByTestId('project-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('project-card-2')).toBeInTheDocument();
  });

  test('displays project names', () => {
    renderProjectsHub();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  test('displays search input', () => {
    renderProjectsHub();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  test('displays new project button', () => {
    renderProjectsHub();
    const buttons = screen.getAllByText(/new project/i);
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('shows loading skeletons when loading', async () => {
    const { useProjects } = await import('@/hooks/useProjects');
    vi.mocked(useProjects).mockReturnValue({
      projects: [],
      loading: true,
    } as any);

    renderProjectsHub();
    const skeletons = screen.getAllByTestId('project-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
