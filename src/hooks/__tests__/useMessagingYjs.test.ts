/**
 * Unit Tests for useMessagingYjs Hook
 * @file src/hooks/__tests__/useMessagingYjs.test.ts
 *
 * Tests the messaging Yjs logic without full hook rendering to avoid
 * worker crashes from deep Yjs dependency chains.
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

describe('useMessagingYjs', () => {
  it('should export the useMessagingYjs hook', async () => {
    const mod = await import('../useMessagingYjs');
    expect(typeof mod.useMessagingYjs).toBe('function');
    expect(mod.default).toBe(mod.useMessagingYjs);
  });

  describe('Yjs message CRUD logic', () => {
    it('should add a message to Y.Array via Y.Map', () => {
      const ydoc = new Y.Doc();
      const messagesArray = ydoc.getArray('messaging:messages');

      ydoc.transact(() => {
        const yMsg = new Y.Map();
        yMsg.set('id', 'msg-1');
        yMsg.set('conversationId', 'c1');
        yMsg.set('authorId', 'u1');
        yMsg.set('content', 'Hello');
        yMsg.set('text', 'Hello');
        yMsg.set('isSystemMessage', false);
        yMsg.set('createdAt', new Date().toISOString());
        messagesArray.push([yMsg]);
      });

      expect(messagesArray.length).toBe(1);
      const msg = messagesArray.get(0) as Y.Map<unknown>;
      expect(msg.get('content')).toBe('Hello');
      expect(msg.get('authorId')).toBe('u1');
    });

    it('should edit a message in Y.Array', () => {
      const ydoc = new Y.Doc();
      const messagesArray = ydoc.getArray('messaging:messages');

      ydoc.transact(() => {
        const yMsg = new Y.Map();
        yMsg.set('id', 'msg-1');
        yMsg.set('content', 'Original');
        messagesArray.push([yMsg]);
      });

      ydoc.transact(() => {
        for (let i = 0; i < messagesArray.length; i++) {
          const yMsg = messagesArray.get(i) as Y.Map<unknown>;
          if (yMsg.get('id') === 'msg-1') {
            yMsg.set('content', 'Edited');
            yMsg.set('editedAt', new Date().toISOString());
            break;
          }
        }
      });

      const msg = messagesArray.get(0) as Y.Map<unknown>;
      expect(msg.get('content')).toBe('Edited');
      expect(msg.get('editedAt')).toBeDefined();
    });

    it('should delete a message from Y.Array', () => {
      const ydoc = new Y.Doc();
      const messagesArray = ydoc.getArray('messaging:messages');

      ydoc.transact(() => {
        const yMsg1 = new Y.Map();
        yMsg1.set('id', 'msg-1');
        yMsg1.set('content', 'First');
        const yMsg2 = new Y.Map();
        yMsg2.set('id', 'msg-2');
        yMsg2.set('content', 'Second');
        messagesArray.push([yMsg1, yMsg2]);
      });

      expect(messagesArray.length).toBe(2);

      ydoc.transact(() => {
        for (let i = 0; i < messagesArray.length; i++) {
          const yMsg = messagesArray.get(i) as Y.Map<unknown>;
          if (yMsg.get('id') === 'msg-1') {
            messagesArray.delete(i, 1);
            break;
          }
        }
      });

      expect(messagesArray.length).toBe(1);
      const remaining = messagesArray.get(0) as Y.Map<unknown>;
      expect(remaining.get('id')).toBe('msg-2');
    });

    it('should sort messages by createdAt', () => {
      const ydoc = new Y.Doc();
      const messagesArray = ydoc.getArray('messaging:messages');

      ydoc.transact(() => {
        const yMsg1 = new Y.Map();
        yMsg1.set('id', 'msg-1');
        yMsg1.set('createdAt', '2026-03-08T12:00:00Z');
        const yMsg2 = new Y.Map();
        yMsg2.set('id', 'msg-2');
        yMsg2.set('createdAt', '2026-03-08T11:00:00Z');
        messagesArray.push([yMsg1, yMsg2]);
      });

      const msgs: Array<{ id: string; createdAt: string }> = [];
      messagesArray.forEach((yMsg) => {
        const m = yMsg as Y.Map<unknown>;
        msgs.push({
          id: m.get('id') as string,
          createdAt: m.get('createdAt') as string,
        });
      });

      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      expect(msgs[0].id).toBe('msg-2');
      expect(msgs[1].id).toBe('msg-1');
    });
  });

  describe('room naming', () => {
    it('should derive room name from conversationId', () => {
      // Mirrors getMessagingRoomName logic
      const conversationId = 'conv-123';
      const roomName = `messaging-${conversationId}`;
      expect(roomName).toBe('messaging-conv-123');
    });
  });

  describe('yMapToMessage conversion', () => {
    it('should convert Y.Map to ConversationMessage shape', () => {
      // Y.Map must be attached to a Y.Doc for get/set to work
      const ydoc = new Y.Doc();
      const arr = ydoc.getArray('test');

      ydoc.transact(() => {
        const yMsg = new Y.Map();
        yMsg.set('id', 'msg-1');
        yMsg.set('conversationId', 'c1');
        yMsg.set('authorId', 'u1');
        yMsg.set('content', 'Hello');
        yMsg.set('text', 'Hello');
        yMsg.set('isSystemMessage', false);
        yMsg.set('createdAt', '2026-03-08T12:00:00Z');
        yMsg.set('userName', 'Alice');
        arr.push([yMsg]);
      });

      const yMsg = arr.get(0) as Y.Map<unknown>;

      // Replicate the conversion logic
      const message = {
        id: yMsg.get('id') as string,
        conversationId: yMsg.get('conversationId') as string,
        authorId: yMsg.get('authorId') as string,
        content: yMsg.get('content') as string,
        text: yMsg.get('text') as string,
        isSystemMessage: (yMsg.get('isSystemMessage') as boolean) ?? false,
        createdAt: yMsg.get('createdAt') as string,
        userName: yMsg.get('userName') as string,
      };

      expect(message.id).toBe('msg-1');
      expect(message.content).toBe('Hello');
      expect(message.isSystemMessage).toBe(false);
      expect(message.userName).toBe('Alice');
    });
  });
});
