/**
 * Feature Flags Integration Tests
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Tests the admin flag CRUD routes and evaluation logic.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn(),
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

jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn(),
}));

jest.mock('../../lib/featureFlags', () => ({
  invalidateCache: jest.fn(),
  evaluateAllFlags: jest.fn().mockResolvedValue({ 'test-flag': true }),
}));

const { query } = require('../../database/config');
const { invalidateCache } = require('../../lib/featureFlags');

function createTestToken(userId = 'admin-user-1', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'admin@test.com', userType: 'admin', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createNonAdminToken(userId = 'user-1') {
  return jwt.sign(
    { id: userId, email: 'user@test.com', userType: 'client' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  const flagRoutes = require('../../routes/admin-flags');
  app.use('/api/admin/flags', flagRoutes);
  return app;
}

describe('Feature Flags Integration Tests', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(() => {
    app = createApp();
    adminToken = createTestToken();
    userToken = createNonAdminToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/flags', () => {
    it('returns list of flags for admin', async () => {
      const mockFlags = [
        { id: 'uuid-1', name: 'new-dashboard', enabled: true, rollout_percentage: 100 },
        { id: 'uuid-2', name: 'ai-copilot', enabled: false, rollout_percentage: 50 },
      ];
      query.mockResolvedValueOnce({ rows: mockFlags });

      const res = await request(app)
        .get('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('new-dashboard');
    });

    it('rejects non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/flags')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/admin/flags');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/flags/evaluate', () => {
    it('returns evaluated flags for authenticated user', async () => {
      const res = await request(app)
        .get('/api/admin/flags/evaluate')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ 'test-flag': true });
    });
  });

  describe('POST /api/admin/flags', () => {
    it('creates a new flag', async () => {
      const newFlag = {
        id: 'uuid-new',
        name: 'beta-feature',
        description: 'A beta feature',
        enabled: false,
        rollout_percentage: 100,
        user_allowlist: [],
        metadata: {},
        created_by: 'admin-user-1',
      };
      query.mockResolvedValueOnce({ rows: [newFlag] });

      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'beta-feature', description: 'A beta feature' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('beta-feature');
      expect(invalidateCache).toHaveBeenCalledWith('beta-feature');
    });

    it('rejects invalid flag names', async () => {
      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Invalid Name!' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('lowercase');
    });

    it('rejects missing name', async () => {
      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'No name provided' });

      expect(res.status).toBe(400);
    });

    it('returns 409 for duplicate flag name', async () => {
      query.mockRejectedValueOnce({ code: '23505' });

      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'existing-flag' });

      expect(res.status).toBe(409);
    });
  });

  describe('PATCH /api/admin/flags/:id', () => {
    it('updates flag enabled status', async () => {
      const updated = { id: 'uuid-1', name: 'my-flag', enabled: true, rollout_percentage: 100 };
      query.mockResolvedValueOnce({ rows: [updated] });

      const res = await request(app)
        .patch('/api/admin/flags/uuid-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(invalidateCache).toHaveBeenCalledWith('my-flag');
    });

    it('updates rollout percentage', async () => {
      const updated = { id: 'uuid-1', name: 'my-flag', enabled: true, rollout_percentage: 25 };
      query.mockResolvedValueOnce({ rows: [updated] });

      const res = await request(app)
        .patch('/api/admin/flags/uuid-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rollout_percentage: 25 });

      expect(res.status).toBe(200);
      expect(res.body.rollout_percentage).toBe(25);
    });

    it('rejects invalid rollout percentage', async () => {
      const res = await request(app)
        .patch('/api/admin/flags/uuid-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rollout_percentage: 150 });

      expect(res.status).toBe(400);
    });

    it('returns 400 for empty update', async () => {
      const res = await request(app)
        .patch('/api/admin/flags/uuid-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent flag', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/api/admin/flags/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/flags/:id', () => {
    it('deletes a flag', async () => {
      query.mockResolvedValueOnce({ rows: [{ name: 'old-flag' }] });

      const res = await request(app)
        .delete('/api/admin/flags/uuid-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(invalidateCache).toHaveBeenCalledWith('old-flag');
    });

    it('returns 404 for non-existent flag', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/admin/flags/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
