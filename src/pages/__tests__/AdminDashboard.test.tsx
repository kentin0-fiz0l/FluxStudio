/**
 * Admin Dashboard Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  UsageCharts: () => (
    <div data-testid="usage-charts">Usage Charts</div>
  ),
}));

// Mock apiService
vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn().mockResolvedValue({
      success: true,
      data: { users: [], total: 0, projects: [] },
    }),
  },
}));

vi.mock('@/config/environment', () => ({
  buildApiUrl: vi.fn((endpoint: string) => `/api${endpoint}`),
  config: { API_TIMEOUT: 30000, API_BASE_URL: '/api' },
}));

import { AdminDashboard } from '../admin/Dashboard';

describe('AdminDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>
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

  test('displays stat cards with labels', async () => {
    renderPage();
    // Stats are loaded via useQuery; labels exist in both loading and loaded states
    expect(await screen.findByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Total Projects')).toBeInTheDocument();
  });

  test('displays recent activity section', () => {
    renderPage();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  test('renders SystemHealth component', () => {
    renderPage();
    expect(screen.getByTestId('system-health')).toBeInTheDocument();
  });

  test('renders UsageCharts component', () => {
    renderPage();
    expect(screen.getByTestId('usage-charts')).toBeInTheDocument();
  });

  test('displays View All link for audit logs', () => {
    renderPage();
    expect(screen.getByText('View All')).toBeInTheDocument();
  });
});
