/**
 * PricingTable Component Tests
 *
 * Tests: tier rendering, Most Popular badge, CTA buttons, loading state.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { PricingTable } from '../PricingTable';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('PricingTable', () => {
  test('renders all pricing tier names', () => {
    render(<PricingTable onSelectPlan={vi.fn()} />);

    expect(screen.getByText('Foundation')).toBeTruthy();
    expect(screen.getByText('Standard')).toBeTruthy();
    expect(screen.getByText('Premium')).toBeTruthy();
    expect(screen.getByText('Elite')).toBeTruthy();
  });

  test('renders pricing amounts', () => {
    render(<PricingTable onSelectPlan={vi.fn()} />);

    expect(screen.getByText('$1,000')).toBeTruthy();
    expect(screen.getByText('$2,500')).toBeTruthy();
    expect(screen.getByText('$5,000')).toBeTruthy();
    expect(screen.getByText('$12,000')).toBeTruthy();
  });

  test('renders Most Popular badge on Standard tier', () => {
    render(<PricingTable onSelectPlan={vi.fn()} />);

    // "Most Popular" appears both as the badge and the CTA button text
    const elements = screen.getAllByText('Most Popular');
    expect(elements.length).toBeGreaterThanOrEqual(2);
    // The badge span has specific styling
    const badge = elements.find(el => el.classList.contains('rounded-full'));
    expect(badge).toBeTruthy();
  });

  test('renders CTA button text for each tier', () => {
    render(<PricingTable onSelectPlan={vi.fn()} />);

    expect(screen.getByText('Get Started')).toBeTruthy();
    // "Most Popular" is the CTA text for Standard tier
    // Check for the others
    expect(screen.getByText('Go Premium')).toBeTruthy();
    expect(screen.getByText('Contact Sales')).toBeTruthy();
  });

  test('calls onSelectPlan when a CTA button is clicked', async () => {
    const onSelectPlan = vi.fn();
    const { user } = render(<PricingTable onSelectPlan={onSelectPlan} />);

    await user.click(screen.getByText('Get Started'));
    expect(onSelectPlan).toHaveBeenCalledTimes(1);
    expect(onSelectPlan.mock.calls[0][0]).toMatchObject({ id: 'foundation' });
  });

  test('shows Processing text when loading and tier is selected', async () => {
    const onSelectPlan = vi.fn();
    const { user, rerender } = render(<PricingTable onSelectPlan={onSelectPlan} />);

    await user.click(screen.getByText('Get Started'));
    rerender(<PricingTable onSelectPlan={onSelectPlan} loading />);

    expect(screen.getByText('Processing...')).toBeTruthy();
  });
});
