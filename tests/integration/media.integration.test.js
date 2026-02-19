/**
 * Media Route Integration Tests
 *
 * Tests transcoding submission, status checking,
 * admin job monitoring, HLS manifest access control,
 * and error handling.
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

const mockTranscodingService = {
  createTranscodingJob: jest.fn(),
  getTranscodingStatus: jest.fn(),
  monitorJobs: jest.fn()
};

jest.mock('../../services/transcoding-service-do', () => mockTranscodingService);

const { query } = require('../../database/config');

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createAdminToken(userId = 'admin-user-1') {
  return jwt.sign({ id: userId, email: 'admin@example.com', userType: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const mediaRoutes = require('../../routes/media');
  app.use('/api/media', mediaRoutes);
  return app;
}

describe('Media Integration Tests', () => {
  let app;
  let token;
  let adminToken;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
    adminToken = createAdminToken();
  });

  beforeEach(() => {
    query.mockReset();
    Object.values(mockTranscodingService).forEach(fn => fn.mockReset());
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for POST /api/media/transcode without token', async () => {
      await request(app).post('/api/media/transcode').send({ fileId: 'f1' }).expect(401);
    });

    it('should return 401 for GET /api/media/transcode/:fileId without token', async () => {
      await request(app).get('/api/media/transcode/f1').expect(401);
    });

    it('should return 401 for GET /api/media/:fileId/manifest without token', async () => {
      await request(app).get('/api/media/f1/manifest').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .post('/api/media/transcode')
        .set('Authorization', 'Bearer invalid-token')
        .send({ fileId: 'f1' })
        .expect(401);
    });
  });

  // =========================================================================
  // POST /api/media/transcode
  // =========================================================================
  describe('POST /api/media/transcode', () => {
    it('should submit a transcoding job', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'f1', name: 'video.mp4', file_url: 'https://spaces.digitaloceanspaces.com/uploads/video.mp4', uploaded_by: userId }]
      });
      mockTranscodingService.createTranscodingJob.mockResolvedValueOnce({
        jobId: 'job-1',
        status: 'pending',
        outputUrl: 'https://cdn.example.com/hls/video/master.m3u8'
      });

      const res = await request(app)
        .post('/api/media/transcode')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: 'f1' })
        .expect(200);

      expect(res.body.message).toBe('Transcoding job submitted successfully');
      expect(res.body.jobId).toBe('job-1');
      expect(res.body.status).toBe('pending');
      expect(res.body.hlsUrl).toBeDefined();
    });

    it('should return 400 when fileId is missing', async () => {
      const res = await request(app)
        .post('/api/media/transcode')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('fileId is required');
    });

    it('should return 404 when file not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/media/transcode')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: 'nonexistent' })
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });

    it('should return 403 when user does not own the file', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'f1', name: 'video.mp4', file_url: 'video.mp4', uploaded_by: 'other-user' }]
      });

      const res = await request(app)
        .post('/api/media/transcode')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: 'f1' })
        .expect(403);

      expect(res.body.error).toBe('Unauthorized');
    });

    it('should handle transcoding service errors', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'f1', name: 'video.mp4', file_url: 'video.mp4', uploaded_by: userId }]
      });
      mockTranscodingService.createTranscodingJob.mockRejectedValueOnce(new Error('Service error'));

      const res = await request(app)
        .post('/api/media/transcode')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: 'f1' })
        .expect(500);

      expect(res.body.error).toBe('Failed to submit transcoding job');
    });
  });

  // =========================================================================
  // GET /api/media/transcode/:fileId
  // =========================================================================
  describe('GET /api/media/transcode/:fileId', () => {
    it('should return transcoding status', async () => {
      mockTranscodingService.getTranscodingStatus.mockResolvedValueOnce({
        id: 'f1',
        name: 'video.mp4',
        transcoding_status: 'completed',
        job_status: 'done',
        progress: 100,
        hls_manifest_url: 'https://cdn.example.com/hls/video/master.m3u8',
        drm_protected: false,
        error_message: null,
        created_at: '2025-01-01T00:00:00Z',
        completed_at: '2025-01-01T00:05:00Z'
      });

      const res = await request(app)
        .get('/api/media/transcode/f1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.fileId).toBe('f1');
      expect(res.body.status).toBe('completed');
      expect(res.body.progress).toBe(100);
      expect(res.body.hlsManifestUrl).toBeDefined();
    });

    it('should return 404 when file not found', async () => {
      mockTranscodingService.getTranscodingStatus.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/media/transcode/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });

    it('should handle errors', async () => {
      mockTranscodingService.getTranscodingStatus.mockRejectedValueOnce(new Error('error'));

      const res = await request(app)
        .get('/api/media/transcode/f1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get transcoding status');
    });
  });

  // =========================================================================
  // POST /api/media/monitor-jobs (Admin)
  // =========================================================================
  describe('POST /api/media/monitor-jobs', () => {
    it('should allow admin to monitor jobs', async () => {
      mockTranscodingService.monitorJobs.mockResolvedValueOnce({ checked: 5 });

      const res = await request(app)
        .post('/api/media/monitor-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toBe('Job monitoring completed');
      expect(res.body.jobsChecked).toBe(5);
    });

    it('should return 403 for non-admin users', async () => {
      const res = await request(app)
        .post('/api/media/monitor-jobs')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });

    it('should handle errors', async () => {
      mockTranscodingService.monitorJobs.mockRejectedValueOnce(new Error('error'));

      const res = await request(app)
        .post('/api/media/monitor-jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to monitor jobs');
    });
  });

  // =========================================================================
  // GET /api/media/:fileId/manifest
  // =========================================================================
  describe('GET /api/media/:fileId/manifest', () => {
    it('should return manifest for file owner', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'f1',
          hls_manifest_url: 'https://cdn.example.com/hls/video/master.m3u8',
          drm_protected: false,
          is_public: false,
          uploaded_by: userId
        }]
      });

      const res = await request(app)
        .get('/api/media/f1/manifest')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.manifestUrl).toBe('https://cdn.example.com/hls/video/master.m3u8');
      expect(res.body.drmProtected).toBe(false);
    });

    it('should return manifest for public files', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'f1',
          hls_manifest_url: 'https://cdn.example.com/hls/video/master.m3u8',
          drm_protected: false,
          is_public: true,
          uploaded_by: 'other-user'
        }]
      });

      const res = await request(app)
        .get('/api/media/f1/manifest')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.manifestUrl).toBeDefined();
    });

    it('should return 403 when user has no access to private file', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{
            id: 'f1',
            hls_manifest_url: 'https://cdn.example.com/hls/video/master.m3u8',
            drm_protected: false,
            is_public: false,
            uploaded_by: 'other-user'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // membership check fails

      const res = await request(app)
        .get('/api/media/f1/manifest')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Access denied');
    });

    it('should return 404 when file not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/media/nonexistent/manifest')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });

    it('should return 404 when manifest not available', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'f1',
          hls_manifest_url: null,
          drm_protected: false,
          is_public: true,
          uploaded_by: userId
        }]
      });

      const res = await request(app)
        .get('/api/media/f1/manifest')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('HLS manifest not available');
      expect(res.body.suggestion).toBeDefined();
    });

    it('should include license server URL for DRM-protected content', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'f1',
          hls_manifest_url: 'https://cdn.example.com/hls/video/master.m3u8',
          drm_protected: true,
          is_public: true,
          uploaded_by: userId
        }]
      });

      const res = await request(app)
        .get('/api/media/f1/manifest')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.drmProtected).toBe(true);
      expect(res.body.licenseServerUrl).toContain('license');
    });
  });
});
