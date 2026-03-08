/**
 * Presence / Awareness Protocol Integration Tests
 *
 * Tests Yjs Awareness behavior between multiple clients.
 * Uses real Awareness instances connected via update propagation
 * to verify presence state, typing indicators, and disconnect handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Connect two Awareness instances so state changes propagate bidirectionally.
 * Returns a disconnect function.
 */
function connectAwareness(
  awarenessA: Awareness,
  awarenessB: Awareness,
): () => void {
  const handleA = (changes: { added: number[]; updated: number[]; removed: number[] }, origin: string) => {
    if (origin === 'remote') return;
    const changedClients = [...changes.added, ...changes.updated, ...changes.removed];
    const update = encodeAwarenessUpdate(awarenessA, changedClients);
    applyAwarenessUpdate(awarenessB, update, 'remote');
  };

  const handleB = (changes: { added: number[]; updated: number[]; removed: number[] }, origin: string) => {
    if (origin === 'remote') return;
    const changedClients = [...changes.added, ...changes.updated, ...changes.removed];
    const update = encodeAwarenessUpdate(awarenessB, changedClients);
    applyAwarenessUpdate(awarenessA, update, 'remote');
  };

  awarenessA.on('update', handleA);
  awarenessB.on('update', handleB);

  // Sync existing state
  const fullUpdateA = encodeAwarenessUpdate(awarenessA, [awarenessA.clientID]);
  applyAwarenessUpdate(awarenessB, fullUpdateA, 'remote');

  const fullUpdateB = encodeAwarenessUpdate(awarenessB, [awarenessB.clientID]);
  applyAwarenessUpdate(awarenessA, fullUpdateB, 'remote');

  return () => {
    awarenessA.off('update', handleA);
    awarenessB.off('update', handleB);
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Presence / Awareness Sync (real protocol)', () => {
  let docA: Y.Doc;
  let docB: Y.Doc;
  let awarenessA: Awareness;
  let awarenessB: Awareness;
  let disconnect: () => void;

  beforeEach(() => {
    docA = new Y.Doc();
    docB = new Y.Doc();
    awarenessA = new Awareness(docA);
    awarenessB = new Awareness(docB);
  });

  afterEach(() => {
    disconnect?.();
    awarenessA.destroy();
    awarenessB.destroy();
    docA.destroy();
    docB.destroy();
  });

  // --------------------------------------------------------------------------
  // 1. Multiple clients set presence
  // --------------------------------------------------------------------------

  describe('Multi-client presence visibility', () => {
    it('should make both clients visible to each other', () => {
      disconnect = connectAwareness(awarenessA, awarenessB);

      awarenessA.setLocalState({
        user: { id: 'user-a', name: 'Alice', color: '#FF0000' },
        isActive: true,
        isTyping: false,
      });

      awarenessB.setLocalState({
        user: { id: 'user-b', name: 'Bob', color: '#00FF00' },
        isActive: true,
        isTyping: false,
      });

      // Client A should see client B's state
      const statesFromA = Array.from(awarenessA.getStates().entries());
      const otherFromA = statesFromA.find(([id]) => id !== awarenessA.clientID);
      expect(otherFromA).toBeDefined();
      expect((otherFromA![1] as { user: { name: string } }).user.name).toBe('Bob');

      // Client B should see client A's state
      const statesFromB = Array.from(awarenessB.getStates().entries());
      const otherFromB = statesFromB.find(([id]) => id !== awarenessB.clientID);
      expect(otherFromB).toBeDefined();
      expect((otherFromB![1] as { user: { name: string } }).user.name).toBe('Alice');
    });

    it('should handle three clients with a hub topology', () => {
      const docC = new Y.Doc();
      const awarenessC = new Awareness(docC);

      // A <-> B, A <-> C (hub through A)
      const disconnectAB = connectAwareness(awarenessA, awarenessB);
      const disconnectAC = connectAwareness(awarenessA, awarenessC);

      awarenessA.setLocalState({ user: { id: 'a', name: 'Alice' }, isActive: true });
      awarenessB.setLocalState({ user: { id: 'b', name: 'Bob' }, isActive: true });
      awarenessC.setLocalState({ user: { id: 'c', name: 'Charlie' }, isActive: true });

      // A sees B and C
      expect(awarenessA.getStates().size).toBe(3);

      // B sees A (and possibly C through A depending on propagation)
      // With direct awareness protocol, B sees A's state
      const statesB = awarenessB.getStates();
      expect(statesB.has(awarenessA.clientID)).toBe(true);

      disconnectAB();
      disconnectAC();
      awarenessC.destroy();
      docC.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Client disconnect removes state
  // --------------------------------------------------------------------------

  describe('Client disconnect', () => {
    it('should remove state when a client sets local state to null', () => {
      disconnect = connectAwareness(awarenessA, awarenessB);

      awarenessA.setLocalState({
        user: { id: 'user-a', name: 'Alice' },
        isActive: true,
      });

      awarenessB.setLocalState({
        user: { id: 'user-b', name: 'Bob' },
        isActive: true,
      });

      // Both see each other
      expect(awarenessA.getStates().size).toBe(2);
      expect(awarenessB.getStates().size).toBe(2);

      // Client B "disconnects" (sets state to null)
      awarenessB.setLocalState(null);

      // Client A should see B's state removed (entry deleted from map)
      const statesA = awarenessA.getStates();
      expect(statesA.has(awarenessB.clientID)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Typing indicator propagation
  // --------------------------------------------------------------------------

  describe('Typing indicator propagation', () => {
    it('should propagate typing state changes between clients', () => {
      disconnect = connectAwareness(awarenessA, awarenessB);

      awarenessA.setLocalState({
        user: { id: 'user-a', name: 'Alice' },
        isActive: true,
        isTyping: false,
      });

      awarenessB.setLocalState({
        user: { id: 'user-b', name: 'Bob' },
        isActive: true,
        isTyping: false,
      });

      // Client A starts typing
      awarenessA.setLocalStateField('isTyping', true);

      // Client B should see A is typing
      const aStateFromB = awarenessB.getStates().get(awarenessA.clientID) as { isTyping: boolean };
      expect(aStateFromB.isTyping).toBe(true);

      // Client A stops typing
      awarenessA.setLocalStateField('isTyping', false);

      // Client B should see A stopped
      const aStateAfter = awarenessB.getStates().get(awarenessA.clientID) as { isTyping: boolean };
      expect(aStateAfter.isTyping).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Rapid state updates don't cause stale reads
  // --------------------------------------------------------------------------

  describe('Rapid state updates', () => {
    it('should reflect the latest state after rapid updates', () => {
      disconnect = connectAwareness(awarenessA, awarenessB);

      awarenessA.setLocalState({
        user: { id: 'user-a', name: 'Alice' },
        isActive: true,
        cursor: { x: 0, y: 0 },
      });

      // Simulate rapid cursor movements
      for (let i = 1; i <= 50; i++) {
        awarenessA.setLocalStateField('cursor', { x: i * 10, y: i * 5 });
      }

      // Client B should see the final cursor position
      const aState = awarenessB.getStates().get(awarenessA.clientID) as {
        cursor: { x: number; y: number };
      };
      expect(aState.cursor).toEqual({ x: 500, y: 250 });
    });

    it('should handle rapid typing toggling', () => {
      disconnect = connectAwareness(awarenessA, awarenessB);

      awarenessA.setLocalState({
        user: { id: 'user-a', name: 'Alice' },
        isActive: true,
        isTyping: false,
      });

      // Rapid toggle
      for (let i = 0; i < 20; i++) {
        awarenessA.setLocalStateField('isTyping', i % 2 === 0);
      }

      // Final state should be isTyping: false (19 is odd, so i%2 === 1 → false)
      // Actually: i=19, 19%2=1, so false
      const aState = awarenessB.getStates().get(awarenessA.clientID) as { isTyping: boolean };
      expect(aState.isTyping).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Awareness change event firing
  // --------------------------------------------------------------------------

  describe('Awareness change events', () => {
    it('should fire change events when remote state updates', () => {
      const changeHandler = vi.fn();
      awarenessB.on('change', changeHandler);

      disconnect = connectAwareness(awarenessA, awarenessB);

      awarenessA.setLocalState({
        user: { id: 'user-a', name: 'Alice' },
        isActive: true,
      });

      // changeHandler should have been called with the added client
      expect(changeHandler).toHaveBeenCalled();
      const lastCall = changeHandler.mock.calls[changeHandler.mock.calls.length - 1];
      const changes = lastCall[0] as { added: number[]; updated: number[]; removed: number[] };

      // Client A's clientID should be in added or updated
      const allChanged = [...changes.added, ...changes.updated];
      expect(allChanged).toContain(awarenessA.clientID);

      awarenessB.off('change', changeHandler);
    });
  });
});
