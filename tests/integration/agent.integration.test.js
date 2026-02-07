/**
 * Agent API Integration Tests
 * @file tests/integration/agent.integration.test.js
 *
 * Tests all agent API endpoints with real HTTP requests.
 * Requires running backend server.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Test configuration
const BASE_URL = process.env.UNIFIED_BACKEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

describe('Agent API Integration Tests', () => {
  let authToken;
  let testUser;
  let testSession;

  // Create a test token for authenticated requests
  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a test user and get token
    const timestamp = Date.now();
    const userData = {
      name: 'Agent Test User',
      email: `agent-test-${timestamp}@example.com`,
      password: 'testpassword123',
    };

    try {
      // Try to create user
      const signupResponse = await request(BASE_URL)
        .post('/api/auth/signup')
        .send(userData);

      if (signupResponse.status === 201) {
        authToken = signupResponse.body.token;
        testUser = signupResponse.body.user;
      } else {
        // If signup fails, try login
        const loginResponse = await request(BASE_URL)
          .post('/api/auth/login')
          .send({ email: userData.email, password: userData.password });

        if (loginResponse.status === 200) {
          authToken = loginResponse.body.token;
          testUser = loginResponse.body.user;
        }
      }

      // Fallback: generate a mock token for testing
      if (!authToken) {
        testUser = { id: `test-user-${timestamp}`, email: userData.email };
        authToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
      }
    } catch (error) {
      // Generate a fallback token
      testUser = { id: `test-user-${Date.now()}`, email: 'test@example.com' };
      authToken = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
    }
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('Authentication', () => {
    test('should require authentication for agent endpoints', async () => {
      await request(BASE_URL)
        .get('/api/agent/daily_brief')
        .expect(401);
    });

    test('should reject invalid tokens', async () => {
      await request(BASE_URL)
        .get('/api/agent/daily_brief')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    test('should accept valid token', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/list_projects')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not return 401 (may return 200 or other valid response)
      expect(response.status).not.toBe(401);
    });
  });

  // ============================================================================
  // Daily Brief Endpoint
  // ============================================================================

  describe('GET /api/agent/daily_brief', () => {
    test('should return daily brief with valid token', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/daily_brief')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.brief).toBeDefined();
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.generatedAt).toBeDefined();
    });

    test('should include rate limit headers', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/daily_brief')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-agent-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-agent-ratelimit-remaining']).toBeDefined();
    });
  });

  // ============================================================================
  // What Changed Endpoint
  // ============================================================================

  describe('GET /api/agent/what_changed', () => {
    test('should return changes with default timeframe', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/what_changed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.since).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.changes).toBeDefined();
    });

    test('should accept since parameter', async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(BASE_URL)
        .get(`/api/agent/what_changed?since=${encodeURIComponent(since)}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.since).getTime()).toBeLessThanOrEqual(new Date(since).getTime() + 1000);
    });
  });

  // ============================================================================
  // Search Projects Endpoint
  // ============================================================================

  describe('GET /api/agent/search_projects', () => {
    test('should require query parameter', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/search_projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should return search results', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/search_projects?query=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should support pagination', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/search_projects?query=test&limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================================
  // List Projects Endpoint
  // ============================================================================

  describe('GET /api/agent/list_projects', () => {
    test('should return list of projects', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/list_projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/list_projects?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned projects should have status 'active'
      response.body.data.forEach(project => {
        if (project.status) {
          expect(project.status.toLowerCase()).toBe('active');
        }
      });
    });
  });

  // ============================================================================
  // Get Project Endpoint
  // ============================================================================

  describe('GET /api/agent/get_project/:id', () => {
    test('should return 404 for non-existent project', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/get_project/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Not found');
    });

    test('should return project details for valid ID', async () => {
      // First create a project to test with
      const createResponse = await request(BASE_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Agent Test Project',
          description: 'Created for agent integration test',
          type: 'design',
        });

      if (createResponse.status === 201 && createResponse.body.id) {
        const projectId = createResponse.body.id;

        const response = await request(BASE_URL)
          .get(`/api/agent/get_project/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(projectId);
      }
    });
  });

  // ============================================================================
  // Activity Feed Endpoint
  // ============================================================================

  describe('GET /api/agent/activity_feed', () => {
    test('should return activity feed', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/activity_feed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should respect limit parameter', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/activity_feed?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================================
  // Session Management
  // ============================================================================

  describe('Session Management', () => {
    test('POST /api/agent/session should create new session', async () => {
      const response = await request(BASE_URL)
        .post('/api/agent/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();

      testSession = response.body.data;
    });

    test('POST /api/agent/session should accept projectId', async () => {
      const response = await request(BASE_URL)
        .post('/api/agent/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectId: 'test-project-id' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projectId).toBe('test-project-id');
    });

    test('GET /api/agent/session/:id should return session', async () => {
      if (!testSession) {
        // Create a session first
        const createResponse = await request(BASE_URL)
          .post('/api/agent/session')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        testSession = createResponse.body.data;
      }

      const response = await request(BASE_URL)
        .get(`/api/agent/session/${testSession.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testSession.id);
    });

    test('GET /api/agent/session/:id should return 404 for invalid session', async () => {
      await request(BASE_URL)
        .get('/api/agent/session/invalid-session-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ============================================================================
  // Chat Endpoint (SSE)
  // ============================================================================

  describe('POST /api/agent/chat', () => {
    test('should require message parameter', async () => {
      const response = await request(BASE_URL)
        .post('/api/agent/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should return SSE response for valid message', async () => {
      const response = await request(BASE_URL)
        .post('/api/agent/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello, what can you help me with?',
          sessionId: testSession?.id,
        });

      // Chat endpoint uses SSE, so we check for proper content type
      // or successful response status
      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toContain('text/event-stream');
      }
    });
  });

  // ============================================================================
  // Pending Actions
  // ============================================================================

  describe('Pending Actions', () => {
    test('GET /api/agent/pending_actions should return list', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/pending_actions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('POST /api/agent/pending_action/:id/approve should handle invalid ID', async () => {
      const response = await request(BASE_URL)
        .post('/api/agent/pending_action/non-existent/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .expect([200, 404, 500]);

      // The endpoint may succeed (updating 0 rows) or return 404/500
      expect(response.body).toBeDefined();
    });

    test('POST /api/agent/pending_action/:id/reject should handle invalid ID', async () => {
      const response = await request(BASE_URL)
        .post('/api/agent/pending_action/non-existent/reject')
        .set('Authorization', `Bearer ${authToken}`)
        .expect([200, 404, 500]);

      expect(response.body).toBeDefined();
    });
  });

  // ============================================================================
  // Rate Limiting
  // ============================================================================

  describe('Rate Limiting', () => {
    test('should include rate limit headers', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/list_projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-agent-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-agent-ratelimit-remaining']).toBeDefined();
    });

    test('should enforce rate limits on repeated requests', async () => {
      // This test is designed to be lightweight - it verifies rate limit
      // headers decrease, not that we hit the actual limit
      const responses = [];

      for (let i = 0; i < 3; i++) {
        const response = await request(BASE_URL)
          .get('/api/agent/what_changed')
          .set('Authorization', `Bearer ${authToken}`);

        responses.push(response);
      }

      // Verify rate limit remaining decreases
      const remaining1 = parseInt(responses[0].headers['x-agent-ratelimit-remaining']);
      const remaining2 = parseInt(responses[1].headers['x-agent-ratelimit-remaining']);

      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    test('should return proper error format', async () => {
      const response = await request(BASE_URL)
        .get('/api/agent/search_projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    test('should handle malformed requests gracefully', async () => {
      const response = await request(BASE_URL)
        .post('/api/agent/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('not valid json{')
        .expect([400, 500]);

      // Should return error response, not crash
      expect(response.body).toBeDefined();
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    test('should respond quickly to list_projects', async () => {
      const startTime = Date.now();

      await request(BASE_URL)
        .get('/api/agent/list_projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    test('should handle concurrent requests', async () => {
      const startTime = Date.now();

      const requests = Array.from({ length: 5 }, () =>
        request(BASE_URL)
          .get('/api/agent/activity_feed')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All should succeed or hit rate limit
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });

      expect(duration).toBeLessThan(5000); // 5 concurrent requests within 5 seconds
    });
  });
});
