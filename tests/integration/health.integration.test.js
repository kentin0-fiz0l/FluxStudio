/**
 * Health Route Integration Tests
 */

const express = require('express');
const request = require('supertest');

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

jest.mock('../../config/environment', () => ({
  config: {
    AUTH_PORT: 3001,
    JWT_SECRET: 'test-secret'
  }
}));

jest.mock('../../lib/cache', () => ({
  getClient: jest.fn(() => null)
}));

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

const { query } = require('../../database/config');

function createApp() {
  const app = express();
  app.use(express.json());
  app.set('io', null);
  app.set('authNamespace', null);
  app.set('messagingNamespace', null);
  app.set('printingNamespace', null);
  app.set('designBoardsNamespace', null);
  const routes = require('../../routes/health');
  app.use('/', routes);
  return app;
}

describe('Health Route Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: USE_DATABASE = true
    process.env.USE_DATABASE = 'true';
  });

  // =========================================================================
  // GET /health
  // =========================================================================
  describe('GET /health', () => {
    it('should return healthy when all services are up', async () => {
      query.mockResolvedValueOnce({ rows: [{ ping: 1 }] });

      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('healthy');
      expect(res.body.dependencies.database.status).toBe('healthy');
    });

    it('should return degraded when DB is down', async () => {
      query.mockRejectedValueOnce(new Error('Connection refused'));

      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('degraded');
      expect(res.body.dependencies.database.status).toBe('unhealthy');
    });

    it('should report Redis not available', async () => {
      query.mockResolvedValueOnce({ rows: [{ ping: 1 }] });

      const res = await request(app)
        .get('/health')
        .expect(200);

      // cache.getClient returns null, so Redis is not available
      expect(res.body.dependencies.redis.status).toBe('not_available');
    });
  });

  // =========================================================================
  // GET /admin/db-status
  // =========================================================================
  describe('GET /admin/db-status', () => {
    it('should return database table status', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { tablename: 'users' },
          { tablename: 'projects' },
          { tablename: 'refresh_tokens' },
          { tablename: 'security_events' },
          { tablename: 'organizations' }
        ]
      });

      const res = await request(app)
        .get('/admin/db-status')
        .expect(200);

      expect(res.body.status).toBe('complete');
      expect(res.body.tables).toContain('users');
    });

    it('should return 500 on database error', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/admin/db-status')
        .expect(500);

      expect(res.body.error).toBe('Failed to check database status');
    });
  });

  // =========================================================================
  // POST /admin/init-database
  // =========================================================================
  describe('POST /admin/init-database', () => {
    it('should initialize when no users table exists', async () => {
      // First query: check tables (no users table)
      query.mockResolvedValueOnce({ rows: [] });
      // Second query: run SQL
      jest.doMock('fs', () => ({
        readFileSync: jest.fn(() => 'SELECT 1')
      }));
      query.mockResolvedValueOnce({ rows: [] });
      // Third query: get final tables
      query.mockResolvedValueOnce({
        rows: [{ tablename: 'users' }, { tablename: 'projects' }]
      });

      const res = await request(app)
        .post('/admin/init-database')
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 403 with wrong secret when users table exists', async () => {
      query.mockResolvedValueOnce({
        rows: [{ tablename: 'users' }]
      });

      const res = await request(app)
        .post('/admin/init-database')
        .set('x-admin-secret', 'wrong-secret')
        .expect(403);

      expect(res.body.error).toBe('Database already initialized. JWT_SECRET required for re-initialization.');
    });

    it('should return 403 with missing secret when users table exists', async () => {
      query.mockResolvedValueOnce({
        rows: [{ tablename: 'users' }]
      });

      const res = await request(app)
        .post('/admin/init-database')
        .expect(403);

      expect(res.body.error).toBe('Database already initialized. JWT_SECRET required for re-initialization.');
    });
  });
});
