/**
 * Auth Routes Unit Tests
 * Tests backend authentication endpoints
 * @file tests/routes/auth.routes.test.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'google@example.com',
        name: 'Google User',
        sub: 'google-123',
        picture: 'https://example.com/avatar.jpg',
      }),
    }),
  })),
}));

jest.mock('../../lib/auth/securityLogger', () => ({
  logEvent: jest.fn(),
  SEVERITY: { INFO: 'info', WARNING: 'warning', ERROR: 'error' },
}));

jest.mock('../../lib/auth/authHelpers', () => ({
  generateAuthResponse: jest.fn((user) => ({
    token: 'test-token',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user: { id: user.id, email: user.email, name: user.name, userType: user.userType },
  })),
}));

jest.mock('../../lib/monitoring/sentry', () => ({
  captureAuthError: jest.fn(),
}));

jest.mock('../../lib/security/anomalyDetector', () => ({
  isIpBlocked: jest.fn().mockResolvedValue(false),
  checkSuspiciousUserAgent: jest.fn().mockReturnValue(false),
  checkRequestRate: jest.fn().mockResolvedValue(false),
  blockIpAddress: jest.fn(),
}));

jest.mock('../../lib/email/emailService', () => ({
  emailService: {
    generateToken: jest.fn().mockReturnValue('test-verification-token'),
    generateExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 86400000)),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Test configuration
const JWT_SECRET = 'test-jwt-secret-key-for-tests';

// In-memory test data store
let testUsers = [];

// Create mock auth helper
const mockAuthHelper = {
  getUsers: jest.fn(() => Promise.resolve(testUsers)),
  saveUsers: jest.fn((users) => {
    testUsers = users;
    return Promise.resolve();
  }),
  authenticateToken: jest.fn((req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }),
};

// Setup express app with auth routes
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock CSRF middleware
  app.use((req, res, next) => {
    res.locals.csrfToken = 'test-csrf-token';
    next();
  });

  // Import and configure auth routes
  const authRouter = require('../../routes/auth');
  authRouter.setAuthHelper(mockAuthHelper);

  app.use('/api/auth', authRouter);

  return app;
}

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testUsers = [];
    app = createTestApp();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          userType: 'client',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(testUsers.length).toBe(1);
    });

    it('should reject signup with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          password: 'password123',
          name: 'New User',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject signup with short password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '1234567',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('8 characters');
    });

    it('should reject signup with duplicate email', async () => {
      // First signup
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User',
        });

      // Second signup with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'Second User',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already registered');
    });

    it('should reject invalid user type', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          userType: 'invalid-type',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid user type');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      testUsers = [
        {
          id: 'user-1',
          email: 'existing@example.com',
          password: hashedPassword,
          name: 'Existing User',
          userType: 'designer',
        },
      ];
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'testpassword',
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('existing@example.com');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        });

      expect(response.status).toBe(401);
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let validToken;

    beforeEach(() => {
      testUsers = [
        {
          id: 'user-1',
          email: 'me@example.com',
          name: 'Me User',
          userType: 'client',
        },
      ];

      validToken = jwt.sign(
        { id: 'user-1', email: 'me@example.com', userType: 'client', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('user-1');
    });

    it('should reject request without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should reject request with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', email: 'me@example.com', type: 'access' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let validToken;

    beforeEach(() => {
      validToken = jwt.sign(
        { id: 'user-1', email: 'test@example.com', type: 'access' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logged out');
    });
  });

  describe('GET /api/csrf-token', () => {
    it('should return CSRF token', async () => {
      const response = await request(app).get('/api/auth/csrf-token');

      expect(response.status).toBe(200);
      expect(response.body.csrfToken).toBeDefined();
    });
  });
});
