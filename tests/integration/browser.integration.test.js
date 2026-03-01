/**
 * Browser Route Integration Tests
 *
 * Tests link preview, web capture, PDF export, thumbnail generation,
 * design QA diffing, and job status polling endpoints.
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

const { query } = require('../../database/config');

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

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678')
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with browser routes
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/browser', require('../../routes/browser'));
  return app;
}

describe('Browser Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';
  const validProjectId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const validAssetId = 'ffffffff-1111-2222-3333-444444444444';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for POST /api/browser/link-preview without token', async () => {
      await request(app)
        .post('/api/browser/link-preview')
        .send({ url: 'https://example.com' })
        .expect(401);
    });

    it('should return 401 for GET /api/browser/jobs/some-id without token', async () => {
      await request(app)
        .get('/api/browser/jobs/some-id')
        .expect(401);
    });
  });

  // =========================================================================
  // POST /api/browser/link-preview
  // =========================================================================
  describe('POST /api/browser/link-preview', () => {
    it('should return 201 for valid URL', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'job-1' }] });

      const res = await request(app)
        .post('/api/browser/link-preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('job-1');
    });

    it('should return 400 for missing URL', async () => {
      const res = await request(app)
        .post('/api/browser/link-preview')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid URL format', async () => {
      const res = await request(app)
        .post('/api/browser/link-preview')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'not-a-valid-url' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // POST /api/browser/web-capture
  // =========================================================================
  describe('POST /api/browser/web-capture', () => {
    it('should return 201 for valid request', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'job-2' }] });

      const res = await request(app)
        .post('/api/browser/web-capture')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', projectId: validProjectId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('job-2');
    });

    it('should return 400 for missing URL', async () => {
      const res = await request(app)
        .post('/api/browser/web-capture')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: validProjectId })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid projectId', async () => {
      const res = await request(app)
        .post('/api/browser/web-capture')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', projectId: 'not-a-uuid' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on DB error', async () => {
      query.mockRejectedValueOnce(new Error('DB insert failed'));

      const res = await request(app)
        .post('/api/browser/web-capture')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', projectId: validProjectId })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to create job');
    });
  });

  // =========================================================================
  // POST /api/browser/pdf-export
  // =========================================================================
  describe('POST /api/browser/pdf-export', () => {
    it('should return 201 for valid request', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'job-3' }] });

      const res = await request(app)
        .post('/api/browser/pdf-export')
        .set('Authorization', `Bearer ${token}`)
        .send({ html: '<h1>Hello</h1>', projectId: validProjectId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('job-3');
    });

    it('should return 400 for missing html', async () => {
      const res = await request(app)
        .post('/api/browser/pdf-export')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: validProjectId })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid projectId', async () => {
      const res = await request(app)
        .post('/api/browser/pdf-export')
        .set('Authorization', `Bearer ${token}`)
        .send({ html: '<h1>Hello</h1>', projectId: 'bad-id' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on DB error', async () => {
      query.mockRejectedValueOnce(new Error('DB insert failed'));

      const res = await request(app)
        .post('/api/browser/pdf-export')
        .set('Authorization', `Bearer ${token}`)
        .send({ html: '<h1>Hello</h1>', projectId: validProjectId })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to create job');
    });
  });

  // =========================================================================
  // POST /api/browser/thumbnail
  // =========================================================================
  describe('POST /api/browser/thumbnail', () => {
    it('should return 201 for valid request', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'job-4' }] });

      const res = await request(app)
        .post('/api/browser/thumbnail')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: validProjectId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('job-4');
    });

    it('should return 400 for missing projectId', async () => {
      const res = await request(app)
        .post('/api/browser/thumbnail')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .post('/api/browser/thumbnail')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: 'not-a-uuid' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // POST /api/browser/design-qa
  // =========================================================================
  describe('POST /api/browser/design-qa', () => {
    it('should return 201 for valid request', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'job-5' }] });

      const res = await request(app)
        .post('/api/browser/design-qa')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', baselineAssetId: validAssetId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('job-5');
    });

    it('should return 400 for missing URL', async () => {
      const res = await request(app)
        .post('/api/browser/design-qa')
        .set('Authorization', `Bearer ${token}`)
        .send({ baselineAssetId: validAssetId })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid baselineAssetId', async () => {
      const res = await request(app)
        .post('/api/browser/design-qa')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', baselineAssetId: 'not-a-uuid' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for threshold out of range', async () => {
      const res = await request(app)
        .post('/api/browser/design-qa')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com', baselineAssetId: validAssetId, threshold: 1.5 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // GET /api/browser/jobs/:id
  // =========================================================================
  describe('GET /api/browser/jobs/:id', () => {
    it('should return 200 for existing job', async () => {
      query.mockResolvedValueOnce({ rows: [{
        id: 'job-1', type: 'link_preview', status: 'completed',
        output: { title: 'Example' }, error: null,
        created_at: '2025-10-01', started_at: '2025-10-01', completed_at: '2025-10-01',
      }] });

      const res = await request(app)
        .get('/api/browser/jobs/job-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.job).toBeDefined();
      expect(res.body.job.id).toBe('job-1');
      expect(res.body.job.type).toBe('link_preview');
    });

    it('should return 404 for non-existent job', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/browser/jobs/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Job not found');
    });
  });
});
