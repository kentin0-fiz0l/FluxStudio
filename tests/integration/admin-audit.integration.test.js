/**
 * Admin Audit Log Integration Tests
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

jest.mock('../../lib/auth/middleware', () => {
  const actual = jest.requireActual('../../lib/auth/middleware');
  return {
    ...actual,
    authenticateToken: actual.authenticateToken
  };
});

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

const { query } = require('../../database/config');

function createTestToken(userId = 'test-user', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'admin@example.com', userType: 'admin', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createNonAdminToken(userId = 'test-user') {
  return jwt.sign(
    { id: userId, email: 'user@example.com', userType: 'client' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin/audit-logs', require('../../routes/admin-audit'));
  return app;
}

describe('Admin Audit Log Integration Tests', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = createTestToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      await request(app)
        .get('/admin/audit-logs')
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      const nonAdminToken = createNonAdminToken();

      const res = await request(app)
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });
  });

  // =========================================================================
  // GET /admin/audit-logs
  // =========================================================================
  describe('GET /admin/audit-logs', () => {
    it('should return paginated audit logs', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 'log-1', user_id: 'u1', action: 'login', resource_type: 'user',
            resource_id: null, details: {}, ip_address: '127.0.0.1', user_agent: 'test',
            created_at: new Date(), user_name: 'Test', user_email: 'test@example.com'
          },
          {
            id: 'log-2', user_id: 'u2', action: 'create', resource_type: 'project',
            resource_id: 'p1', details: { name: 'My Project' }, ip_address: '127.0.0.1',
            user_agent: 'test', created_at: new Date(), user_name: 'User2', user_email: 'user2@example.com'
          }
        ]
      });

      const res = await request(app)
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.logs).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by action', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      query.mockResolvedValueOnce({
        rows: [{
          id: 'log-1', user_id: 'u1', action: 'login', resource_type: 'user',
          resource_id: null, details: {}, ip_address: '127.0.0.1', user_agent: 'test',
          created_at: new Date(), user_name: 'Test', user_email: 'test@example.com'
        }]
      });

      const res = await request(app)
        .get('/admin/audit-logs?action=login')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.logs).toHaveLength(1);
    });

    it('should filter by userId', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
      query.mockResolvedValueOnce({
        rows: [{
          id: 'log-1', user_id: 'u1', action: 'login', resource_type: 'user',
          resource_id: null, details: {}, ip_address: '127.0.0.1', user_agent: 'test',
          created_at: new Date(), user_name: 'Test', user_email: 'test@example.com'
        }]
      });

      const res = await request(app)
        .get('/admin/audit-logs?userId=u1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.logs).toHaveLength(1);
    });

    it('should return empty results', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.logs).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // =========================================================================
  // GET /admin/audit-logs/export
  // =========================================================================
  describe('GET /admin/audit-logs/export', () => {
    it('should return CSV export', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          action: 'login', resource_type: 'user', resource_id: null,
          details: {}, ip_address: '127.0.0.1', created_at: new Date(),
          user_name: 'Test', user_email: 'test@example.com'
        }]
      });

      const res = await request(app)
        .get('/admin/audit-logs/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toMatch(/^Timestamp,/);
    });

    it('should return empty CSV when no data', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/admin/audit-logs/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toMatch(/^Timestamp,/);
    });
  });
});
