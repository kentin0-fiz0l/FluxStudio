/**
 * Projects Route Integration Tests
 *
 * Tests CRUD operations, authentication, authorization,
 * and error handling for the projects API.
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

// Mock projects-adapter
const mockProjectsAdapter = {
  getProjects: jest.fn(),
  getProjectById: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  getProjectMembers: jest.fn(),
  addProjectMember: jest.fn(),
  removeProjectMember: jest.fn(),
  updateProjectMemberRole: jest.fn(),
  getProjectActivity: jest.fn(),
  getOrCreateProjectConversation: jest.fn(),
  getProjectUnreadCount: jest.fn(),
  getProjectsUnreadCounts: jest.fn()
};

jest.mock('../../database/projects-adapter', () => mockProjectsAdapter);

// Mock activity logger
jest.mock('../../lib/activityLogger', () => ({
  projectCreated: jest.fn(),
  projectUpdated: jest.fn(),
  getUserActivities: jest.fn()
}));

// Mock middleware/security
jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
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

const { query } = require('../../database/config');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

// Helper: build express app with project routes
function createApp() {
  const app = express();
  app.use(express.json());
  const projectRoutes = require('../../routes/projects');
  app.use('/api/projects', projectRoutes);
  return app;
}

// Deterministic test UUIDs for Zod validation
const TEST_UUIDS = {
  user1: '10000000-0000-0000-0000-000000000001',
  user2: '10000000-0000-0000-0000-000000000002',
  project1: '20000000-0000-0000-0000-000000000001',
};

describe('Projects Integration Tests', () => {
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
    // Default query to resolve so .catch() chaining doesn't throw
    query.mockResolvedValue({ rows: [] });
    Object.values(mockProjectsAdapter).forEach(fn => fn.mockReset());
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/projects without token', async () => {
      await request(app).get('/api/projects').expect(401);
    });

    it('should return 401 for POST /api/projects without token', async () => {
      await request(app).post('/api/projects').send({ name: 'Test' }).expect(401);
    });

    it('should return 401 for PUT /api/projects/:id without token', async () => {
      await request(app).put('/api/projects/proj-1').send({ name: 'Test' }).expect(401);
    });

    it('should return 401 for DELETE /api/projects/:id without token', async () => {
      await request(app).delete('/api/projects/proj-1').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: userId, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/projects
  // =========================================================================
  describe('GET /api/projects', () => {
    it('should return projects for authenticated user', async () => {
      mockProjectsAdapter.getProjects.mockResolvedValueOnce([
        { id: 'proj-1', name: 'Project 1', status: 'planning' },
        { id: 'proj-2', name: 'Project 2', status: 'in_progress' }
      ]);
      mockProjectsAdapter.getProjectsUnreadCounts.mockResolvedValueOnce({
        'proj-1': 3,
        'proj-2': 0
      });

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.projects).toHaveLength(2);
      expect(res.body.projects[0].unreadCount).toBe(3);
      expect(mockProjectsAdapter.getProjects).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });

    it('should pass query parameters for filtering', async () => {
      mockProjectsAdapter.getProjects.mockResolvedValueOnce([]);

      await request(app)
        .get('/api/projects?organizationId=org-1&status=active&limit=10&offset=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockProjectsAdapter.getProjects).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          organizationId: 'org-1',
          status: 'active',
          limit: 10,
          offset: 5
        })
      );
    });

    it('should return empty list when no projects exist', async () => {
      mockProjectsAdapter.getProjects.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.projects).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('should handle database errors', async () => {
      mockProjectsAdapter.getProjects.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to fetch projects');
    });
  });

  // =========================================================================
  // GET /api/projects/:projectId
  // =========================================================================
  describe('GET /api/projects/:projectId', () => {
    it('should return a project by ID', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValueOnce({
        id: 'proj-1', name: 'Project 1', status: 'planning'
      });
      mockProjectsAdapter.getProjectUnreadCount.mockResolvedValueOnce(5);
      mockProjectsAdapter.getProjectMembers.mockResolvedValueOnce([
        { userId: 'test-user-123', role: 'owner' }
      ]);

      const res = await request(app)
        .get('/api/projects/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.project.id).toBe('proj-1');
      expect(res.body.project.unreadCount).toBe(5);
      expect(res.body.project.members).toHaveLength(1);
    });

    it('should return 404 for non-existent project', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });
  });

  // =========================================================================
  // POST /api/projects
  // =========================================================================
  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const newProject = {
        id: 'proj-new',
        name: 'New Project',
        description: 'A test project',
        status: 'planning'
      };

      mockProjectsAdapter.createProject.mockResolvedValueOnce(newProject);
      mockProjectsAdapter.getOrCreateProjectConversation.mockResolvedValueOnce({ id: 'conv-1' });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Project', description: 'A test project' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.project.name).toBe('New Project');
      expect(mockProjectsAdapter.createProject).toHaveBeenCalled();
    });

    it('should return 400 when name is too short', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'ab' })
        .expect(400);

      expect(res.body.error).toContain('at least 3 characters');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' })
        .expect(400);

      expect(res.body.error).toBe('Required');
    });

    it('should add additional members if provided', async () => {
      mockProjectsAdapter.createProject.mockResolvedValueOnce({
        id: 'proj-new', name: 'Team Project'
      });
      mockProjectsAdapter.addProjectMember.mockResolvedValue();
      mockProjectsAdapter.getOrCreateProjectConversation.mockResolvedValueOnce({ id: 'conv-1' });

      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Team Project', members: ['user-2', 'user-3'] })
        .expect(201);

      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledTimes(2);
      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledWith('proj-new', 'user-2', 'contributor');
      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledWith('proj-new', 'user-3', 'contributor');
    });

    it('should handle database errors during creation', async () => {
      mockProjectsAdapter.createProject.mockRejectedValueOnce(new Error('DB write error'));

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Failing Project' })
        .expect(500);

      expect(res.body.error).toBe('Failed to create project');
    });
  });

  // =========================================================================
  // PUT /api/projects/:projectId
  // =========================================================================
  describe('PUT /api/projects/:projectId', () => {
    it('should update project', async () => {
      mockProjectsAdapter.updateProject.mockResolvedValueOnce({
        id: 'proj-1', name: 'Updated Name', status: 'in_progress'
      });

      const res = await request(app)
        .put('/api/projects/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name', status: 'in_progress' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.project.name).toBe('Updated Name');
    });

    it('should return 404 when project not found', async () => {
      mockProjectsAdapter.updateProject.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });
  });

  // =========================================================================
  // DELETE /api/projects/:projectId
  // =========================================================================
  describe('DELETE /api/projects/:projectId', () => {
    it('should delete a project', async () => {
      mockProjectsAdapter.deleteProject.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/projects/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Project deleted successfully');
      expect(mockProjectsAdapter.deleteProject).toHaveBeenCalledWith('proj-1', userId);
    });

    it('should handle deletion errors', async () => {
      mockProjectsAdapter.deleteProject.mockRejectedValueOnce(new Error('Cannot delete'));

      const res = await request(app)
        .delete('/api/projects/proj-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to delete project');
    });
  });

  // =========================================================================
  // Project Members
  // =========================================================================
  describe('Project Members', () => {
    it('GET /api/projects/:id/members should list members', async () => {
      mockProjectsAdapter.getProjectMembers.mockResolvedValueOnce([
        { userId: 'user-1', role: 'owner' },
        { userId: 'user-2', role: 'contributor' }
      ]);

      const res = await request(app)
        .get('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.members).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('POST /api/projects/:id/members should add a member', async () => {
      mockProjectsAdapter.addProjectMember.mockResolvedValueOnce();

      const res = await request(app)
        .post('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: TEST_UUIDS.user2, role: 'contributor' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockProjectsAdapter.addProjectMember).toHaveBeenCalledWith('proj-1', TEST_UUIDS.user2, 'contributor');
    });

    it('POST /api/projects/:id/members should return 400 without userId', async () => {
      const res = await request(app)
        .post('/api/projects/proj-1/members')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'contributor' })
        .expect(400);

      expect(res.body.error).toBe('Required');
    });

    it('DELETE /api/projects/:id/members/:userId should remove member', async () => {
      mockProjectsAdapter.removeProjectMember.mockResolvedValueOnce();

      const res = await request(app)
        .delete('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockProjectsAdapter.removeProjectMember).toHaveBeenCalledWith('proj-1', 'user-2');
    });

    it('PUT /api/projects/:id/members/:userId should update role', async () => {
      mockProjectsAdapter.updateProjectMemberRole.mockResolvedValueOnce();

      const res = await request(app)
        .put('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockProjectsAdapter.updateProjectMemberRole).toHaveBeenCalledWith('proj-1', 'user-2', 'admin');
    });

    it('PUT /api/projects/:id/members/:userId should return 400 without role', async () => {
      const res = await request(app)
        .put('/api/projects/proj-1/members/user-2')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Role is required');
    });
  });

  // =========================================================================
  // Project Activity
  // =========================================================================
  describe('GET /api/projects/:id/activity', () => {
    it('should return project activity', async () => {
      mockProjectsAdapter.getProjectActivity.mockResolvedValueOnce([
        { type: 'project_created', timestamp: '2025-01-01T00:00:00Z' }
      ]);

      const res = await request(app)
        .get('/api/projects/proj-1/activity')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.activity).toHaveLength(1);
    });
  });

  // =========================================================================
  // Project Counts
  // =========================================================================
  describe('GET /api/projects/:id/counts', () => {
    it('should return project counts when user is a member', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValueOnce({ id: 'proj-1' });
      mockProjectsAdapter.getProjectMembers.mockResolvedValueOnce([
        { userId: 'test-user-123', role: 'owner' }
      ]);
      query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '12' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const res = await request(app)
        .get('/api/projects/proj-1/counts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.counts.messages).toBe(5);
      expect(res.body.counts.files).toBe(3);
      expect(res.body.counts.assets).toBe(12);
      expect(res.body.counts.boards).toBe(2);
    });

    it('should return 404 when project not found', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/projects/nonexistent/counts')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });

    it('should return 403 when user is not a project member', async () => {
      mockProjectsAdapter.getProjectById.mockResolvedValueOnce({ id: 'proj-1' });
      mockProjectsAdapter.getProjectMembers.mockResolvedValueOnce([
        { userId: 'other-user', role: 'owner' }
      ]);

      const res = await request(app)
        .get('/api/projects/proj-1/counts')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Not a project member');
    });
  });
});
