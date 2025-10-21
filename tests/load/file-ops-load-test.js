import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const uploadRate = new Rate('uploads');
const downloadRate = new Rate('downloads');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 users
    { duration: '3m', target: 20 },   // Stay at 20 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Spike to 100 users
    { duration: '2m', target: 100 },  // Hold spike
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // 95% of requests should be below 2s
    'http_req_duration{type:upload}': ['p(95)<5000'], // Uploads can take up to 5s
    'http_req_duration{type:download}': ['p(95)<3000'], // Downloads up to 3s
    http_req_failed: ['rate<0.05'],      // Error rate should be less than 5%
    errors: ['rate<0.1'],
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

// Create a test user and get auth token
function getAuthToken() {
  const payload = JSON.stringify({
    email: `test_file_${randomString(8)}@example.com`,
    password: 'TestPassword123!',
    name: `File Test User`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/signup`, payload, params);

  if (res.status === 201) {
    const body = JSON.parse(res.body);
    return body.token;
  }

  return null;
}

// Test file upload
function testFileUpload(token, fileSize = 'small') {
  const fd = new FormData();

  // Generate mock file data
  let fileData;
  let fileName;

  switch (fileSize) {
    case 'small':
      fileData = 'x'.repeat(10 * 1024); // 10KB
      fileName = `test_small_${randomString(8)}.txt`;
      break;
    case 'medium':
      fileData = 'x'.repeat(500 * 1024); // 500KB
      fileName = `test_medium_${randomString(8)}.txt`;
      break;
    case 'large':
      fileData = 'x'.repeat(2 * 1024 * 1024); // 2MB
      fileName = `test_large_${randomString(8)}.txt`;
      break;
  }

  fd.append('file', http.file(fileData, fileName, 'text/plain'));
  fd.append('projectId', 'test-project-123');
  fd.append('description', `Load test file - ${fileSize}`);

  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data; boundary=' + fd.boundary,
    },
    tags: { type: 'upload' },
  };

  const res = http.post(`${BASE_URL}/api/files/upload`, fd.body(), params);

  const success = check(res, {
    'upload status is 201': (r) => r.status === 201,
    'upload returns file id': (r) => {
      try {
        return JSON.parse(r.body).fileId !== undefined;
      } catch (e) {
        return false;
      }
    },
    'upload duration acceptable': (r) => {
      switch (fileSize) {
        case 'small': return r.timings.duration < 2000;
        case 'medium': return r.timings.duration < 4000;
        case 'large': return r.timings.duration < 6000;
      }
    },
  });

  errorRate.add(!success);
  uploadRate.add(success);

  if (success && res.body) {
    try {
      const body = JSON.parse(res.body);
      return body.fileId;
    } catch (e) {
      return null;
    }
  }

  return null;
}

// Test file download
function testFileDownload(token, fileId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { type: 'download' },
  };

  const res = http.get(`${BASE_URL}/api/files/${fileId}`, params);

  const success = check(res, {
    'download status is 200': (r) => r.status === 200,
    'download has content': (r) => r.body && r.body.length > 0,
    'download duration < 3000ms': (r) => r.timings.duration < 3000,
  });

  errorRate.add(!success);
  downloadRate.add(success);
}

// Test file list
function testFileList(token, projectId = 'test-project-123') {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { type: 'list' },
  };

  const res = http.get(`${BASE_URL}/api/files?projectId=${projectId}`, params);

  const success = check(res, {
    'list status is 200': (r) => r.status === 200,
    'list returns array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).files);
      } catch (e) {
        return false;
      }
    },
    'list duration < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
}

// Test file metadata update
function testFileUpdate(token, fileId) {
  const payload = JSON.stringify({
    name: `Updated_${randomString(8)}.txt`,
    description: 'Updated file description',
    tags: ['test', 'load-test', 'updated'],
  });

  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { type: 'update' },
  };

  const res = http.patch(`${BASE_URL}/api/files/${fileId}`, payload, params);

  const success = check(res, {
    'update status is 200': (r) => r.status === 200,
    'update duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
}

// Test file delete
function testFileDelete(token, fileId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { type: 'delete' },
  };

  const res = http.del(`${BASE_URL}/api/files/${fileId}`, null, params);

  const success = check(res, {
    'delete status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    'delete duration < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
}

// Test file search
function testFileSearch(token, query) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    tags: { type: 'search' },
  };

  const res = http.get(`${BASE_URL}/api/files/search?q=${query}`, params);

  const success = check(res, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).results);
      } catch (e) {
        return false;
      }
    },
    'search duration < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
}

// Main test scenario
export default function () {
  // Get auth token (reuse for entire VU session)
  const token = getAuthToken();
  if (!token) {
    console.error('Failed to get auth token');
    return;
  }

  // Scenario 1: Upload-heavy workflow (40% of users)
  if (Math.random() < 0.4) {
    // Upload small file
    const fileId1 = testFileUpload(token, 'small');
    sleep(1);

    // Upload medium file
    const fileId2 = testFileUpload(token, 'medium');
    sleep(2);

    // List files
    testFileList(token);
    sleep(1);

    // Download one of the files
    if (fileId1) {
      testFileDownload(token, fileId1);
    }
    sleep(1);
  }

  // Scenario 2: Download-heavy workflow (30% of users)
  else if (Math.random() < 0.7) {
    // Upload one file
    const fileId = testFileUpload(token, 'small');
    sleep(1);

    if (fileId) {
      // Download it multiple times (simulating sharing)
      testFileDownload(token, fileId);
      sleep(0.5);
      testFileDownload(token, fileId);
      sleep(0.5);
      testFileDownload(token, fileId);
      sleep(1);
    }

    // List files
    testFileList(token);
  }

  // Scenario 3: File management workflow (30% of users)
  else {
    // Upload file
    const fileId = testFileUpload(token, 'medium');
    sleep(1);

    if (fileId) {
      // Update metadata
      testFileUpdate(token, fileId);
      sleep(1);

      // Download to verify
      testFileDownload(token, fileId);
      sleep(1);

      // Search for it
      testFileSearch(token, 'test');
      sleep(1);

      // Delete it
      testFileDelete(token, fileId);
      sleep(1);
    }
  }

  sleep(1);
}

// Handle setup
export function setup() {
  console.log('Starting file operations load test...');
  console.log(`Target: ${BASE_URL}`);

  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.error('Health check failed! Aborting test.');
    throw new Error('Service is not healthy');
  }

  console.log('Health check passed. Beginning file operations load test...');
}

// Handle teardown
export function teardown(data) {
  console.log('File operations load test completed.');
  console.log('Check metrics for upload/download rates and error rates.');
}
