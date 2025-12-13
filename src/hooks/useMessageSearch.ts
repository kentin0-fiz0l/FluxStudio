/**
 * useMessageSearch Hook - Flux Studio
 *
 * Custom hook for searching messages with debounced API calls.
 * Supports both scoped (single conversation) and global (all conversations) search.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MessageSearchResult {
  id: string;
  userId: string;
  conversationId: string;
  text: string;
  assetId?: string;
  replyToMessageId?: string;
  projectId?: string;
  isSystemMessage: boolean;
  createdAt: string;
  editedAt?: string;
  originalMessageId?: string;
  userName?: string;
  userAvatar?: string;
  conversationName?: string;
  conversationIsGroup?: boolean;
}

export interface UseMessageSearchOptions {
  /** Optional conversation ID to scope search */
  conversationId?: string | null;
  /** Debounce delay in ms (default: 300) */
  debounceDelay?: number;
  /** Maximum results to fetch (default: 50) */
  limit?: number;
  /** Minimum query length to trigger search (default: 2) */
  minQueryLength?: number;
}

export interface UseMessageSearchReturn {
  /** Current search query */
  query: string;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Debounced query that triggers API calls */
  debouncedQuery: string;
  /** Search results */
  results: MessageSearchResult[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Clear search query and results */
  clearSearch: () => void;
  /** Number of results */
  resultCount: number;
  /** Whether search is active (has query) */
  isSearchActive: boolean;
  /** Load more results (pagination) */
  loadMore: () => Promise<void>;
  /** Whether there are more results to load */
  hasMore: boolean;
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
// MAIN HOOK
// ============================================================================

export function useMessageSearch(options: UseMessageSearchOptions = {}): UseMessageSearchReturn {
  const {
    conversationId = null,
    debounceDelay = 300,
    limit = 50,
    minQueryLength = 2,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Debounce the query
  const debouncedQuery = useDebounce(query, debounceDelay);

  // Reset offset when query or conversationId changes
  useEffect(() => {
    setOffset(0);
    setResults([]);
    setHasMore(false);
  }, [debouncedQuery, conversationId]);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      // Don't search if query is too short
      if (!debouncedQuery || debouncedQuery.trim().length < minQueryLength) {
        setResults([]);
        setError(null);
        setHasMore(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        // Build query params
        const params = new URLSearchParams({
          q: debouncedQuery.trim(),
          limit: String(limit),
          offset: '0',
        });

        if (conversationId) {
          params.set('conversationId', conversationId);
        }

        const response = await fetch(`/api/messages/search?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Search failed');
        }

        const data = await response.json();

        if (data.success) {
          setResults(data.results || []);
          setHasMore((data.results || []).length >= limit);
        } else {
          throw new Error(data.error || 'Search failed');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, conversationId, limit, minQueryLength]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.trim().length < minQueryLength || isLoading || !hasMore) {
      return;
    }

    const newOffset = offset + limit;
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const params = new URLSearchParams({
        q: debouncedQuery.trim(),
        limit: String(limit),
        offset: String(newOffset),
      });

      if (conversationId) {
        params.set('conversationId', conversationId);
      }

      const response = await fetch(`/api/messages/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Load more failed');
      }

      const data = await response.json();

      if (data.success) {
        const newResults = data.results || [];
        setResults(prev => [...prev, ...newResults]);
        setOffset(newOffset);
        setHasMore(newResults.length >= limit);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Load more failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, conversationId, limit, minQueryLength, offset, isLoading, hasMore]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setOffset(0);
    setHasMore(false);
  }, []);

  // Computed values
  const isSearchActive = useMemo(() => query.trim().length >= minQueryLength, [query, minQueryLength]);
  const resultCount = results.length;

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    isLoading,
    error,
    clearSearch,
    resultCount,
    isSearchActive,
    loadMore,
    hasMore,
  };
}

export default useMessageSearch;
