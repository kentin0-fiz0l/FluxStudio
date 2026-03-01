/**
 * Integrations Route Integration Tests
 *
 * Tests OAuth flows, Figma/Slack/GitHub integration endpoints,
 * Zod validation, and error handling.
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

// Mock oauth-manager (lazy-loaded via require inside route)
const mockOAuthManager = {
  getAuthorizationURL: jest.fn(),
  handleCallback: jest.fn(),
  getUserIntegrations: jest.fn(),
  disconnectIntegration: jest.fn(),
  getAccessToken: jest.fn(),
};
jest.mock('../../lib/oauth-manager', () => mockOAuthManager);

// Mock @octokit/rest
const mockOctokit = {
  repos: {
    listForAuthenticatedUser: jest.fn(),
    get: jest.fn(),
    listCommits: jest.fn(),
    listBranches: jest.fn(),
    listCollaborators: jest.fn(),
  },
  issues: {
    listForRepo: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    createComment: jest.fn(),
  },
  pulls: {
    list: jest.fn(),
  },
  users: {
    getAuthenticated: jest.fn(),
  },
};
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => mockOctokit)
}));

// Mock github-sync-service
const mockSyncService = {
  syncRepository: jest.fn(),
  getLinkedProject: jest.fn(),
  syncIssuesFromGitHub: jest.fn(),
  getRepositoryLink: jest.fn(),
  startAutoSync: jest.fn(),
  stopAutoSync: jest.fn(),
  processWebhookEvent: jest.fn(),
  isRunning: false,
  syncInterval: 300000,
};
jest.mock('../../services/github-sync-service', () => {
  return jest.fn(() => mockSyncService);
});

// Mock Figma service (virtual — module loaded lazily inside route handlers)
jest.mock('../../src/services/figmaService', () => ({
  default: jest.fn().mockImplementation(() => ({
    getMe: jest.fn(),
    getTeamProjects: jest.fn(),
    getFile: jest.fn(),
    getComments: jest.fn(),
  })),
}), { virtual: true });

// Mock Slack service (virtual — module loaded lazily inside route handlers)
jest.mock('../../src/services/slackService', () => ({
  default: jest.fn().mockImplementation(() => ({
    listChannels: jest.fn(),
    postMessage: jest.fn(),
    sendProjectUpdate: jest.fn(),
  })),
  handleChallenge: jest.fn(),
  verifyWebhookSignature: jest.fn(),
  parseWebhook: jest.fn(),
}), { virtual: true });

// Mock security middleware
jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with integrations routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/integrations');
  app.use('/api/integrations', routes);
  return app;
}

describe('Integrations Integration Tests', () => {
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
    it('should return 401 for GET /api/integrations/ without token', async () => {
      await request(app)
        .get('/api/integrations/')
        .expect(401);
    });

    it('should return 401 for GET /api/integrations/:provider/auth without token', async () => {
      await request(app)
        .get('/api/integrations/github/auth')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/integrations/
  // =========================================================================
  describe('GET /api/integrations/', () => {
    it('should return 200 with integrations list', async () => {
      mockOAuthManager.getUserIntegrations.mockResolvedValueOnce([
        { provider: 'github', connected: true }
      ]);

      const res = await request(app)
        .get('/api/integrations/')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.integrations).toHaveLength(1);
      expect(res.body.integrations[0].provider).toBe('github');
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.getUserIntegrations.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/integrations/')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.message).toBe('Error retrieving integrations');
    });

    it('should handle missing table (42P01 error code) gracefully', async () => {
      const tableError = new Error('relation "oauth_integrations" does not exist');
      tableError.code = '42P01';
      mockOAuthManager.getUserIntegrations.mockRejectedValueOnce(tableError);

      const res = await request(app)
        .get('/api/integrations/')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.integrations).toEqual([]);
    });
  });

  // =========================================================================
  // GET /api/integrations/:provider/auth
  // =========================================================================
  describe('GET /api/integrations/:provider/auth', () => {
    it('should return 200 with authorization URL', async () => {
      mockOAuthManager.getAuthorizationURL.mockResolvedValueOnce({
        url: 'https://github.com/login/oauth/authorize?client_id=test',
        stateToken: 'state-123'
      });

      const res = await request(app)
        .get('/api/integrations/github/auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.authorizationUrl).toContain('github.com');
      expect(res.body.stateToken).toBe('state-123');
      expect(res.body.provider).toBe('github');
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.getAuthorizationURL.mockRejectedValueOnce(new Error('Provider not supported'));

      const res = await request(app)
        .get('/api/integrations/unknown/auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.message).toBe('Provider not supported');
    });
  });

  // =========================================================================
  // POST /api/integrations/:provider/callback
  // =========================================================================
  describe('POST /api/integrations/:provider/callback', () => {
    it('should return 200 with valid code and state (Zod validated)', async () => {
      mockOAuthManager.handleCallback.mockResolvedValueOnce({
        userInfo: { name: 'Test User', scope: 'repo user' }
      });

      const res = await request(app)
        .post('/api/integrations/github/callback')
        .send({ code: 'auth-code-123', state: 'state-token-456' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBe('github');
    });

    it('should return 400 for missing code (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/integrations/github/callback')
        .send({ state: 'state-token-456' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for missing state (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/integrations/github/callback')
        .send({ code: 'auth-code-123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on OAuth error', async () => {
      mockOAuthManager.handleCallback.mockRejectedValueOnce(new Error('Invalid state'));

      const res = await request(app)
        .post('/api/integrations/github/callback')
        .send({ code: 'auth-code-123', state: 'bad-state' })
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid state');
    });
  });

  // =========================================================================
  // DELETE /api/integrations/:provider
  // =========================================================================
  describe('DELETE /api/integrations/:provider', () => {
    it('should return 200 when disconnected', async () => {
      mockOAuthManager.disconnectIntegration.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/integrations/github')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.provider).toBe('github');
      expect(res.body.message).toContain('disconnected');
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.disconnectIntegration.mockRejectedValueOnce(new Error('Not connected'));

      const res = await request(app)
        .delete('/api/integrations/github')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.message).toBe('Not connected');
    });
  });

  // =========================================================================
  // GET /api/integrations/figma/files
  // =========================================================================
  describe('GET /api/integrations/figma/files', () => {
    it('should return 200 with Figma files', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('figma-token');
      const FigmaService = require('../../src/services/figmaService').default;
      FigmaService.mockImplementation(() => ({
        getMe: jest.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com', handle: 'tester', teams: [{ id: 'team-1' }] }),
        getTeamProjects: jest.fn().mockResolvedValue([{ id: 'proj-1', name: 'Design' }]),
      }));

      const res = await request(app)
        .get('/api/integrations/figma/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.teamId).toBe('team-1');
      expect(res.body.projects).toBeDefined();
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.getAccessToken.mockRejectedValueOnce(new Error('Figma not connected'));

      const res = await request(app)
        .get('/api/integrations/figma/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.message).toBe('Figma not connected');
    });
  });

  // =========================================================================
  // POST /api/integrations/slack/message
  // =========================================================================
  describe('POST /api/integrations/slack/message', () => {
    it('should return 200 when message sent (Zod validated)', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('slack-token');
      const SlackService = require('../../src/services/slackService').default;
      SlackService.mockImplementation(() => ({
        postMessage: jest.fn().mockResolvedValue({ ok: true, ts: '1234567890.123456' }),
      }));

      const res = await request(app)
        .post('/api/integrations/slack/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: '#general', text: 'Hello team!' })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 for missing channel (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/integrations/slack/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Hello team!' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for missing text (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/integrations/slack/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: '#general' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.getAccessToken.mockRejectedValueOnce(new Error('Slack not connected'));

      const res = await request(app)
        .post('/api/integrations/slack/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: '#general', text: 'Hello' })
        .expect(500);

      expect(res.body.message).toBe('Slack not connected');
    });
  });

  // =========================================================================
  // POST /api/integrations/slack/project-update
  // =========================================================================
  describe('POST /api/integrations/slack/project-update', () => {
    it('should return 200 when project update sent (Zod validated)', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('slack-token');
      const SlackService = require('../../src/services/slackService').default;
      SlackService.mockImplementation(() => ({
        sendProjectUpdate: jest.fn().mockResolvedValue({ ok: true }),
      }));

      const res = await request(app)
        .post('/api/integrations/slack/project-update')
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: '#project', projectName: 'FluxStudio', updateType: 'milestone' })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('should return 400 for missing required fields (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/integrations/slack/project-update')
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: '#project' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.getAccessToken.mockRejectedValueOnce(new Error('Slack error'));

      const res = await request(app)
        .post('/api/integrations/slack/project-update')
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: '#project', projectName: 'FluxStudio', updateType: 'milestone' })
        .expect(500);

      expect(res.body.message).toBe('Slack error');
    });
  });

  // =========================================================================
  // GET /api/integrations/github/repositories
  // =========================================================================
  describe('GET /api/integrations/github/repositories', () => {
    it('should return 200 with repositories', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('gh-token');
      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValueOnce({
        data: [{ id: 1, name: 'flux-repo', full_name: 'user/flux-repo' }]
      });

      const res = await request(app)
        .get('/api/integrations/github/repositories')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.repositories).toHaveLength(1);
      expect(res.body.repositories[0].name).toBe('flux-repo');
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.getAccessToken.mockRejectedValueOnce(new Error('GitHub not connected'));

      const res = await request(app)
        .get('/api/integrations/github/repositories')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.message).toBe('GitHub not connected');
    });
  });

  // =========================================================================
  // POST /api/integrations/github/repositories/:owner/:repo/issues
  // =========================================================================
  describe('POST /api/integrations/github/repositories/:owner/:repo/issues', () => {
    it('should return 200 when issue created (Zod validated)', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('gh-token');
      mockOctokit.issues.create.mockResolvedValueOnce({
        data: { id: 42, title: 'Bug report', number: 10 }
      });

      const res = await request(app)
        .post('/api/integrations/github/repositories/user/flux-repo/issues')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Bug report', body: 'Something is broken' })
        .expect(200);

      expect(res.body.title).toBe('Bug report');
    });

    it('should return 400 for missing title (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/integrations/github/repositories/user/flux-repo/issues')
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'No title here' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on error', async () => {
      mockOAuthManager.getAccessToken.mockRejectedValueOnce(new Error('Permission denied'));

      const res = await request(app)
        .post('/api/integrations/github/repositories/user/flux-repo/issues')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Bug report' })
        .expect(500);

      expect(res.body.message).toBe('Permission denied');
    });
  });

  // =========================================================================
  // POST /api/integrations/github/repositories/:owner/:repo/link
  // =========================================================================
  describe('POST /api/integrations/github/repositories/:owner/:repo/link', () => {
    const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
      process.env.USE_DATABASE = 'true';
    });

    afterEach(() => {
      delete process.env.USE_DATABASE;
    });

    it('should return 200 when repo linked (Zod validated)', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('gh-token');

      // getProjects query (database mode)
      query.mockResolvedValueOnce({
        rows: [{
          id: validProjectId,
          title: 'Test Project',
          members: [{ userId: userId }],
        }]
      });

      const res = await request(app)
        .post('/api/integrations/github/repositories/user/flux-repo/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: validProjectId })
        .expect(200);

      expect(res.body.message).toContain('linked');
    });

    it('should return 400 for missing projectId (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/integrations/github/repositories/user/flux-repo/link')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 404 when project not found', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('gh-token');

      // getProjects returns empty array
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/integrations/github/repositories/user/flux-repo/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: validProjectId })
        .expect(404);

      expect(res.body.message).toBe('Project not found');
    });

    it('should return 403 when user is not a project member', async () => {
      mockOAuthManager.getAccessToken.mockResolvedValueOnce('gh-token');

      // getProjects returns project where user is not a member
      query.mockResolvedValueOnce({
        rows: [{
          id: validProjectId,
          title: 'Test Project',
          members: [{ userId: 'other-user' }],
        }]
      });

      const res = await request(app)
        .post('/api/integrations/github/repositories/user/flux-repo/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ projectId: validProjectId })
        .expect(403);

      expect(res.body.message).toBe('Access denied');
    });
  });
});
