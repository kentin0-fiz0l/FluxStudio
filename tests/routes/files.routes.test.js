/**
 * Files Routes Unit Tests
 * Tests file upload, listing, deletion, and project attachment endpoints
 * @file tests/routes/files.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// ─── Mock files adapter ───
const mockFilesAdapter = {
  listFiles: jest.fn(),
  getFileById: jest.fn(),
  createFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileProjects: jest.fn(),
  attachFileToProject: jest.fn(),
  detachFileFromProject: jest.fn(),
  getProjectFiles: jest.fn(),
};

// ─── Mock database query ───
const mockQuery = jest.fn();

// ─── Mock file storage ───
const mockFileStorage = {
  upload: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  getFileStream: jest.fn(),
  saveFile: jest.fn(),
};

jest.mock('../../database/files-adapter', () => mockFilesAdapter);
jest.mock('../../database/config', () => ({
  query: (...args) => mockQuery(...args),
}));
jest.mock('../../storage', () => mockFileStorage);

jest.mock('../../lib/auth/middleware', () => ({
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Access token is required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
  },
  rateLimitByUser: () => (req, res, next) => next(),
}));

jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next(),
  },
}));

jest.mock('../../middleware/csrf', () => ({
  csrfProtection: (req, res, next) => next(),
}));

jest.mock('../../lib/fileValidator', () => ({
  validateUploadedFiles: (req, res, next) => next(),
}));

jest.mock('../../lib/activityLogger', () => ({
  fileUploaded: jest.fn().mockResolvedValue(undefined),
  filesUploaded: jest.fn().mockResolvedValue(undefined),
  fileDeleted: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn(),
}));

jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn().mockReturnValue('test-cuid-123'),
}));

// Setup express app with files routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  const filesRouter = require('../../routes/files');
  app.use('/api/files', filesRouter);

  return app;
}

// Helper to generate a valid JWT token
function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'test@example.com', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Files Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    validToken = generateToken();
    app = createTestApp();
  });

  // ─────────────────────────────────────────────
  // GET /api/files
  // ─────────────────────────────────────────────
  describe('GET /api/files', () => {
    it('should return file list for authenticated user', async () => {
      mockFilesAdapter.listFiles.mockResolvedValue({
        items: [
          { id: 'file-1', name: 'design.png', mimeType: 'image/png', sizeBytes: 1024 },
          { id: 'file-2', name: 'logo.svg', mimeType: 'image/svg+xml', sizeBytes: 2048 },
        ],
        total: 2,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should pass query parameters to adapter', async () => {
      mockFilesAdapter.listFiles.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      await request(app)
        .get('/api/files?projectId=proj-1&type=image&limit=10&offset=5')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockFilesAdapter.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          projectId: 'proj-1',
          type: 'image',
          limit: 10,
          offset: 5,
        })
      );
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/files');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockFilesAdapter.listFiles.mockRejectedValue(new Error('DB connection lost'));

      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to list files');
    });

    it('should use default pagination when no params provided', async () => {
      mockFilesAdapter.listFiles.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      });

      await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockFilesAdapter.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
        })
      );
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/files/:fileId
  // ─────────────────────────────────────────────
  describe('GET /api/files/:fileId', () => {
    it('should return file details for existing file', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        name: 'design.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        userId: 'user-1',
      });

      const response = await request(app)
        .get('/api/files/file-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file.id).toBe('file-1');
    });

    it('should return 404 when file does not exist', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/files/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('File not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/files/file-1');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/files/file-1')
        .set('Authorization', 'Bearer invalid');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockFilesAdapter.getFileById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/files/file-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to get file');
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/files/upload
  // ─────────────────────────────────────────────
  describe('POST /api/files/upload', () => {
    it('should upload a file successfully', async () => {
      mockFileStorage.upload.mockResolvedValue('storage-key-123');
      mockFilesAdapter.createFile.mockResolvedValue({
        id: 'file-new',
        name: 'test.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        storageKey: 'storage-key-123',
      });

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('files', Buffer.from('fake-png-data'), 'test.png');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.files).toHaveLength(1);
      expect(response.body.message).toContain('uploaded successfully');
    });

    it('should return 400 when no files are uploaded', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No files uploaded');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('files', Buffer.from('data'), 'test.png');

      expect(response.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${expiredToken}`)
        .attach('files', Buffer.from('data'), 'test.png');

      expect(response.status).toBe(401);
    });

    it('should handle storage upload failures', async () => {
      mockFileStorage.upload.mockRejectedValue(new Error('Storage unavailable'));

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('files', Buffer.from('data'), 'test.png');

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to upload');
    });

    it('should reject disallowed file extensions', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('files', Buffer.from('malicious'), 'script.exe');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('File type not allowed');
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /api/files/:fileId
  // ─────────────────────────────────────────────
  describe('DELETE /api/files/:fileId', () => {
    it('should delete a file successfully', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        name: 'delete-me.png',
        storageKey: 'sk-123',
        originalName: 'delete-me.png',
      });
      mockFileStorage.delete.mockResolvedValue(true);
      mockFilesAdapter.deleteFile.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/files/file-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 when file does not exist', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/files/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('File not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/api/files/file-1');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .delete('/api/files/file-1')
        .set('Authorization', 'Bearer invalid');

      expect(response.status).toBe(401);
    });

    it('should handle storage delete failures', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        storageKey: 'sk-123',
        originalName: 'test.png',
      });
      mockFileStorage.delete.mockRejectedValue(new Error('Storage error'));

      const response = await request(app)
        .delete('/api/files/file-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to delete');
    });

    it('should handle database delete failures', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        storageKey: 'sk-123',
        originalName: 'test.png',
      });
      mockFileStorage.delete.mockResolvedValue(true);
      mockFilesAdapter.deleteFile.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/files/file-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to delete');
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/files/:fileId/attach
  // ─────────────────────────────────────────────
  describe('POST /api/files/:fileId/attach', () => {
    it('should attach file to project', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        name: 'design.png',
      });
      mockFilesAdapter.attachFileToProject.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/files/file-1/attach')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ projectId: 'proj-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('attached');
    });

    it('should return 400 when projectId is missing', async () => {
      const response = await request(app)
        .post('/api/files/file-1/attach')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('projectId is required');
    });

    it('should return 404 when file does not exist', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/files/nonexistent/attach')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ projectId: 'proj-1' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('File not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/files/file-1/attach')
        .send({ projectId: 'proj-1' });

      expect(response.status).toBe(401);
    });

    it('should accept optional role and notes', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        name: 'design.png',
      });
      mockFilesAdapter.attachFileToProject.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/files/file-1/attach')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          projectId: 'proj-1',
          role: 'deliverable',
          notes: 'Final version',
        });

      expect(response.status).toBe(200);
      expect(mockFilesAdapter.attachFileToProject).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'deliverable',
          notes: 'Final version',
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        name: 'design.png',
      });
      mockFilesAdapter.attachFileToProject.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/files/file-1/attach')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ projectId: 'proj-1' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to attach');
    });
  });

  // ─────────────────────────────────────────────
  // DELETE /api/files/:fileId/attach/:projectId
  // ─────────────────────────────────────────────
  describe('DELETE /api/files/:fileId/attach/:projectId', () => {
    it('should detach file from project', async () => {
      mockFilesAdapter.detachFileFromProject.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/files/file-1/attach/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('detached');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete('/api/files/file-1/attach/proj-1');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .delete('/api/files/file-1/attach/proj-1')
        .set('Authorization', 'Bearer invalid');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockFilesAdapter.detachFileFromProject.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/files/file-1/attach/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to detach');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .delete('/api/files/file-1/attach/proj-1')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/files/:fileId/projects
  // ─────────────────────────────────────────────
  describe('GET /api/files/:fileId/projects', () => {
    it('should return projects attached to file', async () => {
      mockFilesAdapter.getFileProjects.mockResolvedValue([
        { id: 'proj-1', name: 'Project Alpha' },
        { id: 'proj-2', name: 'Project Beta' },
      ]);

      const response = await request(app)
        .get('/api/files/file-1/projects')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.projects).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/files/file-1/projects');

      expect(response.status).toBe(401);
    });

    it('should return empty array when no projects attached', async () => {
      mockFilesAdapter.getFileProjects.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files/file-1/projects')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockFilesAdapter.getFileProjects.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/files/file-1/projects')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to get file projects');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/files/file-1/projects')
        .set('Authorization', 'Bearer bad');

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/files/project-files/:projectId
  // ─────────────────────────────────────────────
  describe('GET /api/files/project-files/:projectId', () => {
    it('should return files for a project', async () => {
      mockFilesAdapter.getProjectFiles.mockResolvedValue({
        files: [
          { id: 'file-1', name: 'design.png' },
          { id: 'file-2', name: 'spec.pdf' },
        ],
        total: 2,
        hasMore: false,
      });

      const response = await request(app)
        .get('/api/files/project-files/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should pass pagination params to adapter', async () => {
      mockFilesAdapter.getProjectFiles.mockResolvedValue({
        files: [],
        total: 0,
        hasMore: false,
      });

      await request(app)
        .get('/api/files/project-files/proj-1?limit=10&offset=20')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockFilesAdapter.getProjectFiles).toHaveBeenCalledWith('proj-1', {
        limit: 10,
        offset: 20,
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/files/project-files/proj-1');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockFilesAdapter.getProjectFiles.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/files/project-files/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to get project files');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/files/project-files/proj-1')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/files/projects/:projectId/files
  // ─────────────────────────────────────────────
  describe('GET /api/files/projects/:projectId/files', () => {
    it('should return project files with print status', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'pm-1' }],
      }); // canUserAccessProject check
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'pf-1',
            name: 'model.stl',
            size: 5000,
            uploadedAt: '2024-01-01',
            uploadedBy: 'user-1',
            printStatus: null,
            printProgress: null,
            printJobId: null,
          },
        ],
      }); // file listing query

      const response = await request(app)
        .get('/api/files/projects/proj-1/files')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 when user lacks project access', async () => {
      mockQuery.mockResolvedValue({ rows: [] }); // no access

      const response = await request(app)
        .get('/api/files/projects/proj-1/files')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/files/projects/proj-1/files');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // First call succeeds (canUserAccessProject), second call fails (file listing)
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'pm-1' }] }) // access check passes
        .mockRejectedValueOnce(new Error('Connection refused')); // listing fails

      const response = await request(app)
        .get('/api/files/projects/proj-1/files')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/files/projects/proj-1/files')
        .set('Authorization', 'Bearer nope');

      expect(response.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/files/projects/:projectId/attach-file
  // ─────────────────────────────────────────────
  describe('POST /api/files/projects/:projectId/attach-file', () => {
    it('should attach existing file to project', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        name: 'design.png',
      });
      mockFilesAdapter.attachFileToProject.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/files/projects/proj-1/attach-file')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ fileId: 'file-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file).toBeDefined();
    });

    it('should return 400 when fileId is missing', async () => {
      const response = await request(app)
        .post('/api/files/projects/proj-1/attach-file')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('fileId is required');
    });

    it('should return 404 when file does not exist', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/files/projects/proj-1/attach-file')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ fileId: 'nonexistent' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('File not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/files/projects/proj-1/attach-file')
        .send({ fileId: 'file-1' });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      mockFilesAdapter.getFileById.mockResolvedValue({
        id: 'file-1',
        name: 'design.png',
      });
      mockFilesAdapter.attachFileToProject.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/files/projects/proj-1/attach-file')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ fileId: 'file-1' });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to attach');
    });
  });
});
