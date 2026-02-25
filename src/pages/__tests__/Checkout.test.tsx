/**
 * Checkout Page Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  })),
}));

// Mock PricingTable
vi.mock('@/components/payments/PricingTable', () => ({
  PricingTable: ({ onSelectPlan, loading }: any) => (
    <div data-testid="pricing-table">
      <button
        data-testid="select-starter"
        onClick={() => onSelectPlan({ id: 'starter', name: 'Starter', priceId: 'price_starter' })}
        disabled={loading}
      >
        Select Starter
      </button>
      <button
        data-testid="select-elite"
        onClick={() => onSelectPlan({ id: 'elite', name: 'Elite' })}
        disabled={loading}
      >
        Contact Sales
      </button>
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
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
import { Checkout } from '../Checkout';

describe('Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiService.post).mockReset();
  });

  const renderCheckout = (initialEntries: string[] = ['/checkout']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Checkout />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    test('renders without crashing', () => {
      renderCheckout();
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    test('displays secure checkout badge', () => {
      renderCheckout();
      expect(screen.getByText(/secure checkout powered by stripe/i)).toBeInTheDocument();
    });

    test('renders pricing table', () => {
      renderCheckout();
      expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
    });

    test('displays trust badges', () => {
      renderCheckout();
      expect(screen.getByText('Secure Payment')).toBeInTheDocument();
      expect(screen.getByText('Flexible Payment')).toBeInTheDocument();
      expect(screen.getByText('Satisfaction Guaranteed')).toBeInTheDocument();
    });

    test('back button calls navigate(-1)', () => {
      renderCheckout();
      fireEvent.click(screen.getByText('Back'));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('Plan Selection', () => {
    test('creates checkout session when selecting a plan', async () => {
      vi.mocked(apiService.post).mockResolvedValueOnce({
        success: true,
        data: { url: 'https://checkout.stripe.com/session' },
      });

      // Mock window.location
      const locationAssign = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { href: '', assign: locationAssign },
        writable: true,
        configurable: true,
      });

      renderCheckout();

      fireEvent.click(screen.getByTestId('select-starter'));

      await waitFor(() => {
        expect(apiService.post).toHaveBeenCalledWith(
          '/payments/create-checkout-session',
          expect.objectContaining({
            priceId: 'price_starter',
          })
        );
      });
    });

    test('shows error when checkout session creation fails', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Payment processing failed'));

      renderCheckout();

      fireEvent.click(screen.getByTestId('select-starter'));

      await waitFor(() => {
        expect(screen.getByText('Payment processing failed')).toBeInTheDocument();
      });
    });

    test('dismiss button clears error', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Payment failed'));

      renderCheckout();

      fireEvent.click(screen.getByTestId('select-starter'));

      await waitFor(() => {
        expect(screen.getByText('Payment failed')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Dismiss'));

      expect(screen.queryByText('Payment failed')).not.toBeInTheDocument();
    });

    test('elite plan triggers email to sales', () => {
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
      });

      renderCheckout();

      fireEvent.click(screen.getByTestId('select-elite'));

      expect(window.location.href).toContain('mailto:sales@fluxstudio.art');
    });
  });

  describe('Unauthenticated User', () => {
    test('redirects to login when selecting plan without auth', async () => {
      const { useAuth } = await import('@/store/slices/authSlice');
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      renderCheckout();

      fireEvent.click(screen.getByTestId('select-starter'));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/login?callbackUrl=')
      );
    });
  });
});
