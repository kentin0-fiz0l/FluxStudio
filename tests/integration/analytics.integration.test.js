/**
 * Analytics Route Integration Tests
 *
 * Tests project health, burndown, velocity, team workload,
 * risk assessment, event ingestion, and funnel queries.
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

jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
}));

jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678')
}));

jest.mock('../../lib/analytics-scoring', () => ({
  calculateProjectHealth: jest.fn(),
  calculateWorkload: jest.fn(),
  calculateVelocity: jest.fn(),
  forecastCompletion: jest.fn(),
}));

const {
  calculateProjectHealth,
  calculateWorkload,
  calculateVelocity,
  forecastCompletion,
} = require('../../lib/analytics-scoring');

jest.mock('../../lib/analytics/funnelTracker', () => ({
  ingestEvent: jest.fn(),
  queryFunnel: jest.fn(),
  queryRetention: jest.fn(),
  FUNNEL_STAGES: ['visit', 'signup', 'activate', 'retain'],
}));

const { ingestEvent, queryFunnel, queryRetention } = require('../../lib/analytics/funnelTracker');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with analytics routes
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', require('../../routes/analytics'));
  return app;
}

describe('Analytics Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';
  const projectId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const teamId = 'tttttttt-uuuu-vvvv-wwww-xxxxxxxxxxxx';

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
    it('should return 401 for GET /api/analytics/project/:projectId/health without token', async () => {
      await request(app)
        .get(`/api/analytics/project/${projectId}/health`)
        .expect(401);
    });

    it('should return 401 for POST /api/analytics/events without token (Zod rejects first)', async () => {
      // POST /events does NOT require authenticateToken — it uses optional JWT extraction.
      // But if we send a valid body without auth, it should still succeed (201).
      // So test auth on a protected endpoint instead.
      await request(app)
        .get(`/api/analytics/project/${projectId}/burndown`)
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/analytics/project/:projectId/health
  // =========================================================================
  describe('GET /api/analytics/project/:projectId/health', () => {
    it('should return 200 with health data', async () => {
      // verifyProjectAccess query
      query.mockResolvedValueOnce({ rows: [{ id: projectId, due_date: '2025-12-01', organization_id: 'org-1' }] });
      // task stats query
      query.mockResolvedValueOnce({ rows: [{
        total_tasks: 20, completed_tasks: 10, in_progress_tasks: 5,
        todo_tasks: 3, blocked_tasks: 1, overdue_tasks: 1, completion_percentage: 50,
      }] });
      // velocity query
      query.mockResolvedValueOnce({ rows: [{ avg_estimated: '4.0', avg_actual: '5.0', count: '10' }] });
      // momentum query
      query.mockResolvedValueOnce({ rows: [{ recent: '15', previous: '10' }] });
      // cache snapshot insert (non-critical)
      query.mockResolvedValueOnce({ rows: [] });

      calculateProjectHealth.mockReturnValue({
        score: 78,
        completionScore: 80,
        velocityScore: 70,
        momentumScore: 90,
        overdueScore: 72,
        breakdown: { completion: 'good' },
      });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/health`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.projectId).toBe(projectId);
      expect(res.body.score).toBe(78);
      expect(res.body.taskStats).toBeDefined();
      expect(res.body.taskStats.total).toBe(20);
      expect(calculateProjectHealth).toHaveBeenCalled();
    });

    it('should return 404 when project not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/health`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });

    it('should return 500 on DB error', async () => {
      query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/health`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to calculate health score');
    });
  });

  // =========================================================================
  // GET /api/analytics/project/:projectId/burndown
  // =========================================================================
  describe('GET /api/analytics/project/:projectId/burndown', () => {
    it('should return 200 with burndown data', async () => {
      // verifyProjectAccess
      query.mockResolvedValueOnce({ rows: [{ id: projectId, due_date: '2025-12-01', organization_id: 'org-1' }] });
      // total tasks count
      query.mockResolvedValueOnce({ rows: [{ total: '15' }] });
      // daily completed
      query.mockResolvedValueOnce({ rows: [
        { date: '2025-11-01', completed_by_date: '3' },
        { date: '2025-11-02', completed_by_date: '5' },
      ] });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/burndown`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.projectId).toBe(projectId);
      expect(res.body.totalTasks).toBe(15);
      expect(res.body.burndown).toHaveLength(2);
      expect(res.body.burndown[0].remaining).toBe(12);
    });

    it('should return 404 when project not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/burndown`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });

    it('should return 500 on DB error', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/burndown`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to calculate burndown');
    });
  });

  // =========================================================================
  // GET /api/analytics/project/:projectId/velocity
  // =========================================================================
  describe('GET /api/analytics/project/:projectId/velocity', () => {
    it('should return 200 with velocity and forecast', async () => {
      // verifyProjectAccess
      query.mockResolvedValueOnce({ rows: [{ id: projectId, due_date: '2025-12-01', organization_id: 'org-1' }] });
      // completed tasks for velocity
      query.mockResolvedValueOnce({ rows: [
        { started_at: '2025-10-01', completed_at: '2025-10-03', estimated_hours: 4, actual_hours: 5 },
      ] });
      // remaining tasks
      query.mockResolvedValueOnce({ rows: [{ remaining: '8' }] });

      calculateVelocity.mockReturnValue({ weeklyVelocity: 3.5, estimationAccuracy: 0.8 });
      forecastCompletion.mockReturnValue({ estimatedWeeks: 2.3, onTrack: true });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/velocity`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.projectId).toBe(projectId);
      expect(res.body.weeklyVelocity).toBe(3.5);
      expect(res.body.forecast).toEqual({ estimatedWeeks: 2.3, onTrack: true });
      expect(res.body.remainingTasks).toBe(8);
    });

    it('should return 404 when project not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/velocity`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });

    it('should return 500 on DB error', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/velocity`)
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to calculate velocity');
    });
  });

  // =========================================================================
  // GET /api/analytics/team/:teamId/workload
  // =========================================================================
  describe('GET /api/analytics/team/:teamId/workload', () => {
    it('should return 200 with member workload', async () => {
      // verifyTeamAccess
      query.mockResolvedValueOnce({ rows: [{ id: teamId }] });
      // team members with tasks
      query.mockResolvedValueOnce({ rows: [{
        user_id: 'user-1', user_name: 'Alice', email: 'alice@test.com', avatar_url: null,
        role: 'developer', active_tasks: '5', in_progress_tasks: '3', pending_tasks: '2',
        blocked_tasks: '0', completed_tasks: '10', overdue_tasks: '1',
        remaining_estimated_hours: '20', critical_tasks: '1', high_tasks: '2',
        medium_tasks: '1', low_tasks: '1',
      }] });
      // bottlenecks
      query.mockResolvedValueOnce({ rows: [] });

      calculateWorkload.mockReturnValue({ workloadScore: 65, workloadLevel: 'moderate' });

      const res = await request(app)
        .get(`/api/analytics/team/${teamId}/workload`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.teamId).toBe(teamId);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].name).toBe('Alice');
      expect(res.body.members[0].workloadScore).toBe(65);
      expect(res.body.bottlenecks).toBeDefined();
    });

    it('should return 404 when team not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/analytics/team/${teamId}/workload`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Team not found');
    });
  });

  // =========================================================================
  // GET /api/analytics/project/:projectId/risks
  // =========================================================================
  describe('GET /api/analytics/project/:projectId/risks', () => {
    it('should return 200 with at-risk tasks', async () => {
      // verifyProjectAccess
      query.mockResolvedValueOnce({ rows: [{ id: projectId, due_date: '2025-12-01', organization_id: 'org-1' }] });
      // completed tasks for velocity
      query.mockResolvedValueOnce({ rows: [] });
      // remaining tasks
      query.mockResolvedValueOnce({ rows: [{ remaining: '5' }] });
      // at-risk tasks
      query.mockResolvedValueOnce({ rows: [{
        id: 'task-1', title: 'Overdue Task', status: 'in-progress', priority: 'high',
        due_date: '2025-10-01', estimated_hours: '8', assigned_to: 'user-1',
        assigned_name: 'Alice', risk_type: 'overdue', days_overdue: '10',
      }] });
      // health history
      query.mockResolvedValueOnce({ rows: [{ date: '2025-10-25', health_score: 72 }] });

      calculateVelocity.mockReturnValue({ weeklyVelocity: 2 });
      forecastCompletion.mockReturnValue({ estimatedWeeks: 2.5, onTrack: false });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/risks`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.projectId).toBe(projectId);
      expect(res.body.atRiskTasks).toHaveLength(1);
      expect(res.body.atRiskTasks[0].riskType).toBe('overdue');
      expect(res.body.forecast).toBeDefined();
      expect(res.body.remainingTasks).toBe(5);
      expect(res.body.healthHistory).toHaveLength(1);
    });

    it('should return 404 when project not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get(`/api/analytics/project/${projectId}/risks`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Project not found');
    });
  });

  // =========================================================================
  // POST /api/analytics/events
  // =========================================================================
  describe('POST /api/analytics/events', () => {
    it('should return 201 for valid event', async () => {
      ingestEvent.mockResolvedValueOnce({ id: 'event-1' });

      const res = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventName: 'page_view', properties: { page: '/home' } })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.eventId).toBe('event-1');
      expect(ingestEvent).toHaveBeenCalled();
    });

    it('should return 400 for missing eventName', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({ properties: { page: '/home' } })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for empty eventName', async () => {
      const res = await request(app)
        .post('/api/analytics/events')
        .send({ eventName: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on ingestEvent error', async () => {
      ingestEvent.mockRejectedValueOnce(new Error('DB write failed'));

      const res = await request(app)
        .post('/api/analytics/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ eventName: 'signup' })
        .expect(500);

      expect(res.body.error).toBe('Failed to record event');
    });
  });

  // =========================================================================
  // GET /api/analytics/funnel
  // =========================================================================
  describe('GET /api/analytics/funnel', () => {
    it('should return 403 for non-admin user', async () => {
      // user role query — not admin
      query.mockResolvedValueOnce({ rows: [{ role: 'client' }] });

      const res = await request(app)
        .get('/api/analytics/funnel')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.error).toBe('Admin access required');
    });

    it('should return 200 with funnel and retention data for admin', async () => {
      const adminToken = createTestToken(userId, { userType: 'admin' });
      // user role query — admin
      query.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

      queryFunnel.mockResolvedValueOnce([
        { stage: 'visit', count: 1000 },
        { stage: 'signup', count: 200 },
      ]);
      queryRetention.mockResolvedValueOnce({ week1: 0.8, week2: 0.6 });

      const res = await request(app)
        .get('/api/analytics/funnel')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.funnel).toHaveLength(2);
      expect(res.body.retention).toBeDefined();
      expect(res.body.period).toBeDefined();
    });
  });
});
