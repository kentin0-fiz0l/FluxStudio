/**
 * Printing Route Integration Tests
 *
 * Tests file linking, job management, status updates,
 * sync, quick print, estimate, and error handling.
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

jest.mock('../../services/printJobLogger', () => ({
  createPrintJob: jest.fn(),
  linkToProject: jest.fn(),
  updateJobStatus: jest.fn(),
  updateJobByFluxPrintId: jest.fn(),
  calculatePrintTime: jest.fn(),
  getActiveJobs: jest.fn(),
  getJobHistory: jest.fn(),
  getProjectStats: jest.fn(),
}));

const printJobLogger = require('../../services/printJobLogger');

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  __esModule: true,
  default: jest.fn(),
}));

const axios = require('axios');

jest.mock('../../lib/storage', () => ({
  fileStorage: {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  }
}));

jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'mock-cuid')
}));

jest.mock('../../middleware/security', () => ({
  printRateLimit: (req, res, next) => next(),
  rateLimit: jest.fn(() => (req, res, next) => next()),
}));

jest.mock('../../middleware/csrf', () => ({
  csrfProtection: (req, res, next) => next(),
}));

jest.mock('../../lib/fileValidator', () => ({
  validateUploadedFiles: jest.fn(),
}));

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getHeaders: jest.fn(() => ({})),
  }));
});

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with printing routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/printing');
  app.use('/api/printing', routes);
  return app;
}

describe('Printing Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    process.env.FLUXPRINT_ENABLED = 'true';
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // POST /api/printing/files/:filename/link
  // =========================================================================
  describe('POST /api/printing/files/:filename/link', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return 201 when linked successfully', async () => {
      // canUserAccessProject check
      query.mockResolvedValueOnce({ rows: [{ id: validProjectId }] });
      // Check existing link
      query.mockResolvedValueOnce({ rows: [] });
      // Insert new link
      query.mockResolvedValueOnce({ rows: [{ id: 'mock-cuid', project_id: validProjectId, filename: 'model.stl' }] });

      const res = await request(app)
        .post('/api/printing/files/model.stl/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ project_id: validProjectId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.file).toBeDefined();
    });

    it('should return 400 for missing project_id (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/files/model.stl/link')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid filename (path traversal)', async () => {
      const res = await request(app)
        .post('/api/printing/files/..%2Fetc%2Fpasswd/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ project_id: validProjectId })
        .expect(400);

      expect(res.body.error).toBe('Invalid filename');
    });

    it('should return 403 when user has no project access', async () => {
      // canUserAccessProject returns no rows
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/printing/files/model.stl/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ project_id: validProjectId })
        .expect(403);

      expect(res.body.error).toContain('permission');
    });

    it('should return 409 when file already linked to another project', async () => {
      const otherProjectId = '660e8400-e29b-41d4-a716-446655440001';
      // canUserAccessProject
      query.mockResolvedValueOnce({ rows: [{ id: validProjectId }] });
      // Check existing link - linked to different project
      query.mockResolvedValueOnce({ rows: [{ id: 'existing-id', project_id: otherProjectId }] });

      const res = await request(app)
        .post('/api/printing/files/model.stl/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ project_id: validProjectId })
        .expect(409);

      expect(res.body.error).toContain('already linked');
    });

    it('should return 500 on DB error', async () => {
      // canUserAccessProject succeeds
      query.mockResolvedValueOnce({ rows: [{ id: validProjectId }] });
      // Check existing link fails
      query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .post('/api/printing/files/model.stl/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ project_id: validProjectId })
        .expect(500);

      expect(res.body.error).toContain('Failed to link');
    });
  });

  // =========================================================================
  // POST /api/printing/jobs/:jobId/link
  // =========================================================================
  describe('POST /api/printing/jobs/:jobId/link', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return 200 when job linked', async () => {
      printJobLogger.linkToProject.mockResolvedValueOnce({
        id: 'job-1',
        project_id: validProjectId
      });

      const res = await request(app)
        .post('/api/printing/jobs/job-1/link')
        .send({ project_id: validProjectId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.job).toBeDefined();
    });

    it('should return 400 for missing project_id (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/jobs/job-1/link')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when job not found', async () => {
      printJobLogger.linkToProject.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/printing/jobs/nonexistent/link')
        .send({ project_id: validProjectId })
        .expect(404);

      expect(res.body.error).toBe('Print job not found');
    });
  });

  // =========================================================================
  // PATCH /api/printing/jobs/:jobId/status
  // =========================================================================
  describe('PATCH /api/printing/jobs/:jobId/status', () => {
    it('should return 200 when status updated', async () => {
      printJobLogger.updateJobStatus.mockResolvedValueOnce(true);

      const res = await request(app)
        .patch('/api/printing/jobs/job-1/status')
        .send({ status: 'printing', progress: 50 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('printing');
    });

    it('should call calculatePrintTime when status is completed', async () => {
      printJobLogger.updateJobStatus.mockResolvedValueOnce(true);
      printJobLogger.calculatePrintTime.mockResolvedValueOnce(true);

      await request(app)
        .patch('/api/printing/jobs/job-1/status')
        .send({ status: 'completed' })
        .expect(200);

      expect(printJobLogger.calculatePrintTime).toHaveBeenCalledWith('job-1');
    });

    it('should return 400 for missing status (Zod validation)', async () => {
      const res = await request(app)
        .patch('/api/printing/jobs/job-1/status')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on error', async () => {
      printJobLogger.updateJobStatus.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .patch('/api/printing/jobs/job-1/status')
        .send({ status: 'printing' })
        .expect(500);

      expect(res.body.error).toContain('Failed to update');
    });
  });

  // =========================================================================
  // POST /api/printing/jobs/sync/:fluxprintQueueId
  // =========================================================================
  describe('POST /api/printing/jobs/sync/:fluxprintQueueId', () => {
    it('should return 200 when synced', async () => {
      printJobLogger.updateJobByFluxPrintId.mockResolvedValueOnce({
        id: 'job-1',
        status: 'printing'
      });

      const res = await request(app)
        .post('/api/printing/jobs/sync/42')
        .send({ status: 'printing', progress: 30 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.job).toBeDefined();
    });

    it('should return 400 for missing status (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/jobs/sync/42')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when job not found', async () => {
      printJobLogger.updateJobByFluxPrintId.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/printing/jobs/sync/999')
        .send({ status: 'printing' })
        .expect(404);

      expect(res.body.error).toBe('Print job not found');
    });

    it('should call calculatePrintTime when synced status is completed', async () => {
      printJobLogger.updateJobByFluxPrintId.mockResolvedValueOnce({
        id: 'job-1',
        status: 'completed'
      });
      printJobLogger.calculatePrintTime.mockResolvedValueOnce(true);

      await request(app)
        .post('/api/printing/jobs/sync/42')
        .send({ status: 'completed' })
        .expect(200);

      expect(printJobLogger.calculatePrintTime).toHaveBeenCalledWith('job-1');
    });
  });

  // =========================================================================
  // POST /api/printing/quick-print
  // =========================================================================
  describe('POST /api/printing/quick-print', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

    const validPayload = {
      filename: 'model.stl',
      projectId: validProjectId,
      config: {
        material: 'PLA',
        quality: 'standard',
        copies: 1,
      }
    };

    it('should return 200 on success', async () => {
      // Project access check
      query.mockResolvedValueOnce({
        rows: [{ id: validProjectId, owner_id: userId, role: null }]
      });
      // axios.post to FluxPrint queue
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: { queue_id: 'fp-queue-1' }
      });
      // Insert print job
      query.mockResolvedValueOnce({ rows: [] });
      // Check existing file link
      query.mockResolvedValueOnce({ rows: [] });
      // Insert file link
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/printing/quick-print')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.estimate).toBeDefined();
    });

    it('should return 400 for missing filename (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/quick-print')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: validProjectId, config: { material: 'PLA', quality: 'standard' } })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for missing projectId (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/quick-print')
        .set('Authorization', `Bearer ${token}`)
        .send({ filename: 'model.stl', config: { material: 'PLA', quality: 'standard' } })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid material (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/quick-print')
        .set('Authorization', `Bearer ${token}`)
        .send({
          filename: 'model.stl',
          projectId: validProjectId,
          config: { material: 'WOOD', quality: 'standard' }
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid quality (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/quick-print')
        .set('Authorization', `Bearer ${token}`)
        .send({
          filename: 'model.stl',
          projectId: validProjectId,
          config: { material: 'PLA', quality: 'extreme' }
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 403 for insufficient permissions', async () => {
      // Project access check - viewer role
      query.mockResolvedValueOnce({
        rows: [{ id: validProjectId, owner_id: 'other-user', role: 'viewer' }]
      });

      const res = await request(app)
        .post('/api/printing/quick-print')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload)
        .expect(403);

      expect(res.body.error).toContain('Insufficient permissions');
    });

    it('should return 404 when project not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/printing/quick-print')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload)
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });
  });

  // =========================================================================
  // POST /api/printing/estimate
  // =========================================================================
  describe('POST /api/printing/estimate', () => {
    it('should return 200 with estimate', async () => {
      // Slicer API unavailable, falls back to rough estimate
      axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const res = await request(app)
        .post('/api/printing/estimate')
        .set('Authorization', `Bearer ${token}`)
        .send({ filename: 'model.stl', material: 'PLA', quality: 'standard' })
        .expect(200);

      expect(res.body.timeHours).toBeDefined();
      expect(res.body.materialGrams).toBeDefined();
      expect(res.body.totalCost).toBeDefined();
      expect(res.body.confidence).toBe('low');
    });

    it('should return 200 with high confidence estimate when slicer available', async () => {
      axios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          print_time_minutes: 180,
          filament_used_g: 75,
        }
      });

      const res = await request(app)
        .post('/api/printing/estimate')
        .set('Authorization', `Bearer ${token}`)
        .send({ filename: 'model.stl', material: 'PLA', quality: 'standard' })
        .expect(200);

      expect(res.body.confidence).toBe('high');
      expect(res.body.timeHours).toBe(3);
      expect(res.body.timeMinutes).toBe(0);
    });

    it('should return 400 for missing filename (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/estimate')
        .set('Authorization', `Bearer ${token}`)
        .send({ material: 'PLA', quality: 'standard' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid material (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/estimate')
        .set('Authorization', `Bearer ${token}`)
        .send({ filename: 'model.stl', material: 'WOOD', quality: 'standard' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid quality (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/printing/estimate')
        .set('Authorization', `Bearer ${token}`)
        .send({ filename: 'model.stl', material: 'PLA', quality: 'extreme' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // GET /api/printing/jobs/active
  // =========================================================================
  describe('GET /api/printing/jobs/active', () => {
    it('should return 200 with active jobs', async () => {
      printJobLogger.getActiveJobs.mockResolvedValueOnce([
        { id: 'job-1', status: 'printing' }
      ]);

      const res = await request(app)
        .get('/api/printing/jobs/active')
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('should return 500 on error', async () => {
      printJobLogger.getActiveJobs.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/printing/jobs/active')
        .expect(500);

      expect(res.body.error).toContain('Failed to get active jobs');
    });
  });

  // =========================================================================
  // GET /api/printing/jobs/history
  // =========================================================================
  describe('GET /api/printing/jobs/history', () => {
    it('should return 200 with job history', async () => {
      printJobLogger.getJobHistory.mockResolvedValueOnce([
        { id: 'job-1', status: 'completed' }
      ]);

      const res = await request(app)
        .get('/api/printing/jobs/history')
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('should return 500 on error', async () => {
      printJobLogger.getJobHistory.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/printing/jobs/history')
        .expect(500);

      expect(res.body.error).toContain('Failed to get job history');
    });
  });

  // =========================================================================
  // GET /api/printing/projects/:projectId/stats
  // =========================================================================
  describe('GET /api/printing/projects/:projectId/stats', () => {
    it('should return 200 with project stats', async () => {
      printJobLogger.getProjectStats.mockResolvedValueOnce({
        totalJobs: 5,
        completedJobs: 3,
        totalMaterialUsed: 150
      });

      const res = await request(app)
        .get('/api/printing/projects/proj-1/stats')
        .expect(200);

      expect(res.body.totalJobs).toBe(5);
    });

    it('should return 200 with message when no jobs found', async () => {
      printJobLogger.getProjectStats.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/printing/projects/proj-1/stats')
        .expect(200);

      expect(res.body.message).toContain('No print jobs');
    });
  });
});
