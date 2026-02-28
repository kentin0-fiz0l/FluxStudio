/**
 * Compliance Route Integration Tests
 *
 * Tests GDPR/CCPA data export, account deletion,
 * consent management, and error handling.
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

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../lib/compliance/dataExporter', () => ({
  exportUserData: jest.fn(),
  createExportRequest: jest.fn(),
  completeExportRequest: jest.fn(),
  failExportRequest: jest.fn(),
  hasRecentExport: jest.fn(),
  getExportRequest: jest.fn(),
}));

jest.mock('../../lib/compliance/accountDeletor', () => ({
  requestDeletion: jest.fn(),
  cancelDeletion: jest.fn(),
  getDeletionStatus: jest.fn(),
}));

const { exportUserData, createExportRequest, completeExportRequest, hasRecentExport, getExportRequest } = require('../../lib/compliance/dataExporter');
const { requestDeletion, cancelDeletion, getDeletionStatus } = require('../../lib/compliance/accountDeletor');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with compliance routes
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/compliance', require('../../routes/compliance'));
  return app;
}

describe('Compliance Integration Tests', () => {
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
    it('should return 401 for POST /api/compliance/data-export without token', async () => {
      await request(app).post('/api/compliance/data-export').expect(401);
    });

    it('should return 401 for GET /api/compliance/data-export/:id without token', async () => {
      await request(app).get('/api/compliance/data-export/export-1').expect(401);
    });

    it('should return 401 for POST /api/compliance/delete-account without token', async () => {
      await request(app).post('/api/compliance/delete-account').send({}).expect(401);
    });

    it('should return 401 for POST /api/compliance/cancel-deletion without token', async () => {
      await request(app).post('/api/compliance/cancel-deletion').expect(401);
    });

    it('should return 401 for GET /api/compliance/consents without token', async () => {
      await request(app).get('/api/compliance/consents').expect(401);
    });

    it('should return 401 for PUT /api/compliance/consents without token', async () => {
      await request(app).put('/api/compliance/consents').send({}).expect(401);
    });
  });

  // =========================================================================
  // POST /api/compliance/data-export
  // =========================================================================
  describe('POST /api/compliance/data-export', () => {
    it('should create data export and return 201 with exportId', async () => {
      hasRecentExport.mockResolvedValueOnce(false);
      createExportRequest.mockResolvedValueOnce({ id: 'export-1' });
      exportUserData.mockResolvedValueOnce({ user: { id: userId, email: 'test@example.com' } });
      completeExportRequest.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/api/compliance/data-export')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.exportId).toBe('export-1');
      expect(res.body.status).toBe('completed');
      expect(hasRecentExport).toHaveBeenCalledWith(userId);
      expect(createExportRequest).toHaveBeenCalledWith(userId);
      expect(exportUserData).toHaveBeenCalledWith(userId);
    });

    it('should return 429 when rate limited (recent export exists)', async () => {
      hasRecentExport.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/compliance/data-export')
        .set('Authorization', `Bearer ${token}`)
        .expect(429);

      expect(res.body.error).toBe('Rate limit exceeded');
      expect(createExportRequest).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GET /api/compliance/data-export/:id
  // =========================================================================
  describe('GET /api/compliance/data-export/:id', () => {
    it('should return export status for valid request', async () => {
      getExportRequest.mockResolvedValueOnce({
        id: 'export-1',
        status: 'completed',
        file_size: 2048,
        requested_at: '2025-01-01T00:00:00Z',
        completed_at: '2025-01-01T00:01:00Z',
        expires_at: '2025-01-08T00:00:00Z',
        downloaded_at: null,
      });

      const res = await request(app)
        .get('/api/compliance/data-export/export-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe('export-1');
      expect(res.body.status).toBe('completed');
      expect(res.body.fileSize).toBe(2048);
    });

    it('should return 404 when export not found', async () => {
      getExportRequest.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/compliance/data-export/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Export request not found');
    });
  });

  // =========================================================================
  // POST /api/compliance/delete-account
  // =========================================================================
  describe('POST /api/compliance/delete-account', () => {
    it('should schedule account deletion and return 201', async () => {
      requestDeletion.mockResolvedValueOnce({
        grace_period_ends: '2025-02-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      });

      const res = await request(app)
        .post('/api/compliance/delete-account')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Leaving platform' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.gracePeriodEnds).toBe('2025-02-01T00:00:00Z');
      expect(res.body.requestedAt).toBe('2025-01-01T00:00:00Z');
      expect(requestDeletion).toHaveBeenCalledWith(userId, 'Leaving platform');
    });
  });

  // =========================================================================
  // POST /api/compliance/cancel-deletion
  // =========================================================================
  describe('POST /api/compliance/cancel-deletion', () => {
    it('should cancel pending deletion and return 200', async () => {
      cancelDeletion.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/compliance/cancel-deletion')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(cancelDeletion).toHaveBeenCalledWith(userId);
    });

    it('should return 404 when no pending deletion', async () => {
      cancelDeletion.mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/compliance/cancel-deletion')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('No pending deletion request found');
    });
  });

  // =========================================================================
  // GET /api/compliance/consents
  // =========================================================================
  describe('GET /api/compliance/consents', () => {
    it('should return consent settings', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { consent_type: 'marketing_emails', granted: true, created_at: '2025-01-01T00:00:00Z' },
          { consent_type: 'analytics_tracking', granted: false, created_at: '2025-01-01T00:00:00Z' },
        ],
      });
      getDeletionStatus.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/compliance/consents')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.consents.marketing_emails.granted).toBe(true);
      expect(res.body.consents.analytics_tracking.granted).toBe(false);
      expect(res.body.consents.third_party_sharing.granted).toBe(false);
      expect(res.body.deletionStatus).toBeNull();
    });
  });

  // =========================================================================
  // PUT /api/compliance/consents
  // =========================================================================
  describe('PUT /api/compliance/consents', () => {
    it('should update consent preferences and return 200', async () => {
      query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .put('/api/compliance/consents')
        .set('Authorization', `Bearer ${token}`)
        .send({ consents: { marketing_emails: true, analytics_tracking: false } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.updated).toHaveLength(2);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================
  describe('Error handling', () => {
    it('should return 500 when data export service fails', async () => {
      hasRecentExport.mockRejectedValueOnce(new Error('Service unavailable'));

      const res = await request(app)
        .post('/api/compliance/data-export')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to create data export');
    });
  });
});
