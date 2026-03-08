/**
 * Messaging Yjs Sync Integration Tests
 *
 * Tests real Yjs CRDT synchronization for messaging between two Y.Doc instances
 * using Y.applyUpdate to simulate WebSocket transport. No mocks —
 * these verify the actual merge behavior the messaging system relies on.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';

// Shared type names matching useMessagingYjs.ts
const MESSAGING_YJS_TYPES = {
  MESSAGES: 'messaging:messages',
  META: 'messaging:meta',
} as const;

// ============================================================================
// Helpers
// ============================================================================

/** Connect two Y.Docs so updates propagate bidirectionally. */
function connectDocs(docA: Y.Doc, docB: Y.Doc): () => void {
  const handleA = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') {
      Y.applyUpdate(docB, update, 'remote');
    }
  };
  const handleB = (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') {
      Y.applyUpdate(docA, update, 'remote');
    }
  };

  docA.on('update', handleA);
  docB.on('update', handleB);

  // Sync existing state
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA), 'remote');
  Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB), 'remote');

  return () => {
    docA.off('update', handleA);
    docB.off('update', handleB);
  };
}

interface MessageData {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

/** Add a message within a single transaction. */
function pushMessage(doc: Y.Doc, msg: MessageData): void {
  const messagesArray = doc.getArray(MESSAGING_YJS_TYPES.MESSAGES);
  doc.transact(() => {
    const yMsg = new Y.Map();
    yMsg.set('id', msg.id);
    yMsg.set('conversationId', msg.conversationId);
    yMsg.set('authorId', msg.authorId);
    yMsg.set('content', msg.content);
    yMsg.set('text', msg.content);
    yMsg.set('isSystemMessage', false);
    yMsg.set('createdAt', msg.createdAt);
    messagesArray.push([yMsg]);
  });
}

/** Read all messages from a Y.Doc, sorted by createdAt. */
function readMessages(doc: Y.Doc): MessageData[] {
  const messagesArray = doc.getArray(MESSAGING_YJS_TYPES.MESSAGES);
  const msgs: MessageData[] = [];
  messagesArray.forEach((item) => {
    const yMsg = item as Y.Map<unknown>;
    msgs.push({
      id: yMsg.get('id') as string,
      conversationId: yMsg.get('conversationId') as string,
      authorId: yMsg.get('authorId') as string,
      content: yMsg.get('content') as string,
      createdAt: yMsg.get('createdAt') as string,
    });
  });
  return msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Find a message by ID in a Y.Doc and return its Y.Map. */
function findYMessage(doc: Y.Doc, messageId: string): { index: number; yMsg: Y.Map<unknown> } | null {
  const messagesArray = doc.getArray(MESSAGING_YJS_TYPES.MESSAGES);
  for (let i = 0; i < messagesArray.length; i++) {
    const yMsg = messagesArray.get(i) as Y.Map<unknown>;
    if (yMsg.get('id') === messageId) {
      return { index: i, yMsg };
    }
  }
  return null;
}

// ============================================================================
// Tests
// ============================================================================

describe('Messaging Yjs Sync (real CRDT)', () => {
  let docA: Y.Doc;
  let docB: Y.Doc;
  let disconnect: () => void;

  beforeEach(() => {
    docA = new Y.Doc();
    docB = new Y.Doc();
  });

  afterEach(() => {
    disconnect?.();
    docA.destroy();
    docB.destroy();
  });

  // --------------------------------------------------------------------------
  // 1. Concurrent message additions
  // --------------------------------------------------------------------------

  describe('Concurrent message additions', () => {
    it('should sync messages added by both clients concurrently', () => {
      disconnect = connectDocs(docA, docB);

      pushMessage(docA, {
        id: 'msg-a1',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'Hello from A',
        createdAt: '2024-01-01T10:00:00Z',
      });

      pushMessage(docB, {
        id: 'msg-b1',
        conversationId: 'conv-1',
        authorId: 'user-b',
        content: 'Hello from B',
        createdAt: '2024-01-01T10:00:01Z',
      });

      const msgsA = readMessages(docA);
      const msgsB = readMessages(docB);

      expect(msgsA).toHaveLength(2);
      expect(msgsB).toHaveLength(2);

      // Both clients see the same messages
      expect(msgsA.map((m) => m.id).sort()).toEqual(msgsB.map((m) => m.id).sort());
      expect(msgsA.map((m) => m.id).sort()).toEqual(['msg-a1', 'msg-b1']);
    });

    it('should preserve message ordering by createdAt across clients', () => {
      disconnect = connectDocs(docA, docB);

      // Add messages in non-chronological push order
      pushMessage(docB, {
        id: 'msg-3',
        conversationId: 'conv-1',
        authorId: 'user-b',
        content: 'Third message',
        createdAt: '2024-01-01T10:02:00Z',
      });

      pushMessage(docA, {
        id: 'msg-1',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'First message',
        createdAt: '2024-01-01T10:00:00Z',
      });

      pushMessage(docA, {
        id: 'msg-2',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'Second message',
        createdAt: '2024-01-01T10:01:00Z',
      });

      // When sorted by createdAt, order should be consistent
      const msgsA = readMessages(docA);
      const msgsB = readMessages(docB);

      expect(msgsA.map((m) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-3']);
      expect(msgsB.map((m) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-3']);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Edit conflict (last-write-wins on Y.Map)
  // --------------------------------------------------------------------------

  describe('Edit conflict resolution', () => {
    it('should converge when two clients edit the same message', () => {
      pushMessage(docA, {
        id: 'msg-edit',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'Original content',
        createdAt: '2024-01-01T10:00:00Z',
      });

      disconnect = connectDocs(docA, docB);

      // Both edit the same message concurrently
      const foundA = findYMessage(docA, 'msg-edit');
      const foundB = findYMessage(docB, 'msg-edit');

      docA.transact(() => {
        foundA!.yMsg.set('content', 'Edited by A');
        foundA!.yMsg.set('editedAt', '2024-01-01T10:01:00Z');
      });

      docB.transact(() => {
        foundB!.yMsg.set('content', 'Edited by B');
        foundB!.yMsg.set('editedAt', '2024-01-01T10:01:01Z');
      });

      // Both docs should converge to the same content (last-write-wins)
      const contentA = (findYMessage(docA, 'msg-edit')!.yMsg.get('content') as string);
      const contentB = (findYMessage(docB, 'msg-edit')!.yMsg.get('content') as string);
      expect(contentA).toBe(contentB);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Delete + edit race
  // --------------------------------------------------------------------------

  describe('Delete + edit race condition', () => {
    it('should resolve delete winning over concurrent edit', () => {
      pushMessage(docA, {
        id: 'msg-race',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'Will be deleted',
        createdAt: '2024-01-01T10:00:00Z',
      });

      disconnect = connectDocs(docA, docB);

      // Disconnect to simulate concurrent offline edits
      disconnect();

      // Client A deletes the message
      const foundInA = findYMessage(docA, 'msg-race');
      docA.transact(() => {
        const messagesArray = docA.getArray(MESSAGING_YJS_TYPES.MESSAGES);
        messagesArray.delete(foundInA!.index, 1);
      });

      // Client B edits the same message
      const foundInB = findYMessage(docB, 'msg-race');
      docB.transact(() => {
        foundInB!.yMsg.set('content', 'Edited by B while A deleted');
      });

      // Reconnect
      disconnect = connectDocs(docA, docB);

      // Y.Array delete wins — message should be gone from both docs
      const msgsA = readMessages(docA);
      const msgsB = readMessages(docB);
      expect(msgsA).toHaveLength(0);
      expect(msgsB).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Offline reconnection
  // --------------------------------------------------------------------------

  describe('Offline client reconnection', () => {
    it('should sync queued messages after reconnection', () => {
      disconnect = connectDocs(docA, docB);

      pushMessage(docA, {
        id: 'msg-before',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'Before disconnect',
        createdAt: '2024-01-01T10:00:00Z',
      });

      expect(readMessages(docB)).toHaveLength(1);

      // Disconnect
      disconnect();

      // Both add messages while offline
      pushMessage(docA, {
        id: 'msg-offline-a',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'Offline from A',
        createdAt: '2024-01-01T10:01:00Z',
      });

      pushMessage(docB, {
        id: 'msg-offline-b',
        conversationId: 'conv-1',
        authorId: 'user-b',
        content: 'Offline from B',
        createdAt: '2024-01-01T10:01:30Z',
      });

      expect(readMessages(docA)).toHaveLength(2);
      expect(readMessages(docB)).toHaveLength(2);

      // Reconnect
      disconnect = connectDocs(docA, docB);

      // All messages should be merged
      const msgsA = readMessages(docA);
      const msgsB = readMessages(docB);
      expect(msgsA).toHaveLength(3);
      expect(msgsB).toHaveLength(3);

      const idsA = msgsA.map((m) => m.id).sort();
      const idsB = msgsB.map((m) => m.id).sort();
      expect(idsA).toEqual(idsB);
      expect(idsA).toContain('msg-before');
      expect(idsA).toContain('msg-offline-a');
      expect(idsA).toContain('msg-offline-b');
    });
  });

  // --------------------------------------------------------------------------
  // 5. State encoding roundtrip
  // --------------------------------------------------------------------------

  describe('State encoding roundtrip', () => {
    it('should preserve messages through encodeStateAsUpdate / applyUpdate', () => {
      pushMessage(docA, {
        id: 'msg-persist',
        conversationId: 'conv-1',
        authorId: 'user-a',
        content: 'Persisted message',
        createdAt: '2024-01-01T10:00:00Z',
      });

      const savedState = Y.encodeStateAsUpdate(docA);

      const docRestored = new Y.Doc();
      Y.applyUpdate(docRestored, savedState);

      const msgs = readMessages(docRestored);
      expect(msgs).toHaveLength(1);
      expect(msgs[0].id).toBe('msg-persist');
      expect(msgs[0].content).toBe('Persisted message');

      docRestored.destroy();
    });
  });
});
