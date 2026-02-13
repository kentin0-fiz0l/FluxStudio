/**
 * Unit Tests for useSearch hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/searchService', () => ({
  searchService: {
    search: vi.fn(),
    getSearchHistory: vi.fn(() => []),
    getSavedSearches: vi.fn(() => []),
    clearSearchHistory: vi.fn(),
    removeFromHistory: vi.fn(),
    saveSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
    markSavedSearchUsed: vi.fn(),
  },
}));

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, null, children);
  };
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty state', async () => {
    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSearchActive).toBe(false);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('should update query', async () => {
    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.setQuery('test query');
    });

    expect(result.current.query).toBe('test query');
  });

  it('should search after debounce', async () => {
    const { searchService } = await import('../../services/searchService');
    (searchService.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [{ id: 'r-1', title: 'Test Result', url: '/test', type: 'task' }],
      total: 1,
      hasMore: false,
      facets: null,
    });

    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false, debounceDelay: 100 }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.setQuery('test search');
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Wait for async search
    await vi.waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });
  });

  it('should not search if query is too short', async () => {
    const { searchService } = await import('../../services/searchService');

    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false, debounceDelay: 50 }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.setQuery('a');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(searchService.search).not.toHaveBeenCalled();
  });

  it('should update filters', async () => {
    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('types', ['task', 'file'] as any);
    });

    expect(result.current.filters.types).toEqual(['task', 'file']);
    expect(result.current.activeFilterCount).toBe(2);
  });

  it('should clear filters', async () => {
    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateFilter('types', ['task'] as any);
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.activeFilterCount).toBe(0);
  });

  it('should toggle type filter', async () => {
    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.toggleTypeFilter('task' as any);
    });

    expect(result.current.filters.types).toContain('task');

    act(() => {
      result.current.toggleTypeFilter('task' as any);
    });

    expect(result.current.filters.types).not.toContain('task');
  });

  it('should clear search', async () => {
    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.setQuery('test');
      result.current.updateFilter('types', ['task'] as any);
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('should update sort', async () => {
    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.setSortBy('date');
    });

    expect(result.current.sortBy).toBe('date');

    act(() => {
      result.current.setSortOrder('asc');
    });

    expect(result.current.sortOrder).toBe('asc');
  });

  it('should manage search history', async () => {
    const { searchService } = await import('../../services/searchService');

    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.clearSearchHistory();
    });

    expect(searchService.clearSearchHistory).toHaveBeenCalled();

    act(() => {
      result.current.removeFromHistory('old query');
    });

    expect(searchService.removeFromHistory).toHaveBeenCalledWith('old query');
  });

  it('should save and load searches', async () => {
    const { searchService } = await import('../../services/searchService');
    const savedSearch = { id: 'saved-1', name: 'My Search', query: 'test', filters: {} };
    (searchService.saveSearch as ReturnType<typeof vi.fn>).mockReturnValue(savedSearch);
    (searchService.getSavedSearches as ReturnType<typeof vi.fn>).mockReturnValue([savedSearch]);

    const { useSearch } = await import('../useSearch');
    const { result } = renderHook(
      () => useSearch({ syncWithURL: false }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.setQuery('test');
    });

    act(() => {
      result.current.saveCurrentSearch('My Search');
    });

    expect(searchService.saveSearch).toHaveBeenCalledWith('My Search', 'test', {});
  });
});
