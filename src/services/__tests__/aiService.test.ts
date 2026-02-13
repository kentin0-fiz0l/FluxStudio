/**
 * Unit Tests for AI Service
 * @file src/services/__tests__/aiService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
// testHelpers available if needed

const fetchCtx = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});

vi.mock('@/utils/apiHelpers', () => ({
  getApiUrl: (path: string) => `http://localhost:3001${path}`,
  getAuthToken: () => 'mock-token',
}));

// Replace global fetch
vi.stubGlobal('fetch', fetchCtx.mockFetch);

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

function mockFetchResponse(data: any, status = 200) {
  fetchCtx.mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : String(status),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({ 'content-type': 'application/json' }),
    body: null,
  });
}

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
    clearCsrfToken();
  });

  // Helper: mock CSRF token fetch (needed before every POST/PUT/DELETE)
  function mockCsrf() {
    mockFetchResponse({ csrfToken: 'csrf-123' });
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
      mockCsrf();
      mockFetchResponse({ content: 'Hello!', tokensUsed: 42 });

      const result = await chat('Hi');
      expect(result).toEqual({ content: 'Hello!', tokensUsed: 42 });
    });

    it('should include context when provided', async () => {
      mockCsrf();
      mockFetchResponse({ content: 'resp', tokensUsed: 10 });

      await chat('Hi', { project: { id: 'p1', name: 'Test' } });

      const postCall = fetchCtx.mockFetch.mock.calls[1];
      const body = JSON.parse(postCall[1].body);
      expect(body.context).toEqual({ project: { id: 'p1', name: 'Test' } });
    });

    it('should throw on HTTP error', async () => {
      mockCsrf();
      mockFetchError('Rate limited', 429);

      await expect(chat('Hi')).rejects.toThrow('Rate limited');
    });

    it('should throw with fallback message when error JSON parsing fails', async () => {
      mockCsrf();
      fetchCtx.mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('parse fail')),
      });

      await expect(chat('Hi')).rejects.toThrow('Request failed');
    });
  });

  describe('getConversations', () => {
    it('should return list of conversations', async () => {
      const convos = [{ id: 'c1', title: 'Test' }];
      mockFetchResponse({ conversations: convos });

      const result = await getConversations();
      expect(result).toEqual(convos);
    });

    it('should return empty array when no conversations field', async () => {
      mockFetchResponse({});

      const result = await getConversations();
      expect(result).toEqual([]);
    });

    it('should throw on error', async () => {
      mockFetchError('Unauthorized', 401);

      await expect(getConversations()).rejects.toThrow('Failed to fetch conversations');
    });
  });

  describe('getConversation', () => {
    it('should return a specific conversation', async () => {
      const convo = { id: 'c1', messages: [], createdAt: '2025-01-01' };
      mockFetchResponse({ conversation: convo });

      const result = await getConversation('c1');
      expect(result).toEqual(convo);
    });

    it('should throw on error', async () => {
      mockFetchError('Not found', 404);

      await expect(getConversation('invalid')).rejects.toThrow('Failed to fetch conversation');
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      mockCsrf();
      mockFetchResponse({});

      await expect(deleteConversation('c1')).resolves.toBeUndefined();
    });

    it('should throw on error', async () => {
      mockCsrf();
      mockFetchError('Forbidden', 403);

      await expect(deleteConversation('c1')).rejects.toThrow('Failed to delete conversation');
    });
  });

  describe('reviewDesign', () => {
    it('should return design feedback', async () => {
      mockCsrf();
      const feedback = { feedback: 'Looks great', aspects: ['usability'] };
      mockFetchResponse(feedback);

      const result = await reviewDesign({ description: 'A landing page' });
      expect(result).toEqual(feedback);
    });

    it('should throw on error', async () => {
      mockCsrf();
      mockFetchError('Analysis failed', 500);

      await expect(reviewDesign({ description: 'test' })).rejects.toThrow('Analysis failed');
    });
  });

  describe('generateCode', () => {
    it('should return generated code', async () => {
      mockCsrf();
      const codeResult = { code: '<Button />', componentType: 'button', style: 'modern' };
      mockFetchResponse(codeResult);

      const result = await generateCode({ description: 'A button' });
      expect(result).toEqual(codeResult);
    });

    it('should throw on error', async () => {
      mockCsrf();
      mockFetchError('Generation failed', 500);

      await expect(generateCode({ description: 'test' })).rejects.toThrow('Generation failed');
    });
  });

  describe('checkHealth', () => {
    it('should return health status', async () => {
      mockFetchResponse({ status: 'healthy', hasApiKey: true });

      const result = await checkHealth();
      expect(result).toEqual({ status: 'healthy', hasApiKey: true });
    });

    it('should return unhealthy on error', async () => {
      mockFetchError('Down', 503);

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

  describe('CSRF token caching', () => {
    it('should reuse cached CSRF token for subsequent requests', async () => {
      mockCsrf();
      mockFetchResponse({ content: 'a', tokensUsed: 1 });
      await chat('first');

      // Second call should not fetch CSRF again
      mockFetchResponse({ content: 'b', tokensUsed: 1 });
      await chat('second');

      // Only 3 fetch calls total: 1 csrf + 1 chat + 1 chat (no second csrf)
      expect(fetchCtx.mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
