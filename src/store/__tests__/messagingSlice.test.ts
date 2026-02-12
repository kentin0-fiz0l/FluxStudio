import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

vi.mock('../store', () => ({ useStore: vi.fn() }));
vi.mock('@/services/logging', () => ({
  storeLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { createMessagingSlice, type MessagingSlice, type Conversation, type Message } from '../slices/messagingSlice';

function createTestStore() {
  return create<MessagingSlice>()(
    immer((...args) => ({
      ...createMessagingSlice(...(args as Parameters<typeof createMessagingSlice>)),
    }))
  );
}

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  isGroup: false,
  members: ['user-1', 'user-2'],
  unreadCount: 0,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  authorId: 'user-1',
  content: 'Hello',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('messagingSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have empty defaults', () => {
      const { messaging } = store.getState();
      expect(messaging.conversations).toEqual([]);
      expect(messaging.activeConversationId).toBeNull();
      expect(messaging.messages).toEqual({});
      expect(messaging.typingIndicators).toEqual([]);
    });
  });

  describe('conversations', () => {
    it('setConversations replaces all conversations', () => {
      store.getState().messaging.setConversations([makeConversation(), makeConversation({ id: 'conv-2' })]);
      expect(store.getState().messaging.conversations).toHaveLength(2);
    });

    it('addConversation prepends', () => {
      store.getState().messaging.setConversations([makeConversation({ id: 'c1' })]);
      store.getState().messaging.addConversation(makeConversation({ id: 'c2' }));
      expect(store.getState().messaging.conversations[0].id).toBe('c2');
    });

    it('setActiveConversation updates id', () => {
      store.getState().messaging.setActiveConversation('conv-1');
      expect(store.getState().messaging.activeConversationId).toBe('conv-1');
    });
  });

  describe('messages', () => {
    it('setMessages sets messages for a conversation', () => {
      const msgs = [makeMessage(), makeMessage({ id: 'msg-2' })];
      store.getState().messaging.setMessages('conv-1', msgs);
      expect(store.getState().messaging.messages['conv-1']).toHaveLength(2);
    });

    it('addMessage appends and updates conversation lastMessage', () => {
      store.getState().messaging.setConversations([makeConversation({ id: 'conv-1' })]);
      const msg = makeMessage({ id: 'msg-new', content: 'New msg' });
      store.getState().messaging.addMessage(msg);

      expect(store.getState().messaging.messages['conv-1']).toHaveLength(1);
      expect(store.getState().messaging.conversations[0].lastMessage?.content).toBe('New msg');
    });

    it('updateMessage updates a message across conversations', () => {
      store.getState().messaging.setMessages('conv-1', [makeMessage({ id: 'msg-1' })]);
      store.getState().messaging.updateMessage('msg-1', { content: 'Updated' });
      expect(store.getState().messaging.messages['conv-1'][0].content).toBe('Updated');
    });

    it('deleteMessage removes a message', () => {
      store.getState().messaging.setMessages('conv-1', [makeMessage({ id: 'msg-1' })]);
      store.getState().messaging.deleteMessage('conv-1', 'msg-1');
      expect(store.getState().messaging.messages['conv-1']).toHaveLength(0);
    });
  });

  describe('typing indicators', () => {
    it('setTyping adds indicator and replaces existing for same user/conversation', () => {
      const ind = { conversationId: 'conv-1', userId: 'u1', userName: 'User 1', timestamp: Date.now() };
      store.getState().messaging.setTyping(ind);
      expect(store.getState().messaging.typingIndicators).toHaveLength(1);

      // Same user typing again - should replace
      store.getState().messaging.setTyping({ ...ind, timestamp: Date.now() + 1000 });
      expect(store.getState().messaging.typingIndicators).toHaveLength(1);
    });

    it('clearTyping removes indicator', () => {
      store.getState().messaging.setTyping({
        conversationId: 'conv-1', userId: 'u1', userName: 'User 1', timestamp: Date.now(),
      });
      store.getState().messaging.clearTyping('conv-1', 'u1');
      expect(store.getState().messaging.typingIndicators).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('should set unreadCount to 0', () => {
      store.getState().messaging.setConversations([makeConversation({ id: 'c1', unreadCount: 5 })]);
      store.getState().messaging.markAsRead('c1');
      expect(store.getState().messaging.conversations[0].unreadCount).toBe(0);
    });
  });

  describe('fetchConversations', () => {
    it('should fetch and set conversations', async () => {
      localStorage.setItem('auth_token', 'tok');
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ conversations: [makeConversation()] }),
      });

      await store.getState().messaging.fetchConversations();
      expect(store.getState().messaging.conversations).toHaveLength(1);
      expect(store.getState().messaging.isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      await store.getState().messaging.fetchConversations();
      expect(store.getState().messaging.error).toBeTruthy();
    });
  });
});
