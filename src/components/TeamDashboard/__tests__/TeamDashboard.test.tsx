/**
 * TeamDashboard Component Tests
 *
 * Tests: team data rendering, not-found state, layout composition.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { TeamDashboard } from '../TeamDashboard';

vi.mock('../../../contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentTeam: null,
    currentOrganization: { id: 'org1' },
    projects: [],
    isLoadingProjects: false,
    navigateTo: vi.fn(),
    getTeamStats: vi.fn().mockResolvedValue(null),
    getTeamMembers: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1' } })),
}));

vi.mock('../../MobileOptimizedHeader', () => ({
  MobileOptimizedHeader: () => <div data-testid="mobile-header" />,
}));

vi.mock('../../OrganizationBreadcrumb', () => ({
  OrganizationBreadcrumb: () => <div data-testid="breadcrumb" />,
}));

vi.mock('../TeamNotFound', () => ({
  TeamNotFound: () => <div data-testid="team-not-found">Team Not Found</div>,
}));

vi.mock('../TeamHeader', () => ({
  TeamHeader: () => <div data-testid="team-header" />,
}));

vi.mock('../TeamProjectsList', () => ({
  TeamProjectsList: () => <div data-testid="team-projects-list" />,
}));

vi.mock('../TeamMembersSidebar', () => ({
  TeamMembersSidebar: () => <div data-testid="team-members-sidebar" />,
}));

const { useOrganization } = await import('../../../contexts/OrganizationContext');

describe('TeamDashboard', () => {
  test('renders TeamNotFound when currentTeam is null', () => {
    render(<TeamDashboard />);

    expect(screen.getByTestId('team-not-found')).toBeTruthy();
  });

  test('renders team layout when currentTeam exists', () => {
    vi.mocked(useOrganization).mockReturnValue({
      currentTeam: { id: 't1', name: 'Design Team', createdAt: '2025-01-01' },
      currentOrganization: { id: 'org1' },
      projects: [],
      isLoadingProjects: false,
      navigateTo: vi.fn(),
      getTeamStats: vi.fn().mockResolvedValue(null),
      getTeamMembers: vi.fn().mockResolvedValue([]),
    } as any);

    render(<TeamDashboard />);

    expect(screen.getByTestId('team-header')).toBeTruthy();
    expect(screen.getByTestId('team-projects-list')).toBeTruthy();
    expect(screen.getByTestId('team-members-sidebar')).toBeTruthy();
  });

  test('renders breadcrumb when team exists', () => {
    vi.mocked(useOrganization).mockReturnValue({
      currentTeam: { id: 't1', name: 'Design Team', createdAt: '2025-01-01' },
      currentOrganization: { id: 'org1' },
      projects: [],
      isLoadingProjects: false,
      navigateTo: vi.fn(),
      getTeamStats: vi.fn().mockResolvedValue(null),
      getTeamMembers: vi.fn().mockResolvedValue([]),
    } as any);

    render(<TeamDashboard />);

    expect(screen.getByTestId('breadcrumb')).toBeTruthy();
  });
});
