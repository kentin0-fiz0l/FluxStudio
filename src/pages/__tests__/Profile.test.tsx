/**
 * Profile Page Tests
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
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: null,
      userType: 'creator',
      createdAt: '2024-01-15T00:00:00.000Z',
    },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: vi.fn(() => ({
    projects: [{ id: '1', name: 'Project 1' }, { id: '2', name: 'Project 2' }],
    isLoading: false,
  })),
}));

// Mock DashboardLayout
vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

import { Profile } from '../Profile';

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProfile = () => {
    return render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );
  };

  test('renders without crashing', () => {
    renderProfile();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  test('displays personal information section', () => {
    renderProfile();
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });

  test('displays user name', () => {
    renderProfile();
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
  });

  test('displays user email', () => {
    renderProfile();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  test('displays user type', () => {
    renderProfile();
    expect(screen.getByText('creator')).toBeInTheDocument();
  });

  test('displays member since date', () => {
    renderProfile();
    // The formatDate function formats to en-US locale
    expect(screen.getByText(/January/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  test('displays security settings section', () => {
    renderProfile();
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
  });

  test('displays account stats', () => {
    renderProfile();
    expect(screen.getByText('Account Stats')).toBeInTheDocument();
    expect(screen.getByText('Projects Created')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('displays quick actions', () => {
    renderProfile();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('My Teams')).toBeInTheDocument();
  });

  test('displays edit profile button', () => {
    renderProfile();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  test('displays back to projects link', () => {
    renderProfile();
    const link = screen.getByText('← Back to Projects');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/projects');
  });
});
