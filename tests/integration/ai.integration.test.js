/**
 * AI Route Integration Tests
 *
 * Tests AI chat, conversations, design review, code generation,
 * design feedback analysis, project structure, template generation,
 * usage tracking, and health check.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

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

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

// Mock Anthropic SDK
const mockCreate = jest.fn();
const mockStream = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
      stream: mockStream,
    }
  }));
});

// Mock AI summary service
jest.mock('../../services/ai-summary-service', () => ({
  logAiUsage: jest.fn(),
  getAiUsageLogs: jest.fn(() => []),
  sanitizeApiError: jest.fn((err) => err.message || 'Unknown error'),
  aiSummaryService: null,
}));

// Mock quota check
jest.mock('../../middleware/quotaCheck', () => ({
  checkQuota: jest.fn(() => (req, res, next) => next()),
}));

function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createApp() {
  // Set API key so anthropic client initializes
  process.env.ANTHROPIC_API_KEY = 'test-key';
  // Clear module cache to re-initialize with env var
  jest.isolateModules(() => {});

  const app = express();
  app.use(express.json());
  const aiRoutes = require('../../routes/ai');
  app.use('/api/ai', aiRoutes);
  return app;
}

describe('AI Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    mockCreate.mockReset();
    mockStream.mockReset();
  });

  // Auth tests
  describe('Authentication', () => {
    it('should return 401 for POST /api/ai/chat without token', async () => {
      await request(app).post('/api/ai/chat').send({ message: 'hello' }).expect(401);
    });
    it('should return 401 for GET /api/ai/conversations without token', async () => {
      await request(app).get('/api/ai/conversations').expect(401);
    });
    it('should return 401 for POST /api/ai/design-review without token', async () => {
      await request(app).post('/api/ai/design-review').send({ description: 'test' }).expect(401);
    });
  });

  // Chat sync tests
  describe('POST /api/ai/chat/sync', () => {
    it('should return 400 for empty message', async () => {
      const res = await request(app)
        .post('/api/ai/chat/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '' });
      expect(res.status).toBe(400);
    });

    it('should return AI response on success', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello from AI' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        model: 'claude-sonnet-4-5-20250929',
      });
      const res = await request(app)
        .post('/api/ai/chat/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hello' });
      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Hello from AI');
      expect(res.body.tokensUsed).toBe(30);
    });

    it('should handle API error', async () => {
      mockCreate.mockRejectedValue(Object.assign(new Error('Rate limit'), { status: 429, headers: {} }));
      const res = await request(app)
        .post('/api/ai/chat/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hello' });
      expect(res.status).toBe(429);
    });
  });

  // Chat SSE tests
  describe('POST /api/ai/chat', () => {
    it('should return 400 for missing message', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should stream SSE response', async () => {
      // Create an async iterator for the stream mock
      const events = [
        { type: 'message_start', message: { usage: { input_tokens: 5 } } },
        { type: 'content_block_delta', delta: { text: 'Hi' } },
        { type: 'content_block_delta', delta: { text: ' there' } },
        { type: 'message_delta', usage: { output_tokens: 10 } },
      ];
      mockStream.mockResolvedValue({
        [Symbol.asyncIterator]: () => {
          let i = 0;
          return {
            next: () => {
              if (i < events.length) return Promise.resolve({ value: events[i++], done: false });
              return Promise.resolve({ done: true });
            }
          };
        }
      });

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'text/event-stream')
        .send({ message: 'hi' });

      expect(res.headers['content-type']).toMatch(/text\/event-stream/);
      expect(res.text).toContain('data:');
      expect(res.text).toContain('"type":"start"');
    });
  });

  // Conversation tests
  describe('GET /api/ai/conversations', () => {
    it('should return empty conversations list', async () => {
      const res = await request(app)
        .get('/api/ai/conversations')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.conversations).toBeDefined();
    });
  });

  describe('GET /api/ai/conversations/:id', () => {
    it('should return 404 for non-existent conversation', async () => {
      const res = await request(app)
        .get('/api/ai/conversations/non-existent-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/ai/conversations/:id', () => {
    it('should return 404 for non-existent conversation', async () => {
      const res = await request(app)
        .delete('/api/ai/conversations/non-existent-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // Design review tests
  describe('POST /api/ai/design-review', () => {
    it('should return 400 for missing description', async () => {
      const res = await request(app)
        .post('/api/ai/design-review')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return design feedback on success', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Great design with improvements needed' }],
        usage: { input_tokens: 15, output_tokens: 50 },
      });
      const res = await request(app)
        .post('/api/ai/design-review')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'A landing page with hero section' });
      expect(res.status).toBe(200);
      expect(res.body.feedback).toBeDefined();
      expect(res.body.aspects).toBeDefined();
    });

    it('should handle Anthropic error', async () => {
      mockCreate.mockRejectedValue(new Error('Service unavailable'));
      const res = await request(app)
        .post('/api/ai/design-review')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Test design' });
      expect(res.status).toBe(500);
    });
  });

  // Code generation tests
  describe('POST /api/ai/generate-code', () => {
    it('should return 400 for empty description', async () => {
      const res = await request(app)
        .post('/api/ai/generate-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: '' });
      expect(res.status).toBe(400);
    });

    it('should return generated code on success', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'const Button = () => <button>Click</button>;' }],
        usage: { input_tokens: 10, output_tokens: 30 },
      });
      const res = await request(app)
        .post('/api/ai/generate-code')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'A primary button component' });
      expect(res.status).toBe(200);
      expect(res.body.code).toBeDefined();
      expect(res.body.componentType).toBeDefined();
    });
  });

  // Design feedback analysis
  describe('POST /api/ai/design-feedback/analyze', () => {
    it('should return 400 for missing imageUrl', async () => {
      const res = await request(app)
        .post('/api/ai/design-feedback/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // Project structure generation
  describe('POST /api/ai/generate-project-structure', () => {
    it('should return 400 for short description', async () => {
      const res = await request(app)
        .post('/api/ai/generate-project-structure')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: '' });
      expect(res.status).toBe(400);
    });

    it('should return project structure on success', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          name: 'Test Project',
          folders: ['/assets', '/docs'],
          tasks: [{ title: 'Setup', week: 1, description: 'Initialize' }],
          teamRoles: ['Designer'],
          tags: ['design'],
          projectType: 'design',
        }) }],
        usage: { input_tokens: 10, output_tokens: 50 },
      });
      const res = await request(app)
        .post('/api/ai/generate-project-structure')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'A design system for mobile app' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // Template generation
  describe('POST /api/ai/generate-template', () => {
    it('should return 400 for short description', async () => {
      const res = await request(app)
        .post('/api/ai/generate-template')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: '' });
      expect(res.status).toBe(400);
    });

    it('should return generated template on success', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          name: 'Test Template',
          description: 'A test',
          category: 'design',
          complexity: 'basic',
          tags: ['test'],
          structure: { projectType: 'design', folders: [], files: [], entities: [] },
          variables: [],
          suggestedTasks: [],
          teamRoles: [],
        }) }],
        usage: { input_tokens: 10, output_tokens: 80 },
      });
      const res = await request(app)
        .post('/api/ai/generate-template')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'A comprehensive design system template' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // Health and usage
  describe('GET /api/ai/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/ai/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.hasApiKey).toBe(true);
    });
  });

  describe('GET /api/ai/usage', () => {
    it('should return usage data', async () => {
      const res = await request(app)
        .get('/api/ai/usage')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.usage).toBeDefined();
      expect(res.body.totals).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app).get('/api/ai/usage').expect(401);
    });
  });
});
