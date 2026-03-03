/**
 * MessageSearchPanel Component Tests
 *
 * Tests search input, close button, scope toggle, placeholder state.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';

vi.mock('../../../hooks/useMessageSearch', () => ({
  useMessageSearch: () => ({
    query: '',
    setQuery: vi.fn(),
    debouncedQuery: '',
    results: [],
    isLoading: false,
    error: null,
    clearSearch: vi.fn(),
    resultCount: 0,
    isSearchActive: false,
    loadMore: vi.fn(),
    hasMore: false,
  }),
}));

import { MessageSearchPanel } from '../MessageSearchPanel';

function defaultProps(overrides: Partial<Parameters<typeof MessageSearchPanel>[0]> = {}) {
  return {
    conversationId: 'conv-1',
    onResultClick: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe('MessageSearchPanel', () => {
  test('renders search input', () => {
    render(<MessageSearchPanel {...defaultProps()} />);
    expect(screen.getByPlaceholderText('Search in this conversation...')).toBeTruthy();
  });

  test('renders close button', () => {
    render(<MessageSearchPanel {...defaultProps()} />);
    expect(screen.getByLabelText('Close search')).toBeTruthy();
  });

  test('shows scope toggle when conversationId is provided', () => {
    render(<MessageSearchPanel {...defaultProps()} />);
    expect(screen.getByText('This conversation')).toBeTruthy();
    expect(screen.getByText('All conversations')).toBeTruthy();
  });

  test('shows placeholder instructions when search is not active', () => {
    render(<MessageSearchPanel {...defaultProps()} />);
    expect(screen.getByText('Type to search messages')).toBeTruthy();
    expect(screen.getByText('Minimum 2 characters required')).toBeTruthy();
  });

  test('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<MessageSearchPanel {...defaultProps({ onClose })} />);
    await user.click(screen.getByLabelText('Close search'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
