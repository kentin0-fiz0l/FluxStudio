import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

import { createOfflineSlice, type OfflineSlice } from '../slices/offlineSlice';

function createTestStore() {
  return create<OfflineSlice>()(
    immer((...args) => ({
      ...createOfflineSlice(...(args as Parameters<typeof createOfflineSlice>)),
    }))
  );
}

describe('offlineSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start online and synced', () => {
      const { offline } = store.getState();
      expect(offline.networkStatus).toBe('online');
      expect(offline.syncStatus).toBe('synced');
      expect(offline.pendingActions).toEqual([]);
      expect(offline.conflicts).toEqual([]);
    });
  });

  describe('setNetworkStatus', () => {
    it('should update network status', () => {
      store.getState().offline.setNetworkStatus('offline');
      expect(store.getState().offline.networkStatus).toBe('offline');
    });
  });

  describe('setSyncStatus', () => {
    it('should update sync status', () => {
      store.getState().offline.setSyncStatus('syncing');
      expect(store.getState().offline.syncStatus).toBe('syncing');
    });
  });

  describe('queueAction', () => {
    it('should add a pending action with generated id and timestamp', () => {
      // Go offline so sync doesn't fire automatically
      store.getState().offline.setNetworkStatus('offline');
      store.getState().offline.queueAction({ type: 'CREATE_PROJECT', payload: { name: 'Test' }, maxRetries: 3 });

      const actions = store.getState().offline.pendingActions;
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('CREATE_PROJECT');
      expect(actions[0].retryCount).toBe(0);
      expect(actions[0].id).toBeTruthy();
      expect(store.getState().offline.syncStatus).toBe('pending');
    });
  });

  describe('removeAction', () => {
    it('should remove action and set synced if none left', () => {
      store.getState().offline.setNetworkStatus('offline');
      store.getState().offline.queueAction({ type: 'TEST', payload: {}, maxRetries: 1 });
      const id = store.getState().offline.pendingActions[0].id;

      store.getState().offline.removeAction(id);
      expect(store.getState().offline.pendingActions).toHaveLength(0);
      expect(store.getState().offline.syncStatus).toBe('synced');
    });
  });

  describe('retryAction', () => {
    it('should increment retryCount', () => {
      store.getState().offline.setNetworkStatus('offline');
      store.getState().offline.queueAction({ type: 'TEST', payload: {}, maxRetries: 3 });
      const id = store.getState().offline.pendingActions[0].id;

      store.getState().offline.retryAction(id);
      expect(store.getState().offline.pendingActions[0].retryCount).toBe(1);
    });

    it('should not exceed maxRetries', () => {
      store.getState().offline.setNetworkStatus('offline');
      store.getState().offline.queueAction({ type: 'TEST', payload: {}, maxRetries: 1 });
      const id = store.getState().offline.pendingActions[0].id;

      store.getState().offline.retryAction(id);
      store.getState().offline.retryAction(id); // Should not increment past max
      expect(store.getState().offline.pendingActions[0].retryCount).toBe(1);
    });
  });

  describe('conflicts', () => {
    it('addConflict should add with generated id', () => {
      store.getState().offline.addConflict({ localData: { a: 1 }, serverData: { a: 2 } });
      expect(store.getState().offline.conflicts).toHaveLength(1);
      expect(store.getState().offline.conflicts[0].resolved).toBe(false);
    });

    it('resolveConflict should mark as resolved', () => {
      store.getState().offline.addConflict({ localData: {}, serverData: {} });
      const id = store.getState().offline.conflicts[0].id;
      store.getState().offline.resolveConflict(id, 'local');
      expect(store.getState().offline.conflicts[0].resolved).toBe(true);
    });
  });

  describe('sync', () => {
    it('should skip if offline', async () => {
      store.getState().offline.setNetworkStatus('offline');
      store.getState().offline.queueAction({ type: 'TEST', payload: {}, maxRetries: 1 });
      // Manually set status back since queueAction tries to sync
      await store.getState().offline.sync();
      // Actions should still be there
      expect(store.getState().offline.pendingActions).toHaveLength(1);
    });

    it('should process actions with endpoints', async () => {
      localStorage.setItem('auth_token', 'tok');
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      // Add action while offline
      store.getState().offline.setNetworkStatus('offline');
      store.getState().offline.queueAction({
        type: 'CREATE', payload: { x: 1 }, maxRetries: 3, endpoint: '/api/test', method: 'POST',
      });

      // Come back online and sync
      store.getState().offline.setNetworkStatus('online');
      // The setNetworkStatus auto-triggers sync, but let's also call it directly
      await store.getState().offline.sync();

      expect(store.getState().offline.pendingActions).toHaveLength(0);
      expect(store.getState().offline.syncStatus).toBe('synced');
    });
  });

  describe('clearPending', () => {
    it('should clear all pending actions', () => {
      store.getState().offline.setNetworkStatus('offline');
      store.getState().offline.queueAction({ type: 'A', payload: {}, maxRetries: 1 });
      store.getState().offline.queueAction({ type: 'B', payload: {}, maxRetries: 1 });

      store.getState().offline.clearPending();
      expect(store.getState().offline.pendingActions).toHaveLength(0);
      expect(store.getState().offline.syncStatus).toBe('synced');
    });
  });
});
