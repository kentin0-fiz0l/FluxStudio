import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200 users
    { duration: '3m', target: 200 },  // Hold spike
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.1'],             // Custom error rate
  },
};

const BASE_URL = 'https://fluxstudio.art';

// Generate random test data
function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Test signup flow
function testSignup() {
  const payload = JSON.stringify({
    email: `test_${randomString(10)}@example.com`,
    password: 'TestPassword123!',
    name: `Test User ${randomString(5)}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/signup`, payload, params);

  const success = check(res, {
    'signup status is 201': (r) => r.status === 201,
    'signup returns token': (r) => JSON.parse(r.body).token !== undefined,
    'signup duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);

  return res;
}

// Test login flow
function testLogin(email, password) {
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => JSON.parse(r.body).token !== undefined,
    'login duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);

  if (success && res.body) {
    const body = JSON.parse(res.body);
    return body.token;
  }

  return null;
}

// Test OAuth Google flow (just the initiation endpoint)
function testOAuthGoogle() {
  const res = http.get(`${BASE_URL}/api/auth/google`);

  const success = check(res, {
    'oauth redirect received': (r) => r.status === 302 || r.status === 200,
    'oauth duration < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
}

// Test token verification
function testVerifyToken(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get(`${BASE_URL}/api/auth/verify`, params);

  const success = check(res, {
    'verify status is 200': (r) => r.status === 200,
    'verify returns user': (r) => JSON.parse(r.body).user !== undefined,
    'verify duration < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
}

// Test logout
function testLogout(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/logout`, null, params);

  const success = check(res, {
    'logout status is 200': (r) => r.status === 200,
    'logout duration < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
}

// Main test scenario
export default function () {
  // Scenario 1: New user signup and immediate use (30% of traffic)
  if (Math.random() < 0.3) {
    const signupRes = testSignup();
    if (signupRes.status === 201) {
      const body = JSON.parse(signupRes.body);
      testVerifyToken(body.token);
      sleep(1);
      testLogout(body.token);
    }
  }

  // Scenario 2: Existing user login (60% of traffic)
  else if (Math.random() < 0.9) {
    const token = testLogin('existing_user@example.com', 'ExistingPassword123!');
    if (token) {
      sleep(0.5);
      testVerifyToken(token);
      sleep(2); // User works for a bit
      testLogout(token);
    }
  }

  // Scenario 3: OAuth flow (10% of traffic)
  else {
    testOAuthGoogle();
  }

  sleep(1);
}

// Handle setup (runs once before test)
export function setup() {
  console.log('Starting authentication load test...');
  console.log(`Target: ${BASE_URL}`);

  // Health check before starting
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Aborting test.');
    throw new Error('Service is not healthy');
  }

  console.log('Health check passed. Beginning load test...');
}

// Handle teardown (runs once after test)
export function teardown(data) {
  console.log('Load test completed.');
}
