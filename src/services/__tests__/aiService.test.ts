/**
 * Unit Tests for AI Service
 * @file src/services/__tests__/aiService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keep fetch mock for streaming tests (streamChat uses raw fetch)
const fetchCtx = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});

vi.mock('@/utils/apiHelpers', () => ({
  getApiUrl: (path: string) => `http://localhost:3001${path}`,
  getAuthToken: () => 'mock-token',
}));

// Mock apiService for non-streaming methods
vi.mock('@/services/apiService', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    makeRequest: vi.fn(),
  },
}));

// Keep global fetch stub for streaming (streamChat uses raw fetch)
vi.stubGlobal('fetch', fetchCtx.mockFetch);

import { apiService } from '@/services/apiService';

import {
  chat,
  streamChat,
  getConversations,
  getConversation,
  deleteConversation,
  reviewDesign,
  generateCode,
  checkHealth,
  clearCsrfToken,
} from '../aiService';

function mockFetchError(message: string, status = 500) {
  fetchCtx.mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
    headers: new Headers({ 'content-type': 'application/json' }),
  });
}

describe('aiService', () => {
  beforeEach(() => {
    fetchCtx.mockFetch.mockReset();
    vi.mocked(apiService.get).mockReset();
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.delete).mockReset();
    clearCsrfToken();
  });

  // Helper: mock CSRF token fetch via apiService (needed for streamChat)
  function mockCsrf() {
    vi.mocked(apiService.get).mockResolvedValueOnce({
      success: true,
      data: { csrfToken: 'csrf-123' },
    });
  }

  describe('clearCsrfToken', () => {
    it('should clear the cached CSRF token', () => {
      clearCsrfToken();
      // No error thrown
      expect(true).toBe(true);
    });
  });

  describe('chat', () => {
    it('should send a message and return content', async () => {
      vi.mocked(apiService.post).mockResolvedValueOnce({
        success: true,
        data: { content: 'Hello!', tokensUsed: 42 },
      });

      const result = await chat('Hi');
      expect(result).toEqual({ content: 'Hello!', tokensUsed: 42 });
    });

    it('should include context when provided', async () => {
      vi.mocked(apiService.post).mockResolvedValueOnce({
        success: true,
        data: { content: 'resp', tokensUsed: 10 },
      });

      await chat('Hi', { project: { id: 'p1', name: 'Test' } });

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/ai/chat/sync',
        expect.objectContaining({
          context: { project: { id: 'p1', name: 'Test' } },
        })
      );
    });

    it('should throw on HTTP error', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Rate limited'));

      await expect(chat('Hi')).rejects.toThrow('Rate limited');
    });

    it('should throw with fallback message when error', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Request failed'));

      await expect(chat('Hi')).rejects.toThrow('Request failed');
    });
  });

  describe('getConversations', () => {
    it('should return list of conversations', async () => {
      const convos = [{ id: 'c1', title: 'Test' }];
      vi.mocked(apiService.get).mockResolvedValueOnce({
        success: true,
        data: { conversations: convos },
      });

      const result = await getConversations();
      expect(result).toEqual(convos);
    });

    it('should return empty array when no conversations field', async () => {
      vi.mocked(apiService.get).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const result = await getConversations();
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      vi.mocked(apiService.get).mockRejectedValueOnce(new Error('Failed to fetch conversations'));

      await expect(getConversations()).rejects.toThrow('Failed to fetch conversations');
    });
  });

  describe('getConversation', () => {
    it('should return a specific conversation', async () => {
      const convo = { id: 'c1', messages: [], createdAt: '2025-01-01' };
      vi.mocked(apiService.get).mockResolvedValueOnce({
        success: true,
        data: { conversation: convo },
      });

      const result = await getConversation('c1');
      expect(result).toEqual(convo);
    });

    it('should throw on error', async () => {
      vi.mocked(apiService.get).mockRejectedValueOnce(new Error('Failed to fetch conversation'));

      await expect(getConversation('invalid')).rejects.toThrow('Failed to fetch conversation');
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      vi.mocked(apiService.delete).mockResolvedValueOnce({
        success: true,
        data: {},
      });

      await expect(deleteConversation('c1')).resolves.toBeUndefined();
    });

    it('should throw on error', async () => {
      vi.mocked(apiService.delete).mockRejectedValueOnce(new Error('Failed to delete conversation'));

      await expect(deleteConversation('c1')).rejects.toThrow('Failed to delete conversation');
    });
  });

  describe('reviewDesign', () => {
    it('should return design feedback', async () => {
      const feedback = { feedback: 'Looks great', aspects: ['usability'] };
      vi.mocked(apiService.post).mockResolvedValueOnce({
        success: true,
        data: feedback,
      });

      const result = await reviewDesign({ description: 'A landing page' });
      expect(result).toEqual(feedback);
    });

    it('should throw on error', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Analysis failed'));

      await expect(reviewDesign({ description: 'test' })).rejects.toThrow('Analysis failed');
    });
  });

  describe('generateCode', () => {
    it('should return generated code', async () => {
      const codeResult = { code: '<Button />', componentType: 'button', style: 'modern' };
      vi.mocked(apiService.post).mockResolvedValueOnce({
        success: true,
        data: codeResult,
      });

      const result = await generateCode({ description: 'A button' });
      expect(result).toEqual(codeResult);
    });

    it('should throw on error', async () => {
      vi.mocked(apiService.post).mockRejectedValueOnce(new Error('Generation failed'));

      await expect(generateCode({ description: 'test' })).rejects.toThrow('Generation failed');
    });
  });

  describe('checkHealth', () => {
    it('should return health status', async () => {
      vi.mocked(apiService.get).mockResolvedValueOnce({
        success: true,
        data: { status: 'healthy', hasApiKey: true },
      });

      const result = await checkHealth();
      expect(result).toEqual({ status: 'healthy', hasApiKey: true });
    });

    it('should return unhealthy on error', async () => {
      vi.mocked(apiService.get).mockRejectedValueOnce(new Error('Down'));

      const result = await checkHealth();
      expect(result).toEqual({ status: 'unhealthy', hasApiKey: false });
    });
  });

  describe('streamChat', () => {
    it('should call onError when fetch fails', async () => {
      mockCsrf();
      fetchCtx.mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onError = vi.fn();
      await expect(streamChat('Hi', {}, { onError })).rejects.toThrow('Network error');
      expect(onError).toHaveBeenCalledWith('Network error');
    });

    it('should call onError when response is not ok', async () => {
      mockCsrf();
      mockFetchError('Bad request', 400);

      const onError = vi.fn();
      await expect(streamChat('Hi', {}, { onError })).rejects.toThrow('Bad request');
      expect(onError).toHaveBeenCalledWith('Bad request');
    });

    it('should throw when no response body', async () => {
      mockCsrf();
      fetchCtx.mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: null,
        headers: new Headers(),
      });

      const onError = vi.fn();
      await expect(streamChat('Hi', {}, { onError })).rejects.toThrow('No response body');
    });

    it('should parse SSE events and call callbacks', async () => {
      mockCsrf();

      const chunks = [
        'data: {"type":"start","conversationId":"c1"}\n\n',
        'data: {"type":"chunk","content":"Hello"}\n\n',
        'data: {"type":"done","conversationId":"c1","tokensUsed":10}\n\n',
      ];

      let readIndex = 0;
      const encoder = new TextEncoder();
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          if (readIndex < chunks.length) {
            return Promise.resolve({ done: false, value: encoder.encode(chunks[readIndex++]) });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
      };

      fetchCtx.mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { getReader: () => mockReader },
        headers: new Headers(),
      });

      const onStart = vi.fn();
      const onChunk = vi.fn();
      const onDone = vi.fn();

      await streamChat('Hi', {}, { onStart, onChunk, onDone });

      expect(onStart).toHaveBeenCalledWith('c1');
      expect(onChunk).toHaveBeenCalledWith('Hello');
      expect(onDone).toHaveBeenCalledWith('c1', 10);
    });
  });

  describe('CSRF token caching for streaming', () => {
    it('should reuse cached CSRF token for subsequent streaming requests', async () => {
      // First streaming call: fetches CSRF via apiService, then raw fetch for stream
      mockCsrf();
      fetchCtx.mockFetch.mockRejectedValueOnce(new Error('stream1'));
      try { await streamChat('first'); } catch { /* expected */ }

      // Second streaming call: should NOT fetch CSRF again (cached)
      fetchCtx.mockFetch.mockRejectedValueOnce(new Error('stream2'));
      try { await streamChat('second'); } catch { /* expected */ }

      // apiService.get should have been called only once for CSRF
      expect(apiService.get).toHaveBeenCalledTimes(1);
      // raw fetch should have been called twice (once per streamChat)
      expect(fetchCtx.mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
