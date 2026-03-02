/**
 * Connectors Route Integration Tests
 *
 * Tests OAuth connector listing, auth URLs, callbacks,
 * file browsing, import, sync jobs, and error handling.
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

jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
}));

const mockConnectorsAdapter = {
  getUserConnectors: jest.fn(),
  isConnected: jest.fn(),
  getConnectorInfo: jest.fn(),
  disconnectConnector: jest.fn(),
  getGitHubRepos: jest.fn(),
  getGitHubRepoContents: jest.fn(),
  getGoogleDriveFiles: jest.fn(),
  getDropboxFiles: jest.fn(),
  getOneDriveFiles: jest.fn(),
  importFile: jest.fn(),
  getConnectorFiles: jest.fn(),
  linkFileToProject: jest.fn(),
  deleteConnectorFile: jest.fn(),
  getSyncJobs: jest.fn(),
  createSyncJob: jest.fn()
};

jest.mock('../../database/connectors-adapter', () => mockConnectorsAdapter);

const mockOauthManager = {
  getAuthorizationURL: jest.fn(),
  handleCallback: jest.fn(),
  refreshToken: jest.fn()
};

jest.mock('../../lib/oauth-manager', () => mockOauthManager);

const mockFilesAdapter = {
  createFromConnector: jest.fn()
};

jest.mock('../../database/files-adapter', () => mockFilesAdapter);

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const connectorRoutes = require('../../routes/connectors');
  app.use('/api/connectors', connectorRoutes);
  return app;
}

// Deterministic test UUIDs for Zod validation
const TEST_UUIDS = {
  user1: '10000000-0000-0000-0000-000000000001',
  project1: '20000000-0000-0000-0000-000000000001',
  file1: '30000000-0000-0000-0000-000000000001',
  connector1: '40000000-0000-0000-0000-000000000001',
};

describe('Connectors Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    Object.values(mockConnectorsAdapter).forEach(fn => fn.mockReset());
    Object.values(mockOauthManager).forEach(fn => fn.mockReset());
    Object.values(mockFilesAdapter).forEach(fn => fn.mockReset());
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/connectors/list without token', async () => {
      await request(app).get('/api/connectors/list').expect(401);
    });

    it('should return 401 for DELETE /api/connectors/github without token', async () => {
      await request(app).delete('/api/connectors/github').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/connectors/list')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/connectors/list
  // =========================================================================
  describe('GET /api/connectors/list', () => {
    it('should return all connectors with status', async () => {
      mockConnectorsAdapter.getUserConnectors.mockResolvedValueOnce([
        { provider: 'github', isActive: true, isExpired: false, username: 'testuser', connectedAt: '2025-01-01' }
      ]);

      const res = await request(app)
        .get('/api/connectors/list')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.connectors).toHaveLength(6);

      const github = res.body.connectors.find(c => c.id === 'github');
      expect(github.status).toBe('connected');
      expect(github.username).toBe('testuser');

      const figma = res.body.connectors.find(c => c.id === 'figma');
      expect(figma.status).toBe('disconnected');
    });

    it('should handle errors', async () => {
      mockConnectorsAdapter.getUserConnectors.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/connectors/list')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get connectors list');
    });
  });

  // =========================================================================
  // GET /api/connectors/:provider/auth-url
  // =========================================================================
  describe('GET /api/connectors/:provider/auth-url', () => {
    it('should return OAuth authorization URL', async () => {
      mockOauthManager.getAuthorizationURL.mockResolvedValueOnce({
        url: 'https://github.com/login/oauth/authorize?...',
        stateToken: 'state-123'
      });

      const res = await request(app)
        .get('/api/connectors/github/auth-url')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.url).toContain('github.com');
      expect(res.body.stateToken).toBe('state-123');
    });

    it('should return 400 for invalid provider', async () => {
      const res = await request(app)
        .get('/api/connectors/invalid_provider/auth-url')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.error).toContain('Invalid provider');
    });

    it('should handle errors', async () => {
      mockOauthManager.getAuthorizationURL.mockRejectedValueOnce(new Error('OAuth error'));

      const res = await request(app)
        .get('/api/connectors/github/auth-url')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // GET /api/connectors/:provider/callback
  // =========================================================================
  describe('GET /api/connectors/:provider/callback', () => {
    it('should handle successful OAuth callback', async () => {
      mockOauthManager.handleCallback.mockResolvedValueOnce({
        userInfo: { userId: 'test-user-123' }
      });

      const res = await request(app)
        .get('/api/connectors/github/callback?code=abc123&state=state-123')
        .expect(302);

      expect(res.headers.location).toContain('success=true');
      expect(res.headers.location).toContain('provider=github');
    });

    it('should redirect with error when OAuth returns error', async () => {
      const res = await request(app)
        .get('/api/connectors/github/callback?error=access_denied&error_description=User%20denied')
        .expect(302);

      expect(res.headers.location).toContain('error=access_denied');
    });

    it('should redirect with error when missing params', async () => {
      const res = await request(app)
        .get('/api/connectors/github/callback')
        .expect(302);

      expect(res.headers.location).toContain('error=missing_params');
    });
  });

  // =========================================================================
  // DELETE /api/connectors/:provider
  // =========================================================================
  describe('DELETE /api/connectors/:provider', () => {
    it('should disconnect a connector', async () => {
      mockConnectorsAdapter.disconnectConnector.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/connectors/github')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockConnectorsAdapter.disconnectConnector).toHaveBeenCalledWith(userId, 'github');
    });

    it('should handle errors', async () => {
      mockConnectorsAdapter.disconnectConnector.mockRejectedValueOnce(new Error('error'));

      const res = await request(app)
        .delete('/api/connectors/github')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to disconnect connector');
    });
  });

  // =========================================================================
  // GET /api/connectors/:provider/status
  // =========================================================================
  describe('GET /api/connectors/:provider/status', () => {
    it('should return connector status', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(true);
      mockConnectorsAdapter.getConnectorInfo.mockResolvedValueOnce({
        username: 'testuser',
        connectedAt: '2025-01-01'
      });

      const res = await request(app)
        .get('/api/connectors/github/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.connected).toBe(true);
      expect(res.body.info.username).toBe('testuser');
    });
  });

  // =========================================================================
  // GET /api/connectors/:provider/files
  // =========================================================================
  describe('GET /api/connectors/:provider/files', () => {
    it('should return GitHub repos when no owner/repo specified', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(true);
      mockConnectorsAdapter.getGitHubRepos.mockResolvedValueOnce([
        { name: 'repo-1', full_name: 'user/repo-1' }
      ]);

      const res = await request(app)
        .get('/api/connectors/github/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.files).toHaveLength(1);
    });

    it('should return 401 when not connected', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(false);

      const res = await request(app)
        .get('/api/connectors/github/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(res.body.error).toContain('Not connected');
    });

    it('should return 400 for unsupported provider', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(true);

      const res = await request(app)
        .get('/api/connectors/slack/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.error).toContain('not supported');
    });
  });

  // =========================================================================
  // POST /api/connectors/:provider/import
  // =========================================================================
  describe('POST /api/connectors/:provider/import', () => {
    it('should import a file from a connector', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(true);
      mockConnectorsAdapter.importFile.mockResolvedValueOnce({
        id: 'file-1',
        name: 'design.fig',
        mime_type: 'application/figma'
      });
      mockFilesAdapter.createFromConnector.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/connectors/figma/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: 'figma-file-123', projectId: TEST_UUIDS.project1 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.file.name).toBe('design.fig');
    });

    it('should return 400 when fileId is missing', async () => {
      const res = await request(app)
        .post('/api/connectors/github/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: TEST_UUIDS.project1 })
        .expect(400);

      expect(res.body.error).toBe('Required');
    });

    it('should return 401 when not connected', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/connectors/github/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileId: 'file-1' })
        .expect(401);

      expect(res.body.error).toContain('Not connected');
    });
  });

  // =========================================================================
  // Connector Files
  // =========================================================================
  describe('Connector Files', () => {
    it('GET /api/connectors/files should return imported files', async () => {
      mockConnectorsAdapter.getConnectorFiles.mockResolvedValueOnce([
        { id: 'f1', name: 'file.fig', provider: 'figma' }
      ]);

      const res = await request(app)
        .get('/api/connectors/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.files).toHaveLength(1);
    });

    it('POST /api/connectors/files/:fileId/link should link file to project', async () => {
      mockConnectorsAdapter.linkFileToProject.mockResolvedValueOnce({
        id: TEST_UUIDS.file1,
        name: 'file.fig',
        projectId: TEST_UUIDS.project1
      });

      const res = await request(app)
        .post(`/api/connectors/files/${TEST_UUIDS.file1}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: TEST_UUIDS.project1 })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('POST /api/connectors/files/:fileId/link should return 400 without projectId', async () => {
      const res = await request(app)
        .post(`/api/connectors/files/${TEST_UUIDS.file1}/link`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Required');
    });

    it('POST /api/connectors/files/:fileId/link should return 404 when file not found', async () => {
      mockConnectorsAdapter.linkFileToProject.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/connectors/files/nonexistent/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: TEST_UUIDS.project1 })
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });

    it('DELETE /api/connectors/files/:fileId should delete a file', async () => {
      mockConnectorsAdapter.deleteConnectorFile.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/connectors/files/f1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('DELETE /api/connectors/files/:fileId should return 404 when not found', async () => {
      mockConnectorsAdapter.deleteConnectorFile.mockResolvedValueOnce(false);

      const res = await request(app)
        .delete('/api/connectors/files/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('File not found');
    });
  });

  // =========================================================================
  // Sync Jobs
  // =========================================================================
  describe('Sync Jobs', () => {
    it('GET /api/connectors/sync-jobs should return jobs', async () => {
      mockConnectorsAdapter.getSyncJobs.mockResolvedValueOnce([
        { id: 'job-1', provider: 'github', status: 'completed' }
      ]);

      const res = await request(app)
        .get('/api/connectors/sync-jobs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.jobs).toHaveLength(1);
    });

    it('POST /api/connectors/:provider/sync should trigger sync', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(true);
      mockConnectorsAdapter.createSyncJob.mockResolvedValueOnce({
        id: 'job-new',
        status: 'pending'
      });

      const res = await request(app)
        .post('/api/connectors/github/sync')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.job.status).toBe('pending');
    });

    it('POST /api/connectors/:provider/sync should return 401 when not connected', async () => {
      mockConnectorsAdapter.isConnected.mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/connectors/github/sync')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(res.body.error).toContain('Not connected');
    });
  });

  // =========================================================================
  // POST /api/connectors/:provider/refresh
  // =========================================================================
  describe('POST /api/connectors/:provider/refresh', () => {
    it('should refresh OAuth token', async () => {
      mockOauthManager.refreshToken.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/connectors/github/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.refreshed).toBe(true);
    });

    it('should handle errors', async () => {
      mockOauthManager.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));

      const res = await request(app)
        .post('/api/connectors/github/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to refresh token');
    });
  });
});
