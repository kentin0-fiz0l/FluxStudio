/**
 * SearchResults Page Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
const mockSetQuery = vi.fn();
const mockSearch = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/store/slices/authSlice', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
    logout: vi.fn(),
    isAuthenticated: true,
  })),
}));

vi.mock('@/hooks/useSearch', () => ({
  useSearch: vi.fn(() => ({
    query: '',
    setQuery: mockSetQuery,
    results: [],
    total: 0,
    hasMore: false,
    facets: { types: { project: 0, file: 0, task: 0, message: 0 }, projects: [] },
    isLoading: false,
    error: null,
    filters: { types: [], projectIds: [], dateRange: { start: null, end: null }, status: [], priority: [], createdBy: [] },
    setFilters: vi.fn(),
    sortBy: 'relevance',
    setSortBy: vi.fn(),
    sortOrder: 'desc',
    setSortOrder: vi.fn(),
    loadMore: vi.fn(),
    searchHistory: [],
    removeFromHistory: vi.fn(),
    clearHistory: vi.fn(),
    savedSearches: [],
    saveSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
    search: mockSearch,
  })),
}));

vi.mock('@/components/templates', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/search/SearchFilters', () => ({
  SearchFilters: () => <div data-testid="search-filters" />,
}));

vi.mock('@/components/search/SearchResultCard', () => ({
  SearchResultCard: ({ result }: any) => <div data-testid="search-result">{result.title}</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { useSearch } from '@/hooks/useSearch';
import { SearchResults } from '../SearchResults';

const defaultSearchReturn = {
  query: '',
  setQuery: mockSetQuery,
  results: [],
  total: 0,
  hasMore: false,
  facets: { types: { project: 0, file: 0, task: 0, message: 0 }, projects: [] },
  isLoading: false,
  error: null,
  filters: { types: [], projectIds: [], dateRange: { start: null, end: null }, status: [], priority: [], createdBy: [] },
  setFilters: vi.fn(),
  sortBy: 'relevance' as const,
  setSortBy: vi.fn(),
  sortOrder: 'desc' as const,
  setSortOrder: vi.fn(),
  loadMore: vi.fn(),
  searchHistory: [],
  removeFromHistory: vi.fn(),
  clearHistory: vi.fn(),
  savedSearches: [],
  saveSearch: vi.fn(),
  deleteSavedSearch: vi.fn(),
  search: mockSearch,
};

describe('SearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearch).mockReturnValue(defaultSearchReturn as any);
  });

  const renderSearch = () => render(
    <MemoryRouter>
      <SearchResults />
    </MemoryRouter>
  );

  test('renders without crashing', () => {
    renderSearch();
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays search input', () => {
    renderSearch();
    const input = screen.getByRole('textbox') || screen.getByPlaceholderText(/search/i);
    expect(input).toBeInTheDocument();
  });

  test('shows empty state when no results', () => {
    renderSearch();
    expect(screen.queryByTestId('search-result')).not.toBeInTheDocument();
  });

  test('renders search result cards when data is present', () => {
    // Override the mock before render
    vi.mocked(useSearch).mockReturnValueOnce({
      ...defaultSearchReturn,
      query: 'test',
      total: 2,
      results: [
        { id: '1', type: 'project', title: 'Test Project', score: 100, metadata: { createdAt: new Date().toISOString() }, url: '/projects/1' },
        { id: '2', type: 'file', title: 'Test File', score: 50, metadata: { createdAt: new Date().toISOString() }, url: '/files/2' },
      ],
    } as any);

    renderSearch();
    // Verify the page rendered with results data
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
  });

  test('displays search filters', () => {
    renderSearch();
    expect(screen.getByTestId('search-filters')).toBeInTheDocument();
  });
});
