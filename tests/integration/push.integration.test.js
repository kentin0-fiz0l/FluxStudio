/**
 * Push Notification Route Integration Tests
 *
 * Tests push subscription management, notification preferences,
 * subscription status, and error handling.
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

const { query } = require('../../database/config');

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

// Mock uuid (ESM package not supported by Jest transform)
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678')
}));

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

// Helper: build express app with push routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/push');
  app.use('/api/push', routes);
  return app;
}

describe('Push Notification Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  const validSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8l930ds',
      auth: 'tBHItJI5svbpC7htENQ3Uw',
    },
  };

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
    it('should return 401 for POST /api/push/subscribe without token', async () => {
      await request(app)
        .post('/api/push/subscribe')
        .send(validSubscription)
        .expect(401);
    });

    it('should return 401 for GET /api/push/preferences without token', async () => {
      await request(app)
        .get('/api/push/preferences')
        .expect(401);
    });
  });

  // =========================================================================
  // POST /api/push/subscribe — Subscribe
  // =========================================================================
  describe('POST /api/push/subscribe', () => {
    it('should subscribe with valid endpoint and keys (200)', async () => {
      // Check existing: none found
      query.mockResolvedValueOnce({ rows: [] });
      // Insert new subscription
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send(validSubscription)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 400 for missing keys (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({ endpoint: 'https://fcm.googleapis.com/fcm/send/test' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid endpoint URL (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({
          endpoint: 'not-a-url',
          keys: { p256dh: 'key1', auth: 'key2' },
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should update existing subscription on duplicate endpoint', async () => {
      // Check existing: found
      query.mockResolvedValueOnce({ rows: [{ id: 'existing-sub-id' }] });
      // Update
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send(validSubscription)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Verify update query was called (second call), not insert
      expect(query).toHaveBeenCalledTimes(2);
      const updateCall = query.mock.calls[1][0];
      expect(updateCall).toContain('UPDATE');
    });

    it('should return 500 on DB error for subscribe', async () => {
      query.mockRejectedValueOnce(new Error('DB connection failed'));

      const res = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send(validSubscription)
        .expect(500);

      expect(res.body.error).toBe('Failed to subscribe to push notifications');
    });
  });

  // =========================================================================
  // POST /api/push/unsubscribe — Unsubscribe
  // =========================================================================
  describe('POST /api/push/unsubscribe', () => {
    it('should unsubscribe successfully', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/push/unsubscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({ endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 400 for missing endpoint (Zod validation)', async () => {
      const res = await request(app)
        .post('/api/push/unsubscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });

  // =========================================================================
  // GET /api/push/preferences — Get Preferences
  // =========================================================================
  describe('GET /api/push/preferences', () => {
    it('should return saved preferences', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          push_enabled: true,
          push_messages: false,
          push_project_updates: true,
          push_mentions: true,
          push_comments: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
        }]
      });

      const res = await request(app)
        .get('/api/push/preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.pushEnabled).toBe(true);
      expect(res.body.pushMessages).toBe(false);
      expect(res.body.pushProjectUpdates).toBe(true);
      expect(res.body.pushMentions).toBe(true);
      expect(res.body.pushComments).toBe(false);
      expect(res.body.quietHoursStart).toBe('22:00');
      expect(res.body.quietHoursEnd).toBe('08:00');
    });

    it('should return defaults when none saved', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/push/preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.pushEnabled).toBe(true);
      expect(res.body.pushMessages).toBe(true);
      expect(res.body.pushProjectUpdates).toBe(true);
      expect(res.body.pushMentions).toBe(true);
      expect(res.body.pushComments).toBe(true);
      expect(res.body.quietHoursStart).toBeNull();
      expect(res.body.quietHoursEnd).toBeNull();
    });

    it('should return 500 on DB error for preferences', async () => {
      query.mockRejectedValueOnce(new Error('DB read failed'));

      const res = await request(app)
        .get('/api/push/preferences')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get notification preferences');
    });
  });

  // =========================================================================
  // PUT /api/push/preferences — Update Preferences
  // =========================================================================
  describe('PUT /api/push/preferences', () => {
    it('should update preferences successfully (200)', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/push/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          pushEnabled: true,
          pushMessages: false,
          pushProjectUpdates: true,
          pushMentions: true,
          pushComments: false,
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should validate preference types (Zod — rejects non-boolean)', async () => {
      const res = await request(app)
        .put('/api/push/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          pushEnabled: 'yes-please',
          pushMessages: 123,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should return 500 on DB error for update preferences', async () => {
      query.mockRejectedValueOnce(new Error('DB write failed'));

      const res = await request(app)
        .put('/api/push/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ pushEnabled: false })
        .expect(500);

      expect(res.body.error).toBe('Failed to update notification preferences');
    });
  });

  // =========================================================================
  // GET /api/push/status — Subscription Status
  // =========================================================================
  describe('GET /api/push/status', () => {
    it('should return subscription count and isSubscribed true', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const res = await request(app)
        .get('/api/push/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.subscriptionCount).toBe(3);
      expect(res.body.isSubscribed).toBe(true);
    });

    it('should return isSubscribed false when no subscriptions', async () => {
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const res = await request(app)
        .get('/api/push/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.subscriptionCount).toBe(0);
      expect(res.body.isSubscribed).toBe(false);
    });

    it('should return 500 on DB error for status', async () => {
      query.mockRejectedValueOnce(new Error('DB count failed'));

      const res = await request(app)
        .get('/api/push/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get push status');
    });
  });
});
