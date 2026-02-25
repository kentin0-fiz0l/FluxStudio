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

vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));

import { apiService } from '@/services/apiService';
import Referrals from '../Referrals';

describe('Referrals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiService.get).mockReset();
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
    vi.mocked(apiService.get).mockReturnValue(new Promise(() => {}));
    renderPage();
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('renders without crashing after loading', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { success: true, code: 'ABC123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          stats: { totalReferrals: 5, converted: 2, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        },
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Invite Friends')).toBeInTheDocument();
    });
  });

  test('displays referral link card', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { success: true, code: 'ABC123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          stats: { totalReferrals: 5, converted: 2, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        },
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your Referral Link')).toBeInTheDocument();
    });
  });

  test('displays referral URL with code', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { success: true, code: 'ABC123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          stats: { totalReferrals: 0, converted: 0, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        },
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/signup\?ref=ABC123/)).toBeInTheDocument();
    });
  });

  test('displays stats when available', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { success: true, code: 'ABC123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          stats: { totalReferrals: 10, converted: 3, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        },
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Total Referrals')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Created a Project')).toBeInTheDocument();
    });
  });

  test('displays recent referrals list', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { success: true, code: 'ABC123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          stats: { totalReferrals: 2, converted: 1, firstReferral: null, latestReferral: null },
          recentReferrals: [
            { name: 'Jane Doe', email: 'jane@test.com', signedUpAt: '2025-01-15', converted: true },
            { name: 'John Smith', email: null, signedUpAt: '2025-01-14', converted: false },
          ],
        },
      });

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
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { success: true, code: 'ABC123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          stats: { totalReferrals: 0, converted: 0, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        },
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });

  test('renders inside dashboard layout', async () => {
    vi.mocked(apiService.get)
      .mockResolvedValueOnce({
        success: true,
        data: { success: true, code: 'ABC123' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          stats: { totalReferrals: 0, converted: 0, firstReferral: null, latestReferral: null },
          recentReferrals: [],
        },
      });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });
});
