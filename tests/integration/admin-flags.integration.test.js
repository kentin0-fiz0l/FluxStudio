/**
 * Admin Feature Flags Route Integration Tests
 *
 * Tests CRUD operations for feature flags, admin authorization,
 * and error handling.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

// Mock database/config
jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

const { query } = require('../../database/config');

// Mock lib/auth/tokenService
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

// Mock auditLog
jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn()
}));

// Mock featureFlags
jest.mock('../../lib/featureFlags', () => ({
  invalidateCache: jest.fn(),
  evaluateAllFlags: jest.fn()
}));

// Mock zodValidate middleware — pass through
jest.mock('../../middleware/zodValidate', () => ({
  zodValidate: () => (req, res, next) => next()
}));

// Mock schemas
jest.mock('../../lib/schemas', () => ({
  createFeatureFlagSchema: {},
  updateFeatureFlagSchema: {}
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with admin-flags routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/admin-flags');
  app.use('/api/admin/flags', routes);
  return app;
}

describe('Admin Feature Flags Integration Tests', () => {
  let app;
  let adminToken;
  let userToken;
  const adminId = 'admin-user-123';
  const userId = 'regular-user-456';

  beforeAll(() => {
    app = createApp();
    adminToken = createTestToken(adminId, { userType: 'admin' });
    userToken = createTestToken(userId, { userType: 'client' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      await request(app).get('/api/admin/flags').expect(401);
    });

    it('should return 401 for POST without token', async () => {
      await request(app).post('/api/admin/flags').send({ name: 'test' }).expect(401);
    });
  });

  // =========================================================================
  // Admin Authorization
  // =========================================================================
  describe('Admin Authorization', () => {
    it('should return 403 for non-admin user on GET /', async () => {
      const res = await request(app)
        .get('/api/admin/flags')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });

    it('should return 403 for non-admin user on POST /', async () => {
      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'test-flag' })
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });
  });

  // =========================================================================
  // GET /api/admin/flags — List Flags
  // =========================================================================
  describe('GET /api/admin/flags', () => {
    it('should list all feature flags for admin', async () => {
      const mockFlags = [
        { id: 'flag-1', name: 'dark-mode', enabled: true, rollout_percentage: 100 },
        { id: 'flag-2', name: 'beta-feature', enabled: false, rollout_percentage: 50 },
      ];
      query.mockResolvedValueOnce({ rows: mockFlags });

      const res = await request(app)
        .get('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('dark-mode');
      expect(res.body[1].name).toBe('beta-feature');
    });
  });

  // =========================================================================
  // POST /api/admin/flags — Create Flag
  // =========================================================================
  describe('POST /api/admin/flags', () => {
    it('should create a flag with name and description', async () => {
      const mockFlag = {
        id: 'flag-new',
        name: 'new-feature',
        description: 'A new feature flag',
        enabled: false,
        rollout_percentage: 100,
      };
      query.mockResolvedValueOnce({ rows: [mockFlag] });

      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'new-feature', description: 'A new feature flag' })
        .expect(201);

      expect(res.body.id).toBe('flag-new');
      expect(res.body.name).toBe('new-feature');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'No name provided' })
        .expect(400);

      expect(res.body.error).toBe('Flag name is required');
    });

    it('should return 400 for invalid name format', async () => {
      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Invalid Name With Spaces!' })
        .expect(400);

      expect(res.body.error).toBe('Flag name must be lowercase alphanumeric with hyphens only');
    });
  });

  // =========================================================================
  // PATCH /api/admin/flags/:id — Update Flag
  // =========================================================================
  describe('PATCH /api/admin/flags/:id', () => {
    it('should update flag with enabled and rollout_percentage', async () => {
      const updatedFlag = {
        id: 'flag-1',
        name: 'dark-mode',
        enabled: true,
        rollout_percentage: 75,
      };
      query.mockResolvedValueOnce({ rows: [updatedFlag] });

      const res = await request(app)
        .patch('/api/admin/flags/flag-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true, rollout_percentage: 75 })
        .expect(200);

      expect(res.body.enabled).toBe(true);
      expect(res.body.rollout_percentage).toBe(75);
    });

    it('should return 404 when flag not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .patch('/api/admin/flags/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false })
        .expect(404);

      expect(res.body.error).toBe('Feature flag not found');
    });

    it('should return 400 when no valid fields provided', async () => {
      const res = await request(app)
        .patch('/api/admin/flags/flag-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('No valid fields to update');
    });
  });

  // =========================================================================
  // DELETE /api/admin/flags/:id — Delete Flag
  // =========================================================================
  describe('DELETE /api/admin/flags/:id', () => {
    it('should delete flag successfully', async () => {
      query.mockResolvedValueOnce({ rows: [{ name: 'old-flag' }] });

      const res = await request(app)
        .delete('/api/admin/flags/flag-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when flag not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/admin/flags/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toBe('Feature flag not found');
    });
  });

  // =========================================================================
  // Database Error Handling
  // =========================================================================
  describe('Database error handling', () => {
    it('should return 500 when query throws on list', async () => {
      query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to fetch feature flags');
    });

    it('should return 500 when query throws on create', async () => {
      query.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/admin/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'failing-flag' })
        .expect(500);

      expect(res.body.error).toBe('Failed to create feature flag');
    });
  });
});
