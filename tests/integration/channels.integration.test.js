/**
 * Channels & Organizations Route Integration Tests
 *
 * Tests channel creation, listing, organization CRUD,
 * authentication, and error handling.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

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

const CHANNELS_FILE = path.join(__dirname, '..', '..', 'channels.json');
const TEAMS_FILE = path.join(__dirname, '..', '..', 'teams.json');

let channelsData = { channels: [] };
let teamsData = { teams: [] };

const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;
const originalExistsSync = fs.existsSync;

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const channelRoutes = require('../../routes/channels');
  app.use('/api', channelRoutes);
  return app;
}

describe('Channels & Organizations Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);

    jest.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      if (filePath === CHANNELS_FILE) return true;
      return originalExistsSync(filePath);
    });

    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
      if (filePath === CHANNELS_FILE) return JSON.stringify(channelsData);
      if (filePath === TEAMS_FILE) return JSON.stringify(teamsData);
      return originalReadFileSync(filePath, encoding);
    });

    jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath, data) => {
      if (filePath === CHANNELS_FILE) {
        channelsData = JSON.parse(data);
        return;
      }
      if (filePath === TEAMS_FILE) {
        teamsData = JSON.parse(data);
        return;
      }
      return originalWriteFileSync(filePath, data);
    });
  });

  beforeEach(() => {
    channelsData = { channels: [] };
    teamsData = { teams: [] };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for POST /api/channels without token', async () => {
      await request(app)
        .post('/api/channels')
        .send({ name: 'test', teamId: 'team-1' })
        .expect(401);
    });

    it('should return 401 for GET /api/channels/:teamId without token', async () => {
      await request(app).get('/api/channels/team-1').expect(401);
    });

    it('should return 401 for GET /api/organizations without token', async () => {
      await request(app).get('/api/organizations').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/organizations')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // POST /api/channels
  // =========================================================================
  describe('POST /api/channels', () => {
    it('should create a new channel', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'general', teamId: 'team-1', description: 'General chat' })
        .expect(200);

      expect(res.body.name).toBe('general');
      expect(res.body.teamId).toBe('team-1');
      expect(res.body.description).toBe('General chat');
      expect(res.body.createdBy).toBe(userId);
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${token}`)
        .send({ teamId: 'team-1' })
        .expect(400);

      expect(res.body.message).toBe('Name and team ID are required');
    });

    it('should return 400 when teamId is missing', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'general' })
        .expect(400);

      expect(res.body.message).toBe('Name and team ID are required');
    });

    it('should create channel with empty description when not provided', async () => {
      const res = await request(app)
        .post('/api/channels')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'minimal', teamId: 'team-1' })
        .expect(200);

      expect(res.body.description).toBe('');
    });
  });

  // =========================================================================
  // GET /api/channels/:teamId
  // =========================================================================
  describe('GET /api/channels/:teamId', () => {
    it('should return channels for a team', async () => {
      channelsData = {
        channels: [
          { id: 'ch-1', name: 'general', teamId: 'team-1' },
          { id: 'ch-2', name: 'design', teamId: 'team-1' },
          { id: 'ch-3', name: 'other', teamId: 'team-2' }
        ]
      };

      const res = await request(app)
        .get('/api/channels/team-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].teamId).toBe('team-1');
      expect(res.body[1].teamId).toBe('team-1');
    });

    it('should return empty array when no channels exist for team', async () => {
      const res = await request(app)
        .get('/api/channels/team-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(0);
    });
  });

  // =========================================================================
  // GET /api/organizations
  // =========================================================================
  describe('GET /api/organizations', () => {
    it('should return user organizations', async () => {
      teamsData = {
        teams: [
          {
            id: 'org-1',
            name: 'Design Co',
            description: 'A design company',
            createdAt: '2025-01-01T00:00:00Z',
            members: [
              { userId, role: 'owner', joinedAt: '2025-01-01T00:00:00Z' },
              { userId: 'user-2', role: 'member', joinedAt: '2025-01-02T00:00:00Z' }
            ]
          }
        ]
      };

      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.organizations).toHaveLength(1);
      expect(res.body.organizations[0].name).toBe('Design Co');
      expect(res.body.organizations[0].role).toBe('owner');
      expect(res.body.organizations[0].memberCount).toBe(2);
    });

    it('should not return organizations user is not a member of', async () => {
      teamsData = {
        teams: [
          {
            id: 'org-other',
            name: 'Other Org',
            members: [{ userId: 'someone-else', role: 'owner' }]
          }
        ]
      };

      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.organizations).toHaveLength(0);
    });

    it('should return empty array when no organizations exist', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.organizations).toHaveLength(0);
    });
  });

  // =========================================================================
  // POST /api/organizations
  // =========================================================================
  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Org', description: 'A new org' })
        .expect(200);

      expect(res.body.name).toBe('New Org');
      expect(res.body.description).toBe('A new org');
      expect(res.body.createdBy).toBe(userId);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].userId).toBe(userId);
      expect(res.body.members[0].role).toBe('owner');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name' })
        .expect(400);

      expect(res.body.message).toBe('Organization name is required');
    });

    it('should create organization with empty description when not provided', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Minimal Org' })
        .expect(200);

      expect(res.body.description).toBe('');
    });
  });
});
