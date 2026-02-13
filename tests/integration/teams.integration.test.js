/**
 * Teams Route Integration Tests
 *
 * Tests CRUD operations, membership management, invitations,
 * authorization, and error handling for the teams API.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

// Mock database/config (required by tokenService chain)
jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
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

// Mock activity logger
jest.mock('../../lib/activityLogger', () => ({
  memberJoined: jest.fn(),
  memberLeft: jest.fn()
}));

// Teams file storage mock - we'll intercept fs reads/writes
const TEAMS_FILE = path.join(__dirname, '..', '..', 'teams.json');
const USERS_FILE = path.join(__dirname, '..', '..', 'users.json');

// In-memory data stores for testing
let teamsData = { teams: [] };
let usersData = { users: [] };

// Mock fs for teams file operations
const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const teamRoutes = require('../../routes/teams');
  app.use('/api/teams', teamRoutes);
  return app;
}

describe('Teams Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';
  const otherUserId = 'other-user-456';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);

    // Override fs methods to use in-memory storage
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
      if (filePath === TEAMS_FILE) {
        return JSON.stringify(teamsData);
      }
      if (filePath === USERS_FILE) {
        return JSON.stringify(usersData);
      }
      return originalReadFileSync(filePath, encoding);
    });

    jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath, data) => {
      if (filePath === TEAMS_FILE) {
        teamsData = JSON.parse(data);
        return;
      }
      return originalWriteFileSync(filePath, data);
    });
  });

  beforeEach(() => {
    // Reset in-memory data before each test
    teamsData = { teams: [] };
    usersData = {
      users: [
        { id: userId, email: 'test@example.com', name: 'Test User' },
        { id: otherUserId, email: 'other@example.com', name: 'Other User' }
      ]
    };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/teams without token', async () => {
      await request(app).get('/api/teams').expect(401);
    });

    it('should return 401 for POST /api/teams without token', async () => {
      await request(app).post('/api/teams').send({ name: 'Test' }).expect(401);
    });

    it('should return 401 for PUT /api/teams/:id without token', async () => {
      await request(app).put('/api/teams/team-1').send({ name: 'Test' }).expect(401);
    });

    it('should return 401 for DELETE /api/teams/:id without token', async () => {
      await request(app).delete('/api/teams/team-1').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/teams')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // POST /api/teams (Create)
  // =========================================================================
  describe('POST /api/teams', () => {
    it('should create a new team', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Design Team', description: 'For designers' })
        .expect(200);

      expect(res.body.message).toBe('Team created successfully');
      expect(res.body.team.name).toBe('Design Team');
      expect(res.body.team.description).toBe('For designers');
      expect(res.body.team.createdBy).toBe(userId);
      expect(res.body.team.members).toHaveLength(1);
      expect(res.body.team.members[0].userId).toBe(userId);
      expect(res.body.team.members[0].role).toBe('owner');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' })
        .expect(400);

      expect(res.body.message).toBe('Team name is required');
    });

    it('should create team with empty description when not provided', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Minimal Team' })
        .expect(200);

      expect(res.body.team.description).toBe('');
    });
  });

  // =========================================================================
  // GET /api/teams (List)
  // =========================================================================
  describe('GET /api/teams', () => {
    it('should return user teams', async () => {
      // Seed a team
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'My Team',
          members: [{ userId, role: 'owner', joinedAt: new Date().toISOString() }],
          invites: []
        }]
      };

      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.teams).toHaveLength(1);
      expect(res.body.teams[0].name).toBe('My Team');
    });

    it('should not return teams user is not a member of', async () => {
      teamsData = {
        teams: [{
          id: 'team-other',
          name: 'Not My Team',
          members: [{ userId: 'someone-else', role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.teams).toHaveLength(0);
    });

    it('should return empty array when no teams exist', async () => {
      const res = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.teams).toHaveLength(0);
    });
  });

  // =========================================================================
  // GET /api/teams/:id (Get by ID)
  // =========================================================================
  describe('GET /api/teams/:id', () => {
    it('should return team details for a member', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'My Team',
          description: 'Test team',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .get('/api/teams/team-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe('team-1');
      expect(res.body.name).toBe('My Team');
    });

    it('should return 404 for non-existent team', async () => {
      const res = await request(app)
        .get('/api/teams/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBe('Team not found');
    });

    it('should return 403 when user is not a member', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Private Team',
          members: [{ userId: 'someone-else', role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .get('/api/teams/team-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.message).toBe('Access denied');
    });
  });

  // =========================================================================
  // PUT /api/teams/:id (Update)
  // =========================================================================
  describe('PUT /api/teams/:id', () => {
    it('should update team when user is owner', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Old Name',
          description: 'Old desc',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .put('/api/teams/team-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', description: 'New desc' })
        .expect(200);

      expect(res.body.name).toBe('New Name');
      expect(res.body.description).toBe('New desc');
    });

    it('should update team when user is admin', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Old Name',
          members: [
            { userId: 'someone', role: 'owner' },
            { userId, role: 'admin' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .put('/api/teams/team-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Admin Updated' })
        .expect(200);

      expect(res.body.name).toBe('Admin Updated');
    });

    it('should return 403 when regular member tries to update', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId: 'someone', role: 'owner' },
            { userId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .put('/api/teams/team-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);

      expect(res.body.message).toBe('Permission denied');
    });

    it('should return 404 for non-existent team', async () => {
      const res = await request(app)
        .put('/api/teams/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(res.body.message).toBe('Team not found');
    });
  });

  // =========================================================================
  // DELETE /api/teams/:id (Delete)
  // =========================================================================
  describe('DELETE /api/teams/:id', () => {
    it('should delete team when user is owner', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Delete Me',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .delete('/api/teams/team-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('Team deleted successfully');
      expect(teamsData.teams).toHaveLength(0);
    });

    it('should return 403 when non-owner tries to delete', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Protected Team',
          members: [
            { userId: 'real-owner', role: 'owner' },
            { userId, role: 'admin' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .delete('/api/teams/team-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.message).toBe('Only team owner can delete the team');
    });

    it('should return 404 for non-existent team', async () => {
      const res = await request(app)
        .delete('/api/teams/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBe('Team not found');
    });
  });

  // =========================================================================
  // POST /api/teams/:id/invite (Invite member)
  // =========================================================================
  describe('POST /api/teams/:id/invite', () => {
    it('should invite a user by email', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newmember@example.com', role: 'member' })
        .expect(200);

      expect(res.body.message).toBe('Invitation sent successfully');
      expect(res.body.invite.email).toBe('newmember@example.com');
      expect(res.body.invite.role).toBe('member');
      expect(res.body.invite.status).toBe('pending');
    });

    it('should return 400 when email is missing', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'member' })
        .expect(400);

      expect(res.body.message).toBe('Email is required');
    });

    it('should return 403 when regular member tries to invite', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId: 'real-owner', role: 'owner' },
            { userId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com' })
        .expect(403);

      expect(res.body.message).toBe('Permission denied');
    });

    it('should return 400 when inviting existing member', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId, role: 'owner' },
            { userId: otherUserId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'other@example.com' })
        .expect(400);

      expect(res.body.message).toBe('User is already a team member');
    });

    it('should return 404 when team does not exist', async () => {
      const res = await request(app)
        .post('/api/teams/nonexistent/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'new@example.com' })
        .expect(404);

      expect(res.body.message).toBe('Team not found');
    });
  });

  // =========================================================================
  // DELETE /api/teams/:id/members/:userId (Remove member)
  // =========================================================================
  describe('DELETE /api/teams/:id/members/:userId', () => {
    it('should remove a member when user is owner', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId, role: 'owner' },
            { userId: otherUserId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .delete(`/api/teams/team-1/members/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('Member removed successfully');
      expect(teamsData.teams[0].members).toHaveLength(1);
    });

    it('should allow a user to remove themselves', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId: 'real-owner', role: 'owner' },
            { userId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .delete(`/api/teams/team-1/members/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('Member removed successfully');
    });

    it('should return 403 when regular member tries to remove another member', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId: 'real-owner', role: 'owner' },
            { userId, role: 'member' },
            { userId: otherUserId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .delete(`/api/teams/team-1/members/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.message).toBe('Permission denied');
    });

    it('should return 404 for non-existent team', async () => {
      const res = await request(app)
        .delete(`/api/teams/nonexistent/members/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBe('Team not found');
    });
  });

  // =========================================================================
  // PUT /api/teams/:id/members/:userId (Update role)
  // =========================================================================
  describe('PUT /api/teams/:id/members/:userId', () => {
    it('should update member role when user is owner', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId, role: 'owner' },
            { userId: otherUserId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .put(`/api/teams/team-1/members/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(res.body.message).toBe('Role updated successfully');
      expect(res.body.member.role).toBe('admin');
    });

    it('should return 400 with invalid role', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .put(`/api/teams/team-1/members/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'superadmin' })
        .expect(400);

      expect(res.body.message).toBe('Valid role is required');
    });

    it('should return 400 when role is missing', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .put(`/api/teams/team-1/members/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.message).toBe('Valid role is required');
    });

    it('should return 403 when non-owner tries to change roles', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId: 'real-owner', role: 'owner' },
            { userId, role: 'admin' },
            { userId: otherUserId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .put(`/api/teams/team-1/members/${otherUserId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(403);

      expect(res.body.message).toBe('Only team owner can change roles');
    });

    it('should return 404 when target member not found', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId, role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .put('/api/teams/team-1/members/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(404);

      expect(res.body.message).toBe('Member not found');
    });
  });

  // =========================================================================
  // GET /api/teams/:id/invites (List invitations)
  // =========================================================================
  describe('GET /api/teams/:id/invites', () => {
    it('should list invitations for owner/admin', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId, role: 'owner' }],
          invites: [
            { id: 'inv-1', email: 'pending@example.com', status: 'pending' }
          ]
        }]
      };

      const res = await request(app)
        .get('/api/teams/team-1/invites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.invites).toHaveLength(1);
      expect(res.body.invites[0].email).toBe('pending@example.com');
    });

    it('should return 403 for regular members', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId: 'owner', role: 'owner' },
            { userId, role: 'member' }
          ],
          invites: []
        }]
      };

      const res = await request(app)
        .get('/api/teams/team-1/invites')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.message).toBe('Permission denied');
    });
  });

  // =========================================================================
  // DELETE /api/teams/:id/invites/:inviteId (Cancel invitation)
  // =========================================================================
  describe('DELETE /api/teams/:id/invites/:inviteId', () => {
    it('should cancel an invitation', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId, role: 'owner' }],
          invites: [
            { id: 'inv-1', email: 'pending@example.com', status: 'pending' }
          ]
        }]
      };

      const res = await request(app)
        .delete('/api/teams/team-1/invites/inv-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('Invitation cancelled');
      expect(teamsData.teams[0].invites).toHaveLength(0);
    });

    it('should return 403 for non-admin/owner', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [
            { userId: 'owner', role: 'owner' },
            { userId, role: 'member' }
          ],
          invites: [{ id: 'inv-1' }]
        }]
      };

      const res = await request(app)
        .delete('/api/teams/team-1/invites/inv-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.message).toBe('Permission denied');
    });
  });

  // =========================================================================
  // POST /api/teams/:id/accept-invite (Accept invitation)
  // =========================================================================
  describe('POST /api/teams/:id/accept-invite', () => {
    it('should accept a pending invitation', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId: 'owner', role: 'owner' }],
          invites: [
            { id: 'inv-1', email: 'test@example.com', role: 'member', status: 'pending' }
          ]
        }]
      };

      const res = await request(app)
        .post('/api/teams/team-1/accept-invite')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.message).toBe('Successfully joined the team');
      expect(teamsData.teams[0].members).toHaveLength(2);
      expect(teamsData.teams[0].invites[0].status).toBe('accepted');
    });

    it('should return 404 when no invitation exists', async () => {
      teamsData = {
        teams: [{
          id: 'team-1',
          name: 'Team',
          members: [{ userId: 'owner', role: 'owner' }],
          invites: []
        }]
      };

      const res = await request(app)
        .post('/api/teams/team-1/accept-invite')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBe('Invitation not found');
    });

    it('should return 404 for non-existent team', async () => {
      const res = await request(app)
        .post('/api/teams/nonexistent/accept-invite')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBe('Team not found');
    });
  });
});
