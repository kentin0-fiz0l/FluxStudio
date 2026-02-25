/**
 * Home Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', userType: 'designer' as const };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/store/slices/authSlice', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: mockUser,
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    })),
  };
});

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [],
    loading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useFirstTimeExperience', () => ({
  useFirstTimeExperience: vi.fn(() => ({
    isFirstTime: false,
    isDismissed: false,
    steps: [],
    markStepComplete: vi.fn(),
    dismiss: vi.fn(),
    completedCount: 0,
    totalSteps: 4,
    updateData: vi.fn(),
  })),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/molecules', () => ({
  ProjectCard: () => <div data-testid="project-card" />,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  EmptyState: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/loading/LoadingStates', () => ({
  ProjectCardSkeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/Logo3D', () => ({
  Logo3D: () => <div data-testid="logo-3d" />,
}));

vi.mock('@/components/common/GettingStartedCard', () => ({
  GettingStartedCard: () => <div data-testid="getting-started" />,
}));

vi.mock('@/components/agent/DailyBriefWidget', () => ({
  DailyBriefWidget: () => <div data-testid="daily-brief" />,
}));

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => children,
}));

import { Home } from '../Home';

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHome = () => render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );

  test('renders without crashing', () => {
    renderHome();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('redirects to login when user is null', async () => {
    const authSlice = await import('@/store/slices/authSlice');
    vi.mocked(authSlice.useAuth).mockReturnValue({
      user: null, logout: vi.fn(), isAuthenticated: false, isLoading: false,
    } as any);

    renderHome();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  test('renders daily brief widget', () => {
    renderHome();
    expect(screen.getByTestId('daily-brief')).toBeInTheDocument();
  });

  test('shows getting started card for first-time users', async () => {
    const mod = await import('@/hooks/useFirstTimeExperience');
    vi.mocked(mod.useFirstTimeExperience).mockReturnValue({
      isFirstTime: true,
      isDismissed: false,
      steps: [{ id: '1', title: 'Step 1', description: '', ctaLabel: '', ctaHref: '', isComplete: false }],
      markStepComplete: vi.fn(),
      dismiss: vi.fn(),
      completedCount: 0,
      totalSteps: 4,
      updateData: vi.fn(),
      isCompleted: false,
      completeAll: vi.fn(),
    });

    renderHome();
    expect(screen.getByTestId('getting-started')).toBeInTheDocument();
  });
});
