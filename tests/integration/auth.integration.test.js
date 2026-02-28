/**
 * Auth Integration Tests
 * Tests signup, login, email verification, and password reset flows.
 *
 * Focuses on gaps not covered by tests/routes/auth.routes.test.js:
 * - Email verification (valid token, expired token, already verified)
 * - Forgot password (valid account, nonexistent email, Google-only account)
 * - Signup field validation (missing name, invalid userType)
 * - Login edge cases
 */

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

// Mock database/config - needed by auth routes for email verification queries
jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

jest.mock('../../config/environment', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-key-for-integration-tests-32chars',
    GOOGLE_CLIENT_ID: null,
    FRONTEND_URL: 'http://localhost:5173'
  }
}));

jest.mock('../../middleware/security', () => ({
  authRateLimit: (req, res, next) => next(),
  validateInput: {
    email: (req, res, next) => next(),
    password: (req, res, next) => next(),
    sanitizeInput: (req, res, next) => next()
  }
}));

jest.mock('../../middleware/csrf', () => ({
  getCsrfToken: (req, res) => res.json({ csrfToken: 'test-csrf-token' })
}));

jest.mock('../../lib/security/ipRateLimit', () => ({
  ipRateLimiters: {
    signup: () => (req, res, next) => next(),
    login: () => (req, res, next) => next(),
    passwordReset: () => (req, res, next) => next()
  }
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

jest.mock('../../lib/auth/securityLogger', () => ({
  logEvent: jest.fn().mockResolvedValue(undefined),
  logSignupSuccess: jest.fn().mockResolvedValue(undefined),
  logSignupFailure: jest.fn().mockResolvedValue(undefined),
  logLoginSuccess: jest.fn().mockResolvedValue(undefined),
  logLoginFailure: jest.fn().mockResolvedValue(undefined),
  logOAuthSuccess: jest.fn().mockResolvedValue(undefined),
  logOAuthFailure: jest.fn().mockResolvedValue(undefined),
  SEVERITY: { INFO: 'info', WARNING: 'warning', ERROR: 'error' }
}));

jest.mock('../../lib/auth/authHelpers', () => ({
  generateAuthResponse: jest.fn((user) => ({
    token: 'test-token',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user: { id: user.id, email: user.email, name: user.name, userType: user.userType }
  }))
}));

jest.mock('../../lib/monitoring/sentry', () => ({
  captureAuthError: jest.fn()
}));

jest.mock('../../lib/security/anomalyDetector', () => ({
  isIpBlocked: jest.fn().mockResolvedValue(false),
  checkSuspiciousUserAgent: jest.fn().mockReturnValue(false),
  checkRequestRate: jest.fn().mockResolvedValue(false),
  checkFailedLoginRate: jest.fn().mockResolvedValue(false),
  resetFailedLoginCounter: jest.fn().mockResolvedValue(undefined),
  blockIpAddress: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../lib/email/emailService', () => ({
  emailService: {
    generateToken: jest.fn().mockReturnValue('test-verification-token'),
    generateExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 86400000)),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../lib/analytics/funnelTracker', () => ({
  ingestEvent: jest.fn().mockResolvedValue(undefined)
}));

const { query } = require('../../database/config');
const { emailService } = require('../../lib/email/emailService');

// In-memory test data store
let testUsers = [];

// Create mock auth helper
const mockAuthHelper = {
  getUsers: jest.fn(() => Promise.resolve(testUsers)),
  saveUsers: jest.fn((users) => {
    testUsers = users;
    return Promise.resolve();
  }),
  getUserByEmail: jest.fn((email) => {
    return Promise.resolve(testUsers.find(u => u.email === email) || null);
  }),
  createUser: jest.fn((userData) => {
    const user = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ...userData,
      createdAt: new Date().toISOString()
    };
    testUsers.push(user);
    return Promise.resolve(user);
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
  })
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

describe('Auth Integration Tests', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.USE_DATABASE = 'true';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testUsers = [];
    app = createTestApp();
  });

  // =========================================================================
  // POST /api/auth/signup
  // =========================================================================
  describe('POST /api/auth/signup', () => {
    it('should create account with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          userType: 'client'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.emailVerified).toBe(false);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123'
          // missing name
        });

      expect(res.status).toBe(400);
      // Route may return validation errors as message or error field
      const errorText = res.body.message || res.body.error || JSON.stringify(res.body.errors);
      expect(errorText).toBeTruthy();
    });

    it('should return 400 for duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User',
          userType: 'client'
        });

      // Try to create second user with same email
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'Second User',
          userType: 'client'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already registered');
    });

    it('should return 400 when password too short', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '1234567',
          name: 'Test User',
          userType: 'client'
        });

      expect(res.status).toBe(400);
      const errorText = res.body.message || res.body.error || JSON.stringify(res.body.errors);
      expect(errorText).toBeTruthy();
    });

    it('should return 400 for invalid userType', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          userType: 'admin'
        });

      expect(res.status).toBe(400);
      const errorText = res.body.message || res.body.error || JSON.stringify(res.body.errors);
      expect(errorText).toBeTruthy();
    });
  });

  // =========================================================================
  // POST /api/auth/login
  // =========================================================================
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      testUsers = [
        {
          id: 'user-1',
          email: 'existing@example.com',
          password: hashedPassword,
          name: 'Existing User',
          userType: 'designer'
        }
      ];
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'testpassword'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('existing@example.com');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'existing@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid');
    });

    it('should return 401 for nonexistent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'anypassword'
        });

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/auth/verify-email
  // =========================================================================
  describe('POST /api/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'verify@example.com',
          name: 'Verify User',
          email_verified: false,
          verification_expires: new Date(Date.now() + 86400000).toISOString()
        }]
      });
      // UPDATE query
      query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-verification-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verified successfully');
      expect(res.body.verified).toBe(true);
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith('verify@example.com', 'Verify User');
    });

    it('should return 400 for expired token', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'expired@example.com',
          name: 'Expired User',
          email_verified: false,
          verification_expires: new Date(Date.now() - 86400000).toISOString() // expired yesterday
        }]
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'expired-verification-token' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('expired');
    });

    it('should return success for already verified email', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'already@example.com',
          name: 'Already Verified',
          email_verified: true,
          verification_expires: null
        }]
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'already-used-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('already verified');
      expect(res.body.verified).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'nonexistent-token' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid');
    });

    it('should return 400 when token is missing from request', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });
  });

  // =========================================================================
  // POST /api/auth/forgot-password
  // =========================================================================
  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for valid account', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          name: 'Reset User',
          google_id: null
        }]
      });
      // UPDATE query for reset token
      query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'reset@example.com',
        expect.any(String),
        'Reset User'
      );
    });

    it('should return 200 for nonexistent email (prevent enumeration)', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'noone@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('password reset link has been sent');
      // Should NOT have sent an email
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should suggest Google login for Google-only account', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 'user-google',
          name: 'Google User',
          google_id: 'google-123',
          password: undefined
        }]
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'googleuser@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Google');
      expect(res.body.useGoogle).toBe(true);
      // Should NOT have sent a reset email
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });
  });
});
