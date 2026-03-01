/**
 * Messaging Route Integration Tests
 *
 * Tests conversations, messages, reactions, pins, read receipts,
 * threads, members, mute/archive, search, and error handling.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

jest.mock('../../lib/auth/tokenService', () => ({
  verifyAccessToken: jest.fn((token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }),
  generateAccessToken: jest.fn()
}));

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

const mockAdapter = {
  getConversationsForUser: jest.fn(),
  createConversation: jest.fn(),
  getConversationById: jest.fn(),
  updateConversation: jest.fn(),
  listMessages: jest.fn(),
  createMessage: jest.fn(),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  getMessageById: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  listReactionsForMessage: jest.fn(),
  pinMessage: jest.fn(),
  unpinMessage: jest.fn(),
  listPinnedMessages: jest.fn(),
  setLastRead: jest.fn(),
  updateReadState: jest.fn(),
  getConversationReadStates: jest.fn(),
  listThreadMessages: jest.fn(),
  getThreadSummary: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  searchMessages: jest.fn(),
  hydrateMessagesWithAssets: jest.fn((msgs) => msgs),
  getAssetById: jest.fn(),
};

jest.mock('../../database/messaging-conversations-adapter', () => mockAdapter);

jest.mock('../../database/files-adapter', () => ({
  createFile: jest.fn(),
  createPreview: jest.fn(),
}));

jest.mock('../../database/assets-adapter', () => ({
  createAsset: jest.fn(),
}));

jest.mock('../../storage', () => ({
  saveFile: jest.fn(),
  savePreview: jest.fn(),
}));

jest.mock('../../database/messaging/presence', () => ({
  muteConversation: jest.fn(),
  unmuteConversation: jest.fn(),
  getMuteStatus: jest.fn(),
}));

jest.mock('../../services/ai-summary-service', () => ({
  aiSummaryService: null,
}));

const presenceAdapter = require('../../database/messaging/presence');

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  const messagingModule = require('../../routes/messaging');
  app.use('/api/conversations', messagingModule);
  app.use('/api/messages', messagingModule.messagesRouter);
  return app;
}

describe('Messaging Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    Object.values(mockAdapter).forEach(fn => { if (typeof fn === 'function' && fn.mockReset) fn.mockReset(); });
    mockAdapter.hydrateMessagesWithAssets.mockImplementation((msgs) => msgs);
    Object.values(presenceAdapter).forEach(fn => { if (typeof fn === 'function' && fn.mockReset) fn.mockReset(); });
  });

  // Authentication
  describe('Authentication', () => {
    it('should return 401 for GET /api/conversations without token', async () => {
      await request(app).get('/api/conversations').expect(401);
    });
    it('should return 401 for POST /api/conversations without token', async () => {
      await request(app).post('/api/conversations').send({ name: 'Test' }).expect(401);
    });
    it('should return 401 for GET /api/conversations/:id without token', async () => {
      await request(app).get('/api/conversations/conv-1').expect(401);
    });
  });

  // Conversations CRUD
  describe('Conversations CRUD', () => {
    it('should list conversations', async () => {
      mockAdapter.getConversationsForUser.mockResolvedValue([{ id: 'conv-1', name: 'General' }]);
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversations).toHaveLength(1);
    });

    it('should create a conversation', async () => {
      mockAdapter.createConversation.mockResolvedValue({ id: 'conv-new', name: 'New Chat' });
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Chat', isGroup: true });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.conversation.name).toBe('New Chat');
    });

    it('should get a conversation by id', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1', name: 'General' });
      const res = await request(app)
        .get('/api/conversations/conv-1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.conversation.id).toBe('conv-1');
    });

    it('should return 404 for non-existent conversation', async () => {
      mockAdapter.getConversationById.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/conversations/non-existent')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('should update a conversation', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1', name: 'Old' });
      mockAdapter.updateConversation.mockResolvedValue({ id: 'conv-1', name: 'Updated' });
      const res = await request(app)
        .patch('/api/conversations/conv-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.conversation.name).toBe('Updated');
    });

    it('should return 404 when updating non-existent conversation', async () => {
      mockAdapter.getConversationById.mockResolvedValue(null);
      const res = await request(app)
        .patch('/api/conversations/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });
      expect(res.status).toBe(404);
    });
  });

  // Messages
  describe('Conversation Messages', () => {
    it('should create a message (201)', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.createMessage.mockResolvedValue({ id: 'msg-1', text: 'Hello', userId });
      const res = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Hello' });
      expect(res.status).toBe(201);
      expect(res.body.message.text).toBe('Hello');
    });

    it('should list messages', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.listMessages.mockResolvedValue([{ id: 'msg-1', text: 'Hi' }]);
      const res = await request(app)
        .get('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });

    it('should return 400 for empty message', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      const res = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should edit a message via PUT', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.listMessages.mockResolvedValue([{ id: 'msg-1', userId, createdAt: new Date().toISOString() }]);
      mockAdapter.editMessage.mockResolvedValue({ id: 'msg-1', text: 'Edited' });
      const res = await request(app)
        .put('/api/conversations/conv-1/messages/msg-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Edited' });
      expect(res.status).toBe(200);
    });

    it('should delete a message', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1', createdBy: userId });
      mockAdapter.listMessages.mockResolvedValue([{ id: 'msg-1', userId }]);
      mockAdapter.deleteMessage.mockResolvedValue(true);
      const res = await request(app)
        .delete('/api/conversations/conv-1/messages/msg-1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('should return 403 for editing another users message', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.listMessages.mockResolvedValue([{ id: 'msg-1', userId: 'other-user', createdAt: new Date().toISOString() }]);
      const res = await request(app)
        .put('/api/conversations/conv-1/messages/msg-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Hacked' });
      expect(res.status).toBe(403);
    });
  });

  // Mute/Archive
  describe('Mute/Unmute/Archive', () => {
    it('should mute a conversation', async () => {
      presenceAdapter.muteConversation.mockResolvedValue(true);
      const res = await request(app)
        .post('/api/conversations/conv-1/mute')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration: 1 });
      expect(res.status).toBe(200);
      expect(res.body.muted).toBe(true);
    });

    it('should unmute a conversation', async () => {
      presenceAdapter.unmuteConversation.mockResolvedValue(true);
      const res = await request(app)
        .delete('/api/conversations/conv-1/mute')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.muted).toBe(false);
    });

    it('should get mute status', async () => {
      presenceAdapter.getMuteStatus.mockResolvedValue({ muted: true, mutedUntil: null });
      const res = await request(app)
        .get('/api/conversations/conv-1/mute')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should archive a conversation', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      const { query: dbQuery } = require('../../database/config');
      dbQuery.mockResolvedValue({ rows: [] });
      const res = await request(app)
        .patch('/api/conversations/conv-1/archive')
        .set('Authorization', `Bearer ${token}`)
        .send({ archived: true });
      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(true);
    });
  });

  // Reactions
  describe('Reactions', () => {
    it('should add a reaction', async () => {
      mockAdapter.getMessageById.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' });
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.addReaction.mockResolvedValue({ messageId: 'msg-1', reactions: [{ emoji: '\ud83d\udc4d', count: 1 }] });
      const res = await request(app)
        .post('/api/messages/msg-1/reactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ emoji: '\ud83d\udc4d' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should remove a reaction', async () => {
      mockAdapter.getMessageById.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' });
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.removeReaction.mockResolvedValue({ messageId: 'msg-1', reactions: [] });
      const res = await request(app)
        .delete('/api/messages/msg-1/reactions/%F0%9F%91%8D')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should list reactions', async () => {
      mockAdapter.getMessageById.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' });
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.listReactionsForMessage.mockResolvedValue({ messageId: 'msg-1', reactions: [] });
      const res = await request(app)
        .get('/api/messages/msg-1/reactions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid emoji', async () => {
      mockAdapter.getMessageById.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' });
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      const res = await request(app)
        .post('/api/messages/msg-1/reactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ emoji: '' });
      expect(res.status).toBe(400);
    });
  });

  // Pins
  describe('Pins', () => {
    it('should pin a message', async () => {
      mockAdapter.getMessageById.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' });
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.pinMessage.mockResolvedValue([{ id: 'msg-1' }]);
      const res = await request(app)
        .post('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should unpin a message', async () => {
      mockAdapter.getMessageById.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' });
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.unpinMessage.mockResolvedValue([]);
      const res = await request(app)
        .delete('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should list pinned messages', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.listPinnedMessages.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/conversations/conv-1/pins')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.pins).toBeDefined();
    });
  });

  // Read Receipts
  describe('Read Receipts', () => {
    it('should mark as read', async () => {
      mockAdapter.setLastRead.mockResolvedValue({ conversationId: 'conv-1', userId, messageId: 'msg-5' });
      const res = await request(app)
        .post('/api/conversations/conv-1/read')
        .set('Authorization', `Bearer ${token}`)
        .send({ messageId: 'msg-5' });
      expect(res.status).toBe(200);
    });

    it('should return 400 for missing messageId', async () => {
      const res = await request(app)
        .post('/api/conversations/conv-1/read')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should get read states', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.getConversationReadStates.mockResolvedValue([]);
      const res = await request(app)
        .get('/api/conversations/conv-1/read-states')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.readStates).toBeDefined();
    });
  });

  // Threads
  describe('Threads', () => {
    it('should get thread messages', async () => {
      mockAdapter.listThreadMessages.mockResolvedValue({
        rootMessage: { id: 'msg-root' },
        messages: [{ id: 'msg-reply' }],
        replyCount: 1,
      });
      const res = await request(app)
        .get('/api/conversations/conv-1/threads/msg-root/messages')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.rootMessage).toBeDefined();
    });

    it('should get thread summary', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.getThreadSummary.mockResolvedValue({ replyCount: 3, lastReplyAt: '2026-01-01' });
      const res = await request(app)
        .get('/api/conversations/conv-1/threads/msg-root/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
    });
  });

  // Members
  describe('Members', () => {
    it('should add a member', async () => {
      mockAdapter.addMember.mockResolvedValue({ userId: 'new-user', role: 'member' });
      const res = await request(app)
        .post('/api/conversations/conv-1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: 'new-user' });
      expect(res.status).toBe(201);
    });

    it('should remove a member', async () => {
      mockAdapter.removeMember.mockResolvedValue(true);
      const res = await request(app)
        .delete('/api/conversations/conv-1/members/other-user')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('should leave a conversation', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.removeMember.mockResolvedValue(true);
      const res = await request(app)
        .delete('/api/conversations/conv-1/members/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // Search
  describe('Search', () => {
    it('should search messages', async () => {
      mockAdapter.searchMessages.mockResolvedValue([{ id: 'msg-1', text: 'hello' }]);
      const res = await request(app)
        .get('/api/messages/search?q=hello')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.results).toBeDefined();
    });

    it('should return 400 for short query', async () => {
      const res = await request(app)
        .get('/api/messages/search?q=a')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  // Messages Router (PATCH edit, DELETE)
  describe('Messages Router', () => {
    it('should edit a message via PATCH', async () => {
      mockAdapter.getMessageById.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1', userId });
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.editMessage.mockResolvedValue({ id: 'msg-1', text: 'Patched' });
      const res = await request(app)
        .patch('/api/messages/msg-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Patched' });
      expect(res.status).toBe(200);
    });

    it('should return 400 for PATCH with empty content', async () => {
      const res = await request(app)
        .patch('/api/messages/msg-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '' });
      expect(res.status).toBe(400);
    });

    it('should delete a message via DELETE /api/messages/:id', async () => {
      mockAdapter.deleteMessage.mockResolvedValue(true);
      const res = await request(app)
        .delete('/api/messages/msg-1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });
  });

  // Error handling
  describe('Error Handling', () => {
    it('should handle adapter error in list conversations', async () => {
      mockAdapter.getConversationsForUser.mockRejectedValue(new Error('DB error'));
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    });

    it('should handle adapter error in create message', async () => {
      mockAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockAdapter.createMessage.mockRejectedValue(new Error('DB error'));
      const res = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'hello' });
      expect(res.status).toBe(500);
    });
  });
});
