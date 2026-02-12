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

describe('aiSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const { ai } = store.getState();
      expect(ai.conversations).toEqual([]);
      expect(ai.activeConversationId).toBeNull();
      expect(ai.isProcessing).toBe(false);
      expect(ai.preferences.defaultModel).toBe('claude-sonnet-4-20250514');
      expect(ai.usage.tokensUsed).toBe(0);
    });
  });

  describe('conversations', () => {
    it('createConversation should add and set active', () => {
      const id = store.getState().ai.createConversation({ title: 'Test Chat' });
      expect(id).toBeTruthy();
      expect(store.getState().ai.conversations).toHaveLength(1);
      expect(store.getState().ai.activeConversationId).toBe(id);
      expect(store.getState().ai.conversations[0].title).toBe('Test Chat');
    });

    it('createConversation should use default model from preferences', () => {
      store.getState().ai.createConversation();
      expect(store.getState().ai.conversations[0].model).toBe('claude-sonnet-4-20250514');
    });

    it('deleteConversation should remove and update active', () => {
      const id1 = store.getState().ai.createConversation({ title: 'First' });
      const id2 = store.getState().ai.createConversation({ title: 'Second' });

      store.getState().ai.deleteConversation(id2);
      expect(store.getState().ai.conversations).toHaveLength(1);
      expect(store.getState().ai.activeConversationId).toBe(id1);
    });

    it('clearConversations should remove all', () => {
      store.getState().ai.createConversation();
      store.getState().ai.createConversation();
      store.getState().ai.clearConversations();
      expect(store.getState().ai.conversations).toEqual([]);
      expect(store.getState().ai.activeConversationId).toBeNull();
    });
  });

  describe('messages', () => {
    let convId: string;

    beforeEach(() => {
      convId = store.getState().ai.createConversation();
    });

    it('addMessage should add with generated id and timestamp', () => {
      const msgId = store.getState().ai.addMessage(convId, { role: 'user', content: 'Hello' });
      expect(msgId).toBeTruthy();

      const msgs = store.getState().ai.conversations[0].messages;
      expect(msgs).toHaveLength(1);
      expect(msgs[0].content).toBe('Hello');
    });

    it('first user message should update conversation title', () => {
      store.getState().ai.addMessage(convId, { role: 'user', content: 'How do I design a logo?' });
      expect(store.getState().ai.conversations[0].title).toBe('How do I design a logo?');
    });

    it('updateMessage should modify message', () => {
      const msgId = store.getState().ai.addMessage(convId, { role: 'assistant', content: 'Hi' });
      store.getState().ai.updateMessage(convId, msgId, { content: 'Hello there!' });
      expect(store.getState().ai.conversations[0].messages[0].content).toBe('Hello there!');
    });

    it('deleteMessage should remove message', () => {
      const msgId = store.getState().ai.addMessage(convId, { role: 'user', content: 'test' });
      store.getState().ai.deleteMessage(convId, msgId);
      expect(store.getState().ai.conversations[0].messages).toHaveLength(0);
    });

    it('streamMessageChunk should append to content', () => {
      const msgId = store.getState().ai.addMessage(convId, { role: 'assistant', content: '', isStreaming: true });
      store.getState().ai.streamMessageChunk(convId, msgId, 'Hello');
      store.getState().ai.streamMessageChunk(convId, msgId, ' world');

      expect(store.getState().ai.conversations[0].messages[0].content).toBe('Hello world');
    });

    it('finishStreaming should set isStreaming to false', () => {
      const msgId = store.getState().ai.addMessage(convId, { role: 'assistant', content: 'done', isStreaming: true });
      store.getState().ai.finishStreaming(convId, msgId);
      expect(store.getState().ai.conversations[0].messages[0].isStreaming).toBe(false);
    });
  });

  describe('generation requests', () => {
    it('requestGeneration should add with pending status', () => {
      const id = store.getState().ai.requestGeneration({
        type: 'image', prompt: 'A sunset', model: 'claude-sonnet-4-20250514',
      });
      expect(id).toBeTruthy();
      expect(store.getState().ai.generationRequests[0].status).toBe('pending');
    });

    it('updateGenerationStatus should update status', () => {
      const id = store.getState().ai.requestGeneration({
        type: 'text', prompt: 'test', model: 'claude-sonnet-4-20250514',
      });
      store.getState().ai.updateGenerationStatus(id, { status: 'completed', result: 'done' });
      expect(store.getState().ai.generationRequests[0].status).toBe('completed');
      expect(store.getState().ai.generationRequests[0].completedAt).toBeTruthy();
    });

    it('cancelGeneration should set failed status', () => {
      const id = store.getState().ai.requestGeneration({
        type: 'code', prompt: 'test', model: 'claude-sonnet-4-20250514',
      });
      store.getState().ai.cancelGeneration(id);
      expect(store.getState().ai.generationRequests[0].status).toBe('failed');
      expect(store.getState().ai.generationRequests[0].error).toBe('Cancelled by user');
    });

    it('clearCompletedGenerations should remove only completed/failed', () => {
      store.getState().ai.requestGeneration({ type: 'text', prompt: 'a', model: 'claude-sonnet-4-20250514' });
      const id2 = store.getState().ai.requestGeneration({ type: 'text', prompt: 'b', model: 'claude-sonnet-4-20250514' });
      store.getState().ai.updateGenerationStatus(id2, { status: 'completed' });

      store.getState().ai.clearCompletedGenerations();
      // Only the pending one should remain
      expect(store.getState().ai.generationRequests).toHaveLength(1);
    });
  });

  describe('suggestions', () => {
    it('addSuggestion should add when confidence meets threshold', () => {
      store.getState().ai.addSuggestion({
        type: 'action', title: 'Optimize', description: 'desc', confidence: 0.9,
        context: {}, actions: [],
      });
      expect(store.getState().ai.suggestions).toHaveLength(1);
    });

    it('addSuggestion should skip below threshold', () => {
      store.getState().ai.addSuggestion({
        type: 'action', title: 'Weak', description: 'desc', confidence: 0.3,
        context: {},
      });
      expect(store.getState().ai.suggestions).toHaveLength(0);
    });

    it('dismissSuggestion should mark as dismissed', () => {
      store.getState().ai.addSuggestion({
        type: 'action', title: 'Test', description: 'desc', confidence: 0.9, context: {},
      });
      const id = store.getState().ai.suggestions[0].id;
      store.getState().ai.dismissSuggestion(id);
      expect(store.getState().ai.suggestions[0].dismissed).toBe(true);
    });

    it('applySuggestion should set appliedAt and dismiss', () => {
      store.getState().ai.addSuggestion({
        type: 'action', title: 'Test', description: 'desc', confidence: 0.9, context: {},
      });
      const id = store.getState().ai.suggestions[0].id;
      store.getState().ai.applySuggestion(id);
      expect(store.getState().ai.suggestions[0].appliedAt).toBeTruthy();
      expect(store.getState().ai.suggestions[0].dismissed).toBe(true);
    });
  });

  describe('preferences', () => {
    it('updatePreferences should merge updates', () => {
      store.getState().ai.updatePreferences({ autoSuggest: false, streamResponses: false });
      expect(store.getState().ai.preferences.autoSuggest).toBe(false);
      expect(store.getState().ai.preferences.streamResponses).toBe(false);
      // Others unchanged
      expect(store.getState().ai.preferences.saveHistory).toBe(true);
    });
  });

  describe('usage', () => {
    it('incrementUsage should add tokens and increment requests', () => {
      store.getState().ai.incrementUsage(500);
      expect(store.getState().ai.usage.tokensUsed).toBe(500);
      expect(store.getState().ai.usage.requestsToday).toBe(1);

      store.getState().ai.incrementUsage(300);
      expect(store.getState().ai.usage.tokensUsed).toBe(800);
      expect(store.getState().ai.usage.requestsToday).toBe(2);
    });
  });

  describe('error and processing', () => {
    it('setError should update error state', () => {
      store.getState().ai.setError('Something broke');
      expect(store.getState().ai.error).toBe('Something broke');
    });

    it('setProcessing should update processing state', () => {
      store.getState().ai.setProcessing(true);
      expect(store.getState().ai.isProcessing).toBe(true);
    });
  });
});
