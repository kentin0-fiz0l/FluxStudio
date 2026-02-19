/**
 * Users Route Integration Tests
 *
 * Tests user listing, search, user by ID,
 * authentication, and both database and file-based modes.
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

const { query } = require('../../database/config');

const USERS_FILE = path.join(__dirname, '..', '..', 'users.json');
let usersData = { users: [] };

const originalReadFileSync = fs.readFileSync;

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign({ id: userId, email: 'test@example.com', userType: 'client', ...extra }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  const userRoutes = require('../../routes/users');
  app.use('/api/users', userRoutes);
  return app;
}

describe('Users Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);

    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath, encoding) => {
      if (filePath === USERS_FILE) {
        return JSON.stringify(usersData);
      }
      return originalReadFileSync(filePath, encoding);
    });
  });

  beforeEach(() => {
    query.mockReset();
    // Default to file-based mode (USE_DATABASE not set)
    delete process.env.USE_DATABASE;

    usersData = {
      users: [
        { id: userId, name: 'Test User', email: 'test@example.com', avatar: null, status: 'online', userType: 'client' },
        { id: 'user-2', name: 'Alice Smith', email: 'alice@example.com', avatar: null, status: 'offline', userType: 'freelancer' },
        { id: 'user-3', name: 'Bob Jones', email: 'bob@example.com', avatar: null, status: 'away', userType: 'client' }
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
    it('should return 401 for GET /api/users without token', async () => {
      await request(app).get('/api/users').expect(401);
    });

    it('should return 401 for GET /api/users/:id without token', async () => {
      await request(app).get('/api/users/user-2').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/users (file-based mode)
  // =========================================================================
  describe('GET /api/users (file-based)', () => {
    it('should return users excluding self by default', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.users).toHaveLength(2);
      expect(res.body.users.every(u => u.id !== userId)).toBe(true);
    });

    it('should include self when excludeSelf=false', async () => {
      const res = await request(app)
        .get('/api/users?excludeSelf=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.users).toHaveLength(3);
    });

    it('should filter by search term (name)', async () => {
      const res = await request(app)
        .get('/api/users?search=alice')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].name).toBe('Alice Smith');
    });

    it('should filter by search term (email)', async () => {
      const res = await request(app)
        .get('/api/users?search=bob@')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].email).toBe('bob@example.com');
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/users?limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.users).toHaveLength(1);
    });

    it('should return mapped user fields', async () => {
      const res = await request(app)
        .get('/api/users?excludeSelf=false')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const user = res.body.users.find(u => u.id === userId);
      expect(user).toBeDefined();
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.status).toBe('online');
      expect(user.role).toBe('client');
    });
  });

  // =========================================================================
  // GET /api/users (database mode)
  // =========================================================================
  describe('GET /api/users (database mode)', () => {
    beforeEach(() => {
      process.env.USE_DATABASE = 'true';
    });

    it('should query database when USE_DATABASE is true', async () => {
      query.mockResolvedValueOnce({
        rows: [
          { id: 'user-2', name: 'Alice Smith', email: 'alice@example.com', status: 'offline', role: 'freelancer' }
        ]
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.users).toHaveLength(1);
      expect(query).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.message).toBe('Failed to fetch users');
    });
  });

  // =========================================================================
  // GET /api/users/:userId (file-based mode)
  // =========================================================================
  describe('GET /api/users/:userId (file-based)', () => {
    it('should return a user by ID', async () => {
      const res = await request(app)
        .get('/api/users/user-2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.user.id).toBe('user-2');
      expect(res.body.user.name).toBe('Alice Smith');
      expect(res.body.user.email).toBe('alice@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBe('User not found');
    });
  });

  // =========================================================================
  // GET /api/users/:userId (database mode)
  // =========================================================================
  describe('GET /api/users/:userId (database mode)', () => {
    beforeEach(() => {
      process.env.USE_DATABASE = 'true';
    });

    it('should query database for user by ID', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 'user-2', name: 'Alice', email: 'alice@example.com', status: 'online', role: 'freelancer' }]
      });

      const res = await request(app)
        .get('/api/users/user-2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.user.id).toBe('user-2');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-2']
      );
    });

    it('should return 404 when user not found in database', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/users/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.message).toBe('User not found');
    });

    it('should handle database errors', async () => {
      query.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/users/user-2')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.message).toBe('Failed to fetch user');
    });
  });
});
