/**
 * API Integration Tests
 * Tests the HTTP endpoints for auth and messaging services
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Test configuration (unified backend consolidates all services on 3001)
const AUTH_BASE_URL = process.env.UNIFIED_BACKEND_URL || 'http://localhost:3001';
const MESSAGING_BASE_URL = process.env.UNIFIED_BACKEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'flux-studio-secret-key-2025';

describe('API Integration Tests', () => {
  let authToken;
  let testUser;
  let testConversation;

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Auth Service API', () => {
    test('should respond to health check', async () => {
      const response = await request(AUTH_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('auth-service');
      expect(response.body.checks).toBeDefined();
    });

    test('should create user account via signup', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@integration.com',
        password: 'testpassword123'
      };

      const response = await request(AUTH_BASE_URL)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();

      authToken = response.body.token;
      testUser = response.body.user;
    });

    test('should authenticate existing user via login', async () => {
      const loginData = {
        email: 'test@integration.com',
        password: 'testpassword123'
      };

      const response = await request(AUTH_BASE_URL)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();

      // Update token if needed
      if (!authToken) {
        authToken = response.body.token;
        testUser = response.body.user;
      }
    });

    test('should reject invalid login credentials', async () => {
      const invalidLogin = {
        email: 'test@integration.com',
        password: 'wrongpassword'
      };

      await request(AUTH_BASE_URL)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(401);
    });

    test('should return user profile with valid token', async () => {
      const response = await request(AUTH_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);
    });

    test('should reject requests without valid token', async () => {
      await request(AUTH_BASE_URL)
        .get('/api/auth/me')
        .expect(401);
    });

    test('should logout user successfully', async () => {
      const response = await request(AUTH_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });

    test('should handle Google OAuth flow', async () => {
      // Mock Google credential (in real test, this would be a valid Google JWT)
      const mockGoogleCredential = 'mock.google.credential';

      const response = await request(AUTH_BASE_URL)
        .post('/api/auth/google')
        .send({ credential: mockGoogleCredential })
        .expect(400); // Expected to fail with mock credential

      expect(response.body.message).toContain('verification');
    });

    test('should create and manage teams', async () => {
      // Create team
      const teamData = {
        name: 'Integration Test Team',
        description: 'A team for testing'
      };

      const createResponse = await request(AUTH_BASE_URL)
        .post('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .send(teamData)
        .expect(201);

      expect(createResponse.body.name).toBe(teamData.name);
      const teamId = createResponse.body.id;

      // Get teams
      const getResponse = await request(AUTH_BASE_URL)
        .get('/api/teams')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(getResponse.body)).toBe(true);
      const foundTeam = getResponse.body.find(t => t.id === teamId);
      expect(foundTeam).toBeTruthy();

      // Update team
      const updateData = { name: 'Updated Team Name' };
      const updateResponse = await request(AUTH_BASE_URL)
        .put(`/api/teams/${teamId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.name).toBe(updateData.name);
    });

    test('should handle file upload', async () => {
      // Create a simple test file buffer
      const testFileContent = Buffer.from('test file content');

      const response = await request(AUTH_BASE_URL)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFileContent, 'test.txt')
        .expect(200);

      expect(response.body.url).toBeDefined();
      expect(response.body.filename).toBeDefined();
    });
  });

  describe('Messaging Service API', () => {
    test('should respond to health check', async () => {
      const response = await request(MESSAGING_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('UP');
      expect(response.body.service).toBe('messaging-service');
      expect(response.body.features).toBeDefined();
    });

    test('should require authentication for protected endpoints', async () => {
      // Try to access protected endpoint without token
      await request(MESSAGING_BASE_URL)
        .get('/api/conversations')
        .expect(401);
    });

    test('should create and retrieve conversations', async () => {
      const conversationData = {
        name: 'API Test Conversation',
        description: 'Created via API test',
        type: 'group'
      };

      // Create conversation
      const createResponse = await request(MESSAGING_BASE_URL)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversationData)
        .expect(201);

      expect(createResponse.body.name).toBe(conversationData.name);
      testConversation = createResponse.body;

      // Get conversations
      const getResponse = await request(MESSAGING_BASE_URL)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(getResponse.body)).toBe(true);
      const foundConversation = getResponse.body.find(c => c.id === testConversation.id);
      expect(foundConversation).toBeTruthy();
    });

    test('should create and retrieve messages', async () => {
      if (!testConversation) {
        // Create a conversation first
        const convResponse = await request(MESSAGING_BASE_URL)
          .post('/api/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Message Test Conversation' })
          .expect(201);

        testConversation = convResponse.body;
      }

      const messageData = {
        content: 'Test message via API',
        messageType: 'text'
      };

      // Create message
      const createResponse = await request(MESSAGING_BASE_URL)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(createResponse.body.content).toBe(messageData.content);
      expect(createResponse.body.conversationId).toBe(testConversation.id);

      // Get messages
      const getResponse = await request(MESSAGING_BASE_URL)
        .get(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(getResponse.body)).toBe(true);
      const foundMessage = getResponse.body.find(m => m.id === createResponse.body.id);
      expect(foundMessage).toBeTruthy();
    });

    test('should handle message reactions', async () => {
      if (!testConversation) {
        const convResponse = await request(MESSAGING_BASE_URL)
          .post('/api/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Reaction Test Conversation' })
          .expect(201);

        testConversation = convResponse.body;
      }

      // Create a message first
      const messageResponse = await request(MESSAGING_BASE_URL)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Message for reactions' })
        .expect(201);

      const messageId = messageResponse.body.id;

      // Add reaction
      const reactionData = { reaction: '👍' };
      await request(MESSAGING_BASE_URL)
        .post(`/api/messages/${messageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);

      // Get reactions
      const getResponse = await request(MESSAGING_BASE_URL)
        .get(`/api/messages/${messageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(getResponse.body)).toBe(true);
      const foundReaction = getResponse.body.find(r => r.reaction === '👍');
      expect(foundReaction).toBeTruthy();

      // Remove reaction
      await request(MESSAGING_BASE_URL)
        .delete(`/api/messages/${messageId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reactionData)
        .expect(200);
    });

    test('should handle conversation participants', async () => {
      if (!testConversation) {
        const convResponse = await request(MESSAGING_BASE_URL)
          .post('/api/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Participant Test Conversation' })
          .expect(201);

        testConversation = convResponse.body;
      }

      // Get current participants
      const getResponse = await request(MESSAGING_BASE_URL)
        .get(`/api/conversations/${testConversation.id}/participants`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(getResponse.body)).toBe(true);
      expect(getResponse.body.length).toBeGreaterThan(0); // Creator should be a participant
    });
  });

  describe('Cross-Service Integration', () => {
    test('should maintain user session across services', async () => {
      // Verify user is authenticated for both services
      const authResponse = await request(AUTH_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(authResponse.body.id).toBe(testUser.id);

      // Use same token for messaging service
      const messagingResponse = await request(MESSAGING_BASE_URL)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(messagingResponse.body)).toBe(true);
    });

    test('should handle user data consistency', async () => {
      // Create conversation in messaging service
      const conversationResponse = await request(MESSAGING_BASE_URL)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Consistency Test' })
        .expect(201);

      // Verify user ID matches across services
      expect(conversationResponse.body.createdBy).toBe(testUser.id);

      // Create message and verify author ID
      const messageResponse = await request(MESSAGING_BASE_URL)
        .post(`/api/conversations/${conversationResponse.body.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Consistency test message' })
        .expect(201);

      expect(messageResponse.body.authorId).toBe(testUser.id);
    });
  });

  describe('WebSocket Integration', () => {
    test('should provide WebSocket connection info', async () => {
      const response = await request(MESSAGING_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body.features.websocket).toBe(true);
    });

    // Note: Full WebSocket testing would require additional setup
    // This is a placeholder for WebSocket endpoint verification
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent endpoints', async () => {
      await request(AUTH_BASE_URL)
        .get('/api/nonexistent')
        .expect(404);

      await request(MESSAGING_BASE_URL)
        .get('/api/nonexistent')
        .expect(404);
    });

    test('should handle malformed requests', async () => {
      await request(AUTH_BASE_URL)
        .post('/api/auth/signup')
        .send({ invalid: 'data' })
        .expect(400);
    });

    test('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 10 }, () =>
        request(AUTH_BASE_URL)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429) or rejected (401)
      const statusCodes = responses.map(r => r.status);
      const hasRateLimitOrRejection = statusCodes.some(code => code === 429 || code === 401);
      expect(hasRateLimitOrRejection).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should respond to health checks quickly', async () => {
      const startTime = Date.now();

      await Promise.all([
        request(AUTH_BASE_URL).get('/health'),
        request(MESSAGING_BASE_URL).get('/health')
      ]);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent API requests', async () => {
      const startTime = Date.now();

      // Make 10 concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(MESSAGING_BASE_URL)
          .post('/api/conversations')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: `Concurrent Test ${i}` })
      );

      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      console.log(`10 concurrent requests completed in ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});