/**
 * Unit Tests for AI Search Service
 * @file src/services/__tests__/aiSearchService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isNaturalLanguageQuery, interpretQuery, generateSearchSummary } from '../aiSearchService';

// Mock dependencies
vi.mock('@/utils/apiHelpers', () => ({
  getApiUrl: (path: string) => `http://localhost:3001${path}`,
  getAuthToken: () => 'mock-token',
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn().mockResolvedValue({ success: true, data: { csrfToken: 'mock-csrf' } }),
    post: vi.fn(),
  },
}));

describe('aiSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isNaturalLanguageQuery', () => {
    it('should return false for single keywords', () => {
      expect(isNaturalLanguageQuery('dashboard')).toBe(false);
    });

    it('should return false for two-word keywords', () => {
      expect(isNaturalLanguageQuery('user profile')).toBe(false);
    });

    it('should detect "what" queries', () => {
      expect(isNaturalLanguageQuery('what files were changed yesterday')).toBe(true);
    });

    it('should detect "where" queries', () => {
      expect(isNaturalLanguageQuery('where is the login component')).toBe(true);
    });

    it('should detect "find" queries', () => {
      expect(isNaturalLanguageQuery('find all messages from John')).toBe(true);
    });

    it('should detect "show" queries', () => {
      expect(isNaturalLanguageQuery('show me recent projects')).toBe(true);
    });

    it('should detect queries with temporal references', () => {
      expect(isNaturalLanguageQuery('tasks updated this week please')).toBe(true);
    });

    it('should detect queries ending with question mark', () => {
      expect(isNaturalLanguageQuery('has the dashboard been updated?')).toBe(true);
    });

    it('should detect queries with relational keywords', () => {
      expect(isNaturalLanguageQuery('projects related to design system')).toBe(true);
    });

    it('should return false for empty or whitespace-only input', () => {
      expect(isNaturalLanguageQuery('')).toBe(false);
      expect(isNaturalLanguageQuery('   ')).toBe(false);
    });
  });

  describe('interpretQuery', () => {
    it('should call the interpret API endpoint', async () => {
      const { apiService } = await import('@/services/apiService');
      const mockResult = {
        success: true,
        data: {
          originalQuery: 'recent messages',
          interpretedQuery: {
            keywords: ['messages'],
            filters: { dateRange: { start: '2026-03-01', end: '2026-03-08' } },
            intent: 'search_messages',
          },
          confidence: 0.9,
        },
      };
      vi.mocked(apiService.post).mockResolvedValueOnce(mockResult);

      const result = await interpretQuery('recent messages');

      expect(apiService.post).toHaveBeenCalledWith('/api/search/ai/interpret', { query: 'recent messages' });
      expect(result.originalQuery).toBe('recent messages');
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('generateSearchSummary', () => {
    it('should yield chunks from SSE stream', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"chunk","content":"Hello"}\n'));
          controller.enqueue(encoder.encode('data: {"type":"chunk","content":" world"}\n'));
          controller.enqueue(encoder.encode('data: {"type":"done"}\n'));
          controller.close();
        },
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }));

      const chunks: string[] = [];
      for await (const chunk of generateSearchSummary([], 'test query')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world']);
    });

    it('should throw on non-OK response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      }));

      const gen = generateSearchSummary([], 'test');
      await expect(gen.next()).rejects.toThrow('Internal error');
    });

    it('should throw on stream error event', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"error","error":"AI unavailable"}\n'));
          controller.close();
        },
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      }));

      const gen = generateSearchSummary([], 'test');
      await expect(gen.next()).rejects.toThrow('AI unavailable');
    });
  });
});
