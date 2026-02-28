/**
 * Roles Route Integration Tests
 *
 * Tests custom role CRUD, permission enforcement,
 * default role protection, and error handling.
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

jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn()
}));

jest.mock('../../lib/auth/permissions', () => ({
  requirePermission: jest.fn(() => (req, res, next) => next()),
  PERMISSIONS: { 'settings.manage': true, 'projects.view': true, 'projects.edit': true },
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with roles routes (mergeParams)
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/organizations/:orgId/roles', require('../../routes/roles'));
  return app;
}

describe('Roles Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';
  const orgId = 'org-1';

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
    it('should return 401 for GET /api/organizations/:orgId/roles without token', async () => {
      await request(app).get(`/api/organizations/${orgId}/roles`).expect(401);
    });

    it('should return 401 for POST /api/organizations/:orgId/roles without token', async () => {
      await request(app).post(`/api/organizations/${orgId}/roles`).send({ name: 'Test', slug: 'test' }).expect(401);
    });

    it('should return 401 for PUT /api/organizations/:orgId/roles/:slug without token', async () => {
      await request(app).put(`/api/organizations/${orgId}/roles/test`).send({ name: 'Updated' }).expect(401);
    });

    it('should return 401 for DELETE /api/organizations/:orgId/roles/:slug without token', async () => {
      await request(app).delete(`/api/organizations/${orgId}/roles/test`).expect(401);
    });
  });

  // =========================================================================
  // GET /api/organizations/:orgId/roles
  // =========================================================================
  describe('GET /api/organizations/:orgId/roles', () => {
    it('should list roles -> 200', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 'role-1', name: 'Admin', slug: 'admin', permissions: ['*'], is_default: true, created_at: '2025-01-01' },
          { id: 'role-2', name: 'Editor', slug: 'editor', permissions: ['projects.edit'], is_default: false, created_at: '2025-01-02' },
        ],
      });

      const res = await request(app)
        .get(`/api/organizations/${orgId}/roles`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.roles).toHaveLength(2);
      expect(res.body.roles[0].name).toBe('Admin');
      expect(res.body.roles[0].isDefault).toBe(true);
      expect(res.body.availablePermissions).toBeDefined();
    });
  });

  // =========================================================================
  // POST /api/organizations/:orgId/roles
  // =========================================================================
  describe('POST /api/organizations/:orgId/roles', () => {
    it('should create a custom role -> 201', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'role-3', name: 'Reviewer', slug: 'reviewer', permissions: '["projects.view"]', created_at: '2025-01-03' }],
      });

      const res = await request(app)
        .post(`/api/organizations/${orgId}/roles`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Reviewer', slug: 'reviewer', permissions: ['projects.view'] })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.role.name).toBe('Reviewer');
      expect(res.body.role.slug).toBe('reviewer');
    });

    it('should return 400 when required fields are missing (Zod validation)', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/roles`)
        .set('Authorization', `Bearer ${token}`)
        .send({ permissions: ['projects.view'] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 409 for duplicate slug', async () => {
      const duplicateError = new Error('duplicate key');
      duplicateError.code = '23505';
      query.mockRejectedValueOnce(duplicateError);

      const res = await request(app)
        .post(`/api/organizations/${orgId}/roles`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Reviewer', slug: 'reviewer', permissions: [] })
        .expect(409);

      expect(res.body.error).toMatch(/already exists/);
    });
  });

  // =========================================================================
  // PUT /api/organizations/:orgId/roles/:slug
  // =========================================================================
  describe('PUT /api/organizations/:orgId/roles/:slug', () => {
    it('should update a custom role -> 200', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'role-3', is_default: false }],
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 'role-3', name: 'Senior Reviewer', slug: 'reviewer', permissions: '["projects.view","projects.edit"]', updated_at: '2025-01-04' }],
      });

      const res = await request(app)
        .put(`/api/organizations/${orgId}/roles/reviewer`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Senior Reviewer', permissions: ['projects.view', 'projects.edit'] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.role.name).toBe('Senior Reviewer');
    });

    it('should return 404 for unknown slug', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put(`/api/organizations/${orgId}/roles/unknown`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Does Not Exist' })
        .expect(404);

      expect(res.body.error).toBe('Role not found');
    });

    it('should return 403 when editing a default role', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'role-1', is_default: true }],
      });

      const res = await request(app)
        .put(`/api/organizations/${orgId}/roles/admin`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Admin' })
        .expect(403);

      expect(res.body.error).toBe('Cannot edit default roles');
    });
  });

  // =========================================================================
  // DELETE /api/organizations/:orgId/roles/:slug
  // =========================================================================
  describe('DELETE /api/organizations/:orgId/roles/:slug', () => {
    it('should delete a custom role with no members -> 200', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'role-3', is_default: false }],
      });
      query.mockResolvedValueOnce({
        rows: [{ count: '0' }],
      });
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete(`/api/organizations/${orgId}/roles/reviewer`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 403 when deleting a default role', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'role-1', is_default: true }],
      });

      const res = await request(app)
        .delete(`/api/organizations/${orgId}/roles/admin`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Cannot delete default roles');
    });

    it('should return 409 when role has active members', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'role-4', is_default: false }],
      });
      query.mockResolvedValueOnce({
        rows: [{ count: '3' }],
      });

      const res = await request(app)
        .delete(`/api/organizations/${orgId}/roles/in-use`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(res.body.error).toMatch(/reassign members/);
      expect(res.body.memberCount).toBe(3);
    });

    it('should return 404 when role not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete(`/api/organizations/${orgId}/roles/nonexistent`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Custom role not found');
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================
  describe('Error handling', () => {
    it('should return 500 when database query fails on list', async () => {
      query.mockRejectedValueOnce(new Error('Connection lost'));

      const res = await request(app)
        .get(`/api/organizations/${orgId}/roles`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to list roles');
    });
  });
});
