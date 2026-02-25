/**
 * Teams Routes Unit Tests
 * Tests team CRUD, membership, invitations, and role management endpoints
 * @file tests/routes/teams.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// In-memory test data
let testTeams = [];
let testUsers = [];

// Mock fs for file-based storage
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    readFileSync: jest.fn((filePath) => {
      if (filePath.includes('teams.json')) {
        return JSON.stringify({ teams: testTeams });
      }
      if (filePath.includes('users.json')) {
        return JSON.stringify({ users: testUsers });
      }
      return originalFs.readFileSync(filePath);
    }),
    writeFileSync: jest.fn((filePath, data) => {
      if (filePath.includes('teams.json')) {
        testTeams = JSON.parse(data).teams;
      }
    }),
  };
});

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

jest.mock('../../lib/activityLogger', () => ({
  memberJoined: jest.fn().mockResolvedValue(undefined),
  memberLeft: jest.fn().mockResolvedValue(undefined),
}));

// Setup express app with teams routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  const teamsRouter = require('../../routes/teams');
  app.use('/api/teams', teamsRouter);

  return app;
}

// Helper to generate a valid JWT token
function generateToken(payload = {}) {
  return jwt.sign(
    { id: 'user-1', email: 'owner@example.com', type: 'access', ...payload },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Teams Routes', () => {
  let app;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testTeams = [];
    testUsers = [
      { id: 'user-1', email: 'owner@example.com', name: 'Owner' },
      { id: 'user-2', email: 'member@example.com', name: 'Member' },
      { id: 'user-3', email: 'invited@example.com', name: 'Invited' },
    ];
    app = createTestApp();
    validToken = generateToken();
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/teams
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/teams', () => {
    it('should create a team with valid data', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Design Team', description: 'Creative crew' });

      expect(response.status).toBe(200);
      expect(response.body.team.name).toBe('Design Team');
      expect(response.body.team.members).toHaveLength(1);
      expect(response.body.team.members[0].role).toBe('owner');
      expect(response.body.team.members[0].userId).toBe('user-1');
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ description: 'No name' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({ name: 'Team' });

      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/teams
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/teams', () => {
    it('should return teams for the authenticated user', async () => {
      testTeams = [
        {
          id: 'team-1',
          name: 'My Team',
          members: [{ userId: 'user-1', role: 'owner' }],
        },
        {
          id: 'team-2',
          name: 'Other Team',
          members: [{ userId: 'user-99', role: 'owner' }],
        },
      ];

      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.teams).toHaveLength(1);
      expect(response.body.teams[0].name).toBe('My Team');
    });

    it('should return empty array when user has no teams', async () => {
      testTeams = [];

      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.teams).toHaveLength(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/teams');
      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/teams/:id
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/teams/:id', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'My Team',
        members: [{ userId: 'user-1', role: 'owner' }],
      }];
    });

    it('should return team by ID for members', async () => {
      const response = await request(app)
        .get('/api/teams/team-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('My Team');
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .get('/api/teams/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('should return 403 when user is not a member', async () => {
      const nonMemberToken = generateToken({ id: 'user-99', email: 'outsider@example.com' });

      const response = await request(app)
        .get('/api/teams/team-1')
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('denied');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/teams/team-1');
      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/teams/:id
  // ═══════════════════════════════════════════════════════════

  describe('PUT /api/teams/:id', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'Original',
        description: 'Original desc',
        members: [
          { userId: 'user-1', role: 'owner' },
          { userId: 'user-2', role: 'member' },
        ],
      }];
    });

    it('should update team as owner', async () => {
      const response = await request(app)
        .put('/api/teams/team-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated Team', description: 'New desc' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Team');
      expect(response.body.description).toBe('New desc');
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .put('/api/teams/nonexistent')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is a regular member', async () => {
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .put('/api/teams/team-1')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Hacked' });

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/teams/team-1')
        .send({ name: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/teams/:id
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/teams/:id', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'To Delete',
        members: [
          { userId: 'user-1', role: 'owner' },
          { userId: 'user-2', role: 'member' },
        ],
      }];
    });

    it('should delete team as owner', async () => {
      const response = await request(app)
        .delete('/api/teams/team-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
      expect(testTeams).toHaveLength(0);
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .delete('/api/teams/nonexistent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not the owner', async () => {
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .delete('/api/teams/team-1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('owner');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/teams/team-1');
      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/teams/:id/invite
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/teams/:id/invite', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'Team',
        members: [
          { userId: 'user-1', role: 'owner' },
        ],
        invites: [],
      }];
    });

    it('should invite a user by email', async () => {
      const response = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ email: 'invited@example.com', role: 'member' });

      expect(response.status).toBe(200);
      expect(response.body.invite.email).toBe('invited@example.com');
      expect(response.body.invite.status).toBe('pending');
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'member' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email is required');
    });

    it('should return 400 when user is already a member', async () => {
      const response = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ email: 'owner@example.com' }); // user-1 is already owner

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already a team member');
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .post('/api/teams/nonexistent/invite')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ email: 'invited@example.com' });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is a regular member', async () => {
      testTeams[0].members.push({ userId: 'user-2', role: 'member' });
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'invited@example.com' });

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/teams/team-1/invite')
        .send({ email: 'invited@example.com' });

      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // POST /api/teams/:id/accept-invite
  // ═══════════════════════════════════════════════════════════

  describe('POST /api/teams/:id/accept-invite', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'Team',
        members: [{ userId: 'user-1', role: 'owner' }],
        invites: [
          { id: 'inv-1', email: 'invited@example.com', role: 'member', status: 'pending' },
        ],
      }];
    });

    it('should accept a pending invite', async () => {
      const invitedToken = generateToken({ id: 'user-3', email: 'invited@example.com' });

      const response = await request(app)
        .post('/api/teams/team-1/accept-invite')
        .set('Authorization', `Bearer ${invitedToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('joined');
      expect(response.body.team.members).toHaveLength(2);
    });

    it('should return 404 when team not found', async () => {
      const invitedToken = generateToken({ id: 'user-3', email: 'invited@example.com' });

      const response = await request(app)
        .post('/api/teams/nonexistent/accept-invite')
        .set('Authorization', `Bearer ${invitedToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when no pending invite exists', async () => {
      // user-2 has no invite
      const noInviteToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .post('/api/teams/team-1/accept-invite')
        .set('Authorization', `Bearer ${noInviteToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/api/teams/team-1/accept-invite');
      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/teams/:id/members/:userId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/teams/:id/members/:userId', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'Team',
        members: [
          { userId: 'user-1', role: 'owner' },
          { userId: 'user-2', role: 'member' },
        ],
      }];
    });

    it('should remove a member as owner', async () => {
      const response = await request(app)
        .delete('/api/teams/team-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('removed');
    });

    it('should allow a user to remove themselves', async () => {
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .delete('/api/teams/team-1/members/user-2')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 400 when trying to remove owner', async () => {
      // user-2 (regular member) tries to remove user-1 (owner)
      testTeams[0].members[1].role = 'admin'; // make user-2 admin so they pass perm check
      const adminToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .delete('/api/teams/team-1/members/user-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot remove team owner');
    });

    it('should return 403 when regular member tries to remove another', async () => {
      testTeams[0].members.push({ userId: 'user-3', role: 'member' });
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .delete('/api/teams/team-1/members/user-3')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .delete('/api/teams/nonexistent/members/user-2')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/teams/team-1/members/user-2');
      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PUT /api/teams/:id/members/:userId
  // ═══════════════════════════════════════════════════════════

  describe('PUT /api/teams/:id/members/:userId', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'Team',
        members: [
          { userId: 'user-1', role: 'owner' },
          { userId: 'user-2', role: 'member' },
        ],
      }];
    });

    it('should update member role as owner', async () => {
      const response = await request(app)
        .put('/api/teams/team-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.member.role).toBe('admin');
    });

    it('should return 400 when role is missing', async () => {
      const response = await request(app)
        .put('/api/teams/team-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('role is required');
    });

    it('should return 400 when role is invalid', async () => {
      const response = await request(app)
        .put('/api/teams/team-1/members/user-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'superadmin' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .put('/api/teams/nonexistent/members/user-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
    });

    it('should return 404 when member not found', async () => {
      const response = await request(app)
        .put('/api/teams/team-1/members/user-99')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Member not found');
    });

    it('should return 403 when non-owner tries to change role', async () => {
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .put('/api/teams/team-1/members/user-2')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/teams/team-1/members/user-2')
        .send({ role: 'admin' });

      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // GET /api/teams/:id/invites
  // ═══════════════════════════════════════════════════════════

  describe('GET /api/teams/:id/invites', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'Team',
        members: [
          { userId: 'user-1', role: 'owner' },
          { userId: 'user-2', role: 'member' },
        ],
        invites: [
          { id: 'inv-1', email: 'invited@example.com', status: 'pending' },
        ],
      }];
    });

    it('should return invites for owner', async () => {
      const response = await request(app)
        .get('/api/teams/team-1/invites')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.invites).toHaveLength(1);
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .get('/api/teams/nonexistent/invites')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for regular member', async () => {
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .get('/api/teams/team-1/invites')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/teams/team-1/invites');
      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // DELETE /api/teams/:id/invites/:inviteId
  // ═══════════════════════════════════════════════════════════

  describe('DELETE /api/teams/:id/invites/:inviteId', () => {
    beforeEach(() => {
      testTeams = [{
        id: 'team-1',
        name: 'Team',
        members: [
          { userId: 'user-1', role: 'owner' },
          { userId: 'user-2', role: 'member' },
        ],
        invites: [
          { id: 'inv-1', email: 'invited@example.com', status: 'pending' },
        ],
      }];
    });

    it('should cancel an invitation as owner', async () => {
      const response = await request(app)
        .delete('/api/teams/team-1/invites/inv-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('cancelled');
    });

    it('should return 404 when team not found', async () => {
      const response = await request(app)
        .delete('/api/teams/nonexistent/invites/inv-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for regular member', async () => {
      const memberToken = generateToken({ id: 'user-2', email: 'member@example.com' });

      const response = await request(app)
        .delete('/api/teams/team-1/invites/inv-1')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).delete('/api/teams/team-1/invites/inv-1');
      expect(response.status).toBe(401);
    });
  });
});
