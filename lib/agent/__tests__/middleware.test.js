/**
 * Agent Middleware Unit Tests
 * @file lib/agent/__tests__/middleware.test.js
 *
 * Tests all middleware functions with mocked Express req/res/next.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock functions BEFORE vi.mock calls
const mockQuery = vi.fn();
const mockLogAction = vi.fn();
const mockGetSession = vi.fn();

// Mock database config
vi.mock('../../../database/config', () => ({
  query: mockQuery,
}));

// Mock agent service with explicit mock functions
vi.mock('../../../services/agent-service', () => ({
  logAction: mockLogAction,
  getSession: mockGetSession,
}));

// Import the middleware (mocks are already in place via vi.mock hoisting)
import {
  agentPermissions,
  auditLog,
  sanitizeForLog,
  agentRateLimit,
  validateSession,
  getUserPermissions,
  DEFAULT_PERMISSIONS,
  PERMISSION_SCOPES,
} from '../middleware.js';

// Use aliases for cleaner test code
const query = mockQuery;
const agentService = {
  logAction: mockLogAction,
  getSession: mockGetSession,
};

// Helper to create mock Express request
function createMockReq(overrides = {}) {
  return {
    user: { id: 'user-1' },
    body: {},
    query: {},
    params: {},
    ...overrides,
  };
}

// Helper to create mock Express response
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    _body: null,
    status: jest.fn(function(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function(body) {
      this._body = body;
      return this;
    }),
    send: jest.fn(function(body) {
      this._body = body;
      return this;
    }),
    set: jest.fn(function(key, value) {
      this.headers[key] = value;
      return this;
    }),
  };
  return res;
}

describe('Agent Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // getUserPermissions
  // ============================================================================

  describe('getUserPermissions', () => {
    it('should return user permissions from database', async () => {
      query.mockResolvedValue({
        rows: [{
          permissions: ['read:projects', 'read:assets', 'write:projects'],
          auto_approve: ['create_project'],
          max_daily_requests: 200,
          requests_today: 15,
          last_reset_date: new Date().toISOString().split('T')[0],
        }],
      });

      const result = await getUserPermissions('user-1');

      expect(result.permissions).toContain('write:projects');
      expect(result.maxDailyRequests).toBe(200);
      expect(result.requestsToday).toBe(15);
    });

    it('should create default permissions for new user', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })  // First call - no existing permissions
        .mockResolvedValueOnce({});            // Second call - insert

      const result = await getUserPermissions('new-user');

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO agent_permissions'),
        expect.arrayContaining(['new-user', DEFAULT_PERMISSIONS])
      );
      expect(result.permissions).toEqual(DEFAULT_PERMISSIONS);
      expect(result.maxDailyRequests).toBe(100);
    });

    it('should reset daily count when day changes', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      query
        .mockResolvedValueOnce({
          rows: [{
            permissions: DEFAULT_PERMISSIONS,
            auto_approve: [],
            max_daily_requests: 100,
            requests_today: 50,
            last_reset_date: yesterday.toISOString().split('T')[0],
          }],
        })
        .mockResolvedValueOnce({}); // Reset query

      const result = await getUserPermissions('user-1');

      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('SET requests_today = 0'),
        ['user-1']
      );
      expect(result.requestsToday).toBe(0);
    });

    it('should return defaults on database error', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const result = await getUserPermissions('user-1');

      expect(result.permissions).toEqual(DEFAULT_PERMISSIONS);
      expect(result.maxDailyRequests).toBe(100);
    });
  });

  // ============================================================================
  // agentPermissions
  // ============================================================================

  describe('agentPermissions', () => {
    it('should allow request with valid permission', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{
            permissions: ['read:projects'],
            max_daily_requests: 100,
            requests_today: 5,
            last_reset_date: new Date().toISOString().split('T')[0],
          }],
        })
        .mockResolvedValueOnce({}); // incrementRequestCount

      const middleware = agentPermissions('read:projects');
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.agentPermissions).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      const middleware = agentPermissions('read:projects');
      const req = createMockReq({ user: null });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unauthorized' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without required permission', async () => {
      query.mockResolvedValue({
        rows: [{
          permissions: ['read:projects'],
          max_daily_requests: 100,
          requests_today: 5,
          last_reset_date: new Date().toISOString().split('T')[0],
        }],
      });

      const middleware = agentPermissions('write:projects');
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
          requiredScope: 'write:projects',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin:all to access any scope', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{
            permissions: ['admin:all'],
            max_daily_requests: 1000,
            requests_today: 0,
            last_reset_date: new Date().toISOString().split('T')[0],
          }],
        })
        .mockResolvedValueOnce({});

      const middleware = agentPermissions('write:projects');
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should enforce daily limit', async () => {
      query.mockResolvedValue({
        rows: [{
          permissions: ['read:projects'],
          max_daily_requests: 100,
          requests_today: 100, // At limit
          last_reset_date: new Date().toISOString().split('T')[0],
        }],
      });

      const middleware = agentPermissions('read:projects');
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded',
          limit: 100,
        })
      );
    });

    it('should handle database errors gracefully (fail-open with defaults)', async () => {
      // Note: getUserPermissions catches errors and returns defaults (fail-open)
      query.mockRejectedValue(new Error('Database error'));

      const middleware = agentPermissions('read:projects');
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      // Middleware fails open - user gets default permissions and can proceed
      expect(next).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // auditLog
  // ============================================================================

  describe('auditLog', () => {
    it('should log successful actions', async () => {
      const middleware = auditLog('search_projects');
      const req = createMockReq({ body: { query: 'test' } });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Trigger response send
      res.statusCode = 200;
      res.send(JSON.stringify({ success: true }));

      // Wait for setImmediate
      await new Promise(resolve => setImmediate(resolve));

      expect(agentService.logAction).toHaveBeenCalledWith(
        null, // sessionId
        'user-1',
        'search_projects',
        'search_projects',
        expect.any(Object),
        expect.any(Object),
        expect.any(Number),
        'success',
        null
      );
    });

    it('should log error status', async () => {
      const middleware = auditLog('search_projects');
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      // Trigger error response
      res.statusCode = 500;
      res.send(JSON.stringify({ error: 'Server error' }));

      await new Promise(resolve => setImmediate(resolve));

      expect(agentService.logAction).toHaveBeenCalledWith(
        null, // sessionId - not provided
        'user-1',
        'search_projects',
        'search_projects',
        expect.any(Object),
        expect.any(Object),
        expect.any(Number),
        'error',
        'Server error' // errorMessage from output.error
      );
    });

    it('should extract sessionId from body or query', async () => {
      const middleware = auditLog('chat');
      const req = createMockReq({ body: { sessionId: 'session-123' } });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);
      res.send('{}');

      await new Promise(resolve => setImmediate(resolve));

      expect(agentService.logAction).toHaveBeenCalledWith(
        'session-123',
        'user-1',
        'chat',
        'chat',
        expect.objectContaining({ sessionId: 'session-123' }),
        expect.any(Object),
        expect.any(Number),
        'success',
        null // no error
      );
    });
  });

  // ============================================================================
  // sanitizeForLog
  // ============================================================================

  describe('sanitizeForLog', () => {
    it('should redact sensitive fields', () => {
      const input = {
        username: 'john',
        password: 'secret123',
        token: 'jwt-token',
        apiKey: 'api-key-123',
        secret: 'my-secret',
      };

      const result = sanitizeForLog(input);

      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.secret).toBe('[REDACTED]');
    });

    it('should truncate long content fields', () => {
      const longContent = 'a'.repeat(1000);
      const input = {
        content: longContent,
        response: longContent,
      };

      const result = sanitizeForLog(input);

      expect(result.content.length).toBeLessThan(600);
      expect(result.content).toContain('[truncated]');
      expect(result.response).toContain('[truncated]');
    });

    it('should handle null and non-object inputs', () => {
      expect(sanitizeForLog(null)).toBeNull();
      expect(sanitizeForLog('string')).toBe('string');
      expect(sanitizeForLog(123)).toBe(123);
    });

    it('should not modify fields under limit', () => {
      const input = {
        content: 'Short content',
        data: { nested: 'value' },
      };

      const result = sanitizeForLog(input);

      expect(result.content).toBe('Short content');
    });
  });

  // ============================================================================
  // agentRateLimit
  // ============================================================================

  describe('agentRateLimit', () => {
    it('should allow requests under limit', async () => {
      const middleware = agentRateLimit(10, 60000);
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.headers['X-Agent-RateLimit-Limit']).toBe('10');
      expect(res.headers['X-Agent-RateLimit-Remaining']).toBe('9');
    });

    it('should block requests over limit', async () => {
      const middleware = agentRateLimit(2, 60000);
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      // Make 3 requests to exceed limit of 2
      await middleware(req, res, next);
      await middleware(req, res, next);

      next.mockClear();
      res.status.mockClear();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many requests',
          retryAfter: expect.any(Number),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reset after window expires', async () => {
      jest.useFakeTimers();

      const middleware = agentRateLimit(1, 1000); // 1 request per second
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      next.mockClear();

      // Advance time past window
      jest.advanceTimersByTime(1500);

      await middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should skip rate limiting for unauthenticated requests', async () => {
      const middleware = agentRateLimit(10, 60000);
      const req = createMockReq({ user: null });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should track separate limits per user', async () => {
      const middleware = agentRateLimit(1, 60000);

      const req1 = createMockReq({ user: { id: 'user-1' } });
      const res1 = createMockRes();
      const next1 = jest.fn();

      const req2 = createMockReq({ user: { id: 'user-2' } });
      const res2 = createMockRes();
      const next2 = jest.fn();

      // Both users should get their first request through
      await middleware(req1, res1, next1);
      await middleware(req2, res2, next2);

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // validateSession
  // ============================================================================

  describe('validateSession', () => {
    it('should pass through when session is valid', async () => {
      agentService.getSession.mockResolvedValue({
        id: 'session-1',
        user_id: 'user-1',
      });

      const middleware = validateSession();
      const req = createMockReq({ body: { sessionId: 'session-1' } });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.agentSession).toBeDefined();
    });

    it('should pass through when no sessionId provided', async () => {
      const middleware = validateSession();
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.agentSession).toBeUndefined();
    });

    it('should reject invalid session', async () => {
      agentService.getSession.mockResolvedValue(null);

      const middleware = validateSession();
      const req = createMockReq({ body: { sessionId: 'invalid' } });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Not found' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', async () => {
      const middleware = validateSession();
      const req = createMockReq({ user: null });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should get sessionId from query if not in body', async () => {
      agentService.getSession.mockResolvedValue({
        id: 'session-from-query',
        user_id: 'user-1',
      });

      const middleware = validateSession();
      const req = createMockReq({ query: { sessionId: 'session-from-query' } });
      const res = createMockRes();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(agentService.getSession).toHaveBeenCalledWith('session-from-query', 'user-1');
    });
  });

  // ============================================================================
  // Constants
  // ============================================================================

  describe('Constants', () => {
    it('should export DEFAULT_PERMISSIONS', () => {
      expect(DEFAULT_PERMISSIONS).toEqual(['read:projects', 'read:assets', 'read:activity']);
    });

    it('should export PERMISSION_SCOPES', () => {
      expect(PERMISSION_SCOPES).toHaveProperty('read:projects');
      expect(PERMISSION_SCOPES).toHaveProperty('write:projects');
      expect(PERMISSION_SCOPES).toHaveProperty('admin:all');
    });
  });
});
