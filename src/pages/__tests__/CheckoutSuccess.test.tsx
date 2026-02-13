/**
 * CheckoutSuccess Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    h1: ({ children, className, ...props }: any) => <h1 className={className} {...props}>{children}</h1>,
    p: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { CheckoutSuccess } from '../CheckoutSuccess';

describe('CheckoutSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCheckoutSuccess = (initialEntries: string[] = ['/checkout/success']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <CheckoutSuccess />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    test('renders without crashing', () => {
      renderCheckoutSuccess();
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    });

    test('displays thank you message', () => {
      renderCheckoutSuccess();
      expect(screen.getByText(/thank you for your purchase/i)).toBeInTheDocument();
    });

    test('displays what happens next section', () => {
      renderCheckoutSuccess();
      expect(screen.getByText('What happens next?')).toBeInTheDocument();
    });

    test('displays check email instruction', () => {
      renderCheckoutSuccess();
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });

    test('displays access dashboard instruction', () => {
      renderCheckoutSuccess();
      expect(screen.getByText('Access your dashboard')).toBeInTheDocument();
    });

    test('displays go to projects link', () => {
      renderCheckoutSuccess();
      const link = screen.getByText('Go to Projects');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/projects');
    });

    test('displays return to home link', () => {
      renderCheckoutSuccess();
      const link = screen.getByText('Return to home');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/');
    });
  });

  describe('Session ID', () => {
    test('displays order reference when session_id is in URL', () => {
      renderCheckoutSuccess(['/checkout/success?session_id=cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6']);
      expect(screen.getByText(/order reference/i)).toBeInTheDocument();
      expect(screen.getByText(/cs_test_a1b2c3d4e5f6/i)).toBeInTheDocument();
    });

    test('does not display order reference when no session_id', () => {
      renderCheckoutSuccess();
      expect(screen.queryByText(/order reference/i)).not.toBeInTheDocument();
    });
  });
});
