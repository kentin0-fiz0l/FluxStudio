import http from 'k6/http';
import { check, sleep } from 'k6';

// Quick test configuration (2 minutes total)
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'https://fluxstudio.art';

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health duration < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // Test signup
  const signupPayload = JSON.stringify({
    email: `test_${randomString(10)}@example.com`,
    password: 'TestPassword123!',
    name: `Test User ${randomString(5)}`,
  });

  const signupRes = http.post(`${BASE_URL}/api/auth/signup`, signupPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const signupOk = check(signupRes, {
    'signup status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'signup duration < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function setup() {
  console.log('Running quick authentication baseline test...');
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed!');
    throw new Error('Service is not healthy');
  }
  console.log('Health check passed. Starting test...');
}

export function teardown(data) {
  console.log('Quick test completed.');
}
