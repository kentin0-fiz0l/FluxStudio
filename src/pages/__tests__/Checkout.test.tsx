/**
 * Checkout Page Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('../components/payments/SaaSPricingTable', () => ({
  SaaSPricingTable: () => <div data-testid="saas-pricing-table">Pricing Table</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, whileInView, whileHover, whileTap, variants, viewport, style, transition, custom, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
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

import { Checkout } from '../Checkout';

describe('Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(screen.getByText('Back to pricing')).toBeInTheDocument();
    });

    test('displays secure checkout badge', () => {
      renderCheckout();
      expect(screen.getByText(/secure checkout powered by stripe/i)).toBeInTheDocument();
    });

    test('back button navigates to pricing', () => {
      renderCheckout();
      fireEvent.click(screen.getByText('Back to pricing'));
      expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    });
  });
});
