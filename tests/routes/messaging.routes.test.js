/**
 * Messaging Routes Unit Tests
 * Tests conversation CRUD, messages, reactions, pins, threads, and search
 * @file tests/routes/messaging.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// ─── Mock messaging conversations adapter ───
const mockMessagingAdapter = {
  getConversationsForUser: jest.fn(),
  createConversation: jest.fn(),
  getConversationById: jest.fn(),
  updateConversation: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  setLastRead: jest.fn(),
  listMessages: jest.fn(),
  createMessage: jest.fn(),
  getAssetById: jest.fn(),
  hydrateMessagesWithAssets: jest.fn((msgs) => Promise.resolve(msgs)),
  listPinnedMessages: jest.fn(),
  getConversationReadStates: jest.fn(),
  updateReadState: jest.fn(),
  listThreadMessages: jest.fn(),
  getThreadSummary: jest.fn(),
  editMessage: jest.fn(),
  deleteMessage: jest.fn(),
  getMessageById: jest.fn(),
  addReaction: jest.fn(),
  removeReaction: jest.fn(),
  listReactionsForMessage: jest.fn(),
  pinMessage: jest.fn(),
  unpinMessage: jest.fn(),
  searchMessages: jest.fn(),
};

// ─── Mock database query ───
const mockQuery = jest.fn();

// ─── Mock file storage ───
const mockFileStorage = {
  saveFile: jest.fn(),
  savePreview: jest.fn(),
};

// ─── Mock files adapter ───
const mockFilesAdapter = {
  createFile: jest.fn(),
  createPreview: jest.fn(),
};

// ─── Mock assets adapter ───
const mockAssetsAdapter = {
  createAsset: jest.fn(),
};

jest.mock('../../database/messaging-conversations-adapter', () => mockMessagingAdapter);
jest.mock('../../database/files-adapter', () => mockFilesAdapter);
jest.mock('../../database/assets-adapter', () => mockAssetsAdapter);
jest.mock('../../database/config', () => ({
  query: (...args) => mockQuery(...args),
}));
jest.mock('../../storage', () => mockFileStorage);

jest.mock('../../lib/auth/middleware', () => ({
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Access token is required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  },
}));

// Mock optional dependencies that use try/catch
jest.mock('../../services/ai-summary-service', () => ({
  aiSummaryService: null,
}));

jest.mock('../../database/projects-adapter', () => null);

jest.mock('../../lib/activityLogger', () => ({
  messageSent: jest.fn().mockResolvedValue(undefined),
  log: jest.fn().mockResolvedValue(undefined),
}));

// Setup express app with messaging routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  const messagingRouter = require('../../routes/messaging');
  app.use('/api/conversations', messagingRouter);

  // Mount messages router at /api/messages
  const { messagesRouter } = require('../../routes/messaging');
  app.use('/api/messages', messagesRouter);

  return app;
}

// Helper to generate a valid JWT token
function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Messaging Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    validToken = generateToken();
    app = createTestApp();
  });

  // ─────────────────────────────────────────────
  // GET /api/conversations
  // ─────────────────────────────────────────────
  describe('GET /api/conversations', () => {
    it('should return conversations for authenticated user', async () => {
      mockMessagingAdapter.getConversationsForUser.mockResolvedValue([
        { id: 'conv-1', name: 'Team Chat', isGroup: true },
        { id: 'conv-2', name: null, isGroup: false },
      ]);

      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversations).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should pass pagination and filter params', async () => {
      mockMessagingAdapter.getConversationsForUser.mockResolvedValue([]);

      await request(app)
        .get('/api/conversations?limit=10&offset=5&projectId=proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockMessagingAdapter.getConversationsForUser).toHaveBeenCalledWith({
        userId: 'user-1',
        limit: 10,
        offset: 5,
        projectId: 'proj-1',
      });
    });

    it('should cap limit at 100', async () => {
      mockMessagingAdapter.getConversationsForUser.mockResolvedValue([]);

      await request(app)
        .get('/api/conversations?limit=500')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockMessagingAdapter.getConversationsForUser).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/conversations');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', 'Bearer invalid');

      expect(response.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getConversationsForUser.mockRejectedValue(new Error('DB down'));

      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to list conversations');
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/conversations
  // ─────────────────────────────────────────────
  describe('POST /api/conversations', () => {
    it('should create a new conversation', async () => {
      mockMessagingAdapter.createConversation.mockResolvedValue({
        id: 'conv-new',
        name: 'New Chat',
        isGroup: true,
        createdBy: 'user-1',
      });

      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'New Chat',
          isGroup: true,
          memberUserIds: ['user-2', 'user-3'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.conversation.id).toBe('conv-new');
    });

    it('should create a direct message conversation without name', async () => {
      mockMessagingAdapter.createConversation.mockResolvedValue({
        id: 'conv-dm',
        name: null,
        isGroup: false,
        createdBy: 'user-1',
      });

      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          memberUserIds: ['user-2'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when memberUserIds is not an array', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          memberUserIds: 'user-2',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('memberUserIds must be an array');
    });

    it('should return 400 when group conversation has no name', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          isGroup: true,
          memberUserIds: ['user-2'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Group conversations require a name');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .send({ name: 'Chat' });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.createConversation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Test',
          isGroup: true,
          memberUserIds: ['user-2'],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to create conversation');
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/conversations/:id
  // ─────────────────────────────────────────────
  describe('GET /api/conversations/:id', () => {
    it('should return conversation details', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({
        id: 'conv-1',
        name: 'Design Team',
        isGroup: true,
        members: ['user-1', 'user-2'],
      });

      const response = await request(app)
        .get('/api/conversations/conv-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversation.id).toBe('conv-1');
    });

    it('should return 404 when conversation not found', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/conversations/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Conversation not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/conversations/conv-1');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/conversations/conv-1')
        .set('Authorization', 'Bearer bad');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getConversationById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/conversations/conv-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to get conversation');
    });
  });

  // ─────────────────────────────────────────────
  // PATCH /api/conversations/:id
  // ─────────────────────────────────────────────
  describe('PATCH /api/conversations/:id', () => {
    it('should update conversation name', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({
        id: 'conv-1',
        name: 'Old Name',
      });
      mockMessagingAdapter.updateConversation.mockResolvedValue({
        id: 'conv-1',
        name: 'New Name',
      });

      const response = await request(app)
        .patch('/api/conversations/conv-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.conversation.name).toBe('New Name');
    });

    it('should return 404 when conversation not found', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/conversations/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .patch('/api/conversations/conv-1')
        .send({ name: 'X' });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.updateConversation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .patch('/api/conversations/conv-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Fail' });

      expect(response.status).toBe(500);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .patch('/api/conversations/conv-1')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ name: 'X' });

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/conversations/:id/members
  // ─────────────────────────────────────────────
  describe('POST /api/conversations/:id/members', () => {
    it('should add a member to conversation', async () => {
      mockMessagingAdapter.addMember.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-2',
        role: 'member',
      });

      const response = await request(app)
        .post('/api/conversations/conv-1/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ userId: 'user-2' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.member).toBeDefined();
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('userId is required');
    });

    it('should accept custom role', async () => {
      mockMessagingAdapter.addMember.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-2',
        role: 'admin',
      });

      const response = await request(app)
        .post('/api/conversations/conv-1/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ userId: 'user-2', role: 'admin' });

      expect(response.status).toBe(201);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/members')
        .send({ userId: 'user-2' });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.addMember.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/conversations/conv-1/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ userId: 'user-2' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to add member');
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/conversations/:id/messages
  // ─────────────────────────────────────────────
  describe('POST /api/conversations/:id/messages', () => {
    it('should create a text message', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({
        id: 'conv-1',
        name: 'Chat',
      });
      mockMessagingAdapter.createMessage.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        userId: 'user-1',
        text: 'Hello team!',
        createdAt: new Date().toISOString(),
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ text: 'Hello team!' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message.text).toBe('Hello team!');
    });

    it('should create a message with asset attachment', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({
        id: 'conv-1',
        name: 'Chat',
      });
      mockMessagingAdapter.createMessage.mockResolvedValue({
        id: 'msg-2',
        conversationId: 'conv-1',
        userId: 'user-1',
        text: '',
        assetId: 'asset-1',
      });
      mockMessagingAdapter.getAssetById.mockResolvedValue({
        id: 'asset-1',
        name: 'screenshot.png',
      });

      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ assetId: 'asset-1' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message.asset).toBeDefined();
    });

    it('should return 400 when both text and assetId are missing', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('text or assetId is required');
    });

    it('should return 404 when conversation not found', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/conversations/nonexistent/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ text: 'Hello' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Conversation not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .send({ text: 'Hello' });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({
        id: 'conv-1',
      });
      mockMessagingAdapter.createMessage.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ text: 'Will fail' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to create message');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ text: 'Hello' });

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/conversations/:id/messages
  // ─────────────────────────────────────────────
  describe('GET /api/conversations/:id/messages', () => {
    it('should return messages for a conversation', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({
        id: 'conv-1',
        name: 'Chat',
      });
      mockMessagingAdapter.listMessages.mockResolvedValue([
        { id: 'msg-1', text: 'Hello', userId: 'user-1' },
        { id: 'msg-2', text: 'Hi there', userId: 'user-2' },
      ]);

      const response = await request(app)
        .get('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should return 404 when conversation not found', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/conversations/nonexistent/messages')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should pass pagination parameters', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({
        id: 'conv-1',
      });
      mockMessagingAdapter.listMessages.mockResolvedValue([]);

      await request(app)
        .get('/api/conversations/conv-1/messages?limit=10&before=msg-5')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockMessagingAdapter.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          limit: 10,
          before: 'msg-5',
        })
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/conversations/conv-1/messages');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.listMessages.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/conversations/conv-1/messages')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to list messages');
    });

    it('should cap limit at 100', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.listMessages.mockResolvedValue([]);

      await request(app)
        .get('/api/conversations/conv-1/messages?limit=999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockMessagingAdapter.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/conversations/:id/read
  // (First handler at line 243 uses messageId in body)
  // ─────────────────────────────────────────────
  describe('POST /api/conversations/:id/read', () => {
    it('should mark conversation as read', async () => {
      mockMessagingAdapter.setLastRead.mockResolvedValue({
        conversationId: 'conv-1',
        userId: 'user-1',
        messageId: 'msg-5',
      });

      const response = await request(app)
        .post('/api/conversations/conv-1/read')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ messageId: 'msg-5' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when messageId is missing', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/read')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('messageId is required');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/conversations/conv-1/read')
        .send({ messageId: 'msg-1' });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.setLastRead.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/conversations/conv-1/read')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ messageId: 'msg-5' });

      expect(response.status).toBe(500);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/conversations/conv-1/read')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ messageId: 'msg-5' });

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/conversations/:id/pins
  // ─────────────────────────────────────────────
  describe('GET /api/conversations/:id/pins', () => {
    it('should return pinned messages', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.listPinnedMessages.mockResolvedValue([
        { id: 'msg-1', text: 'Important info', isPinned: true },
      ]);

      const response = await request(app)
        .get('/api/conversations/conv-1/pins')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pins).toHaveLength(1);
    });

    it('should return 404 when conversation not found', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/conversations/nonexistent/pins')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/conversations/conv-1/pins');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.listPinnedMessages.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/conversations/conv-1/pins')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });

    it('should return empty array when no pins exist', async () => {
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.listPinnedMessages.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/conversations/conv-1/pins')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pins).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/messages/search
  // ─────────────────────────────────────────────
  describe('GET /api/messages/search', () => {
    it('should search messages with valid query', async () => {
      mockMessagingAdapter.searchMessages.mockResolvedValue([
        { id: 'msg-1', text: 'design review meeting', conversationId: 'conv-1' },
      ]);

      const response = await request(app)
        .get('/api/messages/search?q=design+review')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.query).toBe('design review');
    });

    it('should return 400 when query is too short', async () => {
      const response = await request(app)
        .get('/api/messages/search?q=a')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 2 characters');
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .get('/api/messages/search')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });

    it('should accept conversationId filter', async () => {
      mockMessagingAdapter.searchMessages.mockResolvedValue([]);

      await request(app)
        .get('/api/messages/search?q=test&conversationId=conv-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockMessagingAdapter.searchMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
        })
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/messages/search?q=hello');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.searchMessages.mockRejectedValue(new Error('Search error'));

      const response = await request(app)
        .get('/api/messages/search?q=something')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to search');
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/messages/:messageId/reactions
  // ─────────────────────────────────────────────
  describe('POST /api/messages/:messageId/reactions', () => {
    it('should add a reaction to a message', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.addReaction.mockResolvedValue({
        messageId: 'msg-1',
        reactions: [{ emoji: '👍', count: 1 }],
      });

      const response = await request(app)
        .post('/api/messages/msg-1/reactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ emoji: '👍' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reactions).toBeDefined();
    });

    it('should return 400 when emoji is missing', async () => {
      const response = await request(app)
        .post('/api/messages/msg-1/reactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid emoji');
    });

    it('should return 400 when emoji is too long', async () => {
      const response = await request(app)
        .post('/api/messages/msg-1/reactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ emoji: 'this-is-way-too-long' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when message not found', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/messages/nonexistent/reactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ emoji: '👍' });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not in conversation', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/messages/msg-1/reactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ emoji: '👍' });

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/messages/msg-1/reactions')
        .send({ emoji: '👍' });

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/messages/:messageId/pin
  // ─────────────────────────────────────────────
  describe('POST /api/messages/:messageId/pin', () => {
    it('should pin a message', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.pinMessage.mockResolvedValue([{ id: 'msg-1', isPinned: true }]);

      const response = await request(app)
        .post('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pins).toBeDefined();
    });

    it('should return 404 when message not found', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/messages/nonexistent/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 when not in conversation', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/messages/msg-1/pin');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.pinMessage.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /api/messages/:messageId/pin
  // ─────────────────────────────────────────────
  describe('DELETE /api/messages/:messageId/pin', () => {
    it('should unpin a message', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.unpinMessage.mockResolvedValue([]);

      const response = await request(app)
        .delete('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 when message not found', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/messages/nonexistent/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 when not in conversation', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/messages/msg-1/pin');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.unpinMessage.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/messages/msg-1/pin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /api/conversations/:id/members/:userId
  // ─────────────────────────────────────────────
  describe('DELETE /api/conversations/:id/members/:userId', () => {
    it('should remove a member from conversation', async () => {
      mockMessagingAdapter.removeMember.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/conversations/conv-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/conversations/conv-1/members/user-2');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.removeMember.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/conversations/conv-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to remove member');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .delete('/api/conversations/conv-1/members/user-2')
        .set('Authorization', 'Bearer bad');

      expect(response.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .delete('/api/conversations/conv-1/members/user-2')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // PATCH /api/messages/:messageId
  // ─────────────────────────────────────────────
  describe('PATCH /api/messages/:messageId', () => {
    it('should edit a message', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        userId: 'user-1',
      });
      mockMessagingAdapter.getConversationById.mockResolvedValue({ id: 'conv-1' });
      mockMessagingAdapter.editMessage.mockResolvedValue({
        id: 'msg-1',
        text: 'Updated text',
        editedAt: new Date().toISOString(),
      });

      const response = await request(app)
        .patch('/api/messages/msg-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Updated text' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .patch('/api/messages/msg-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Content is required');
    });

    it('should return 400 when content is empty string', async () => {
      const response = await request(app)
        .patch('/api/messages/msg-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when message not found', async () => {
      mockMessagingAdapter.getMessageById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/messages/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .patch('/api/messages/msg-1')
        .send({ content: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /api/messages/:id
  // ─────────────────────────────────────────────
  describe('DELETE /api/messages/:id', () => {
    it('should delete a message', async () => {
      mockMessagingAdapter.deleteMessage.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/messages/msg-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deleted).toBe(true);
    });

    it('should return 404 when message not found or not authorized', async () => {
      mockMessagingAdapter.deleteMessage.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/messages/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/messages/msg-1');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockMessagingAdapter.deleteMessage.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/messages/msg-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to delete');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .delete('/api/messages/msg-1')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });
});
