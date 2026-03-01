/**
 * Sessions Management Integration Tests
 *
 * Sprint 42: Phase 5.5 — Coverage push for Sprint 41 features
 *
 * Tests session list, revoke, and revoke-all endpoints.
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

function createTestToken(userId = 'user-1') {
  return jwt.sign(
    { id: userId, email: 'user@test.com', userType: 'client', sessionId: 'sess-current' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  const sessionRoutes = require('../../routes/sessions');
  app.use('/api/sessions', sessionRoutes);
  return app;
}

describe('Sessions Integration Tests', () => {
  let app;
  let token;

  beforeAll(() => {
    app = createApp();
    token = createTestToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/sessions', () => {
    it('returns list of active sessions', async () => {
      const mockSessions = [
        {
          id: 'sess-current', user_id: 'user-1', ip_address: '127.0.0.1',
          user_agent: 'Test/1.0', created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        },
        {
          id: 'sess-old', user_id: 'user-1', ip_address: '192.168.1.1',
          user_agent: 'Test/2.0', created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        },
      ];
      query.mockResolvedValueOnce({ rows: mockSessions });

      const res = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.sessions)).toBe(true);
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('revokes a specific session', async () => {
      const sessionId = '00000000-0000-4000-8000-000000000001';
      // Check ownership
      query.mockResolvedValueOnce({ rows: [{ id: sessionId, user_id: 'user-1', token_id: 'tok-1' }] });
      // removeSession DELETE
      query.mockResolvedValueOnce({ rows: [] });
      // logAction INSERT
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent session', async () => {
      const sessionId = '00000000-0000-4000-8000-000000000099';
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/sessions (revoke all)', () => {
    it('revokes all sessions except current', async () => {
      query.mockResolvedValueOnce({ rows: [], rowCount: 3 });

      const res = await request(app)
        .delete('/api/sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
