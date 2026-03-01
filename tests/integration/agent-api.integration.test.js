/**
 * Agent API Route Integration Tests
 *
 * Tests all agent endpoints: search, list, get, activity,
 * what_changed, daily_brief, chat SSE, sessions, pending actions.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn(),
  generateCuid: jest.fn(() => 'mock-cuid'),
}));

jest.mock('../../lib/auth/tokenService', () => ({
  verifyAccessToken: jest.fn((token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }),
  generateAccessToken: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockAgentService = {
  searchProjects: jest.fn(),
  listProjects: jest.fn(),
  getProject: jest.fn(),
  getActivityFeed: jest.fn(),
  whatChanged: jest.fn(),
  generateDailyBrief: jest.fn(),
  chat: jest.fn(),
  createSession: jest.fn(),
  getSession: jest.fn(),
  getPendingActions: jest.fn(),
  resolvePendingAction: jest.fn(),
};
jest.mock('../../services/agent-service', () => mockAgentService);

jest.mock('../../lib/agent/middleware', () => ({
  agentPermissions: jest.fn(() => (req, res, next) => next()),
  auditLog: jest.fn(() => (req, res, next) => next()),
  agentRateLimit: jest.fn(() => (req, res, next) => next()),
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with agent routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/agent-api');
  app.use('/agent', routes);
  return app;
}

describe('Agent API Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for missing token', async () => {
      await request(app)
        .get('/agent/search_projects?query=test')
        .expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(app)
        .get('/agent/search_projects?query=test')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /agent/search_projects
  // =========================================================================
  describe('GET /agent/search_projects', () => {
    it('should return 200 with search results', async () => {
      mockAgentService.searchProjects.mockResolvedValueOnce([
        { id: 'proj-1', name: 'Test Project' },
      ]);

      const res = await request(app)
        .get('/agent/search_projects?query=test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.count).toBe(1);
      expect(mockAgentService.searchProjects).toHaveBeenCalledWith(
        userId,
        'test',
        expect.objectContaining({ limit: 10, offset: 0 })
      );
    });

    it('should return 200 with empty results', async () => {
      mockAgentService.searchProjects.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/agent/search_projects?query=nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.count).toBe(0);
    });

    it('should return 400 for missing query parameter', async () => {
      const res = await request(app)
        .get('/agent/search_projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.error).toBe('Bad request');
    });
  });

  // =========================================================================
  // GET /agent/list_projects
  // =========================================================================
  describe('GET /agent/list_projects', () => {
    it('should return 200 with projects list', async () => {
      mockAgentService.listProjects.mockResolvedValueOnce([
        { id: 'proj-1', name: 'Project One' },
        { id: 'proj-2', name: 'Project Two' },
      ]);

      const res = await request(app)
        .get('/agent/list_projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    it('should return 500 on service error', async () => {
      mockAgentService.listProjects.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/agent/list_projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // GET /agent/get_project/:id
  // =========================================================================
  describe('GET /agent/get_project/:id', () => {
    it('should return 200 with project details', async () => {
      mockAgentService.getProject.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Test Project',
      });

      const res = await request(app)
        .get('/agent/get_project/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('proj-1');
    });

    it('should return 404 when project not found', async () => {
      mockAgentService.getProject.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/agent/get_project/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Not found');
    });

    it('should return 500 on service error', async () => {
      mockAgentService.getProject.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/agent/get_project/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // GET /agent/activity_feed
  // =========================================================================
  describe('GET /agent/activity_feed', () => {
    it('should return 200 with activity feed', async () => {
      mockAgentService.getActivityFeed.mockResolvedValueOnce([
        { id: 'act-1', type: 'project_created' },
      ]);

      const res = await request(app)
        .get('/agent/activity_feed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 500 on service error', async () => {
      mockAgentService.getActivityFeed.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/agent/activity_feed')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // GET /agent/what_changed
  // =========================================================================
  describe('GET /agent/what_changed', () => {
    it('should return 200 with changes', async () => {
      mockAgentService.whatChanged.mockResolvedValueOnce({
        changes: [{ id: 'change-1' }],
      });

      const res = await request(app)
        .get('/agent/what_changed?since=2026-01-01')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 500 on service error', async () => {
      mockAgentService.whatChanged.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/agent/what_changed')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // GET /agent/daily_brief
  // =========================================================================
  describe('GET /agent/daily_brief', () => {
    it('should return 200 with daily brief', async () => {
      mockAgentService.generateDailyBrief.mockResolvedValueOnce({
        summary: 'Your daily brief',
      });

      const res = await request(app)
        .get('/agent/daily_brief')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBe('Your daily brief');
    });

    it('should return 500 on service error', async () => {
      mockAgentService.generateDailyBrief.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/agent/daily_brief')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // POST /agent/chat
  // =========================================================================
  describe('POST /agent/chat', () => {
    it('should return 400 for empty body (Zod validation)', async () => {
      const res = await request(app)
        .post('/agent/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should stream SSE response on success', async () => {
      mockAgentService.chat.mockResolvedValueOnce({
        content: 'Hello from agent',
        toolsUsed: [],
      });

      const res = await request(app)
        .post('/agent/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Hello' });

      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.text).toContain('data:');
      expect(res.text).toContain('"type":"start"');
      expect(res.text).toContain('"type":"chunk"');
      expect(res.text).toContain('"type":"done"');
    });

    it('should handle service error in chat SSE', async () => {
      mockAgentService.chat.mockRejectedValueOnce(new Error('Chat failed'));

      const res = await request(app)
        .post('/agent/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Hello' });

      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.text).toContain('"type":"error"');
    });
  });

  // =========================================================================
  // POST /agent/session
  // =========================================================================
  describe('POST /agent/session', () => {
    it('should return 200 with new session', async () => {
      mockAgentService.createSession.mockResolvedValueOnce({
        id: 'session-1',
        userId,
      });

      const res = await request(app)
        .post('/agent/session')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('session-1');
    });

    it('should return 500 on service error', async () => {
      mockAgentService.createSession.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/agent/session')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // GET /agent/session/:id
  // =========================================================================
  describe('GET /agent/session/:id', () => {
    it('should return 200 with session details', async () => {
      mockAgentService.getSession.mockResolvedValueOnce({
        id: 'session-1',
        user_id: userId,
      });

      const res = await request(app)
        .get('/agent/session/session-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('session-1');
    });

    it('should return 404 when session not found', async () => {
      mockAgentService.getSession.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/agent/session/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Not found');
    });
  });

  // =========================================================================
  // POST /agent/pending_action/:id/approve
  // =========================================================================
  describe('POST /agent/pending_action/:id/approve', () => {
    it('should return 200 on success', async () => {
      mockAgentService.resolvePendingAction.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/agent/pending_action/action-1/approve')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Action approved');
      expect(mockAgentService.resolvePendingAction).toHaveBeenCalledWith(
        'action-1',
        'approved',
        userId
      );
    });

    it('should return 500 on service error', async () => {
      mockAgentService.resolvePendingAction.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/agent/pending_action/action-1/approve')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // POST /agent/pending_action/:id/reject
  // =========================================================================
  describe('POST /agent/pending_action/:id/reject', () => {
    it('should return 200 on success', async () => {
      mockAgentService.resolvePendingAction.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/agent/pending_action/action-1/reject')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Action rejected');
      expect(mockAgentService.resolvePendingAction).toHaveBeenCalledWith(
        'action-1',
        'rejected',
        userId
      );
    });

    it('should return 500 on service error', async () => {
      mockAgentService.resolvePendingAction.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/agent/pending_action/action-1/reject')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });

  // =========================================================================
  // GET /agent/pending_actions
  // =========================================================================
  describe('GET /agent/pending_actions', () => {
    it('should return 200 with pending actions', async () => {
      mockAgentService.getPendingActions.mockResolvedValueOnce([
        { id: 'action-1', type: 'deploy' },
      ]);

      const res = await request(app)
        .get('/agent/pending_actions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.count).toBe(1);
    });

    it('should return 500 on service error', async () => {
      mockAgentService.getPendingActions.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/agent/pending_actions')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Internal server error');
    });
  });
});
