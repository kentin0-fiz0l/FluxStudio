/**
 * Critical Path Integration Tests — Phase 3
 *
 * Tests the new Phase 3 infrastructure:
 * 1. Feature gating (requireTier / requireFeature middleware)
 * 2. Beta waitlist signup flow
 *
 * Note: Signup → Login → Create project → Formation CRUD flows are
 * already covered by auth.integration.test.js, projects.integration.test.js,
 * and formations.integration.test.js.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'test-jwt-secret-key-for-integration-tests-32chars';

// --------------------------------------------------------------------------
// Mocks
// --------------------------------------------------------------------------

const mockDb = {
  query: jest.fn(),
  runMigrations: jest.fn(),
};
jest.mock('../../database/config', () => mockDb);

jest.mock('../../middleware/security', () => ({
  authRateLimit: (_req, _res, next) => next(),
  rateLimit: () => (_req, _res, next) => next(),
  validateInput: {
    email: (_req, _res, next) => next(),
    password: (_req, _res, next) => next(),
    sanitizeInput: (_req, _res, next) => next(),
  },
}));

// --------------------------------------------------------------------------
// Shared helpers
// --------------------------------------------------------------------------

let authToken;
const testUserId = 'user-test-critical-path';

function createAuthToken(overrides = {}) {
  return jwt.sign(
    { id: testUserId, email: 'test@example.com', name: 'Test User', ...overrides },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

beforeAll(() => {
  authToken = createAuthToken();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// --------------------------------------------------------------------------
// Test: Feature gating
// --------------------------------------------------------------------------

describe('Feature Gating: requireTier middleware', () => {
  let gatedApp;

  beforeEach(() => {
    gatedApp = express();
    gatedApp.use(express.json());

    const { requireTier, requireFeature } = require('../../middleware/requireTier');

    // Fake auth middleware
    const fakeAuth = (req, _res, next) => {
      const auth = req.headers.authorization;
      if (auth) {
        try {
          req.user = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
        } catch { /* ignore */ }
      }
      next();
    };

    // Test endpoints
    gatedApp.get('/free-feature', fakeAuth, requireTier('free'), (_req, res) => {
      res.json({ ok: true });
    });

    gatedApp.get('/pro-feature', fakeAuth, requireTier('pro'), (_req, res) => {
      res.json({ ok: true });
    });

    gatedApp.get('/team-feature', fakeAuth, requireTier('team'), (_req, res) => {
      res.json({ ok: true });
    });

    gatedApp.get('/ai-drill', fakeAuth, requireFeature('ai_drill_writing'), (_req, res) => {
      res.json({ ok: true });
    });
  });

  test('unauthenticated user is blocked', async () => {
    const res = await request(gatedApp).get('/pro-feature');
    expect(res.status).toBe(401);
  });

  test('free user can access free features', async () => {
    // Mock getUserTier → 'free'
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ plan_id: 'free' }] });

    const res = await request(gatedApp)
      .get('/free-feature')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('free user is blocked from pro features', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ plan_id: 'free' }] }) // user plan_id
      .mockResolvedValueOnce({ rows: [] }); // no active subscription fallback

    const res = await request(gatedApp)
      .get('/pro-feature')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TIER_REQUIRED');
    expect(res.body.requiredTier).toBe('pro');
    expect(res.body.currentTier).toBe('free');
    expect(res.body.upgradeUrl).toBe('/pricing');
  });

  test('pro user can access pro features', async () => {
    mockDb.query.mockImplementation(async () => {
      return { rows: [{ plan_id: 'pro', slug: 'pro' }] };
    });

    const res = await request(gatedApp)
      .get('/pro-feature')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('pro user is blocked from team features', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ plan_id: 'pro' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(gatedApp)
      .get('/team-feature')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(403);
    expect(res.body.requiredTier).toBe('team');
  });

  test('team user can access everything', async () => {
    mockDb.query.mockResolvedValue({ rows: [{ plan_id: 'team' }] });

    const free = await request(gatedApp).get('/free-feature').set('Authorization', `Bearer ${authToken}`);
    expect(free.status).toBe(200);

    const pro = await request(gatedApp).get('/pro-feature').set('Authorization', `Bearer ${authToken}`);
    expect(pro.status).toBe(200);

    const team = await request(gatedApp).get('/team-feature').set('Authorization', `Bearer ${authToken}`);
    expect(team.status).toBe(200);
  });

  test('requireFeature maps feature names to tiers correctly', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ plan_id: 'free' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(gatedApp)
      .get('/ai-drill')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(403);
    expect(res.body.requiredTier).toBe('pro');
  });
});

// --------------------------------------------------------------------------
// Test: Beta waitlist
// --------------------------------------------------------------------------

describe('Beta Waitlist: Signup Flow', () => {
  let betaApp;

  beforeEach(() => {
    betaApp = express();
    betaApp.use(express.json());
    const betaRouter = require('../../routes/beta');
    betaApp.use('/api/beta', betaRouter);
  });

  test('join waitlist with valid email', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 'wl-1', email: 'band@school.edu', status: 'waiting' }],
    });

    const res = await request(betaApp)
      .post('/api/beta')
      .send({ email: 'band@school.edu', role: 'band_director' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('waiting');
  });

  test('join waitlist with invalid email rejected', async () => {
    const res = await request(betaApp)
      .post('/api/beta')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('join waitlist with invalid role rejected', async () => {
    const res = await request(betaApp)
      .post('/api/beta')
      .send({ email: 'test@example.com', role: 'hacker' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('duplicate email returns existing status', async () => {
    // ON CONFLICT returns nothing, then we query existing
    mockDb.query
      .mockResolvedValueOnce({ rows: [] }) // INSERT returns nothing (conflict)
      .mockResolvedValueOnce({ rows: [{ status: 'invited' }] }); // SELECT existing

    const res = await request(betaApp)
      .post('/api/beta')
      .send({ email: 'already@list.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('invited');
  });
});
