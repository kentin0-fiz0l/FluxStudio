import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createAgentSlice, type AgentSlice } from '../slices/agentSlice';

function createTestStore() {
  return create<AgentSlice>()(
    immer((...args) => ({
      ...createAgentSlice(...(args as Parameters<typeof createAgentSlice>)),
    }))
  );
}

describe('agentSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('initial state', () => {
    it('should have correct defaults', () => {
      const { agent } = store.getState();
      expect(agent.sessions).toEqual([]);
      expect(agent.currentSessionId).toBeNull();
      expect(agent.pendingActions).toEqual([]);
      expect(agent.dailyBrief).toBeNull();
      expect(agent.isStreaming).toBe(false);
      expect(agent.isPanelOpen).toBe(false);
    });
  });

  describe('sessions', () => {
    it('createSession should add session and set current', () => {
      const id = store.getState().agent.createSession('proj-1');
      expect(id).toBeTruthy();
      expect(store.getState().agent.sessions).toHaveLength(1);
      expect(store.getState().agent.currentSessionId).toBe(id);
      expect(store.getState().agent.sessions[0].projectId).toBe('proj-1');
    });

    it('deleteSession should remove and update current', () => {
      const id1 = store.getState().agent.createSession();
      const id2 = store.getState().agent.createSession();

      store.getState().agent.deleteSession(id2);
      expect(store.getState().agent.sessions).toHaveLength(1);
      expect(store.getState().agent.currentSessionId).toBe(id1);
    });

    it('clearSessions should remove all', () => {
      store.getState().agent.createSession();
      store.getState().agent.createSession();
      store.getState().agent.clearSessions();
      expect(store.getState().agent.sessions).toEqual([]);
      expect(store.getState().agent.currentSessionId).toBeNull();
    });
  });

  describe('messages', () => {
    let sessionId: string;

    beforeEach(() => {
      sessionId = store.getState().agent.createSession();
    });

    it('addMessage should add with generated id', () => {
      const msgId = store.getState().agent.addMessage(sessionId, { role: 'user', content: 'Hi' });
      expect(msgId).toBeTruthy();
      expect(store.getState().agent.sessions[0].messages).toHaveLength(1);
    });

    it('updateMessage should modify message', () => {
      const msgId = store.getState().agent.addMessage(sessionId, { role: 'assistant', content: '' });
      store.getState().agent.updateMessage(sessionId, msgId, { content: 'Updated' });
      expect(store.getState().agent.sessions[0].messages[0].content).toBe('Updated');
    });

    it('streamMessageChunk should append to content', () => {
      const msgId = store.getState().agent.addMessage(sessionId, { role: 'assistant', content: '', isStreaming: true });
      store.getState().agent.streamMessageChunk(sessionId, msgId, 'Hello');
      store.getState().agent.streamMessageChunk(sessionId, msgId, ' world');
      expect(store.getState().agent.sessions[0].messages[0].content).toBe('Hello world');
    });

    it('finishStreaming should set isStreaming false on message and agent', () => {
      const msgId = store.getState().agent.addMessage(sessionId, { role: 'assistant', content: 'done', isStreaming: true });
      store.getState().agent.setStreaming(true);
      store.getState().agent.finishStreaming(sessionId, msgId);
      expect(store.getState().agent.sessions[0].messages[0].isStreaming).toBe(false);
      expect(store.getState().agent.isStreaming).toBe(false);
    });
  });

  describe('pending actions', () => {
    it('addPendingAction should add with timestamp', () => {
      store.getState().agent.addPendingAction({
        id: 'act-1', sessionId: 's1', actionType: 'create_project',
        payload: {}, preview: 'Create project X', status: 'pending',
      });
      expect(store.getState().agent.pendingActions).toHaveLength(1);
      expect(store.getState().agent.pendingActions[0].createdAt).toBeTruthy();
    });

    it('updatePendingAction should change status', () => {
      store.getState().agent.addPendingAction({
        id: 'act-1', sessionId: 's1', actionType: 'test',
        payload: {}, preview: 'Test', status: 'pending',
      });
      store.getState().agent.updatePendingAction('act-1', 'approved');
      expect(store.getState().agent.pendingActions[0].status).toBe('approved');
    });

    it('removePendingAction should remove by id', () => {
      store.getState().agent.addPendingAction({
        id: 'act-1', sessionId: 's1', actionType: 'test',
        payload: {}, preview: 'Test', status: 'pending',
      });
      store.getState().agent.removePendingAction('act-1');
      expect(store.getState().agent.pendingActions).toHaveLength(0);
    });

    it('clearPendingActions should remove all', () => {
      store.getState().agent.addPendingAction({ id: 'a1', sessionId: 's', actionType: 't', payload: {}, preview: '', status: 'pending' });
      store.getState().agent.addPendingAction({ id: 'a2', sessionId: 's', actionType: 't', payload: {}, preview: '', status: 'pending' });
      store.getState().agent.clearPendingActions();
      expect(store.getState().agent.pendingActions).toHaveLength(0);
    });
  });

  describe('daily brief', () => {
    it('setDailyBrief should update', () => {
      const brief = {
        brief: 'Good morning!',
        stats: { projectUpdates: 3, newMessages: 5, newAssets: 1, notifications: 2 },
        activeProjectCount: 4,
        generatedAt: new Date().toISOString(),
      };
      store.getState().agent.setDailyBrief(brief);
      expect(store.getState().agent.dailyBrief?.brief).toBe('Good morning!');
    });

    it('setLoadingBrief should update loading state', () => {
      store.getState().agent.setLoadingBrief(true);
      expect(store.getState().agent.isLoadingBrief).toBe(true);
    });
  });

  describe('what changed', () => {
    it('setWhatChanged should set data', () => {
      store.getState().agent.setWhatChanged({
        since: '2025-01-01',
        summary: { projectUpdates: 1, newMessages: 0, newAssets: 0, notifications: 0 },
        changes: { projects: [], messages: [], assets: [], notifications: [] },
      });
      expect(store.getState().agent.whatChanged?.since).toBe('2025-01-01');
    });
  });

  describe('UI state', () => {
    it('setPanelOpen should update', () => {
      store.getState().agent.setPanelOpen(true);
      expect(store.getState().agent.isPanelOpen).toBe(true);
    });

    it('togglePanel should flip', () => {
      store.getState().agent.togglePanel();
      expect(store.getState().agent.isPanelOpen).toBe(true);
      store.getState().agent.togglePanel();
      expect(store.getState().agent.isPanelOpen).toBe(false);
    });

    it('setError should update error', () => {
      store.getState().agent.setError('Failed');
      expect(store.getState().agent.error).toBe('Failed');
    });

    it('setStreaming should update streaming state', () => {
      store.getState().agent.setStreaming(true);
      expect(store.getState().agent.isStreaming).toBe(true);
    });
  });
});
