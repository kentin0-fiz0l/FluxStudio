/**
 * OrganizationDashboard Component Tests
 *
 * Tests: org data rendering, org selector fallback, teams/projects sections.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { OrganizationDashboard } from '../OrganizationDashboard';

vi.mock('../../../contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: null,
    organizations: [
      { id: 'org1', name: 'Acme Inc', description: 'Best company' },
    ],
    teams: [],
    projects: [],
    isLoadingTeams: false,
    isLoadingProjects: false,
    navigateTo: vi.fn(),
    getOrganizationStats: vi.fn().mockResolvedValue(null),
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

vi.mock('../OrgSelector', () => ({
  OrgSelector: ({ organizations }: { organizations: any[] }) => (
    <div data-testid="org-selector">{organizations.length} orgs</div>
  ),
}));

vi.mock('../OrgHeader', () => ({
  OrgHeader: () => <div data-testid="org-header" />,
}));

vi.mock('../OrgSearchBar', () => ({
  OrgSearchBar: () => <div data-testid="org-search-bar" />,
}));

vi.mock('../TeamsSection', () => ({
  TeamsSection: () => <div data-testid="teams-section" />,
}));

vi.mock('../ProjectsSection', () => ({
  ProjectsSection: () => <div data-testid="projects-section" />,
}));

const { useOrganization } = await import('../../../contexts/OrganizationContext');

describe('OrganizationDashboard', () => {
  test('renders OrgSelector when currentOrganization is null', () => {
    render(<OrganizationDashboard />);

    expect(screen.getByTestId('org-selector')).toBeTruthy();
    expect(screen.getByText('1 orgs')).toBeTruthy();
  });

  test('renders dashboard layout when currentOrganization exists', () => {
    vi.mocked(useOrganization).mockReturnValue({
      currentOrganization: { id: 'org1', name: 'Acme Inc' },
      organizations: [{ id: 'org1', name: 'Acme Inc' }],
      teams: [],
      projects: [],
      isLoadingTeams: false,
      isLoadingProjects: false,
      navigateTo: vi.fn(),
      getOrganizationStats: vi.fn().mockResolvedValue(null),
    } as any);

    render(<OrganizationDashboard />);

    expect(screen.getByTestId('org-header')).toBeTruthy();
    expect(screen.getByTestId('org-search-bar')).toBeTruthy();
    expect(screen.getByTestId('teams-section')).toBeTruthy();
    expect(screen.getByTestId('projects-section')).toBeTruthy();
  });

  test('renders breadcrumb when organization is selected', () => {
    vi.mocked(useOrganization).mockReturnValue({
      currentOrganization: { id: 'org1', name: 'Acme Inc' },
      organizations: [{ id: 'org1', name: 'Acme Inc' }],
      teams: [],
      projects: [],
      isLoadingTeams: false,
      isLoadingProjects: false,
      navigateTo: vi.fn(),
      getOrganizationStats: vi.fn().mockResolvedValue(null),
    } as any);

    render(<OrganizationDashboard />);

    expect(screen.getByTestId('breadcrumb')).toBeTruthy();
  });
});
