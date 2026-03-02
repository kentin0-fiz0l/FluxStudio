/**
 * Files Route Integration Tests
 *
 * Tests file listing, upload, deletion, and project attachment endpoints
 * with mocked database adapters and storage.
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

// Mock files-adapter
const mockFilesAdapter = {
  listFiles: jest.fn(),
  getFileById: jest.fn(),
  createFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileProjects: jest.fn(),
  attachFileToProject: jest.fn(),
  detachFileFromProject: jest.fn(),
  getProjectFiles: jest.fn()
};

jest.mock('../../database/files-adapter', () => mockFilesAdapter);

// Mock storage
const mockStorage = {
  upload: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  getFileStream: jest.fn()
};

jest.mock('../../storage', () => mockStorage);

// Mock file validator
jest.mock('../../lib/fileValidator', () => ({
  validateUploadedFiles: (req, res, next) => next(),
  validateFileType: jest.fn(() => true)
}));

// Mock activity logger
jest.mock('../../lib/activityLogger', () => ({
  fileUploaded: jest.fn(),
  filesUploaded: jest.fn(),
  fileDeleted: jest.fn()
}));

// Mock middleware/security
jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
}));

// Mock middleware/csrf
jest.mock('../../middleware/csrf', () => ({
  csrfProtection: (req, res, next) => next(),
  getCsrfToken: jest.fn()
}));

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

// Mock lib/auth/middleware rateLimitByUser
jest.mock('../../lib/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  client: null
}));

const { query } = require('../../database/config');

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const fileRoutes = require('../../routes/files');
  app.use('/api/files', fileRoutes);
  return app;
}

// Deterministic test UUIDs for Zod validation
const TEST_UUIDS = {
  user1: '10000000-0000-0000-0000-000000000001',
  project1: '20000000-0000-0000-0000-000000000001',
  file1: '30000000-0000-0000-0000-000000000001',
  file2: '30000000-0000-0000-0000-000000000002',
};

describe('Files Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    // Reset call history and queues, but keep mock implementations from jest.mock()
    query.mockReset();
    Object.values(mockFilesAdapter).forEach(fn => fn.mockReset());
    Object.values(mockStorage).forEach(fn => fn.mockReset());
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/files without token', async () => {
      await request(app).get('/api/files').expect(401);
    });

    it('should return 401 for GET /api/files/:id without token', async () => {
      await request(app).get('/api/files/file-1').expect(401);
    });

    it('should return 401 for DELETE /api/files/:id without token', async () => {
      await request(app).delete('/api/files/file-1').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/files')
        .set('Authorization', 'Bearer bad-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/files
  // =========================================================================
  describe('GET /api/files', () => {
    it('should list files for authenticated user', async () => {
      mockFilesAdapter.listFiles.mockResolvedValueOnce({
        items: [
          { id: 'f1', name: 'design.png', mimeType: 'image/png', sizeBytes: 1024 },
          { id: 'f2', name: 'model.stl', mimeType: 'application/sla', sizeBytes: 2048 }
        ],
        total: 2,
        page: 1,
        pageSize: 50,
        totalPages: 1
      });

      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.files).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should pass filter parameters', async () => {
      mockFilesAdapter.listFiles.mockResolvedValueOnce({
        items: [], total: 0, page: 1, pageSize: 10, totalPages: 0
      });

      await request(app)
        .get('/api/files?projectId=proj-1&type=image&search=logo&limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockFilesAdapter.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          projectId: 'proj-1',
          type: 'image',
          search: 'logo',
          limit: 10,
          offset: 0
        })
      );
    });

    it('should handle database errors', async () => {
      mockFilesAdapter.listFiles.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to list files');
    });
  });

  // =========================================================================
  // GET /api/files/:fileId
  // =========================================================================
  describe('GET /api/files/:fileId', () => {
    it('should return file details', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce({
        id: 'f1', name: 'design.png', mimeType: 'image/png', sizeBytes: 1024
      });

      const res = await request(app)
        .get('/api/files/f1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.file.id).toBe('f1');
      expect(res.body.file.name).toBe('design.png');
    });

    it('should return 404 for non-existent file', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/files/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });
  });

  // =========================================================================
  // POST /api/files/upload
  // =========================================================================
  describe('POST /api/files/upload', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/files/upload')
        .expect(401);
    });

    it('should return 400 when no files are uploaded', async () => {
      // Send multipart request without actual file attachments
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('projectId', 'proj-1');

      // Multer may return 400 or the handler catches empty files
      expect([400, 500]).toContain(res.status);
    });

    it('should upload a valid file', async () => {
      mockStorage.upload.mockResolvedValueOnce('storage/key/design.png');
      mockFilesAdapter.createFile.mockResolvedValueOnce({
        id: 'f-new', name: 'design.png', storageKey: 'storage/key/design.png'
      });

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('files', Buffer.from('fake png data'), 'design.png')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.files).toHaveLength(1);
      expect(res.body.message).toContain('1 file(s) uploaded');
    });
  });

  // =========================================================================
  // DELETE /api/files/:fileId
  // =========================================================================
  describe('DELETE /api/files/:fileId', () => {
    it('should delete an existing file', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce({
        id: 'f1', storageKey: 'storage/key/f1.png', projectId: 'proj-1'
      });
      mockStorage.delete.mockResolvedValueOnce();
      mockFilesAdapter.deleteFile.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/files/f1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('File deleted successfully');
      expect(mockStorage.delete).toHaveBeenCalledWith('storage/key/f1.png');
      expect(mockFilesAdapter.deleteFile).toHaveBeenCalledWith('f1', userId);
    });

    it('should return 404 when file not found', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/files/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });

    it('should handle deletion errors', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce({
        id: 'f1', storageKey: 'key', projectId: null
      });
      mockStorage.delete.mockRejectedValueOnce(new Error('Storage error'));

      const res = await request(app)
        .delete('/api/files/f1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to delete file');
    });
  });

  // =========================================================================
  // File-Project Attachment
  // =========================================================================
  describe('File-Project Attachment', () => {
    it('GET /api/files/:fileId/projects should return attached projects', async () => {
      mockFilesAdapter.getFileProjects.mockResolvedValueOnce([
        { id: 'proj-1', name: 'Project 1' }
      ]);

      const res = await request(app)
        .get('/api/files/f1/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.projects).toHaveLength(1);
    });

    it('POST /api/files/:fileId/attach should attach file to project', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce({ id: TEST_UUIDS.file1, name: 'test.png' });
      mockFilesAdapter.attachFileToProject.mockResolvedValueOnce();

      const res = await request(app)
        .post(`/api/files/${TEST_UUIDS.file1}/attach`)
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: TEST_UUIDS.project1, role: 'reference' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockFilesAdapter.attachFileToProject).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: TEST_UUIDS.file1,
          projectId: TEST_UUIDS.project1,
          role: 'reference',
          addedBy: userId
        })
      );
    });

    it('POST /api/files/:fileId/attach should return 400 without projectId', async () => {
      const res = await request(app)
        .post(`/api/files/${TEST_UUIDS.file1}/attach`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Required');
    });

    it('POST /api/files/:fileId/attach should return 404 when file not found', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/api/files/${TEST_UUIDS.file1}/attach`)
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: TEST_UUIDS.project1 })
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });

    it('DELETE /api/files/:fileId/attach/:projectId should detach file from project', async () => {
      mockFilesAdapter.detachFileFromProject.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/files/f1/attach/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockFilesAdapter.detachFileFromProject).toHaveBeenCalledWith({
        fileId: 'f1',
        projectId: 'proj-1'
      });
    });
  });

  // =========================================================================
  // Project Files (via /api/files/project-files/:projectId)
  // =========================================================================
  describe('GET /api/files/project-files/:projectId', () => {
    it('should list files attached to a project', async () => {
      mockFilesAdapter.getProjectFiles.mockResolvedValueOnce({
        files: [{ id: 'f1', name: 'test.png' }],
        total: 1,
        hasMore: false
      });

      const res = await request(app)
        .get('/api/files/project-files/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.files).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.hasMore).toBe(false);
    });
  });

  // =========================================================================
  // Project Files (via /api/files/projects/:projectId/files)
  // =========================================================================
  describe('GET /api/files/projects/:projectId/files', () => {
    it('should return project files when user has access', async () => {
      // canUserAccessProject query
      query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      // Files query
      query.mockResolvedValueOnce({
        rows: [
          { id: 'pf1', name: 'model.stl', size: 4096, uploadedAt: '2025-01-01', printStatus: null }
        ]
      });

      const res = await request(app)
        .get('/api/files/projects/proj-1/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.files)).toBe(true);
      expect(res.body.files[0].id).toBe('pf1');
      expect(res.body.files[0].type).toBe('stl');
    });

    it('should return 403 when user has no project access', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/files/projects/proj-1/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toContain('permission');
    });
  });

  // =========================================================================
  // POST /api/files/projects/:projectId/attach-file
  // =========================================================================
  describe('POST /api/files/projects/:projectId/attach-file', () => {
    it('should attach file to project via alternative route', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce({ id: TEST_UUIDS.file1, name: 'test.png' });
      mockFilesAdapter.attachFileToProject.mockResolvedValueOnce();

      const res = await request(app)
        .post(`/api/files/projects/${TEST_UUIDS.project1}/attach-file`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: TEST_UUIDS.file1, role: 'reference' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 400 without fileId', async () => {
      const res = await request(app)
        .post(`/api/files/projects/${TEST_UUIDS.project1}/attach-file`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Required');
    });

    it('should return 404 when file not found', async () => {
      mockFilesAdapter.getFileById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/api/files/projects/${TEST_UUIDS.project1}/attach-file`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: TEST_UUIDS.file2 })
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });
  });
});
