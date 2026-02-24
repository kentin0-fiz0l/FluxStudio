/**
 * Billing Page Tests
 *
 * Tests the billing and subscription management page with Stripe integration.
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

// Stable references to avoid infinite useEffect loops (user is an effect dependency)
const mockUser = { id: 'user-1', name: 'Test User', email: 'test@example.com', avatar: null };
const mockLogout = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
    logout: mockLogout,
  })),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('@/components/payments/UsageBar', () => ({
  UsageBar: ({ label, current, limit }: any) => (
    <div data-testid={`usage-bar-${label.toLowerCase().replace(/\s/g, '-')}`}>
      {label}: {current}/{limit}
    </div>
  ),
}));

vi.mock('@/services/usageService', () => ({
  fetchUsage: vi.fn(),
}));

vi.mock('@/config/plans', () => ({
  getPlan: vi.fn((id: string) => ({ name: id === 'free' ? 'Free' : 'Pro' })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

import { Billing } from '../Billing';
import { fetchUsage } from '@/services/usageService';

function setupMocks(subscriptionData?: any, fetchOk = true) {
  vi.mocked(fetchUsage).mockResolvedValue({
    usage: {
      projects: { current: 3, limit: 5 },
      storage: { current: 100, limit: 500 },
      aiCalls: { current: 10, limit: 100 },
      collaborators: { current: 2, limit: 10 },
    },
    success: true,
    period: { start: '2026-01-01', end: '2026-02-01' },
    plan: 'free',
  });

  global.fetch = vi.fn().mockResolvedValue({
    ok: fetchOk,
    json: () => Promise.resolve(subscriptionData ?? {
      hasSubscription: true,
      subscription: {
        id: 'sub-1',
        status: 'active',
        currentPeriodEnd: '2025-12-31T00:00:00Z',
        cancelledAt: null,
      },
      canTrial: false,
    }),
  });
}

describe('Billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  test('renders without crashing', () => {
    const { container } = render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(container.firstChild).toBeTruthy();
  });

  test('shows loading skeletons before data loads', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><Billing /></MemoryRouter>);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('displays page heading after loading', async () => {
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('Billing & Subscription')).toBeInTheDocument();
  });

  test('displays subscription status section', async () => {
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('Subscription Status')).toBeInTheDocument();
  });

  test('shows active subscription badge', async () => {
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('Active')).toBeInTheDocument();
  });

  test('displays manage subscription section', async () => {
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('Manage Subscription')).toBeInTheDocument();
    expect(screen.getByText('Open Billing Portal')).toBeInTheDocument();
  });

  test('displays payment methods section', async () => {
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('Payment Methods')).toBeInTheDocument();
  });

  test('displays invoice history section', async () => {
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('Invoice History')).toBeInTheDocument();
  });

  test('displays security footer', async () => {
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText(/Payments secured by Stripe/)).toBeInTheDocument();
  });

  test('shows error state when subscription fetch fails', async () => {
    setupMocks({ error: 'Server error' }, false);
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('Failed to fetch subscription status')).toBeInTheDocument();
  });

  test('shows no active subscription state', async () => {
    setupMocks({ hasSubscription: false, subscription: null, canTrial: true });
    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(await screen.findByText('No active subscription')).toBeInTheDocument();
    expect(screen.getByText('View Plans')).toBeInTheDocument();
  });

  test('redirects to login when user is null', async () => {
    const { useAuth } = await import('@/contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    } as any);

    render(<MemoryRouter><Billing /></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith('/login?callbackUrl=/billing');
  });
});
