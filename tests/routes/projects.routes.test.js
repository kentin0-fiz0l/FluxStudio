/**
 * Projects Routes Unit Tests
 * Tests project CRUD, members, activity, conversation, and counts endpoints
 * @file tests/routes/projects.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// ─── Mock projects adapter ───
const mockProjectsAdapter = {
  getProjects: jest.fn(),
  getProjectById: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  getProjectActivity: jest.fn(),
  getOrCreateProjectConversation: jest.fn(),
  getProjectMembers: jest.fn(),
  addProjectMember: jest.fn(),
  removeProjectMember: jest.fn(),
  updateProjectMemberRole: jest.fn(),
  getProjectUnreadCount: jest.fn(),
  getProjectsUnreadCounts: jest.fn(),
};

// ─── Mock database query ───
const mockQuery = jest.fn();

jest.mock('../../database/projects-adapter', () => mockProjectsAdapter);
jest.mock('../../database/config', () => ({
  query: (...args) => mockQuery(...args),
}));

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
}));

jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next(),
  },
}));

jest.mock('../../lib/analytics/funnelTracker', () => ({
  ingestEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/activityLogger', () => ({
  projectCreated: jest.fn().mockResolvedValue(undefined),
  projectUpdated: jest.fn().mockResolvedValue(undefined),
  getUserActivities: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn(),
}));

jest.mock('../../middleware/quotaCheck', () => ({
  checkQuota: () => (_req, _res, next) => next(),
}));

// Setup express app with project routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  const projectsRouter = require('../../routes/projects');
  app.use('/api/projects', projectsRouter);

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

describe('Projects Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
    validToken = generateToken();
    // Default: no unread counts
    mockProjectsAdapter.getProjectsUnreadCounts.mockResolvedValue({});
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/projects
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/projects', () => {
    it('should list projects for the authenticated user', async () => {
      const projects = [
        { id: 'proj-1', name: 'Project Alpha' },
        { id: 'proj-2', name: 'Project Beta' },
      ];
      mockProjectsAdapter.getProjects.mockResolvedValue(projects);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.projects).toHaveLength(2);
      expect(mockProjectsAdapter.getProjects).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });

    it('should pass query parameters to adapter', async () => {
      mockProjectsAdapter.getProjects.mockResolvedValue([]);

      await request(app)
        .get('/api/projects?organizationId=org-1&status=active&limit=10&offset=5')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockProjectsAdapter.getProjects).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          organizationId: 'org-1',
          status: 'active',
          limit: 10,
          offset: 5,
        })
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.getProjects.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Failed to fetch');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/projects/:projectId
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/projects/:projectId', () => {
    it('should return a single project', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Alpha' });
      mockProjectsAdapter.getProjectUnreadCount.mockResolvedValue(3);
      mockProjectsAdapter.getProjectMembers.mockResolvedValue([{ userId: 'user-1', role: 'owner' }]);

      const response = await request(app)
        .get('/api/projects/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.project.name).toBe('Alpha');
      expect(response.body.project.unreadCount).toBe(3);
      expect(response.body.project.members).toHaveLength(1);
    });

    it('should return 404 when project not found', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/projects/proj-1');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.getProjectById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/projects/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/projects
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/projects', () => {
    it('should create a project with valid data', async () => {
      const newProject = { id: 'proj-new', name: 'New Project', status: 'planning' };
      mockProjectsAdapter.createProject.mockResolvedValue(newProject);
      mockProjectsAdapter.getOrCreateProjectConversation.mockResolvedValue({ id: 'conv-1' });
      // Mock the referral query fire-and-forget
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'New Project', description: 'A test project' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.project.name).toBe('New Project');
    });

    it('should return 400 when name is too short', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'AB' }); // less than 3 characters

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('3 characters');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ description: 'No name given' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'New Project' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.createProject.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'New Project' });

      expect(response.status).toBe(500);
    });

    it('should add additional members when specified', async () => {
      const newProject = { id: 'proj-new', name: 'Team Project' };
      mockProjectsAdapter.createProject.mockResolvedValue(newProject);
      mockProjectsAdapter.addProjectMember.mockResolvedValue();
      mockProjectsAdapter.getOrCreateProjectConversation.mockResolvedValue({ id: 'conv-1' });
      mockQuery.mockResolvedValue({ rows: [] });

      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Team Project', members: ['user-2', 'user-3'] });

      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledTimes(2);
      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledWith('proj-new', 'user-2', 'contributor');
      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledWith('proj-new', 'user-3', 'contributor');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/projects/:projectId
  // ═══════════════════════════════════════════════════════════

  describe('PUT /api/projects/:projectId', () => {
    it('should update a project', async () => {
      mockProjectsAdapter.updateProject.mockResolvedValue({
        id: 'proj-1', name: 'Updated Name', status: 'in-progress',
      });

      const response = await request(app)
        .put('/api/projects/proj-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated Name', status: 'in-progress' });

      expect(response.status).toBe(200);
      expect(response.body.project.name).toBe('Updated Name');
    });

    it('should return 404 when project not found', async () => {
      mockProjectsAdapter.updateProject.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/projects/proj-1')
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.updateProject.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .put('/api/projects/proj-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/projects/:projectId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/projects/:projectId', () => {
    it('should delete a project', async () => {
      mockProjectsAdapter.deleteProject.mockResolvedValue();

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/projects/proj-1');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.deleteProject.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/projects/proj-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/projects/:projectId/activity
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/projects/:projectId/activity', () => {
    it('should return project activity', async () => {
      mockProjectsAdapter.getProjectActivity.mockResolvedValue([
        { id: 'act-1', type: 'project.created', timestamp: '2026-01-01T00:00:00Z' },
      ]);

      const response = await request(app)
        .get('/api/projects/proj-1/activity')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.activity).toHaveLength(1);
    });

    it('should pass pagination params', async () => {
      mockProjectsAdapter.getProjectActivity.mockResolvedValue([]);

      await request(app)
        .get('/api/projects/proj-1/activity?limit=5&offset=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockProjectsAdapter.getProjectActivity).toHaveBeenCalledWith(
        'proj-1',
        { limit: 5, offset: 10 }
      );
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/projects/proj-1/activity');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.getProjectActivity.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/projects/proj-1/activity')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/projects/:projectId/conversation
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/projects/:projectId/conversation', () => {
    it('should return project conversation', async () => {
      mockProjectsAdapter.getOrCreateProjectConversation.mockResolvedValue({
        id: 'conv-1', projectId: 'proj-1',
      });

      const response = await request(app)
        .get('/api/projects/proj-1/conversation')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.conversation.id).toBe('conv-1');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/projects/proj-1/conversation');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.getOrCreateProjectConversation.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/projects/proj-1/conversation')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/projects/:projectId/members
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/projects/:projectId/members', () => {
    it('should return project members', async () => {
      mockProjectsAdapter.getProjectMembers.mockResolvedValue([
        { userId: 'user-1', role: 'owner' },
        { userId: 'user-2', role: 'contributor' },
      ]);

      const response = await request(app)
        .get('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.members).toHaveLength(2);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/projects/proj-1/members');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.getProjectMembers.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/projects/:projectId/members
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/projects/:projectId/members', () => {
    it('should add a member to the project', async () => {
      mockProjectsAdapter.addProjectMember.mockResolvedValue();

      const response = await request(app)
        .post('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ userId: 'user-2', role: 'contributor' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('added');
      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledWith('proj-1', 'user-2', 'contributor');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .post('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'contributor' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('userId is required');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/projects/proj-1/members')
        .send({ userId: 'user-2' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.addProjectMember.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ userId: 'user-2' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/projects/:projectId/members/:userId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/projects/:projectId/members/:userId', () => {
    it('should remove a member from the project', async () => {
      mockProjectsAdapter.removeProjectMember.mockResolvedValue();

      const response = await request(app)
        .delete('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('removed');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/projects/proj-1/members/user-2');
      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.removeProjectMember.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/projects/:projectId/members/:userId
  // ═══════════════════════════════════════════════════════════

  describe('PUT /api/projects/:projectId/members/:userId', () => {
    it('should update member role', async () => {
      mockProjectsAdapter.updateProjectMemberRole.mockResolvedValue();

      const response = await request(app)
        .put('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
    });

    it('should return 400 when role is missing', async () => {
      const response = await request(app)
        .put('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Role is required');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/projects/proj-1/members/user-2')
        .send({ role: 'admin' });

      expect(response.status).toBe(401);
    });

    it('should return 500 on adapter error', async () => {
      mockProjectsAdapter.updateProjectMemberRole.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .put('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/projects/:projectId/counts
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/projects/:projectId/counts', () => {
    it('should return project counts', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValue({ id: 'proj-1' });
      mockProjectsAdapter.getProjectMembers.mockResolvedValue([
        { userId: 'user-1', role: 'owner' },
      ]);
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // messages
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // files
        .mockResolvedValueOnce({ rows: [{ count: '12' }] }) // assets
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // boards

      const response = await request(app)
        .get('/api/projects/proj-1/counts')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.counts).toEqual({
        messages: 5,
        files: 3,
        assets: 12,
        boards: 2,
      });
    });

    it('should return 404 when project not found', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/projects/nonexistent/counts')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not a project member', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValue({ id: 'proj-1' });
      mockProjectsAdapter.getProjectMembers.mockResolvedValue([
        { userId: 'other-user', role: 'owner' },
      ]);

      const response = await request(app)
        .get('/api/projects/proj-1/counts')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/projects/proj-1/counts');
      expect(response.status).toBe(401);
    });

    it('should return 500 on query error', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValue({ id: 'proj-1' });
      mockProjectsAdapter.getProjectMembers.mockResolvedValue([
        { userId: 'user-1', role: 'owner' },
      ]);
      mockQuery.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/projects/proj-1/counts')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });
});
