/**
 * OrganizationDashboard Tests
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    currentOrganization: null,
    organizations: [
      { id: 'org-1', name: 'Test Org', description: 'A test organization' },
      { id: 'org-2', name: 'Another Org', description: 'Another organization' },
    ],
    teams: [],
    projects: [],
    isLoadingTeams: false,
    isLoadingProjects: false,
    navigateTo: vi.fn(),
    getOrganizationStats: vi.fn().mockResolvedValue(null),
  })),
}));

// Mock sub-components
vi.mock('@/components/MobileOptimizedHeader', () => ({
  MobileOptimizedHeader: () => <div data-testid="mobile-header" />,
}));

vi.mock('@/components/OrganizationBreadcrumb', () => ({
  OrganizationBreadcrumb: () => <div data-testid="breadcrumb" />,
}));

import { OrganizationDashboard } from '@/components/OrganizationDashboard';

describe('OrganizationDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderOrgDashboard = (props = {}) => {
    return render(
      <MemoryRouter>
        <OrganizationDashboard {...props} />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderOrgDashboard();
    expect(screen.getByText('Select an Organization')).toBeInTheDocument();
  });

  test('displays organization selection when no org is current', () => {
    renderOrgDashboard();
    expect(screen.getByText('Choose an organization to view its dashboard')).toBeInTheDocument();
  });

  test('displays available organizations', () => {
    renderOrgDashboard();
    expect(screen.getByText('Test Org')).toBeInTheDocument();
    expect(screen.getByText('Another Org')).toBeInTheDocument();
  });

  test('displays organization descriptions', () => {
    renderOrgDashboard();
    expect(screen.getByText('A test organization')).toBeInTheDocument();
    expect(screen.getByText('Another organization')).toBeInTheDocument();
  });

  test('renders organization dashboard when org is selected', async () => {
    const { useOrganization } = await import('@/contexts/OrganizationContext');
    vi.mocked(useOrganization).mockReturnValue({
      currentOrganization: { id: 'org-1', name: 'Test Org', description: 'A test organization' },
      organizations: [{ id: 'org-1', name: 'Test Org', description: 'A test organization' }],
      teams: [],
      projects: [],
      isLoadingTeams: false,
      isLoadingProjects: false,
      navigateTo: vi.fn(),
      getOrganizationStats: vi.fn().mockResolvedValue(null),
    } as any);

    renderOrgDashboard();
    expect(screen.getByText('Test Org')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
  });
});
