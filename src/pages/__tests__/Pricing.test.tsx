/**
 * Pricing Page Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
  })),
}));

vi.mock('@/services/usageService', () => ({
  fetchLimits: vi.fn(() => Promise.resolve({ plan: 'free' })),
}));

vi.mock('@/components/payments/SaaSPricingTable', () => ({
  SaaSPricingTable: ({ currentPlan }: any) => (
    <div data-testid="pricing-table" data-plan={currentPlan}>
      Pricing Table
    </div>
  ),
}));

import { useAuth } from '@/store/slices/authSlice';
import { Pricing } from '../Pricing';

describe('Pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPricing = () => render(
    <MemoryRouter>
      <Pricing />
    </MemoryRouter>
  );

  test('renders without crashing', () => {
    renderPricing();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
  });

  test('displays pricing table component', () => {
    renderPricing();
    expect(screen.getByTestId('pricing-table')).toBeInTheDocument();
  });

  test('shows sign in link for unauthenticated users', () => {
    renderPricing();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  test('hides sign in link for authenticated users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
    } as any);

    renderPricing();
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
  });

  test('displays FAQ section', () => {
    renderPricing();
    expect(screen.getByText('Can I change plans later?')).toBeInTheDocument();
    expect(screen.getByText('What happens if I exceed my limits?')).toBeInTheDocument();
  });

  test('toggles FAQ items on click', () => {
    renderPricing();
    const faqButton = screen.getByText('Can I change plans later?');
    fireEvent.click(faqButton);
    expect(screen.getByText(/you can upgrade or downgrade/i)).toBeInTheDocument();
  });

  test('displays page subtitle', () => {
    renderPricing();
    expect(screen.getByText(/choose the plan/i)).toBeInTheDocument();
  });
});
