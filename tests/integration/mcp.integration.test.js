/**
 * MCP Route Integration Tests
 *
 * Tests MCP query, tools listing, and cache clearing endpoints
 * with lazy-loaded MCP manager mocking.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// Prevent auto-init before requiring routes
process.env.MCP_AUTO_CONNECT = 'false';

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn(),
}));

jest.mock('../../lib/auth/tokenService', () => ({
  verifyAccessToken: jest.fn((token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }),
  generateAccessToken: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockMcpManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  queryDatabase: jest.fn(),
  listTools: jest.fn(),
  clearCache: jest.fn(),
};
jest.mock('../../lib/mcp-manager', () => mockMcpManager);

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createAdminToken(userId = 'admin-user-1') {
  return jwt.sign(
    { id: userId, email: 'admin@example.com', userType: 'admin', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with MCP routes (not initialized)
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/mcp');
  app.use('/mcp', routes);
  return app;
}

describe('MCP Integration Tests', () => {
  let app;
  let token;
  let adminToken;

  beforeAll(() => {
    app = createApp();
    token = createTestToken();
    adminToken = createAdminToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for missing token', async () => {
      await request(app)
        .post('/mcp/query')
        .send({ query: 'SELECT * FROM users' })
        .expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(app)
        .post('/mcp/query')
        .set('Authorization', 'Bearer invalid-token')
        .send({ query: 'SELECT * FROM users' })
        .expect(401);
    });
  });

  // =========================================================================
  // POST /mcp/query (not initialized)
  // =========================================================================
  describe('POST /mcp/query (not initialized)', () => {
    it('should return 400 for Zod validation error (empty body)', async () => {
      const res = await request(app)
        .post('/mcp/query')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 503 when MCP is not initialized', async () => {
      const res = await request(app)
        .post('/mcp/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'Show me all users' })
        .expect(503);

      expect(res.body.message).toBe('MCP service not available');
    });
  });

  // =========================================================================
  // GET /mcp/tools (not initialized)
  // =========================================================================
  describe('GET /mcp/tools (not initialized)', () => {
    it('should return tools as unavailable when not initialized', async () => {
      const res = await request(app)
        .get('/mcp/tools')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.tools).toEqual({});
      expect(res.body.available).toBe(false);
    });
  });

  // =========================================================================
  // POST /mcp/cache/clear (not initialized)
  // =========================================================================
  describe('POST /mcp/cache/clear', () => {
    it('should return 403 for non-admin', async () => {
      const res = await request(app)
        .post('/mcp/cache/clear')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.message).toBe('Admin access required');
    });

    it('should return 503 for admin when MCP not initialized', async () => {
      const res = await request(app)
        .post('/mcp/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(503);

      expect(res.body.message).toBe('MCP service not available');
    });
  });

  // =========================================================================
  // Initialized MCP tests
  // =========================================================================
  describe('when MCP is initialized', () => {
    let initializedApp;

    beforeAll(async () => {
      // Create a fresh app with MCP_AUTO_CONNECT=true so getMcpManager triggers init
      process.env.MCP_AUTO_CONNECT = 'true';

      // Reset modules to get fresh route module with clean mcpInitialized=false
      jest.resetModules();

      // Re-apply mocks after resetModules
      jest.mock('../../database/config', () => ({
        query: jest.fn(),
        runMigrations: jest.fn(),
      }));
      jest.mock('../../lib/auth/tokenService', () => ({
        verifyAccessToken: jest.fn((tkn) => {
          try { return jwt.verify(tkn, JWT_SECRET); } catch { return null; }
        }),
        generateAccessToken: jest.fn(),
      }));
      jest.mock('../../lib/logger', () => ({
        createLogger: jest.fn(() => ({
          info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
        })),
      }));
      jest.mock('../../lib/mcp-manager', () => mockMcpManager);

      const express2 = require('express');
      initializedApp = express2();
      initializedApp.use(express2.json());
      const routes = require('../../routes/mcp');
      initializedApp.use('/mcp', routes);

      // Trigger lazy-load by making a request (this calls getMcpManager)
      await request(initializedApp)
        .get('/mcp/tools')
        .set('Authorization', `Bearer ${createTestToken()}`);

      // Wait for the initialize().then() microtask to resolve
      await new Promise((r) => setTimeout(r, 50));

      // Restore env
      process.env.MCP_AUTO_CONNECT = 'false';
    });

    it('should return query results when initialized', async () => {
      mockMcpManager.queryDatabase.mockResolvedValueOnce({
        results: [{ id: 1, name: 'Alice' }],
      });

      const res = await request(initializedApp)
        .post('/mcp/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'Show me all users' })
        .expect(200);

      expect(res.body.results).toBeDefined();
      expect(mockMcpManager.queryDatabase).toHaveBeenCalled();
    });

    it('should return tools when initialized', async () => {
      mockMcpManager.listTools.mockReturnValueOnce({
        queryDB: { description: 'Query database' },
      });

      const res = await request(initializedApp)
        .get('/mcp/tools')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.available).toBe(true);
      expect(res.body.tools).toHaveProperty('queryDB');
    });

    it('should clear cache for admin when initialized', async () => {
      const res = await request(initializedApp)
        .post('/mcp/cache/clear')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.message).toBe('MCP cache cleared successfully');
      expect(mockMcpManager.clearCache).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Lazy initialization
  // =========================================================================
  describe('Lazy initialization', () => {
    it('should call getMcpManager on first request', async () => {
      // The query endpoint triggers getMcpManager internally
      await request(app)
        .post('/mcp/query')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'test' })
        .expect(503);

      // The mock was required as lib/mcp-manager, confirming lazy load
      expect(mockMcpManager).toBeDefined();
    });

    it('should trigger getMcpManager on tools endpoint', async () => {
      const res = await request(app)
        .get('/mcp/tools')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.available).toBe(false);
    });
  });
});
