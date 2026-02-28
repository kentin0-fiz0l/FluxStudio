/**
 * Feedback Route Integration Tests
 *
 * Tests feedback submission, admin listing,
 * validation, pagination, and error handling.
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

const { query: dbQuery } = require('../../database/config');

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

jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn()
}));

jest.mock('../../lib/auth/middleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = require('jsonwebtoken').verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }),
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createAdminToken(userId = 'admin-user-1') {
  return jwt.sign(
    { id: userId, email: 'admin@example.com', userType: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with feedback routes
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/feedback', require('../../routes/feedback'));
  return app;
}

describe('Feedback Integration Tests', () => {
  let app;
  let token;
  let adminToken;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
    adminToken = createAdminToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for POST /api/feedback without token', async () => {
      await request(app).post('/api/feedback').send({ type: 'bug', message: 'test' }).expect(401);
    });
  });

  // =========================================================================
  // POST /api/feedback
  // =========================================================================
  describe('POST /api/feedback', () => {
    it('should submit feedback with valid type and message -> 201', async () => {
      dbQuery.mockResolvedValueOnce({
        rows: [{ id: 'fb-1', type: 'bug', created_at: '2025-06-01T00:00:00Z' }],
      });

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'bug', message: 'Button does not work' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('fb-1');
      expect(res.body.data.type).toBe('bug');
    });

    it('should return 400 when type is missing (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Missing type field' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 when type is invalid enum value (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'complaint', message: 'Invalid type' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should handle database error with 500', async () => {
      dbQuery.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'feature', message: 'Add dark mode' })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to submit feedback.');
    });
  });

  // =========================================================================
  // GET /api/feedback/admin
  // =========================================================================
  describe('GET /api/feedback/admin', () => {
    it('should list feedback for admin user -> 200', async () => {
      dbQuery.mockResolvedValueOnce({
        rows: [
          { id: 'fb-1', type: 'bug', message: 'Broken button', page_url: '/dashboard', user_agent: 'Chrome', created_at: '2025-06-01', email: 'user@test.com', user_name: 'Test User' },
        ],
      });
      dbQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      const res = await request(app)
        .get('/api/feedback/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('fb-1');
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/feedback/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });

    it('should return pagination info', async () => {
      dbQuery.mockResolvedValueOnce({ rows: [] });
      dbQuery.mockResolvedValueOnce({ rows: [{ count: '50' }] });

      const res = await request(app)
        .get('/api/feedback/admin?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.total).toBe(50);
      expect(res.body.pagination.totalPages).toBe(5);
    });

    it('should handle database error with 500', async () => {
      dbQuery.mockRejectedValueOnce(new Error('Query failed'));

      const res = await request(app)
        .get('/api/feedback/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to fetch feedback.');
    });
  });
});
