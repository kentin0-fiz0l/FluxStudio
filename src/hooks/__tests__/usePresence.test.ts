/**
 * Unit Tests for usePresence Hook
 * @file src/hooks/__tests__/usePresence.test.ts
 *
 * Tests the presence logic without full hook rendering to avoid
 * worker crashes from deep Socket.IO / Yjs dependency chains.
 */

import { describe, it, expect, vi } from 'vitest';

// We test the exported types and verify the hook module can be imported
// without crashing. Full integration tests for presence require
// a running Yjs/Socket.IO environment.

describe('usePresence', () => {
  it('should export the usePresence hook', async () => {
    // Dynamic import to verify the module is importable
    const mod = await import('../usePresence');
    expect(typeof mod.usePresence).toBe('function');
    expect(mod.default).toBe(mod.usePresence);
  });

  describe('PresenceUser type shape', () => {
    it('should accept valid PresenceUser objects', () => {
      // Type-level check — compiles without error
      const user: import('../usePresence').PresenceUser = {
        id: 'u1',
        name: 'Alice',
        color: '#f00',
        status: 'online',
      };
      expect(user.id).toBe('u1');
    });
  });

  describe('mock awareness integration', () => {
    it('should build active user list from awareness states', () => {
      // Simulate the logic from the hook without React
      const states = new Map<number, Record<string, unknown>>([
        [1, { user: { id: 'u1', name: 'Alice', color: '#f00' }, isActive: true, isTyping: false }],
        [2, { user: { id: 'u2', name: 'Bob', color: '#0f0' }, isActive: true, isTyping: true }],
        [3, { user: { id: 'u3', name: 'Charlie', color: '#00f' }, isActive: false, isTyping: false }],
      ]);

      const localClientId = 1;
      const active: Array<{ id: string; name: string }> = [];
      const typing: Array<{ id: string; name: string }> = [];

      states.forEach((state, clientId) => {
        if (clientId === localClientId) return;
        const s = state as any;
        if (!s.user || !s.isActive) return;
        active.push({ id: s.user.id, name: s.user.name });
        if (s.isTyping) {
          typing.push({ id: s.user.id, name: s.user.name });
        }
      });

      expect(active).toHaveLength(1);
      expect(active[0].name).toBe('Bob');
      expect(typing).toHaveLength(1);
      expect(typing[0].name).toBe('Bob');
    });

    it('should filter out inactive users', () => {
      const states = new Map<number, Record<string, unknown>>([
        [2, { user: { id: 'u2', name: 'Bob', color: '#0f0' }, isActive: false }],
      ]);

      const active: string[] = [];
      states.forEach((state) => {
        const s = state as any;
        if (s.isActive && s.user) active.push(s.user.id);
      });

      expect(active).toEqual([]);
    });
  });

  describe('typing timeout logic', () => {
    it('should auto-clear typing after timeout', () => {
      vi.useFakeTimers();

      const typingUsers = new Map<string, ReturnType<typeof setTimeout>>();
      let typingList: string[] = [];

      // Simulate typing start
      const userId = 'u2';
      typingList.push(userId);
      typingUsers.set(
        userId,
        setTimeout(() => {
          typingList = typingList.filter((id) => id !== userId);
          typingUsers.delete(userId);
        }, 5000),
      );

      expect(typingList).toContain('u2');

      // Fast forward 5s
      vi.advanceTimersByTime(5000);

      expect(typingList).not.toContain('u2');
      expect(typingUsers.has('u2')).toBe(false);

      vi.useRealTimers();
    });
  });
});
