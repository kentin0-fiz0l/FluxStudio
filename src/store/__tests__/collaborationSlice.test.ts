import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));

import { createAuthSlice, type AuthSlice } from '../slices/authSlice';
import { createCollaborationSlice, type CollaborationSlice } from '../slices/collaborationSlice';

// Collaboration slice uses get().auth.user for acquireLock, so we need both slices
type TestStore = AuthSlice & CollaborationSlice;

function createTestStore() {
  return create<TestStore>()(
    immer((...args) => ({
      ...createAuthSlice(...(args as Parameters<typeof createAuthSlice>)),
      ...createCollaborationSlice(...(args as Parameters<typeof createCollaborationSlice>)),
    }))
  );
}

describe('collaborationSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('initial state', () => {
    it('should start with empty sessions', () => {
      const { collaboration } = store.getState();
      expect(collaboration.sessions).toEqual({});
      expect(collaboration.activeSessionId).toBeNull();
      expect(collaboration.localCursor).toBeNull();
      expect(collaboration.localSelection).toBeNull();
    });
  });

  describe('joinSession', () => {
    it('should create a new session and set it active', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      const session = store.getState().collaboration.sessions['project:p1'];
      expect(session).toBeTruthy();
      expect(session.entityId).toBe('p1');
      expect(store.getState().collaboration.activeSessionId).toBe('project:p1');
    });

    it('should reuse existing session', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.joinSession('project', 'p1');
      // Should still be one session
      expect(Object.keys(store.getState().collaboration.sessions)).toHaveLength(1);
    });
  });

  describe('leaveSession', () => {
    it('should clear activeSessionId if leaving active session', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.leaveSession('project:p1');
      expect(store.getState().collaboration.activeSessionId).toBeNull();
    });
  });

  describe('collaborators', () => {
    it('updateCollaborator should add new collaborator with color', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.updateCollaborator('project:p1', {
        id: 'c1', userId: 'u1', userName: 'Alice',
      });

      const session = store.getState().collaboration.sessions['project:p1'];
      expect(session.collaborators).toHaveLength(1);
      expect(session.collaborators[0].color).toBeTruthy();
      expect(session.collaborators[0].isActive).toBe(true);
    });

    it('updateCollaborator should update existing collaborator', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.updateCollaborator('project:p1', {
        id: 'c1', userId: 'u1', userName: 'Alice',
      });
      store.getState().collaboration.updateCollaborator('project:p1', {
        id: 'c1', userName: 'Alice Updated',
      });

      const session = store.getState().collaboration.sessions['project:p1'];
      expect(session.collaborators).toHaveLength(1);
      expect(session.collaborators[0].userName).toBe('Alice Updated');
    });

    it('removeCollaborator should remove and release their locks', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.updateCollaborator('project:p1', {
        id: 'c1', userId: 'u1', userName: 'Alice',
      });

      store.getState().collaboration.removeCollaborator('project:p1', 'c1');
      expect(store.getState().collaboration.sessions['project:p1'].collaborators).toHaveLength(0);
    });
  });

  describe('cursor and selection', () => {
    it('updateLocalCursor should set cursor position', () => {
      const pos = { x: 100, y: 200, timestamp: new Date().toISOString() };
      store.getState().collaboration.updateLocalCursor(pos);
      expect(store.getState().collaboration.localCursor).toEqual(pos);
    });

    it('updateLocalSelection should set selection', () => {
      const sel = { entityId: 'e1', entityType: 'element' as const };
      store.getState().collaboration.updateLocalSelection(sel);
      expect(store.getState().collaboration.localSelection).toEqual(sel);
    });
  });

  describe('locks', () => {
    it('acquireLock should add a lock and return true', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      const result = store.getState().collaboration.acquireLock('project:p1', 'entity-1', 'element');
      expect(result).toBe(true);
      expect(store.getState().collaboration.sessions['project:p1'].locks).toHaveLength(1);
    });

    it('acquireLock should fail if entity already locked', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.acquireLock('project:p1', 'entity-1', 'element');
      const result = store.getState().collaboration.acquireLock('project:p1', 'entity-1', 'element');
      expect(result).toBe(false);
    });

    it('releaseLock should remove the lock', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.acquireLock('project:p1', 'entity-1', 'element');
      store.getState().collaboration.releaseLock('project:p1', 'entity-1');
      expect(store.getState().collaboration.sessions['project:p1'].locks).toHaveLength(0);
    });
  });

  describe('edits', () => {
    it('addEdit should prepend an edit', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.addEdit('project:p1', {
        entityId: 'e1', entityType: 'element', operation: 'update',
        data: { color: 'red' }, userId: 'u1', userName: 'Alice',
      });

      const edits = store.getState().collaboration.sessions['project:p1'].recentEdits;
      expect(edits).toHaveLength(1);
      expect(edits[0].operation).toBe('update');
    });

    it('undoEdit should mark edit as undone', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.addEdit('project:p1', {
        entityId: 'e1', entityType: 'element', operation: 'create',
        data: {}, userId: 'u1', userName: 'Alice',
      });
      const editId = store.getState().collaboration.sessions['project:p1'].recentEdits[0].id;
      store.getState().collaboration.undoEdit('project:p1', editId);
      expect(store.getState().collaboration.sessions['project:p1'].recentEdits[0].undone).toBe(true);
    });
  });

  describe('clearSession', () => {
    it('should remove session and clear active if matching', () => {
      store.getState().collaboration.joinSession('project', 'p1');
      store.getState().collaboration.clearSession('project:p1');
      expect(store.getState().collaboration.sessions['project:p1']).toBeUndefined();
      expect(store.getState().collaboration.activeSessionId).toBeNull();
    });
  });
});
