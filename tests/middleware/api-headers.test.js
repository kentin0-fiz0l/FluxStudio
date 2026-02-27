/**
 * API Headers Middleware Tests
 *
 * Verifies that:
 * 1. X-API-Version header is present on every response
 * 2. Rate-limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
 *    are present on responses when rate limiting is active
 */

/* global vi */
const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// 1. API Version Header Tests
// ---------------------------------------------------------------------------

describe('API Version Middleware', () => {
  let app;

  beforeEach(() => {
    const { apiVersionMiddleware, API_VERSION } = require('../../middleware/apiVersion');
    app = express();
    app.use(apiVersionMiddleware);
    app.get('/test', (req, res) => res.json({ ok: true }));
  });

  test('should set X-API-Version header on every response', async () => {
    const res = await request(app).get('/test');

    expect(res.status).toBe(200);
    expect(res.headers['x-api-version']).toBeDefined();
    expect(res.headers['x-api-version']).toBe('2025.1');
  });

  test('should set X-API-Version on 404 responses', async () => {
    // Add a catch-all 404 handler after the versioned route
    app.use((req, res) => res.status(404).json({ error: 'Not found' }));

    const res = await request(app).get('/nonexistent');

    expect(res.status).toBe(404);
    expect(res.headers['x-api-version']).toBe('2025.1');
  });

  test('should set X-API-Version for POST requests', async () => {
    app.post('/submit', (req, res) => res.json({ submitted: true }));

    const res = await request(app).post('/submit');

    expect(res.status).toBe(200);
    expect(res.headers['x-api-version']).toBe('2025.1');
  });

  test('API_VERSION constant should match header value', () => {
    const { API_VERSION } = require('../../middleware/apiVersion');
    expect(API_VERSION).toBe('2025.1');
  });
});

// ---------------------------------------------------------------------------
// 2. Rate-Limit Header Tests (express-rate-limit with legacyHeaders: true)
// ---------------------------------------------------------------------------

describe('Rate-Limit Response Headers (express-rate-limit)', () => {
  let app;

  beforeEach(() => {
    // Import the factory that wraps express-rate-limit
    const { rateLimit } = require('../../middleware/security');

    app = express();

    // Apply rate limiter configured for testing: small window, NOT skipped
    app.use(rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      standardHeaders: true,
      legacyHeaders: true,
      skip: () => false // never skip, even in test/dev
    }));

    app.get('/api/test', (req, res) => res.json({ ok: true }));
  });

  test('should include X-RateLimit-Limit header', async () => {
    const res = await request(app).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(Number(res.headers['x-ratelimit-limit'])).toBe(10);
  });

  test('should include X-RateLimit-Remaining header', async () => {
    const res = await request(app).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    // After first request, remaining should be max - 1
    expect(Number(res.headers['x-ratelimit-remaining'])).toBe(9);
  });

  test('should include X-RateLimit-Reset header', async () => {
    const res = await request(app).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
    // The reset value should be a reasonable number (seconds until reset)
    const resetValue = Number(res.headers['x-ratelimit-reset']);
    expect(resetValue).toBeGreaterThan(0);
  });

  test('should decrement remaining count with each request', async () => {
    const res1 = await request(app).get('/api/test');
    const res2 = await request(app).get('/api/test');

    const remaining1 = Number(res1.headers['x-ratelimit-remaining']);
    const remaining2 = Number(res2.headers['x-ratelimit-remaining']);

    expect(remaining1).toBeGreaterThan(remaining2);
  });
});

// ---------------------------------------------------------------------------
// 3. Advanced Rate-Limiter Header Tests
// ---------------------------------------------------------------------------

describe('Advanced Rate-Limiter Response Headers', () => {
  let app;

  beforeEach(() => {
    // The advanced rate limiter uses Redis, so we stub the cache module
    vi.resetModules();

    // Create an in-memory store to replace Redis
    const store = {};
    vi.doMock('../../lib/cache', () => ({
      get: vi.fn(async (key) => store[key] || null),
      set: vi.fn(async (key, value, _ttl) => { store[key] = value; }),
      del: vi.fn(async (key) => { delete store[key]; }),
      initializeCache: vi.fn(async () => {}),
      getClient: vi.fn(() => null)
    }));

    // Stub the security logger to avoid file/network I/O
    vi.doMock('../../lib/auth/securityLogger', () => ({
      logEvent: vi.fn(async () => {}),
      SEVERITY: { WARNING: 'WARNING', INFO: 'INFO' }
    }));

    const AdvancedRateLimiter = require('../../middleware/advancedRateLimiter');

    app = express();
    app.use(AdvancedRateLimiter.middleware());
    app.get('/api/test', (req, res) => res.json({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should include X-RateLimit-Limit header', async () => {
    const res = await request(app).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(Number(res.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
  });

  test('should include X-RateLimit-Remaining header', async () => {
    const res = await request(app).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });

  test('should include X-RateLimit-Reset as Unix timestamp (seconds)', async () => {
    const res = await request(app).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.headers['x-ratelimit-reset']).toBeDefined();

    const resetValue = Number(res.headers['x-ratelimit-reset']);
    // Should be a Unix timestamp in seconds (not milliseconds, not ISO string)
    // A valid Unix timestamp in seconds for 2025+ is roughly > 1_700_000_000
    expect(resetValue).toBeGreaterThan(1_700_000_000);
    // And should not be in milliseconds (> 1_700_000_000_000)
    expect(resetValue).toBeLessThan(1_900_000_000_000);
  });
});

// ---------------------------------------------------------------------------
// 4. Combined: version + rate-limit headers on same response
// ---------------------------------------------------------------------------

describe('Combined API Version + Rate-Limit Headers', () => {
  let app;

  beforeEach(() => {
    const { apiVersionMiddleware } = require('../../middleware/apiVersion');
    const { rateLimit } = require('../../middleware/security');

    app = express();
    app.use(apiVersionMiddleware);
    app.use(rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: true,
      skip: () => false
    }));
    app.get('/api/combined', (req, res) => res.json({ ok: true }));
  });

  test('should include both X-API-Version and X-RateLimit-* headers', async () => {
    const res = await request(app).get('/api/combined');

    expect(res.status).toBe(200);

    // Version header
    expect(res.headers['x-api-version']).toBe('2025.1');

    // Rate-limit headers
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });
});
