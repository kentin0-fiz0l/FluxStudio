/**
 * Templates Route Integration Tests
 *
 * Tests template browsing, custom template CRUD, filtering,
 * search, and error handling.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

// Mock database/config
jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

const { query } = require('../../database/config');

// Mock lib/auth/tokenService
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

// Mock auditLog
jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn()
}));

// Mock uuid (ESM package not supported by Jest transform)
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

// Helper: build express app with templates routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/templates');
  app.use('/api/templates', routes);
  return app;
}

describe('Templates Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

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
    it('should return 401 for GET /api/templates without token', async () => {
      await request(app).get('/api/templates').expect(401);
    });

    it('should return 401 for POST /api/templates/custom without token', async () => {
      await request(app).post('/api/templates/custom').send({}).expect(401);
    });
  });

  // =========================================================================
  // GET /api/templates — List Templates
  // =========================================================================
  describe('GET /api/templates', () => {
    it('should return built-in templates with default sorting', async () => {
      // Custom templates DB query returns empty
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.templates.length).toBeGreaterThanOrEqual(6);
      expect(res.body.total).toBe(res.body.templates.length);
      // Default sort: featured first, then by downloads
      const firstTemplate = res.body.templates[0];
      expect(firstTemplate.featured).toBe(true);
    });

    it('should filter templates by category', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/templates?category=design')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.templates.forEach(t => {
        expect(t.category).toBe('design');
      });
    });

    it('should search templates by name', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/templates?search=dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.templates.length).toBeGreaterThanOrEqual(1);
      const names = res.body.templates.map(t => t.name.toLowerCase());
      expect(names.some(n => n.includes('dashboard'))).toBe(true);
    });

    it('should gracefully degrade on DB error (returns built-ins only)', async () => {
      query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Should still return built-in templates even when DB fails
      expect(res.body.templates.length).toBeGreaterThanOrEqual(6);
    });
  });

  // =========================================================================
  // GET /api/templates/:id — Get Template by ID
  // =========================================================================
  describe('GET /api/templates/:id', () => {
    it('should return a built-in template by ID', async () => {
      const res = await request(app)
        .get('/api/templates/landing-page')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.template.id).toBe('landing-page');
      expect(res.body.template.name).toBe('Landing Page');
      expect(res.body.template.official).toBe(true);
    });

    it('should return 404 for unknown template ID', async () => {
      // DB lookup for custom template returns empty
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/templates/nonexistent-template')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Template not found');
    });
  });

  // =========================================================================
  // POST /api/templates/custom — Create Custom Template
  // =========================================================================
  describe('POST /api/templates/custom', () => {
    it('should create a custom template with valid body (201)', async () => {
      const templateData = {
        name: 'My Custom Template',
        type: 'design',
        description: 'A custom template for testing',
      };

      query.mockResolvedValueOnce({
        rows: [{
          id: 'custom-uuid-123',
          user_id: userId,
          name: templateData.name,
          description: templateData.description,
          category: 'custom',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        }]
      });

      const res = await request(app)
        .post('/api/templates/custom')
        .set('Authorization', `Bearer ${token}`)
        .send(templateData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.template.name).toBe('My Custom Template');
    });

    it('should return 400 for empty body (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/templates/custom')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on DB insert failure', async () => {
      const templateData = {
        name: 'Failing Template',
        type: 'design',
        description: 'This will fail',
      };

      query.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/templates/custom')
        .set('Authorization', `Bearer ${token}`)
        .send(templateData)
        .expect(500);

      expect(res.body.error).toBe('Failed to create custom template');
    });
  });

  // =========================================================================
  // DELETE /api/templates/custom/:id — Delete Custom Template
  // =========================================================================
  describe('DELETE /api/templates/custom/:id', () => {
    it('should delete a custom template successfully', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'custom-uuid-123' }] });

      const res = await request(app)
        .delete('/api/templates/custom/custom-uuid-123')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when custom template not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/templates/custom/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Custom template not found');
    });
  });

  // =========================================================================
  // Database Error Handling
  // =========================================================================
  describe('Database error handling', () => {
    it('should return 500 when DB query throws on delete', async () => {
      query.mockRejectedValueOnce(new Error('DB delete failed'));

      const res = await request(app)
        .delete('/api/templates/custom/some-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to delete custom template');
    });

    it('should return 500 when DB query throws on get by ID', async () => {
      // Not a built-in, so it falls through to DB lookup which fails
      query.mockRejectedValueOnce(new Error('DB read failed'));

      const res = await request(app)
        .get('/api/templates/custom-id-that-fails')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get template');
    });
  });
});
