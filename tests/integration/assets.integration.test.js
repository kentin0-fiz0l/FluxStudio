/**
 * Assets Route Integration Tests
 *
 * Tests asset CRUD, versioning, project attachment/detachment,
 * stats, and Zod validation for the assets API.
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

jest.mock('../../database/assets-adapter', () => ({
  listAssets: jest.fn(),
  getAssetById: jest.fn(),
  createAsset: jest.fn(),
  updateAssetMetadata: jest.fn(),
  deleteAsset: jest.fn(),
  createAssetVersion: jest.fn(),
  setPrimaryAssetVersion: jest.fn(),
  getAssetVersions: jest.fn(),
  getAssetProjects: jest.fn(),
  attachAssetToProject: jest.fn(),
  detachAssetFromProject: jest.fn(),
  getAssetStats: jest.fn(),
  determineAssetKind: jest.fn(),
  getProjectAssets: jest.fn(),
}));

const assetsAdapter = require('../../database/assets-adapter');

jest.mock('../../database/files-adapter', () => ({
  getFileById: jest.fn(),
  createFile: jest.fn(),
  createPreview: jest.fn(),
}));

const filesAdapter = require('../../database/files-adapter');

jest.mock('../../storage', () => ({
  upload: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  getFileStream: jest.fn(),
  saveFile: jest.fn(),
  savePreview: jest.fn(),
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with assets routes
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/assets', require('../../routes/assets'));
  return app;
}

describe('Assets Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';
  const assetId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const fileId = 'ffffffff-1111-2222-3333-444444444444';
  const projectId = 'pppppppp-qqqq-rrrr-ssss-tttttttttttt';
  const versionId = 'aaaa1111-bbbb-cccc-dddd-eeee22223333';

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
    it('should return 401 for GET /api/assets without token', async () => {
      await request(app)
        .get('/api/assets')
        .expect(401);
    });

    it('should return 401 for POST /api/assets without token', async () => {
      await request(app)
        .post('/api/assets')
        .send({ fileId, name: 'Test', kind: 'image' })
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/assets
  // =========================================================================
  describe('GET /api/assets', () => {
    it('should return 200 with asset list', async () => {
      assetsAdapter.listAssets.mockResolvedValueOnce({
        assets: [{ id: assetId, name: 'Logo', kind: 'image' }],
        total: 1,
      });

      const res = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.assets).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('should return 500 on adapter error', async () => {
      assetsAdapter.listAssets.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to list assets');
    });
  });

  // =========================================================================
  // GET /api/assets/stats
  // =========================================================================
  describe('GET /api/assets/stats', () => {
    it('should return 200 with stats', async () => {
      assetsAdapter.getAssetStats.mockResolvedValueOnce({
        totalAssets: 42, totalImages: 20, totalVideos: 5,
      });

      const res = await request(app)
        .get('/api/assets/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalAssets).toBe(42);
    });

    it('should return 500 on error', async () => {
      assetsAdapter.getAssetStats.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/assets/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to get stats');
    });
  });

  // =========================================================================
  // POST /api/assets
  // =========================================================================
  describe('POST /api/assets', () => {
    it('should return 201 for valid create', async () => {
      filesAdapter.getFileById.mockResolvedValueOnce({
        id: fileId, name: 'logo.png', mimeType: 'image/png',
        extension: 'png', organizationId: 'org-1',
      });
      assetsAdapter.determineAssetKind.mockReturnValue('image');
      assetsAdapter.createAsset.mockResolvedValueOnce({ id: assetId, name: 'Logo' });
      assetsAdapter.createAssetVersion.mockResolvedValueOnce({ id: versionId });
      assetsAdapter.getAssetById.mockResolvedValueOnce({
        id: assetId, name: 'Logo', kind: 'image', versions: [{ id: versionId }],
      });

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId, name: 'Logo', kind: 'image' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.asset.id).toBe(assetId);
    });

    it('should return 400 for missing fileId (Zod rejects)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Logo', kind: 'image' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for missing name (Zod rejects)', async () => {
      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId, kind: 'image' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when file not found', async () => {
      filesAdapter.getFileById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/assets')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId, name: 'Logo', kind: 'image' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('File not found');
    });
  });

  // =========================================================================
  // PATCH /api/assets/:assetId
  // =========================================================================
  describe('PATCH /api/assets/:assetId', () => {
    it('should return 200 when updated', async () => {
      assetsAdapter.updateAssetMetadata.mockResolvedValueOnce({
        id: assetId, name: 'Updated Logo', kind: 'image',
      });

      const res = await request(app)
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Logo' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.asset.name).toBe('Updated Logo');
    });

    it('should return 404 when asset not found', async () => {
      assetsAdapter.updateAssetMetadata.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Logo' })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Asset not found');
    });

    it('should return 400 for invalid body (Zod)', async () => {
      const res = await request(app)
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // DELETE /api/assets/:assetId
  // =========================================================================
  describe('DELETE /api/assets/:assetId', () => {
    it('should return 200 on success', async () => {
      assetsAdapter.deleteAsset.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when asset not found', async () => {
      assetsAdapter.deleteAsset.mockResolvedValueOnce(false);

      const res = await request(app)
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Asset not found');
    });
  });

  // =========================================================================
  // POST /api/assets/:assetId/versions
  // =========================================================================
  describe('POST /api/assets/:assetId/versions', () => {
    it('should return 201 for valid version create', async () => {
      filesAdapter.getFileById.mockResolvedValueOnce({
        id: fileId, name: 'logo-v2.png', mimeType: 'image/png',
        extension: 'png', width: 800, height: 600,
      });
      assetsAdapter.createAssetVersion.mockResolvedValueOnce({
        id: versionId, assetId, fileId,
      });

      const res = await request(app)
        .post(`/api/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId, label: 'Version 2' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.version.id).toBe(versionId);
    });

    it('should return 400 for missing fileId (Zod)', async () => {
      const res = await request(app)
        .post(`/api/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ label: 'Version 2' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when file not found', async () => {
      filesAdapter.getFileById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/api/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('File not found');
    });
  });

  // =========================================================================
  // POST /api/assets/:assetId/primary
  // =========================================================================
  describe('POST /api/assets/:assetId/primary', () => {
    it('should return 200 for valid request', async () => {
      assetsAdapter.setPrimaryAssetVersion.mockResolvedValueOnce(true);
      assetsAdapter.getAssetById.mockResolvedValueOnce({
        id: assetId, name: 'Logo', primaryVersionId: versionId,
      });

      const res = await request(app)
        .post(`/api/assets/${assetId}/primary`)
        .set('Authorization', `Bearer ${token}`)
        .send({ versionId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.asset).toBeDefined();
    });

    it('should return 400 for missing versionId (Zod)', async () => {
      const res = await request(app)
        .post(`/api/assets/${assetId}/primary`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // GET /api/assets/:assetId/versions
  // =========================================================================
  describe('GET /api/assets/:assetId/versions', () => {
    it('should return 200 with version list', async () => {
      assetsAdapter.getAssetVersions.mockResolvedValueOnce([
        { id: versionId, label: 'v1', fileId },
      ]);

      const res = await request(app)
        .get(`/api/assets/${assetId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.versions).toHaveLength(1);
    });
  });

  // =========================================================================
  // GET /api/assets/:assetId/projects
  // =========================================================================
  describe('GET /api/assets/:assetId/projects', () => {
    it('should return 200 with project list', async () => {
      assetsAdapter.getAssetProjects.mockResolvedValueOnce([
        { id: projectId, name: 'Design System' },
      ]);

      const res = await request(app)
        .get(`/api/assets/${assetId}/projects`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.projects).toHaveLength(1);
    });
  });

  // =========================================================================
  // POST /api/assets/projects/:projectId/assets — Attach existing asset
  // =========================================================================
  describe('POST /api/assets/projects/:projectId/assets', () => {
    it('should return 200 when attaching existing asset', async () => {
      assetsAdapter.attachAssetToProject.mockResolvedValueOnce(true);

      const res = await request(app)
        .post(`/api/assets/projects/${projectId}/assets`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assetId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Asset attached to project');
    });
  });

  // =========================================================================
  // DELETE /api/assets/projects/:projectId/assets/:assetId — Detach
  // =========================================================================
  describe('DELETE /api/assets/projects/:projectId/assets/:assetId', () => {
    it('should return 200 when detaching asset', async () => {
      assetsAdapter.detachAssetFromProject.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete(`/api/assets/projects/${projectId}/assets/${assetId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Asset detached from project');
    });
  });
});
