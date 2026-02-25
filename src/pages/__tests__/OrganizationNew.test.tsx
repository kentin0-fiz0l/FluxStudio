/**
 * OrganizationNew Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/store/slices/authSlice', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: mockUser,
      logout: vi.fn(),
      isAuthenticated: true,
    })),
  };
});

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/hooks/useOrganizations', () => ({
  useOrganizations: vi.fn(() => ({
    organizations: [{
      id: 'org-1',
      name: 'Flux Studio',
      description: 'A creative production studio',
      website: 'https://fluxstudio.art',
      industry: 'Design & Technology',
      size: 'small',
      createdAt: '2024-01-15T00:00:00.000Z',
      createdBy: '1',
      settings: { allowMemberInvites: true, requireApprovalForJoining: false, defaultMemberRole: 'member' },
      subscription: { plan: 'pro', status: 'active', memberLimit: 25, teamLimit: 10 },
    }],
    currentOrganization: {
      id: 'org-1',
      name: 'Flux Studio',
      description: 'A creative production studio',
      website: 'https://fluxstudio.art',
      industry: 'Design & Technology',
      size: 'small',
      createdAt: '2024-01-15T00:00:00.000Z',
      createdBy: '1',
      settings: { allowMemberInvites: true, requireApprovalForJoining: false, defaultMemberRole: 'member' },
      subscription: { plan: 'pro', status: 'active', memberLimit: 25, teamLimit: 10 },
    },
    loading: false,
    error: null,
    updateOrganization: vi.fn(),
    inviteToOrganization: vi.fn(),
    switchOrganization: vi.fn(),
    leaveOrganization: vi.fn(),
    fetchOrganizations: vi.fn(),
    createOrganization: vi.fn(),
  })),
}));

vi.mock('@/hooks/useTeams', () => ({
  useTeams: vi.fn(() => ({
    teams: [
      {
        id: 'team-1',
        name: 'Design Team',
        description: 'Design team',
        createdBy: '1',
        createdAt: '2024-01-15T00:00:00.000Z',
        members: [
          { userId: '1', role: 'owner', joinedAt: '2024-01-15' },
          { userId: '2', role: 'member', joinedAt: '2024-02-20' },
        ],
        invites: [],
      },
    ],
    loading: false,
    error: null,
    fetchTeams: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    inviteMember: vi.fn(),
    acceptInvite: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
  })),
}));

vi.mock('../contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    projects: [{ id: '1' }, { id: '2' }],
    isLoading: false,
  })),
}));

import { default as OrganizationNew } from '../OrganizationNew';

describe('OrganizationNew', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderOrg = () => render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrganizationNew />
      </MemoryRouter>
    </QueryClientProvider>
  );

  test('renders without crashing', () => {
    renderOrg();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays organization name', () => {
    renderOrg();
    expect(screen.getByText('Flux Studio')).toBeInTheDocument();
  });

  test('shows organization stats', () => {
    renderOrg();
    const members = screen.queryAllByText(/members/i);
    const teams = screen.queryAllByText(/teams/i);
    expect(members.length + teams.length).toBeGreaterThan(0);
  });

  test('shows team management section', () => {
    renderOrg();
    const teamElements = screen.queryAllByText(/team/i);
    expect(teamElements.length).toBeGreaterThan(0);
  });

  test('has settings navigation', () => {
    renderOrg();
    const settingsBtns = screen.queryAllByRole('button', { name: /settings/i });
    const settingsTexts = screen.queryAllByText(/settings/i);
    expect(settingsBtns.length + settingsTexts.length).toBeGreaterThan(0);
  });

  test('shows invite member button', () => {
    renderOrg();
    const inviteBtn = screen.queryByRole('button', { name: /invite/i }) ||
      screen.queryByText(/invite/i) ||
      screen.queryByText(/add member/i);
    expect(inviteBtn).toBeTruthy();
  });
});
