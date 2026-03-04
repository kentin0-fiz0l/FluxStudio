import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createAISlice, type AISlice } from '../slices/aiSlice';

function createTestStore() {
  return create<AISlice>()(
    immer((...args) => ({
      ...createAISlice(...(args as Parameters<typeof createAISlice>)),
    }))
  );
}

describe('aiSlice (extended)', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.restoreAllMocks();
  });

  describe('conversation history', () => {
    it('should add multiple messages and preserve order', () => {
      const convId = store.getState().ai.createConversation();
      store.getState().ai.addMessage(convId, { role: 'user', content: 'First' });
      store.getState().ai.addMessage(convId, { role: 'assistant', content: 'Second' });
      store.getState().ai.addMessage(convId, { role: 'user', content: 'Third' });

      const messages = store.getState().ai.conversations[0].messages;
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
      expect(messages[2].content).toBe('Third');
    });

    it('clearConversations should remove all conversations and reset activeConversationId', () => {
      store.getState().ai.createConversation({ title: 'A' });
      store.getState().ai.createConversation({ title: 'B' });
      store.getState().ai.createConversation({ title: 'C' });

      store.getState().ai.clearConversations();
      expect(store.getState().ai.conversations).toHaveLength(0);
      expect(store.getState().ai.activeConversationId).toBeNull();
    });

    it('deleteConversation should switch active to first remaining', () => {
      const id1 = store.getState().ai.createConversation({ title: 'First' });
      const id2 = store.getState().ai.createConversation({ title: 'Second' });

      // id2 is active (most recently created)
      expect(store.getState().ai.activeConversationId).toBe(id2);

      store.getState().ai.deleteConversation(id2);
      // Should switch to id1 (first remaining)
      expect(store.getState().ai.activeConversationId).toBe(id1);
    });

    it('deleteConversation should set activeConversationId to null when last is deleted', () => {
      const id = store.getState().ai.createConversation();
      store.getState().ai.deleteConversation(id);
      expect(store.getState().ai.activeConversationId).toBeNull();
    });

    it('first user message should auto-title the conversation (truncated to 50 chars)', () => {
      const convId = store.getState().ai.createConversation();
      const longMessage = 'A'.repeat(80);
      store.getState().ai.addMessage(convId, { role: 'user', content: longMessage });

      const title = store.getState().ai.conversations[0].title;
      expect(title.length).toBeLessThanOrEqual(53); // 50 chars + '...'
      expect(title).toContain('...');
    });

    it('addMessage to nonexistent conversation should be a no-op', () => {
      const msgId = store.getState().ai.addMessage('nonexistent', { role: 'user', content: 'Hi' });
      // Still returns an id (generated before set), but no conversation is affected
      expect(msgId).toBeTruthy();
    });
  });

  describe('streaming response states', () => {
    it('should track streaming state through the message lifecycle', () => {
      const convId = store.getState().ai.createConversation();
      const msgId = store.getState().ai.addMessage(convId, {
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      expect(store.getState().ai.conversations[0].messages[0].isStreaming).toBe(true);

      store.getState().ai.streamMessageChunk(convId, msgId, 'Hello');
      expect(store.getState().ai.conversations[0].messages[0].content).toBe('Hello');
      expect(store.getState().ai.conversations[0].messages[0].isStreaming).toBe(true);

      store.getState().ai.streamMessageChunk(convId, msgId, ' there!');
      expect(store.getState().ai.conversations[0].messages[0].content).toBe('Hello there!');

      store.getState().ai.finishStreaming(convId, msgId);
      expect(store.getState().ai.conversations[0].messages[0].isStreaming).toBe(false);
      expect(store.getState().ai.conversations[0].messages[0].content).toBe('Hello there!');
    });

    it('streamMessageChunk for nonexistent conversation should be a no-op', () => {
      expect(() => store.getState().ai.streamMessageChunk('fake', 'fake-msg', 'chunk')).not.toThrow();
    });

    it('finishStreaming for nonexistent message should be a no-op', () => {
      const convId = store.getState().ai.createConversation();
      expect(() => store.getState().ai.finishStreaming(convId, 'nonexistent')).not.toThrow();
    });
  });

  describe('error recovery: failed -> retry', () => {
    it('should set error on a message and then clear it on update', () => {
      const convId = store.getState().ai.createConversation();
      const msgId = store.getState().ai.addMessage(convId, {
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      // Simulate error
      store.getState().ai.updateMessage(convId, msgId, {
        error: 'Network error',
        isStreaming: false,
      });
      expect(store.getState().ai.conversations[0].messages[0].error).toBe('Network error');
      expect(store.getState().ai.conversations[0].messages[0].isStreaming).toBe(false);

      // Simulate retry by replacing content
      store.getState().ai.updateMessage(convId, msgId, {
        content: 'Retry successful',
        error: undefined,
        isStreaming: false,
      });
      expect(store.getState().ai.conversations[0].messages[0].content).toBe('Retry successful');
      expect(store.getState().ai.conversations[0].messages[0].error).toBeUndefined();
    });

    it('setError and setProcessing should manage global error state', () => {
      store.getState().ai.setProcessing(true);
      store.getState().ai.setError('API limit exceeded');

      expect(store.getState().ai.isProcessing).toBe(true);
      expect(store.getState().ai.error).toBe('API limit exceeded');

      // Recovery
      store.getState().ai.setError(null);
      store.getState().ai.setProcessing(false);

      expect(store.getState().ai.isProcessing).toBe(false);
      expect(store.getState().ai.error).toBeNull();
    });
  });

  describe('generation requests', () => {
    it('cancelGeneration should only cancel pending or processing requests', () => {
      const id = store.getState().ai.requestGeneration({
        type: 'image',
        prompt: 'A landscape',
        model: 'claude-sonnet-4-20250514',
      });

      // Complete the request first
      store.getState().ai.updateGenerationStatus(id, { status: 'completed', result: 'image_url' });

      // Try to cancel a completed request - should not change status
      store.getState().ai.cancelGeneration(id);
      expect(store.getState().ai.generationRequests[0].status).toBe('completed');
    });

    it('clearCompletedGenerations should keep only active requests', () => {
      const id1 = store.getState().ai.requestGeneration({ type: 'text', prompt: 'a', model: 'claude-sonnet-4-20250514' });
      const id2 = store.getState().ai.requestGeneration({ type: 'text', prompt: 'b', model: 'claude-sonnet-4-20250514' });
      const id3 = store.getState().ai.requestGeneration({ type: 'text', prompt: 'c', model: 'claude-sonnet-4-20250514' });

      store.getState().ai.updateGenerationStatus(id1, { status: 'completed' });
      store.getState().ai.cancelGeneration(id2); // sets to failed

      store.getState().ai.clearCompletedGenerations();
      // Only id3 (pending) should remain
      expect(store.getState().ai.generationRequests).toHaveLength(1);
      expect(store.getState().ai.generationRequests[0].id).toBe(id3);
    });
  });

  describe('model selection', () => {
    it('createConversation should use specified model', () => {
      store.getState().ai.createConversation({ model: 'gpt-4' });
      expect(store.getState().ai.conversations[0].model).toBe('gpt-4');
    });

    it('createConversation with no model should use preference default', () => {
      store.getState().ai.updatePreferences({ defaultModel: 'claude-3-5-haiku-20241022' });
      store.getState().ai.createConversation();
      expect(store.getState().ai.conversations[0].model).toBe('claude-3-5-haiku-20241022');
    });
  });

  describe('token usage tracking', () => {
    it('incrementUsage should accumulate tokens and requests', () => {
      store.getState().ai.incrementUsage(1000);
      store.getState().ai.incrementUsage(500);
      store.getState().ai.incrementUsage(250);

      const usage = store.getState().ai.usage;
      expect(usage.tokensUsed).toBe(1750);
      expect(usage.requestsToday).toBe(3);
    });

    it('updateUsage should directly overwrite specific fields', () => {
      store.getState().ai.updateUsage({ tokensUsed: 50000, requestsToday: 100 });
      expect(store.getState().ai.usage.tokensUsed).toBe(50000);
      expect(store.getState().ai.usage.requestsToday).toBe(100);
      // tokensLimit should be unchanged
      expect(store.getState().ai.usage.tokensLimit).toBe(100000);
    });
  });

  describe('suggestions edge cases', () => {
    it('addSuggestion should skip when autoSuggest is disabled', () => {
      store.getState().ai.updatePreferences({ autoSuggest: false });
      store.getState().ai.addSuggestion({
        type: 'action',
        title: 'Test',
        description: 'desc',
        confidence: 0.95,
        context: {},
      });
      expect(store.getState().ai.suggestions).toHaveLength(0);
    });

    it('addSuggestion should limit to 20 suggestions', () => {
      for (let i = 0; i < 25; i++) {
        store.getState().ai.addSuggestion({
          type: 'action',
          title: `Suggestion ${i}`,
          description: 'desc',
          confidence: 0.9,
          context: {},
        });
      }
      expect(store.getState().ai.suggestions.length).toBeLessThanOrEqual(20);
    });

    it('clearSuggestions should remove all suggestions', () => {
      store.getState().ai.addSuggestion({
        type: 'action',
        title: 'S1',
        description: 'd',
        confidence: 0.9,
        context: {},
      });
      store.getState().ai.addSuggestion({
        type: 'warning',
        title: 'S2',
        description: 'd',
        confidence: 0.8,
        context: {},
      });
      store.getState().ai.clearSuggestions();
      expect(store.getState().ai.suggestions).toHaveLength(0);
    });

    it('dismissSuggestion should not affect other suggestions', () => {
      store.getState().ai.addSuggestion({ type: 'action', title: 'A', description: '', confidence: 0.9, context: {} });
      store.getState().ai.addSuggestion({ type: 'action', title: 'B', description: '', confidence: 0.9, context: {} });

      const firstId = store.getState().ai.suggestions[0].id;
      store.getState().ai.dismissSuggestion(firstId);

      expect(store.getState().ai.suggestions[0].dismissed).toBe(true);
      expect(store.getState().ai.suggestions[1].dismissed).toBe(false);
    });
  });

  describe('setActiveConversation', () => {
    it('should allow setting to any conversation id', () => {
      const id1 = store.getState().ai.createConversation({ title: 'First' });
      store.getState().ai.createConversation({ title: 'Second' });

      store.getState().ai.setActiveConversation(id1);
      expect(store.getState().ai.activeConversationId).toBe(id1);
    });

    it('should allow setting to null', () => {
      store.getState().ai.createConversation();
      store.getState().ai.setActiveConversation(null);
      expect(store.getState().ai.activeConversationId).toBeNull();
    });
  });

  describe('deleteMessage', () => {
    it('should remove only the specified message', () => {
      const convId = store.getState().ai.createConversation();
      const msg1 = store.getState().ai.addMessage(convId, { role: 'user', content: 'Q1' });
      store.getState().ai.addMessage(convId, { role: 'assistant', content: 'A1' });

      store.getState().ai.deleteMessage(convId, msg1);
      const messages = store.getState().ai.conversations[0].messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('A1');
    });

    it('deleteMessage from nonexistent conversation should be a no-op', () => {
      expect(() => store.getState().ai.deleteMessage('fake-conv', 'fake-msg')).not.toThrow();
    });
  });
});
