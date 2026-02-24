/**
 * Tools Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

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
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  })),
}));

vi.mock('@/contexts/MetMapContext', () => ({
  useMetMap: vi.fn(() => ({
    stats: { songCount: 5, practiceCount: 12 },
    loadStats: vi.fn(),
  })),
}));

vi.mock('@/store', () => ({
  useActiveProject: vi.fn(() => ({
    activeProject: null,
    hasFocus: false,
  })),
}));

// Mock DashboardLayout
vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

import Tools from '../Tools';

describe('Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTools = () => {
    return render(
      <HelmetProvider>
        <MemoryRouter>
          <Tools />
        </MemoryRouter>
      </HelmetProvider>
    );
  };

  test('renders without crashing', () => {
    renderTools();
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  test('displays featured tools section', () => {
    renderTools();
    expect(screen.getByText('Featured Tools')).toBeInTheDocument();
  });

  test('displays MetMap tool', () => {
    renderTools();
    expect(screen.getByText('MetMap')).toBeInTheDocument();
  });

  test('displays Files tool', () => {
    renderTools();
    expect(screen.getByText('Files')).toBeInTheDocument();
  });

  test('displays Assets tool', () => {
    renderTools();
    expect(screen.getByText('Assets')).toBeInTheDocument();
  });

  test('displays coming soon section', () => {
    renderTools();
    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  test('displays coming soon tools', () => {
    renderTools();
    expect(screen.getByText('AI Design Assistant')).toBeInTheDocument();
    expect(screen.getByText('Asset Library')).toBeInTheDocument();
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  test('displays MetMap stats', () => {
    renderTools();
    expect(screen.getByText('5 songs')).toBeInTheDocument();
    expect(screen.getByText('12 sessions')).toBeInTheDocument();
  });

  test('displays tool suggestion card', () => {
    renderTools();
    expect(screen.getByText('Have a tool suggestion?')).toBeInTheDocument();
  });

  test('displays back to projects link', () => {
    renderTools();
    const link = screen.getByText('← Back to Projects');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/projects');
  });

  test('returns null when user is not authenticated', async () => {
    const { useAuth } = await import('@/store/slices/authSlice');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    } as any);

    const { container } = renderTools();
    expect(container.innerHTML).toBe('');
  });
});
