/**
 * AdminMetrics Page Tests
 *
 * Tests the admin metrics dashboard with server performance and Web Vitals display.
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
const mockUser = { id: 'user-1', name: 'Admin User', email: 'admin@example.com', avatar: null };
const mockLogout = vi.fn();

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    token: 'admin-token',
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

const mockMetricsData = {
  server: {
    current: { timestamp: '2025-01-01T00:00:00Z', requests: { total: 1000, errors: 5 }, redis: { total: 500 } },
    summary: {
      period: { minutes: 60, from: '2025-01-01T00:00:00Z', to: '2025-01-01T01:00:00Z' },
      requests: { total: 5000, errors: 25, errorRate: 0.5, avgPerMinute: 83 },
      latency: { avg: 120, max: 350 },
      system: { currentMemory: 256, currentCpu: 35 },
    },
    history: [
      {
        timestamp: '2025-01-01T00:00:00Z',
        requests: { total: 100, failed: 2, latency: { mean: 110, p95: 280, p99: 450 } },
        system: { memory: { heapUsed: 240 }, cpu: { usage: 30 } },
      },
    ],
  },
  webVitals: {
    total_sessions: '150',
    avg_lcp: '2100',
    avg_fcp: '1500',
    avg_fid: '50',
    avg_cls: '0.05',
    avg_ttfb: '180',
    avg_score: '0.85',
    lcp_p75: 2500,
    cls_p75: 0.08,
  },
  perPageVitals: [],
  topEvents: [
    { event_name: 'page_view', count: '5000' },
    { event_name: 'button_click', count: '2500' },
  ],
  wsConnections: { total: 42, '/messaging': 20, '/collaboration': 15, '/boards': 7 },
  funnel: null,
};

import { AdminMetrics } from '../AdminMetrics';

describe('AdminMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMetricsData),
    });
  });

  test('renders without crashing', () => {
    const { container } = render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(container.firstChild).toBeTruthy();
  });

  test('shows loading skeletons initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('displays page heading after loading', async () => {
    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('System Metrics')).toBeInTheDocument();
  });

  test('displays subheading', async () => {
    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('Real-time server performance and Web Vitals')).toBeInTheDocument();
  });

  test('displays server metric cards', async () => {
    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('Avg Latency')).toBeInTheDocument();
    expect(screen.getByText('Requests/min')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('Total Requests')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
    // CPU appears both in metric cards and history table; use getAllByText
    expect(screen.getAllByText('CPU').length).toBeGreaterThan(0);
  });

  test('displays Web Vitals section', async () => {
    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('Web Vitals (24h RUM)')).toBeInTheDocument();
    expect(screen.getByText('LCP')).toBeInTheDocument();
    expect(screen.getByText('FCP')).toBeInTheDocument();
    expect(screen.getByText('FID')).toBeInTheDocument();
    expect(screen.getByText('CLS')).toBeInTheDocument();
    expect(screen.getByText('TTFB')).toBeInTheDocument();
  });

  test('displays top events section', async () => {
    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('Top Events (24h)')).toBeInTheDocument();
    expect(screen.getByText('page_view')).toBeInTheDocument();
    expect(screen.getByText('button_click')).toBeInTheDocument();
  });

  test('displays WebSocket connections', async () => {
    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('WebSocket Connections')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  test('shows error state when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('Failed to fetch metrics')).toBeInTheDocument();
  });

  test('shows admin access required on 403', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Forbidden' }),
    });

    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(await screen.findByText('Admin access required')).toBeInTheDocument();
  });

  test('redirects to login when user is null', async () => {
    const { useAuth } = await import('@/store/slices/authSlice');
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      logout: vi.fn(),
    } as any);

    render(<MemoryRouter><AdminMetrics /></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
