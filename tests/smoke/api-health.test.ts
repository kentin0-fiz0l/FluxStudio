/**
 * Post-Deployment Smoke Tests — API Health
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Validates critical API endpoints are reachable and responding correctly
 * after a deployment. Run against the live deployment URL.
 *
 * Usage: SMOKE_TEST_URL=https://api.fluxstudio.art npx playwright test tests/smoke/api-health.test.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:3001';

test.describe('API Health Smoke Tests', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status');
  });

  test('GET /health/live returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health/live`);
    expect(res.status()).toBe(200);
  });

  test('GET /health/ready returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/health/ready`);
    expect(res.status()).toBe(200);
  });

  test('GET /api/auth/me returns 401 without token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/me`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/auth/login returns expected shape', async ({ request }) => {
    // Attempt login with invalid credentials — should get 400/401, not 500
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: 'smoke-test@nonexistent.com', password: 'wrong' },
    });
    expect([400, 401]).toContain(res.status());
  });

  test('GET /api/admin/flags/evaluate returns 401 without token', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/flags/evaluate`);
    expect(res.status()).toBe(401);
  });

  test('API does not return 500 on unknown routes', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/nonexistent-route-smoke-test`);
    // Should be 404, not 500
    expect(res.status()).not.toBe(500);
  });
});
