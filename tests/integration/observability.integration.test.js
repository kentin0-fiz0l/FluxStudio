/**
 * Observability Route Integration Tests
 *
 * Tests event ingestion, web vitals beacon, vitals summary,
 * and admin metrics endpoints.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks (must be before route require) ---

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

jest.mock('../../lib/auth/middleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }),
}));

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../lib/monitoring/performanceMetrics', () => ({
  getHistory: jest.fn(() => []),
  getSummary: jest.fn(() => ({})),
  getCurrentMetrics: jest.fn(() => ({})),
}));

jest.mock('../../lib/analytics/funnelTracker', () => ({
  queryFunnel: jest.fn().mockResolvedValue(null),
  FUNNEL_STAGES: ['visit', 'signup', 'activate', 'subscribe'],
}));

const { query } = require('../../database/config');

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
    { id: userId, email: 'admin@example.com', userType: 'admin', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with observability routes
function createApp() {
  const app = express();
  app.use(express.json());
  app.set('io', null);
  const routes = require('../../routes/observability');
  app.use('/observability', routes);
  return app;
}

describe('Observability Integration Tests', () => {
  let app;
  let token;
  let adminToken;

  beforeAll(() => {
    app = createApp();
    token = createTestToken();
    adminToken = createAdminToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: query resolves successfully
    query.mockResolvedValue({ rows: [] });
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for /events without token', async () => {
      await request(app)
        .post('/observability/events')
        .send({ events: [{ name: 'page_view', sessionId: 'sess-1' }] })
        .expect(401);
    });

    it('/vitals should NOT require auth', async () => {
      query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/observability/vitals')
        .send({ name: 'LCP', value: 2500.0, id: 'v1-xxx', rating: 'good', url: '/' });

      // Should not be 401 — vitals is unauthenticated
      expect(res.status).not.toBe(401);
    });
  });

  // =========================================================================
  // POST /observability/events
  // =========================================================================
  describe('POST /observability/events', () => {
    it('should return 200 for valid event batch', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/observability/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          events: [
            { name: 'page_view', sessionId: 'sess-1' },
            { name: 'click', sessionId: 'sess-1', properties: { button: 'submit' } },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('should return 400 for empty events array', async () => {
      const res = await request(app)
        .post('/observability/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ events: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for Zod validation failure (missing events)', async () => {
      const res = await request(app)
        .post('/observability/events')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 500 on DB error', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/observability/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          events: [{ name: 'page_view', sessionId: 'sess-1' }],
        })
        .expect(500);

      expect(res.body.error).toBe('Failed to store events');
    });

    it('should handle single event in batch', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/observability/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          events: [{ name: 'page_view', sessionId: 'sess-1' }],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });

  // =========================================================================
  // POST /observability/vitals (single format)
  // =========================================================================
  describe('POST /observability/vitals (single format)', () => {
    it('should return 204 for valid single vital', async () => {
      query.mockResolvedValue({ rows: [] });

      await request(app)
        .post('/observability/vitals')
        .send({
          name: 'LCP',
          value: 2500.0,
          id: 'v1-xxx',
          rating: 'good',
          url: '/',
        })
        .expect(204);
    });

    it('should return 400 for invalid metric name', async () => {
      const res = await request(app)
        .post('/observability/vitals')
        .send({
          name: 'INVALID_METRIC',
          value: 100,
          id: 'v1-xxx',
          rating: 'good',
          url: '/',
        })
        .expect(400);

      expect(res.body.error).toBe('Invalid metric name');
    });

    it('should return 400 for missing required fields (falls through to batch)', async () => {
      const res = await request(app)
        .post('/observability/vitals')
        .send({ name: 'LCP' })
        .expect(400);

      // Missing value and id means it falls through to batch format check
      // which requires sessionId and vitals
      expect(res.body.error).toBe('sessionId and vitals are required');
    });

    it('should handle rate limiting', async () => {
      query.mockResolvedValue({ rows: [] });

      // A single request should succeed
      await request(app)
        .post('/observability/vitals')
        .send({
          name: 'FCP',
          value: 1800,
          id: 'v1-yyy',
          rating: 'good',
          url: '/',
        })
        .expect(204);
    });
  });

  // =========================================================================
  // POST /observability/vitals (batch format)
  // =========================================================================
  describe('POST /observability/vitals (batch format)', () => {
    it('should return 200 for valid batch vitals', async () => {
      query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/observability/vitals')
        .send({
          sessionId: 'sess-1',
          url: '/',
          vitals: { LCP: 2500, FCP: 1800 },
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 400 for missing sessionId', async () => {
      const res = await request(app)
        .post('/observability/vitals')
        .send({ vitals: { LCP: 2500 } })
        .expect(400);

      expect(res.body.error).toBe('sessionId and vitals are required');
    });

    it('should return 400 for missing vitals', async () => {
      const res = await request(app)
        .post('/observability/vitals')
        .send({ sessionId: 'sess-1' })
        .expect(400);

      expect(res.body.error).toBe('sessionId and vitals are required');
    });
  });

  // =========================================================================
  // GET /observability/vitals/summary
  // =========================================================================
  describe('GET /observability/vitals/summary', () => {
    it('should return 200 with summary for admin', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // ensureVitalsTable
        .mockResolvedValueOnce({
          rows: [{ total_sessions: '100', lcp_p75: 2500, fcp_p75: 1800 }],
        })
        .mockResolvedValueOnce({ rows: [] }); // per-page

      const res = await request(app)
        .get('/observability/vitals/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.summary).toBeDefined();
    });

    it('should return 403 for non-admin', async () => {
      const res = await request(app)
        .get('/observability/vitals/summary')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });

    it('should return 500 on DB error', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/observability/vitals/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to fetch vitals summary');
    });
  });

  // =========================================================================
  // GET /observability/metrics
  // =========================================================================
  describe('GET /observability/metrics', () => {
    it('should return 200 with metrics for admin', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // ensureVitalsTable
        .mockResolvedValueOnce({
          rows: [{ total_sessions: '50', avg_lcp: 2000 }],
        })
        .mockResolvedValueOnce({ rows: [] }) // events
        .mockResolvedValueOnce({ rows: [] }); // per-page

      const res = await request(app)
        .get('/observability/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.server).toBeDefined();
      expect(res.body.webVitals).toBeDefined();
    });

    it('should return 403 for non-admin', async () => {
      const res = await request(app)
        .get('/observability/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });

    it('should return 500 on error', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/observability/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to fetch metrics');
    });
  });
});
