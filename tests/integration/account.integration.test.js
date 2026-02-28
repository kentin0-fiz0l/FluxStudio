/**
 * Account Route Integration Tests
 *
 * Tests GDPR data export, account deletion scheduling,
 * cancellation, status checks, and error handling.
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

const { logAction } = require('../../lib/auditLog');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with account routes
function createApp() {
  const app = express();
  app.use(express.json());
  const accountRoutes = require('../../routes/account');
  app.use('/api/account', accountRoutes);
  return app;
}

describe('Account Integration Tests', () => {
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
    it('should return 401 for GET /api/account/export without token', async () => {
      await request(app).get('/api/account/export').expect(401);
    });

    it('should return 401 for POST /api/account/delete without token', async () => {
      await request(app).post('/api/account/delete').send({}).expect(401);
    });

    it('should return 401 for DELETE /api/account/delete without token', async () => {
      await request(app).delete('/api/account/delete').expect(401);
    });

    it('should return 401 for GET /api/account/delete/status without token', async () => {
      await request(app).get('/api/account/delete/status').expect(401);
    });
  });

  // =========================================================================
  // GET /api/account/export
  // =========================================================================
  describe('GET /api/account/export', () => {
    it('should return exported data for authenticated user', async () => {
      // Mock all 5 queries in order: users, projects, files, audit_logs, organization_members
      query.mockResolvedValueOnce({
        rows: [{ id: userId, name: 'Test User', email: 'test@example.com', user_type: 'client', avatar_url: null, created_at: '2025-01-01', updated_at: '2025-01-02' }]
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'My Project', description: 'A project', status: 'active', created_at: '2025-01-01' }]
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 'file-1', original_name: 'design.png', file_type: 'image/png', file_size: 1024, created_at: '2025-01-01' }]
      });
      query.mockResolvedValueOnce({
        rows: [{ action: 'login', resource_type: 'session', resource_id: 'sess-1', details: {}, ip_address: '127.0.0.1', created_at: '2025-01-01' }]
      });
      query.mockResolvedValueOnce({
        rows: [{ id: 'org-1', name: 'My Org', role: 'member', joined_at: '2025-01-01' }]
      });

      const res = await request(app)
        .get('/api/account/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.exportDate).toBeDefined();
      expect(res.body.profile.id).toBe(userId);
      expect(res.body.profile.name).toBe('Test User');
      expect(res.body.organizations).toHaveLength(1);
      expect(res.body.organizations[0].name).toBe('My Org');
      expect(res.body.projects).toHaveLength(1);
      expect(res.body.projects[0].name).toBe('My Project');
      expect(res.body.files).toHaveLength(1);
      expect(res.body.files[0].name).toBe('design.png');
      expect(res.body.files[0].type).toBe('image/png');
      expect(res.body.auditLog).toHaveLength(1);
      expect(res.body.auditLog[0].action).toBe('login');
      expect(logAction).toHaveBeenCalledWith(userId, 'data_export', 'user', userId, {}, expect.anything());
    });

    it('should return 404 when user not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/account/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('User not found');
    });

    it('should handle database errors with 500', async () => {
      query.mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request(app)
        .get('/api/account/export')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to export data');
    });
  });

  // =========================================================================
  // POST /api/account/delete
  // =========================================================================
  describe('POST /api/account/delete', () => {
    it('should schedule deletion with reason', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'del-1' }] });

      const res = await request(app)
        .post('/api/account/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'No longer needed' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Account deletion scheduled');
      expect(res.body.scheduledAt).toBeDefined();
      // Verify scheduled date is ~30 days from now
      const scheduledDate = new Date(res.body.scheduledAt);
      const now = new Date();
      const diffDays = Math.round((scheduledDate - now) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(31);
      expect(logAction).toHaveBeenCalledWith(
        userId, 'deletion_request', 'user', userId,
        expect.objectContaining({ reason: 'No longer needed' }),
        expect.anything()
      );
    });

    it('should schedule deletion without reason', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'del-2' }] });

      const res = await request(app)
        .post('/api/account/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Account deletion scheduled');
      expect(res.body.scheduledAt).toBeDefined();
      // Verify query was called with null reason
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO deletion_requests'),
        expect.arrayContaining([userId, null, expect.any(Date)])
      );
    });

    it('should handle database errors with 500', async () => {
      query.mockRejectedValueOnce(new Error('Insert failed'));

      const res = await request(app)
        .post('/api/account/delete')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'test' })
        .expect(500);

      expect(res.body.error).toBe('Failed to schedule deletion');
    });
  });

  // =========================================================================
  // DELETE /api/account/delete
  // =========================================================================
  describe('DELETE /api/account/delete', () => {
    it('should cancel pending deletion', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'del-1' }] });

      const res = await request(app)
        .delete('/api/account/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Deletion request cancelled');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE deletion_requests'),
        [userId]
      );
      expect(logAction).toHaveBeenCalledWith(userId, 'deletion_cancelled', 'user', userId, {}, expect.anything());
    });

    it('should return 404 when no pending request exists', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/account/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('No pending deletion request found');
    });

    it('should handle database errors with 500', async () => {
      query.mockRejectedValueOnce(new Error('Update failed'));

      const res = await request(app)
        .delete('/api/account/delete')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to cancel deletion');
    });
  });

  // =========================================================================
  // GET /api/account/delete/status
  // =========================================================================
  describe('GET /api/account/delete/status', () => {
    it('should return pending deletion status', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          status: 'pending',
          reason: 'Leaving the platform',
          scheduled_at: '2025-02-01T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z'
        }]
      });

      const res = await request(app)
        .get('/api/account/delete/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasPendingDeletion).toBe(true);
      expect(res.body.status).toBe('pending');
      expect(res.body.scheduledAt).toBe('2025-02-01T00:00:00Z');
      expect(res.body.requestedAt).toBe('2025-01-01T00:00:00Z');
    });

    it('should return hasPendingDeletion=false when no request exists', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/account/delete/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.hasPendingDeletion).toBe(false);
      expect(res.body.status).toBeUndefined();
    });
  });
});
