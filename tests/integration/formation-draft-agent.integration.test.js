/**
 * Formation Draft Agent Route Integration Tests
 *
 * Tests AI formation generation pipeline, session management,
 * approval, refinement, and interruption.
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

jest.mock('../../lib/agent/middleware', () => ({
  agentPermissions: jest.fn(() => (req, res, next) => next()),
  auditLog: jest.fn(() => (req, res, next) => next()),
  agentRateLimit: jest.fn(() => (req, res, next) => next()),
}));

const mockDraftService = {
  createSession: jest.fn(),
  updateSession: jest.fn(),
  getSession: jest.fn(),
  analyzeMusicStructure: jest.fn(),
  generateShowPlan: jest.fn(),
  getPerformerList: jest.fn(),
  generateKeyframe: jest.fn(),
  smoothTransitions: jest.fn(),
  approveShowPlan: jest.fn(),
  refineFormation: jest.fn(),
  cancelGeneration: jest.fn(),
  pauseGeneration: jest.fn(),
  createFallbackSections: jest.fn(),
};

jest.mock('../../services/formation-draft-service', () => mockDraftService);

jest.mock('../../services/formation-draft-yjs-client', () => ({
  FormationDraftYjsClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    setAgentAwareness: jest.fn(),
    writePositionsProgressively: jest.fn(),
    updateKeyframePositions: jest.fn(),
  })),
}));

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
  const agentRoutes = require('../../routes/formation-draft-agent');
  app.use('/api/formation-agent', agentRoutes);
  return app;
}

describe('Formation Draft Agent Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    Object.values(mockDraftService).forEach(fn => fn.mockReset());
  });

  // Authentication
  describe('Authentication', () => {
    it('should return 401 for POST /api/formation-agent/generate without token', async () => {
      await request(app)
        .post('/api/formation-agent/generate')
        .send({ formationId: 'f-1', showDescription: 'test', performerCount: 5 })
        .expect(401);
    });

    it('should return 401 for GET /api/formation-agent/session/:id without token', async () => {
      await request(app).get('/api/formation-agent/session/s-1').expect(401);
    });
  });

  // Zod validation on generate
  describe('POST /api/formation-agent/generate - Validation', () => {
    it('should return 400 for missing formationId', async () => {
      const res = await request(app)
        .post('/api/formation-agent/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ showDescription: 'test', performerCount: 5 });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing showDescription', async () => {
      const res = await request(app)
        .post('/api/formation-agent/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ formationId: 'f-1', performerCount: 5 });
      expect(res.status).toBe(400);
    });

    it('should return 400 for negative performerCount', async () => {
      const res = await request(app)
        .post('/api/formation-agent/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ formationId: 'f-1', showDescription: 'test', performerCount: -1 });
      expect(res.status).toBe(400);
    });
  });

  // Approve
  describe('POST /api/formation-agent/session/:id/approve', () => {
    it('should approve a session', async () => {
      mockDraftService.getSession.mockResolvedValue({ id: 's-1', user_id: userId, status: 'awaiting_approval' });
      mockDraftService.approveShowPlan.mockResolvedValue(true);
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/approve')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      mockDraftService.getSession.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/formation-agent/session/non-existent/approve')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('should return 400 if session is not awaiting approval', async () => {
      mockDraftService.getSession.mockResolvedValue({ id: 's-1', user_id: userId, status: 'running' });
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/approve')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  // Refine
  describe('POST /api/formation-agent/session/:id/refine', () => {
    it('should return 400 for missing instruction', async () => {
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/refine')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent session', async () => {
      mockDraftService.getSession.mockResolvedValue(null);
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/refine')
        .set('Authorization', `Bearer ${token}`)
        .send({ instruction: 'make it more dynamic' });
      expect(res.status).toBe(404);
    });

    it('should return 400 if session not in done/paused state', async () => {
      mockDraftService.getSession.mockResolvedValue({ id: 's-1', user_id: userId, status: 'running' });
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/refine')
        .set('Authorization', `Bearer ${token}`)
        .send({ instruction: 'test' });
      expect(res.status).toBe(400);
    });
  });

  // Interrupt
  describe('POST /api/formation-agent/session/:id/interrupt', () => {
    it('should cancel a session', async () => {
      mockDraftService.getSession.mockResolvedValue({ id: 's-1', user_id: userId, status: 'running' });
      mockDraftService.cancelGeneration.mockResolvedValue(true);
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/interrupt')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'cancel' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('cancel');
    });

    it('should pause a session', async () => {
      mockDraftService.getSession.mockResolvedValue({ id: 's-1', user_id: userId, status: 'running' });
      mockDraftService.pauseGeneration.mockResolvedValue(true);
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/interrupt')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'pause' });
      expect(res.status).toBe(200);
      expect(res.body.action).toBe('pause');
    });

    it('should return 400 for invalid action', async () => {
      const res = await request(app)
        .post('/api/formation-agent/session/s-1/interrupt')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  // Get session
  describe('GET /api/formation-agent/session/:id', () => {
    it('should return session data', async () => {
      mockDraftService.getSession.mockResolvedValue({
        id: 's-1',
        user_id: userId,
        formation_id: 'f-1',
        status: 'done',
        show_plan: {},
        plan_approved: true,
        tokens_used: 100,
        current_section_index: 3,
        total_sections: 3,
        error_message: null,
        created_at: '2026-01-01',
        completed_at: '2026-01-01',
      });
      const res = await request(app)
        .get('/api/formation-agent/session/s-1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('s-1');
      expect(res.body.data.status).toBe('done');
    });

    it('should return 404 for non-existent session', async () => {
      mockDraftService.getSession.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/formation-agent/session/non-existent')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for another users session', async () => {
      mockDraftService.getSession.mockResolvedValue({ id: 's-1', user_id: 'other-user' });
      const res = await request(app)
        .get('/api/formation-agent/session/s-1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
