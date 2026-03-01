/**
 * Search Route Integration Tests
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
  app.use('/search', require('../../routes/search'));
  return app;
}

describe('Search Integration Tests', () => {
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
        .get('/search?q=test')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /search
  // =========================================================================
  describe('GET /search', () => {
    it('should return search results', async () => {
      // projects
      query.mockResolvedValueOnce({
        rows: [{
          id: 'p1', name: 'Test Project', description: 'desc', status: 'active',
          created_at: new Date(), updated_at: new Date(), rank: 0.5
        }]
      });
      // files
      query.mockResolvedValueOnce({ rows: [] });
      // tasks
      query.mockResolvedValueOnce({ rows: [] });
      // messages
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/search?q=test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].type).toBe('project');
    });

    it('should return 400 for empty query', async () => {
      const res = await request(app)
        .get('/search?q=')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.error).toBe('Search query is required');
    });

    it('should filter by type', async () => {
      // Only projects query should be called
      query.mockResolvedValueOnce({
        rows: [{
          id: 'p1', name: 'Test Project', description: 'desc', status: 'active',
          created_at: new Date(), updated_at: new Date(), rank: 0.5
        }]
      });

      const res = await request(app)
        .get('/search?q=test&types=project')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].type).toBe('project');
    });

    it('should support pagination', async () => {
      // projects
      query.mockResolvedValueOnce({ rows: [] });
      // files
      query.mockResolvedValueOnce({ rows: [] });
      // tasks
      query.mockResolvedValueOnce({ rows: [] });
      // messages
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/search?q=test&limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(0);
    });

    it('should return empty results', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/search?q=nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.results).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('should handle individual search type errors gracefully', async () => {
      // The search route catches per-type errors and continues
      // projects error caught internally
      query.mockRejectedValueOnce(new Error('DB error'));
      // files, tasks, messages return empty
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/search?q=test')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Still returns success with partial results
      expect(res.body.success).toBe(true);
      expect(res.body.results).toHaveLength(0);
    });

    it('should return 400 for missing query parameter', async () => {
      const res = await request(app)
        .get('/search')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.error).toBe('Search query is required');
    });
  });
});
