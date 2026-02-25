/**
 * Admin Dashboard Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'admin-1', name: 'Admin User', email: 'admin@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    logout: vi.fn(),
  })),
}));

vi.mock('../../components/admin/SystemHealth', () => ({
  SystemHealth: () => <div data-testid="system-health">System Health</div>,
}));

vi.mock('../../components/admin/UsageCharts', () => ({
  UsageCharts: ({ onExport }: any) => (
    <div data-testid="usage-charts">Usage Charts</div>
  ),
}));

import { AdminDashboard } from '../admin/Dashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  test('displays dashboard overview heading', () => {
    renderPage();
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
  });

  test('displays overview description', () => {
    renderPage();
    expect(
      screen.getByText('Monitor your platform performance and manage resources.')
    ).toBeInTheDocument();
  });

  test('displays admin name', () => {
    renderPage();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  test('displays navigation items', () => {
    renderPage();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  test('displays stat cards', () => {
    renderPage();
    expect(screen.getByText('2,847')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,423')).toBeInTheDocument();
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('846')).toBeInTheDocument();
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
  });

  test('displays recent activity section', () => {
    renderPage();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  test('renders SystemHealth component', () => {
    renderPage();
    expect(screen.getByTestId('system-health')).toBeInTheDocument();
  });

  test('renders UsageCharts component', () => {
    renderPage();
    expect(screen.getByTestId('usage-charts')).toBeInTheDocument();
  });

  test('displays stat change percentages', () => {
    renderPage();
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('-3.2%')).toBeInTheDocument();
  });
});
