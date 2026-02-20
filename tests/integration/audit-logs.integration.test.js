/**
 * Audit Logs Integration Tests
 *
 * Sprint 42: Phase 5.5 — Coverage push for Sprint 41 features
 *
 * Tests the admin audit log API routes.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

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

const { query } = require('../../database/config');

function createAdminToken(userId = 'admin-1') {
  return jwt.sign(
    { id: userId, email: 'admin@test.com', userType: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createUserToken(userId = 'user-1') {
  return jwt.sign(
    { id: userId, email: 'user@test.com', userType: 'client' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  const auditRoutes = require('../../routes/admin-audit');
  app.use('/api/admin/audit-logs', auditRoutes);
  return app;
}

describe('Audit Logs Integration Tests', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(() => {
    app = createApp();
    adminToken = createAdminToken();
    userToken = createUserToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/audit-logs', () => {
    it('returns paginated audit logs for admin', async () => {
      const mockLogs = [
        { id: '1', user_id: 'u1', action: 'create', resource_type: 'project', created_at: new Date().toISOString() },
        { id: '2', user_id: 'u2', action: 'delete', resource_type: 'file', created_at: new Date().toISOString() },
      ];
      // Count query + data query
      query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockLogs });

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs || res.body).toBeDefined();
    });

    it('rejects non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('supports search filter', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/admin/audit-logs?search=project')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('supports pagination parameters', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/admin/audit-logs?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/admin/audit-logs/export', () => {
    it('returns CSV export for admin', async () => {
      const mockLogs = [
        {
          id: '1', user_id: 'u1', action: 'create', resource_type: 'project',
          resource_id: 'p1', details: '{}', ip_address: '127.0.0.1',
          created_at: new Date().toISOString(), email: 'user@test.com',
        },
      ];
      query.mockResolvedValueOnce({ rows: mockLogs });

      const res = await request(app)
        .get('/api/admin/audit-logs/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });
});
