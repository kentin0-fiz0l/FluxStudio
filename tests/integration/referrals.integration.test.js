/**
 * Referrals Route Integration Tests
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
  app.use('/referrals', require('../../routes/referrals'));
  return app;
}

describe('Referrals Integration Tests', () => {
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
    it('should return 401 without token on /referrals/code', async () => {
      await request(app)
        .get('/referrals/code')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /referrals/code
  // =========================================================================
  describe('GET /referrals/code', () => {
    it('should return existing referral code', async () => {
      query.mockResolvedValueOnce({
        rows: [{ code: 'ABCD1234', created_at: new Date() }]
      });

      const res = await request(app)
        .get('/referrals/code')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.code).toBe('ABCD1234');
    });

    it('should create new referral code when none exists', async () => {
      // First query: no existing code
      query.mockResolvedValueOnce({ rows: [] });
      // Second query: INSERT succeeds
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/referrals/code')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.code).toBeDefined();
    });
  });

  // =========================================================================
  // GET /referrals/stats
  // =========================================================================
  describe('GET /referrals/stats', () => {
    it('should return referral stats', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          total_referrals: '5',
          converted: '2',
          first_referral: new Date(),
          latest_referral: new Date()
        }]
      });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/referrals/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalReferrals).toBe(5);
      expect(res.body.stats.converted).toBe(2);
    });

    it('should return empty stats when no referrals', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          total_referrals: '0',
          converted: '0',
          first_referral: null,
          latest_referral: null
        }]
      });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/referrals/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalReferrals).toBe(0);
    });
  });

  // =========================================================================
  // GET /referrals/validate/:code
  // =========================================================================
  describe('GET /referrals/validate/:code', () => {
    it('should validate a valid referral code', async () => {
      query.mockResolvedValueOnce({
        rows: [{ code: 'ABCD1234', referrer_name: 'Test User' }]
      });

      const res = await request(app)
        .get('/referrals/validate/ABCD1234')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.valid).toBe(true);
      expect(res.body.referrerName).toBe('Test User');
    });

    it('should return invalid for unknown code', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/referrals/validate/INVALID')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.valid).toBe(false);
    });
  });
});
