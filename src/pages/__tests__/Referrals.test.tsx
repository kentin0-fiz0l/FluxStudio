/**
 * Referrals Page Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

import Referrals from '../Referrals';

describe('Referrals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <Referrals />
      </MemoryRouter>
    );
  };

  test('renders loading state initially', () => {
    // Never resolve fetches so it stays in loading
    global.fetch = vi.fn(() => new Promise(() => {})) as any;
    renderPage();
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('renders without crashing after loading', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, code: 'ABC123' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          stats: { totalReferrals: 5, converted: 2, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        }),
      }) as any;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Invite Friends')).toBeInTheDocument();
    });
  });

  test('displays referral link card', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, code: 'ABC123' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          stats: { totalReferrals: 5, converted: 2, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        }),
      }) as any;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your Referral Link')).toBeInTheDocument();
    });
  });

  test('displays referral URL with code', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, code: 'ABC123' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          stats: { totalReferrals: 0, converted: 0, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        }),
      }) as any;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/signup\?ref=ABC123/)).toBeInTheDocument();
    });
  });

  test('displays stats when available', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, code: 'ABC123' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          stats: { totalReferrals: 10, converted: 3, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        }),
      }) as any;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Total Referrals')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Created a Project')).toBeInTheDocument();
    });
  });

  test('displays recent referrals list', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, code: 'ABC123' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          stats: { totalReferrals: 2, converted: 1, firstReferral: null, latestReferral: null },
          recentReferrals: [
            { name: 'Jane Doe', email: 'jane@test.com', signedUpAt: '2025-01-15', converted: true },
            { name: 'John Smith', email: null, signedUpAt: '2025-01-14', converted: false },
          ],
        }),
      }) as any;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Recent Referrals')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Converted')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Signed Up')).toBeInTheDocument();
    });
  });

  test('displays copy button for referral link', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, code: 'ABC123' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          stats: { totalReferrals: 0, converted: 0, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        }),
      }) as any;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });

  test('renders inside dashboard layout', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, code: 'ABC123' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          stats: { totalReferrals: 0, converted: 0, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        }),
      }) as any;

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });
});
