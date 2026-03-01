/**
 * Usage Route Integration Tests
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

function createTestToken(userId = 'test-user') {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/usage', require('../../routes/usage'));
  return app;
}

describe('Usage Integration Tests', () => {
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
    it('should return 401 without token on /usage', async () => {
      await request(app)
        .get('/usage')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /usage
  // =========================================================================
  describe('GET /usage', () => {
    it('should return current period usage', async () => {
      // getOrCreateUsage: SELECT returns existing record
      query.mockResolvedValueOnce({
        rows: [{
          user_id: 'test-user',
          period_start: '2026-03-01',
          period_end: '2026-03-31',
          projects_count: 2,
          storage_bytes: '1000000',
          ai_calls_count: 5,
          collaborators_count: 1
        }]
      });
      // get plan_id
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free' }]
      });

      const res = await request(app)
        .get('/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.usage.projects.current).toBe(2);
      expect(res.body.plan).toBe('free');
    });

    it('should return usage with default period', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          user_id: 'test-user',
          period_start: '2026-03-01',
          period_end: '2026-03-31',
          projects_count: 0,
          storage_bytes: '0',
          ai_calls_count: 0,
          collaborators_count: 0
        }]
      });
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free' }]
      });

      const res = await request(app)
        .get('/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.period.start).toBeDefined();
    });

    it('should return 500 on database error', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/usage')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get usage');
    });
  });

  // =========================================================================
  // GET /usage/limits
  // =========================================================================
  describe('GET /usage/limits', () => {
    it('should return free tier limits', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'free' }]
      });

      const res = await request(app)
        .get('/usage/limits')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.plan).toBe('free');
      expect(res.body.limits.projects).toBe(3);
    });

    it('should return pro tier limits', async () => {
      query.mockResolvedValueOnce({
        rows: [{ plan_id: 'pro' }]
      });

      const res = await request(app)
        .get('/usage/limits')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.plan).toBe('pro');
      expect(res.body.limits.projects).toBe(-1);
    });

    it('should default to free tier when plan query fails', async () => {
      // The inner try/catch swallows the error and defaults to 'free'
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/usage/limits')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.plan).toBe('free');
      expect(res.body.limits.projects).toBe(3);
    });
  });
});
