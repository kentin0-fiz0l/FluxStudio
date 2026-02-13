/**
 * Unit Tests for useMessageSearch hook
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../test/utils';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockResults = [
  {
    id: 'msg-1',
    userId: 'user-1',
    conversationId: 'conv-1',
    text: 'Hello world',
    isSystemMessage: false,
    createdAt: '2025-01-15T10:00:00Z',
    userName: 'Test User',
  },
  {
    id: 'msg-2',
    userId: 'user-2',
    conversationId: 'conv-1',
    text: 'Hello there',
    isSystemMessage: false,
    createdAt: '2025-01-15T11:00:00Z',
    userName: 'Other User',
  },
];

describe('useMessageSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty state', async () => {
    const { useMessageSearch } = await import('../useMessageSearch');
    const { result } = renderHook(() => useMessageSearch(), { wrapper: createWrapper() });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSearchActive).toBe(false);
  });

  it('should update query without immediate search', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useMessageSearch } = await import('../useMessageSearch');
    const { result } = renderHook(() => useMessageSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.setQuery('he');
    });

    expect(result.current.query).toBe('he');
    // Should not fetch yet (debounce)
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should search after debounce', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, results: mockResults }),
    }));

    const { useMessageSearch } = await import('../useMessageSearch');
    const { result } = renderHook(() => useMessageSearch({ debounceDelay: 100 }), { wrapper: createWrapper() });

    act(() => {
      result.current.setQuery('Hello');
    });

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Switch to real timers for waitFor to work
    vi.useRealTimers();

    await waitFor(() => expect(result.current.results).toHaveLength(2));
    expect(result.current.resultCount).toBe(2);
    expect(result.current.isSearchActive).toBe(true);
  });

  it('should not search if query is too short', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { useMessageSearch } = await import('../useMessageSearch');
    const { result } = renderHook(() => useMessageSearch({ debounceDelay: 50 }), { wrapper: createWrapper() });

    act(() => {
      result.current.setQuery('a');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it('should handle search error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Search failed' }),
    }));

    const { useMessageSearch } = await import('../useMessageSearch');
    const { result } = renderHook(() => useMessageSearch({ debounceDelay: 50 }), { wrapper: createWrapper() });

    act(() => {
      result.current.setQuery('Hello world');
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Switch to real timers for waitFor to work
    vi.useRealTimers();

    await waitFor(() => expect(result.current.error).toBe('Search failed'));
    expect(result.current.results).toEqual([]);
  });

  it('should clear search', async () => {
    const { useMessageSearch } = await import('../useMessageSearch');
    const { result } = renderHook(() => useMessageSearch(), { wrapper: createWrapper() });

    act(() => {
      result.current.setQuery('test');
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should scope search to conversation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, results: mockResults }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { useMessageSearch } = await import('../useMessageSearch');
    renderHook(() => useMessageSearch({
      conversationId: 'conv-1',
      debounceDelay: 50,
    }), { wrapper: createWrapper() });

    // The hook doesn't search until query is set - this just verifies initialization
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
