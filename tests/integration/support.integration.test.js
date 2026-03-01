/**
 * Support Route Integration Tests
 *
 * Tests support ticket submission, validation, email service
 * integration, and category listing.
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

// Mock auditLog
jest.mock('../../lib/auditLog', () => ({
  logAction: jest.fn()
}));

// Mock email service
jest.mock('../../lib/email/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

const emailService = require('../../lib/email/emailService');

// Mock security middleware
jest.mock('../../middleware/security', () => ({
  validateInput: {
    sanitizeInput: (req, res, next) => next()
  }
}));

// Mock logger
jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with support routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/support');
  app.use('/api/support', routes);
  return app;
}

describe('Support Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  const validTicket = {
    name: 'Test User',
    email: 'test@example.com',
    category: 'technical',
    subject: 'Login issue',
    message: 'I am unable to log in to my account. It keeps showing an error message when I enter my credentials.',
  };

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // POST /api/support/ticket — Submit Ticket
  // =========================================================================
  describe('POST /api/support/ticket', () => {
    it('should submit a ticket with valid data (201)', async () => {
      const res = await request(app)
        .post('/api/support/ticket')
        .set('Authorization', `Bearer ${token}`)
        .send(validTicket)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.ticketId).toBeDefined();
      expect(res.body.ticketId).toMatch(/^FLX-/);
      expect(res.body.message).toBe('Support request submitted successfully');
      // Email should have been called (support + confirmation)
      expect(emailService.sendEmail).toHaveBeenCalled();
    });

    it('should return 400 for missing name (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/support/ticket')
        .send({ ...validTicket, name: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid email (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/support/ticket')
        .send({ ...validTicket, email: 'not-an-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for subject too short', async () => {
      const res = await request(app)
        .post('/api/support/ticket')
        .send({ ...validTicket, subject: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for message under 20 chars (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/support/ticket')
        .send({ ...validTicket, message: 'Too short' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should handle email service failure gracefully', async () => {
      emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP error'));
      emailService.sendEmail.mockRejectedValueOnce(new Error('SMTP error'));

      const res = await request(app)
        .post('/api/support/ticket')
        .set('Authorization', `Bearer ${token}`)
        .send(validTicket)
        .expect(201);

      // Should still succeed even when emails fail
      expect(res.body.success).toBe(true);
      expect(res.body.ticketId).toBeDefined();
    });

    it('should work with optional auth (no token)', async () => {
      const res = await request(app)
        .post('/api/support/ticket')
        .send(validTicket)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.ticketId).toBeDefined();
    });

    it('should return 500 on unexpected error', async () => {
      // Send a body that passes Zod but causes an internal error
      // We force an error by making sendEmail throw after the route tries to
      // access properties that don't exist. Since the route catches errors,
      // we need to mock something that breaks inside the try block.
      // The simplest way: make the entire request body null after Zod.
      // Instead, mock the Date constructor to throw (forces catch block)
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => { throw new Error('Unexpected failure'); });

      const res = await request(app)
        .post('/api/support/ticket')
        .set('Authorization', `Bearer ${token}`)
        .send(validTicket)
        .expect(500);

      expect(res.body.error).toBe('Failed to submit support request');

      Date.now = originalDateNow;
    });
  });

  // =========================================================================
  // GET /api/support/categories — List Categories
  // =========================================================================
  describe('GET /api/support/categories', () => {
    it('should return valid categories list', async () => {
      const res = await request(app)
        .get('/api/support/categories')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.categories).toBeInstanceOf(Array);
      expect(res.body.categories.length).toBe(5);

      const values = res.body.categories.map(c => c.value);
      expect(values).toContain('general');
      expect(values).toContain('billing');
      expect(values).toContain('technical');
      expect(values).toContain('feature');
      expect(values).toContain('account');
    });

    it('should not require authentication', async () => {
      const res = await request(app)
        .get('/api/support/categories')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.categories).toBeDefined();
    });
  });
});
