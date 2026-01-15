/**
 * useSearch Hook - Flux Studio
 *
 * Unified search hook that aggregates search across projects, files, tasks, and messages.
 * Provides debounced search, filtering, pagination, and search history.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  searchService,
  SearchResult,
  SearchResultType,
  SearchFilters,
  SearchResponse,
  SavedSearch,
} from '../services/searchService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseSearchOptions {
  /** Enable URL state synchronization */
  syncWithURL?: boolean;
  /** Debounce delay in ms (default: 300) */
  debounceDelay?: number;
  /** Results per page (default: 20) */
  pageSize?: number;
  /** Minimum query length to trigger search (default: 2) */
  minQueryLength?: number;
  /** Initial filters */
  initialFilters?: Partial<SearchFilters>;
  /** Auto-focus search input */
  autoFocus?: boolean;
}

export interface UseSearchReturn {
  // Query state
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;

  // Results
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  facets: SearchResponse['facets'] | null;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Filters
  filters: Partial<SearchFilters>;
  setFilters: (filters: Partial<SearchFilters>) => void;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  toggleTypeFilter: (type: SearchResultType) => void;

  // Pagination
  page: number;
  setPage: (page: number) => void;
  loadMore: () => Promise<void>;

  // Sorting
  sortBy: 'relevance' | 'date' | 'title';
  sortOrder: 'asc' | 'desc';
  setSortBy: (sortBy: 'relevance' | 'date' | 'title') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Search history
  searchHistory: string[];
  clearSearchHistory: () => void;
  removeFromHistory: (query: string) => void;

  // Saved searches
  savedSearches: SavedSearch[];
  saveCurrentSearch: (name: string) => SavedSearch | null;
  deleteSavedSearch: (id: string) => void;
  loadSavedSearch: (search: SavedSearch) => void;

  // Actions
  clearSearch: () => void;
  refreshSearch: () => void;
  navigateToResult: (result: SearchResult) => void;

  // Computed
  isSearchActive: boolean;
  activeFilterCount: number;
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// URL HELPERS
// ============================================================================

function parseFiltersFromURL(searchParams: URLSearchParams): Partial<SearchFilters> {
  const filters: Partial<SearchFilters> = {};

  const types = searchParams.getAll('type') as SearchResultType[];
  if (types.length > 0) filters.types = types;

  const projectIds = searchParams.getAll('project');
  if (projectIds.length > 0) filters.projectIds = projectIds;

  const startDate = searchParams.get('from');
  const endDate = searchParams.get('to');
  if (startDate || endDate) {
    filters.dateRange = { start: startDate, end: endDate };
  }

  const status = searchParams.getAll('status');
  if (status.length > 0) filters.status = status;

  const priority = searchParams.getAll('priority');
  if (priority.length > 0) filters.priority = priority;

  return filters;
}

function serializeFiltersToURL(
  query: string,
  filters: Partial<SearchFilters>,
  sortBy: string,
  page: number
): URLSearchParams {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  if (sortBy !== 'relevance') params.set('sort', sortBy);
  if (page > 1) params.set('page', String(page));

  filters.types?.forEach(t => params.append('type', t));
  filters.projectIds?.forEach(p => params.append('project', p));
  if (filters.dateRange?.start) params.set('from', filters.dateRange.start);
  if (filters.dateRange?.end) params.set('to', filters.dateRange.end);
  filters.status?.forEach(s => params.append('status', s));
  filters.priority?.forEach(p => params.append('priority', p));

  return params;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    syncWithURL = true,
    debounceDelay = 300,
    pageSize = 20,
    minQueryLength = 2,
    initialFilters = {},
  } = options;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [facets, setFacets] = useState<SearchResponse['facets'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') || '1', 10));
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>(() =>
    (searchParams.get('sort') as 'relevance' | 'date' | 'title') || 'relevance'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Partial<SearchFilters>>(() => {
    if (syncWithURL) {
      return { ...initialFilters, ...parseFiltersFromURL(searchParams) };
    }
    return initialFilters;
  });

  // Search history and saved searches
  const [searchHistory, setSearchHistory] = useState<string[]>(() =>
    searchService.getSearchHistory()
  );
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() =>
    searchService.getSavedSearches()
  );

  // Debounced query
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Sync to URL
  useEffect(() => {
    if (syncWithURL) {
      const params = serializeFiltersToURL(query, filters, sortBy, page);
      setSearchParams(params, { replace: true });
    }
  }, [query, filters, sortBy, page, syncWithURL, setSearchParams]);

  // Perform search when debounced query or filters change
  useEffect(() => {
    const performSearch = async () => {
      // Skip if query too short
      if (!debouncedQuery || debouncedQuery.trim().length < minQueryLength) {
        setResults([]);
        setTotal(0);
        setHasMore(false);
        setFacets(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchService.search({
          query: debouncedQuery,
          filters,
          limit: pageSize,
          offset: (page - 1) * pageSize,
          sortBy,
          sortOrder,
        });

        setResults(response.results);
        setTotal(response.total);
        setHasMore(response.hasMore);
        setFacets(response.facets);

        // Update search history
        setSearchHistory(searchService.getSearchHistory());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        setResults([]);
        setTotal(0);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, filters, page, pageSize, sortBy, sortOrder, minQueryLength]);

  // Reset page when query or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filters, sortBy]);

  // Update specific filter
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Toggle type filter
  const toggleTypeFilter = useCallback((type: SearchResultType) => {
    setFilters(prev => {
      const currentTypes = prev.types || [];
      const exists = currentTypes.includes(type);

      return {
        ...prev,
        types: exists
          ? currentTypes.filter(t => t !== type)
          : [...currentTypes, type],
      };
    });
  }, []);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    setPage(prev => prev + 1);
  }, [hasMore, isLoading]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setHasMore(false);
    setFacets(null);
    setError(null);
    setPage(1);
    setFilters({});
  }, []);

  // Refresh search
  const refreshSearch = useCallback(() => {
    // Force re-run by updating a timestamp or similar
    setFilters(prev => ({ ...prev }));
  }, []);

  // Navigate to result
  const navigateToResult = useCallback((result: SearchResult) => {
    navigate(result.url);
  }, [navigate]);

  // Search history management
  const clearSearchHistory = useCallback(() => {
    searchService.clearSearchHistory();
    setSearchHistory([]);
  }, []);

  const removeFromHistory = useCallback((q: string) => {
    searchService.removeFromHistory(q);
    setSearchHistory(searchService.getSearchHistory());
  }, []);

  // Saved searches management
  const saveCurrentSearch = useCallback((name: string): SavedSearch | null => {
    if (!query.trim()) return null;

    const saved = searchService.saveSearch(name, query, filters);
    setSavedSearches(searchService.getSavedSearches());
    return saved;
  }, [query, filters]);

  const deleteSavedSearch = useCallback((id: string) => {
    searchService.deleteSavedSearch(id);
    setSavedSearches(searchService.getSavedSearches());
  }, []);

  const loadSavedSearch = useCallback((search: SavedSearch) => {
    setQuery(search.query);
    setFilters(search.filters);
    searchService.markSavedSearchUsed(search.id);
  }, []);

  // Computed values
  const isSearchActive = useMemo(() => query.trim().length >= minQueryLength, [query, minQueryLength]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types?.length) count += filters.types.length;
    if (filters.projectIds?.length) count += filters.projectIds.length;
    if (filters.dateRange?.start || filters.dateRange?.end) count += 1;
    if (filters.status?.length) count += filters.status.length;
    if (filters.priority?.length) count += filters.priority.length;
    if (filters.createdBy?.length) count += filters.createdBy.length;
    return count;
  }, [filters]);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    total,
    hasMore,
    facets,
    isLoading,
    error,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    toggleTypeFilter,
    page,
    setPage,
    loadMore,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    searchHistory,
    clearSearchHistory,
    removeFromHistory,
    savedSearches,
    saveCurrentSearch,
    deleteSavedSearch,
    loadSavedSearch,
    clearSearch,
    refreshSearch,
    navigateToResult,
    isSearchActive,
    activeFilterCount,
  };
}

export default useSearch;
