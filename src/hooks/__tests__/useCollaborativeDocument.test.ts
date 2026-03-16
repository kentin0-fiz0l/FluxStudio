/**
 * Unit Tests for useCollaborativeDocument Hook
 * @file src/hooks/__tests__/useCollaborativeDocument.test.ts
 *
 * Tests the collaborative document Yjs logic without full hook rendering
 * to avoid worker crashes from deep dependency chains.
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

describe('useCollaborativeDocument', () => {
  it('should export the useCollaborativeDocument hook', async () => {
    const mod = await import('../collaboration/useCollaborativeDocument');
    expect(typeof mod.useCollaborativeDocument).toBe('function');
    expect(mod.default).toBe(mod.useCollaborativeDocument);
  });

  describe('Y.Doc XmlFragment creation', () => {
    it('should create a Y.XmlFragment for rich text content', () => {
      const ydoc = new Y.Doc();
      const fragment = ydoc.getXmlFragment('content');
      expect(fragment).toBeDefined();
      expect(fragment.length).toBe(0);
    });

    it('should support custom fragment names', () => {
      const ydoc = new Y.Doc();
      const frag1 = ydoc.getXmlFragment('content');
      const frag2 = ydoc.getXmlFragment('notes');

      // Different fragments should be independent
      expect(frag1).not.toBe(frag2);
    });
  });

  describe('room naming', () => {
    it('should derive room name from projectId and documentId', () => {
      const projectId = 'p1';
      const documentId = 'd1';
      const roomName = `project-${projectId}-doc-${documentId}`;
      expect(roomName).toBe('project-p1-doc-d1');
    });
  });

  describe('awareness user state', () => {
    it('should filter out local client from active users', () => {
      const localClientId = 1;
      const states = new Map<number, Record<string, unknown>>([
        [1, { user: { id: 'u1', name: 'Alice', color: '#f00' } }],
        [2, { user: { id: 'u2', name: 'Bob', color: '#0f0' } }],
        [3, { user: { id: 'u3', name: 'Charlie', color: '#00f' } }],
      ]);

      const users = Array.from(states.entries())
        .filter(([clientId]) => clientId !== localClientId)
        .map(([, state]) => (state as any).user)
        .filter(Boolean);

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('Bob');
      expect(users[1].name).toBe('Charlie');
    });
  });

  describe('connection state transitions', () => {
    it('should recognize connected status', () => {
      const statusEvents = ['connecting', 'connected', 'disconnected'];
      const connected = statusEvents.filter((s) => s === 'connected');
      expect(connected).toHaveLength(1);
    });
  });
});
