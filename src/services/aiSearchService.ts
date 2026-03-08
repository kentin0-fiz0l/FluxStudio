/**
 * AI Search Service - Frontend API for AI-Powered Search
 *
 * Interprets natural language queries via Claude and generates
 * AI summaries of search results. Feature-flagged behind 'ai_search'.
 */

import { getApiUrl, getAuthToken } from '@/utils/apiHelpers';
import { apiService } from '@/services/apiService';
import type { SearchResult } from '@/services/searchService';

// ============================================================================
// CSRF Token (reuse pattern from aiService.ts)
// ============================================================================

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (csrfTokenPromise) return csrfTokenPromise;

  csrfTokenPromise = (async () => {
    try {
      const result = await apiService.get<{ csrfToken: string }>('/api/csrf-token');
      csrfToken = result.data?.csrfToken ?? null;
      return csrfToken!;
    } finally {
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

async function getHeadersWithCsrf(): Promise<Record<string, string>> {
  const token = getAuthToken();
  const csrf = await fetchCsrfToken();
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrf,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface AISearchQuery {
  originalQuery: string;
  interpretedQuery: {
    keywords: string[];
    filters: {
      type?: ('project' | 'file' | 'task' | 'message')[];
      dateRange?: { start: string; end: string };
      project?: string;
      author?: string;
    };
    intent: string;
  };
  confidence: number;
}

export interface StreamCallbacks {
  onChunk?: (chunk: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

// ============================================================================
// NATURAL LANGUAGE DETECTION
// ============================================================================

const NL_INDICATORS = [
  /^(what|where|who|when|which|how|why|find|show|list|get|search for)\b/i,
  /\b(from|about|related to|created by|in the|during|last|recent|before|after|between)\b/i,
  /\b(yesterday|today|this week|this month|last week|last month)\b/i,
  /\?$/,
];

/**
 * Detect whether a query looks like natural language vs simple keywords.
 */
export function isNaturalLanguageQuery(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.split(/\s+/).length <= 2) return false;
  return NL_INDICATORS.some((pattern) => pattern.test(trimmed));
}

// ============================================================================
// AI SEARCH FUNCTIONS
// ============================================================================

/**
 * Interpret a natural language query into structured search parameters.
 */
export async function interpretQuery(query: string): Promise<AISearchQuery> {
  const result = await apiService.post<AISearchQuery>('/api/search/ai/interpret', { query });
  return result.data!;
}

/**
 * Stream an AI-generated summary of search results via SSE.
 */
export async function* generateSearchSummary(
  results: SearchResult[],
  query: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const url = getApiUrl('/api/search/ai/summarize');
  const headers = await getHeadersWithCsrf();
  headers['Accept'] = 'text/event-stream';

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ results, query }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'chunk' && data.content) {
            yield data.content;
          } else if (data.type === 'error') {
            throw new Error(data.error);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const aiSearchService = {
  interpretQuery,
  generateSearchSummary,
  isNaturalLanguageQuery,
};

export default aiSearchService;
