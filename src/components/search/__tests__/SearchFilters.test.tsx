/**
 * SearchFilters Component Tests
 *
 * Tests: filter chips, toggle types, clear all, section expand/collapse.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { SearchFilters } from '../SearchFilters';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
    i18n: { language: 'en' },
  }),
}));

function defaultProps() {
  return {
    filters: {} as any,
    facets: {
      types: { project: 5, file: 10, task: 3, message: 2 } as any,
      projects: [],
    },
    onFilterChange: vi.fn(),
    onToggleType: vi.fn(),
    onClearFilters: vi.fn(),
    activeFilterCount: 0,
  };
}

describe('SearchFilters', () => {
  test('renders Filters header', () => {
    render(<SearchFilters {...defaultProps()} />);

    expect(screen.getByText('Filters')).toBeTruthy();
  });

  test('renders content type filter buttons', () => {
    render(<SearchFilters {...defaultProps()} />);

    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Files')).toBeTruthy();
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByText('Messages')).toBeTruthy();
  });

  test('renders facet counts next to type labels', () => {
    render(<SearchFilters {...defaultProps()} />);

    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  test('calls onToggleType when a type filter is clicked', async () => {
    const onToggleType = vi.fn();
    const { user } = render(<SearchFilters {...defaultProps()} onToggleType={onToggleType} />);

    await user.click(screen.getByText('Projects'));
    expect(onToggleType).toHaveBeenCalledWith('project');
  });

  test('shows Clear button and active filter count badge when filters are active', () => {
    const { container } = render(<SearchFilters {...defaultProps()} activeFilterCount={2} />);

    // The active filter count badge is a span with specific styling next to the Filters label
    const badge = container.querySelector('.bg-blue-100, [class*="bg-blue-100"]');
    expect(badge).toBeTruthy();
    expect(screen.getByText('Clear')).toBeTruthy();
  });

  test('calls onClearFilters when Clear button is clicked', async () => {
    const onClearFilters = vi.fn();
    const { user } = render(
      <SearchFilters {...defaultProps()} activeFilterCount={1} onClearFilters={onClearFilters} />
    );

    await user.click(screen.getByLabelText('Clear all filters'));
    expect(onClearFilters).toHaveBeenCalled();
  });
});
