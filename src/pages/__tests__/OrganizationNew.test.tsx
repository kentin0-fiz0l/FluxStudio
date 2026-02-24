/**
 * OrganizationNew Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

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

import { default as OrganizationNew } from '../OrganizationNew';

describe('OrganizationNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderOrg = () => render(
    <MemoryRouter>
      <OrganizationNew />
    </MemoryRouter>
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
    // Should show members, teams, messages, or projects stats - may have multiple matches
    const members = screen.queryAllByText(/members/i);
    const teams = screen.queryAllByText(/teams/i);
    expect(members.length + teams.length).toBeGreaterThan(0);
  });

  test('shows team management section', () => {
    renderOrg();
    // Should have team-related content - multiple matches possible
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
