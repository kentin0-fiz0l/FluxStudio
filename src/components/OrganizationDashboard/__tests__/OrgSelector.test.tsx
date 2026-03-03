/**
 * OrgSelector Component Tests
 *
 * Tests: lists organizations, renders empty prompt, clicking selects org.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { OrgSelector } from '../OrgSelector';

vi.mock('../../MobileOptimizedHeader', () => ({
  MobileOptimizedHeader: () => <div data-testid="mobile-header" />,
}));

describe('OrgSelector', () => {
  test('renders heading and prompt text', () => {
    render(<OrgSelector organizations={[]} navigateTo={vi.fn()} />);

    expect(screen.getByText('Select an Organization')).toBeTruthy();
    expect(screen.getByText('Choose an organization to view its dashboard')).toBeTruthy();
  });

  test('renders organization cards', () => {
    const orgs = [
      { id: 'org1', name: 'Alpha Corp', description: 'First org' },
      { id: 'org2', name: 'Beta LLC', description: 'Second org' },
    ];

    render(<OrgSelector organizations={orgs} navigateTo={vi.fn()} />);

    expect(screen.getByText('Alpha Corp')).toBeTruthy();
    expect(screen.getByText('First org')).toBeTruthy();
    expect(screen.getByText('Beta LLC')).toBeTruthy();
    expect(screen.getByText('Second org')).toBeTruthy();
  });

  test('calls navigateTo when an organization card is clicked', async () => {
    const navigateTo = vi.fn();
    const orgs = [{ id: 'org1', name: 'Alpha Corp' }];

    const { user } = render(<OrgSelector organizations={orgs} navigateTo={navigateTo} />);

    await user.click(screen.getByText('Alpha Corp'));
    expect(navigateTo).toHaveBeenCalledWith('organization', 'org1');
  });

  test('renders empty grid when no organizations exist', () => {
    const { container } = render(<OrgSelector organizations={[]} navigateTo={vi.fn()} />);

    // The grid should be empty
    const grid = container.querySelector('.grid');
    expect(grid?.children.length).toBe(0);
  });
});
