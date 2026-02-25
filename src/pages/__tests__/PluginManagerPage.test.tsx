/**
 * PluginManagerPage Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/components/templates/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/plugins/PluginManager', () => ({
  PluginManager: () => <div data-testid="plugin-manager">Plugin Manager Content</div>,
}));

import PluginManagerPage from '../PluginManagerPage';

describe('PluginManagerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <PluginManagerPage />
      </MemoryRouter>
    );

  test('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('renders plugin manager component', () => {
    renderPage();
    expect(screen.getByTestId('plugin-manager')).toBeInTheDocument();
  });

  test('displays plugin manager content', () => {
    renderPage();
    expect(screen.getByText('Plugin Manager Content')).toBeInTheDocument();
  });

  test('wraps content in dashboard layout', () => {
    renderPage();
    const layout = screen.getByTestId('dashboard-layout');
    const manager = screen.getByTestId('plugin-manager');
    expect(layout).toContainElement(manager);
  });
});
