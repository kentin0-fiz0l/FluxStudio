/**
 * Documents Route Integration Tests
 *
 * Tests CRUD operations, version history, access control,
 * and error handling for the documents API.
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

const mockDocumentsAdapter = {
  getProjectDocuments: jest.fn(),
  createDocument: jest.fn(),
  getDocument: jest.fn(),
  updateDocumentMetadata: jest.fn(),
  deleteDocument: jest.fn(),
  getDocumentVersions: jest.fn(),
  getVersionSnapshot: jest.fn()
};

jest.mock('../../database/documents-adapter', () => mockDocumentsAdapter);

jest.mock('../../lib/auth/middleware', () => {
  const original = jest.requireActual('../../lib/auth/middleware');
  return {
    ...original,
    rateLimitByUser: () => (req, res, next) => next()
  };
});

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const documentRoutes = require('../../routes/documents');
  app.use('/api', documentRoutes);
  return app;
}

describe('Documents Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    Object.values(mockDocumentsAdapter).forEach(fn => fn.mockReset());
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/projects/:projectId/documents without token', async () => {
      await request(app).get('/api/projects/proj-1/documents').expect(401);
    });

    it('should return 401 for POST /api/projects/:projectId/documents without token', async () => {
      await request(app).post('/api/projects/proj-1/documents').send({ title: 'Test' }).expect(401);
    });

    it('should return 401 for GET /api/documents/:id without token', async () => {
      await request(app).get('/api/documents/doc-1').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/projects/proj-1/documents')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/projects/:projectId/documents
  // =========================================================================
  describe('GET /api/projects/:projectId/documents', () => {
    it('should return documents for a project', async () => {
      const mockDocs = [
        { id: 'doc-1', title: 'Design Brief', documentType: 'document' },
        { id: 'doc-2', title: 'Meeting Notes', documentType: 'note' }
      ];
      mockDocumentsAdapter.getProjectDocuments.mockResolvedValueOnce(mockDocs);

      const res = await request(app)
        .get('/api/projects/proj-1/documents')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.documents).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    it('should pass query parameters', async () => {
      mockDocumentsAdapter.getProjectDocuments.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/projects/proj-1/documents?includeArchived=true&limit=10&offset=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockDocumentsAdapter.getProjectDocuments).toHaveBeenCalledWith(
        'proj-1',
        userId,
        { includeArchived: true, limit: 10, offset: 5 }
      );
    });

    it('should return 403 when access denied', async () => {
      mockDocumentsAdapter.getProjectDocuments.mockRejectedValueOnce(
        new Error('No access to this project')
      );

      const res = await request(app)
        .get('/api/projects/proj-1/documents')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should handle generic errors', async () => {
      mockDocumentsAdapter.getProjectDocuments.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/projects/proj-1/documents')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // POST /api/projects/:projectId/documents
  // =========================================================================
  describe('POST /api/projects/:projectId/documents', () => {
    it('should create a new document', async () => {
      const mockDoc = { id: 'doc-new', title: 'New Doc', documentType: 'document' };
      mockDocumentsAdapter.createDocument.mockResolvedValueOnce(mockDoc);

      const res = await request(app)
        .post('/api/projects/proj-1/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Doc', documentType: 'document' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.document.title).toBe('New Doc');
      expect(mockDocumentsAdapter.createDocument).toHaveBeenCalledWith(
        'proj-1',
        userId,
        expect.objectContaining({ title: 'New Doc', documentType: 'document' })
      );
    });

    it('should return 403 when access denied', async () => {
      mockDocumentsAdapter.createDocument.mockRejectedValueOnce(
        new Error('No access to create documents')
      );

      const res = await request(app)
        .post('/api/projects/proj-1/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should handle generic errors', async () => {
      mockDocumentsAdapter.createDocument.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/api/projects/proj-1/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test' })
        .expect(500);

      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/documents/:documentId
  // =========================================================================
  describe('GET /api/documents/:documentId', () => {
    it('should return a document by ID', async () => {
      const mockDoc = { id: 'doc-1', title: 'Design Brief', content: 'Hello' };
      mockDocumentsAdapter.getDocument.mockResolvedValueOnce(mockDoc);

      const res = await request(app)
        .get('/api/documents/doc-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.document.id).toBe('doc-1');
    });

    it('should return 404 for non-existent document', async () => {
      mockDocumentsAdapter.getDocument.mockRejectedValueOnce(
        new Error('Document not found')
      );

      const res = await request(app)
        .get('/api/documents/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Document not found or access denied');
    });

    it('should return 404 when access denied', async () => {
      mockDocumentsAdapter.getDocument.mockRejectedValueOnce(
        new Error('access denied to document')
      );

      const res = await request(app)
        .get('/api/documents/doc-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Document not found or access denied');
    });
  });

  // =========================================================================
  // PATCH /api/documents/:documentId
  // =========================================================================
  describe('PATCH /api/documents/:documentId', () => {
    it('should update document metadata', async () => {
      const mockDoc = { id: 'doc-1', title: 'Updated Title' };
      mockDocumentsAdapter.updateDocumentMetadata.mockResolvedValueOnce(mockDoc);

      const res = await request(app)
        .patch('/api/documents/doc-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.document.title).toBe('Updated Title');
    });

    it('should return 403 when viewer tries to edit', async () => {
      mockDocumentsAdapter.updateDocumentMetadata.mockRejectedValueOnce(
        new Error('Viewers cannot edit this document')
      );

      const res = await request(app)
        .patch('/api/documents/doc-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Fail' })
        .expect(403);

      expect(res.body.error).toContain('Viewers cannot edit');
    });

    it('should return 404 for non-existent document', async () => {
      mockDocumentsAdapter.updateDocumentMetadata.mockRejectedValueOnce(
        new Error('Document not found')
      );

      const res = await request(app)
        .patch('/api/documents/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test' })
        .expect(404);

      expect(res.body.error).toBe('Document not found or access denied');
    });
  });

  // =========================================================================
  // DELETE /api/documents/:documentId
  // =========================================================================
  describe('DELETE /api/documents/:documentId', () => {
    it('should archive a document', async () => {
      mockDocumentsAdapter.deleteDocument.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/documents/doc-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Document archived successfully');
    });

    it('should return 403 for insufficient permissions', async () => {
      mockDocumentsAdapter.deleteDocument.mockRejectedValueOnce(
        new Error('Insufficient permissions to delete')
      );

      const res = await request(app)
        .delete('/api/documents/doc-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent document', async () => {
      mockDocumentsAdapter.deleteDocument.mockRejectedValueOnce(
        new Error('Document not found')
      );

      const res = await request(app)
        .delete('/api/documents/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Document not found or access denied');
    });
  });

  // =========================================================================
  // GET /api/documents/:documentId/versions
  // =========================================================================
  describe('GET /api/documents/:documentId/versions', () => {
    it('should return version history', async () => {
      const mockVersions = [
        { versionNumber: 2, createdAt: '2025-01-02T00:00:00Z' },
        { versionNumber: 1, createdAt: '2025-01-01T00:00:00Z' }
      ];
      mockDocumentsAdapter.getDocumentVersions.mockResolvedValueOnce(mockVersions);

      const res = await request(app)
        .get('/api/documents/doc-1/versions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.versions).toHaveLength(2);
      expect(res.body.count).toBe(2);
    });

    it('should return 404 for non-existent document', async () => {
      mockDocumentsAdapter.getDocumentVersions.mockRejectedValueOnce(
        new Error('Document not found')
      );

      const res = await request(app)
        .get('/api/documents/nonexistent/versions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Document not found or access denied');
    });
  });

  // =========================================================================
  // GET /api/documents/:documentId/versions/:versionNumber
  // =========================================================================
  describe('GET /api/documents/:documentId/versions/:versionNumber', () => {
    it('should return a version snapshot', async () => {
      const mockSnapshot = Buffer.from('snapshot-data');
      mockDocumentsAdapter.getVersionSnapshot.mockResolvedValueOnce(mockSnapshot);

      const res = await request(app)
        .get('/api/documents/doc-1/versions/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('application/octet-stream');
    });

    it('should return 404 for non-existent version', async () => {
      mockDocumentsAdapter.getVersionSnapshot.mockRejectedValueOnce(
        new Error('Version not found')
      );

      const res = await request(app)
        .get('/api/documents/doc-1/versions/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Version not found or access denied');
    });
  });
});
