/**
 * TeamDashboard Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

const defaultOrgMock = {
  currentTeam: null,
  currentOrganization: { id: 'org-1', name: 'Test Org' },
  projects: [],
  isLoadingProjects: false,
  navigateTo: vi.fn(),
  getTeamStats: vi.fn().mockResolvedValue(null),
  getTeamMembers: vi.fn().mockResolvedValue([]),
};

const mockUseOrganization = vi.fn(() => defaultOrgMock);

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: (...args: unknown[]) => mockUseOrganization(...args),
}));

// Mock sub-components
vi.mock('@/components/EnoBackground', () => ({
  EnoBackground: () => <div data-testid="eno-background" />,
}));

vi.mock('@/components/MobileOptimizedHeader', () => ({
  MobileOptimizedHeader: () => <div data-testid="mobile-header" />,
}));

vi.mock('@/components/OrganizationBreadcrumb', () => ({
  OrganizationBreadcrumb: () => <div data-testid="breadcrumb" />,
}));

import { TeamDashboard } from '@/components/TeamDashboard';

describe('TeamDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrganization.mockReturnValue({ ...defaultOrgMock });
  });

  const renderTeamDashboard = (props = {}) => {
    return render(
      <MemoryRouter>
        <TeamDashboard {...props} />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderTeamDashboard();
    expect(screen.getByText('Team Not Found')).toBeInTheDocument();
  });

  test('displays not found message when no team is set', () => {
    renderTeamDashboard();
    expect(screen.getByText(/The requested team could not be found/)).toBeInTheDocument();
  });

  test('displays return to dashboard button when team not found', () => {
    renderTeamDashboard();
    expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
  });

  test('navigates to dashboard on return button click', () => {
    renderTeamDashboard();
    const returnButton = screen.getByText('Return to Dashboard');
    fireEvent.click(returnButton);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('renders team dashboard when team is set', () => {
    mockUseOrganization.mockReturnValue({
      ...defaultOrgMock,
      currentTeam: {
        id: 'team-1',
        name: 'Design Team',
        description: 'The design team',
        settings: { isPrivate: false },
      },
      projects: [
        { id: 'p1', name: 'Project 1' },
      ],
    });

    renderTeamDashboard();
    expect(screen.getByText('Design Team')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
  });
});
