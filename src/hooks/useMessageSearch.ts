/**
 * useMessageSearch Hook - Flux Studio
 *
 * Custom hook for searching messages with debounced queries via TanStack Query.
 * Supports both scoped (single conversation) and global (all conversations) search.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { queryKeys } from '../lib/queryClient';

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
  conversationId?: string | null;
  debounceDelay?: number;
  limit?: number;
  minQueryLength?: number;
}

export interface UseMessageSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;
  results: MessageSearchResult[];
  isLoading: boolean;
  error: string | null;
  clearSearch: () => void;
  resultCount: number;
  isSearchActive: boolean;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// SEARCH FUNCTION
// ============================================================================

async function searchMessages(
  query: string,
  conversationId: string | null | undefined,
  limit: number,
  offset: number
): Promise<{ results: MessageSearchResult[]; hasMore: boolean }> {
  const params: Record<string, string> = {
    q: query.trim(),
    limit: String(limit),
    offset: String(offset),
  };

  if (conversationId) params.conversationId = conversationId;

  const result = await apiService.get<{ results: MessageSearchResult[]; success?: boolean; error?: string }>('/messages/search', { params });
  const data = result.data;
  if (data && 'success' in data && !data.success) throw new Error(data.error || 'Search failed');

  const results = data?.results || [];
  return { results, hasMore: results.length >= limit };
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
  const [additionalResults, setAdditionalResults] = useState<MessageSearchResult[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(false);

  const debouncedQuery = useDebounce(query, debounceDelay);
  const shouldSearch = debouncedQuery.trim().length >= minQueryLength;

  // Reset pagination when query or conversation changes
  useEffect(() => {
    setOffset(0);
    setAdditionalResults([]);
    setHasMorePages(false);
  }, [debouncedQuery, conversationId]);

  const {
    data: searchData,
    isLoading,
    error: queryError,
  } = useQuery<{ results: MessageSearchResult[]; hasMore: boolean }, Error>({
    queryKey: queryKeys.messageSearch.search(debouncedQuery, conversationId),
    queryFn: () => searchMessages(debouncedQuery, conversationId, limit, 0),
    enabled: shouldSearch,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Track hasMore from the query data
  useEffect(() => {
    if (searchData) setHasMorePages(searchData.hasMore);
  }, [searchData]);

  const results = useMemo(() => {
    if (!searchData?.results) return [];
    return [...searchData.results, ...additionalResults];
  }, [searchData, additionalResults]);

  const loadMore = useCallback(async () => {
    if (!shouldSearch || isLoading || !hasMorePages) return;

    const newOffset = offset + limit;
    try {
      const data = await searchMessages(debouncedQuery, conversationId, limit, newOffset);
      setAdditionalResults(prev => [...prev, ...data.results]);
      setOffset(newOffset);
      setHasMorePages(data.hasMore);
    } catch {
      // silently fail load more
    }
  }, [shouldSearch, isLoading, hasMorePages, offset, limit, debouncedQuery, conversationId]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setAdditionalResults([]);
    setOffset(0);
    setHasMorePages(false);
  }, []);

  const isSearchActive = useMemo(() => query.trim().length >= minQueryLength, [query, minQueryLength]);

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    isLoading,
    error: queryError?.message ?? null,
    clearSearch,
    resultCount: results.length,
    isSearchActive,
    loadMore,
    hasMore: hasMorePages,
  };
}

export default useMessageSearch;
