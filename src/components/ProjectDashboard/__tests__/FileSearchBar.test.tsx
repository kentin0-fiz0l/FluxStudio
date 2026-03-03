/**
 * FileSearchBar Component Tests
 *
 * Tests: search input, filter buttons, view mode toggle.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

import { FileSearchBar } from '../FileSearchBar';

function defaultProps() {
  return {
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filterType: 'all' as const,
    setFilterType: vi.fn(),
    viewMode: 'grid' as const,
    setViewMode: vi.fn(),
  };
}

describe('FileSearchBar', () => {
  test('renders search input with placeholder', () => {
    render(<FileSearchBar {...defaultProps()} />);

    expect(screen.getByPlaceholderText('Search files...')).toBeTruthy();
  });

  test('renders filter buttons for All, Design, Reference, Final', () => {
    render(<FileSearchBar {...defaultProps()} />);

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Design')).toBeTruthy();
    expect(screen.getByText('Reference')).toBeTruthy();
    expect(screen.getByText('Final')).toBeTruthy();
  });

  test('calls setFilterType when a filter button is clicked', async () => {
    const setFilterType = vi.fn();
    const { user } = render(
      <FileSearchBar {...defaultProps()} setFilterType={setFilterType} />
    );

    await user.click(screen.getByText('Design'));
    expect(setFilterType).toHaveBeenCalledWith('design');
  });

  test('calls setSearchQuery when typing in search input', async () => {
    const setSearchQuery = vi.fn();
    const { user } = render(
      <FileSearchBar {...defaultProps()} setSearchQuery={setSearchQuery} />
    );

    await user.type(screen.getByPlaceholderText('Search files...'), 'logo');
    expect(setSearchQuery).toHaveBeenCalled();
  });

  test('displays current search query value', () => {
    render(<FileSearchBar {...defaultProps()} searchQuery="mockup" />);

    expect(screen.getByDisplayValue('mockup')).toBeTruthy();
  });
});
