/**
 * TeamDashboard Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Team, Project } from '@/types/organization';

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
  currentTeam: null as Team | null,
  currentOrganization: { id: 'org-1', name: 'Test Org' },
  projects: [] as Project[],
  isLoadingProjects: false,
  navigateTo: vi.fn(),
  getTeamStats: vi.fn().mockResolvedValue(null),
  getTeamMembers: vi.fn().mockResolvedValue([]),
};

const mockUseOrganization = vi.fn(() => defaultOrgMock);

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => mockUseOrganization(),
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
        organizationIds: ['org-1'],
        primaryOrganizationId: 'org-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        leadId: 'user-1',
        settings: {
          isPrivate: false,
          allowProjectCreation: true,
          defaultProjectRole: 'contributor',
          crossOrganizational: false,
        },
      },
      projects: [
        {
          id: 'p1',
          name: 'Project 1',
          organizationId: 'org-1',
          teamIds: ['team-1'],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          managerId: 'user-1',
          status: 'active',
          priority: 'medium',
          settings: {
            isPrivate: false,
            allowFileSharing: true,
            requireApproval: false,
            multiTeamCollaboration: false,
          },
          metadata: {
            projectType: 'show-concept',
            serviceCategory: 'design-concepts',
            serviceTier: 'standard',
            ensembleType: 'marching-band',
            tags: [],
          },
        },
      ],
    });

    renderTeamDashboard();
    expect(screen.getByText('Design Team')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
  });
});
