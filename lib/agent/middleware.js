/**
 * Agent Middleware - Permission and Audit Logging
 *
 * Provides middleware for:
 * - Agent permission checking
 * - Audit logging of agent actions
 * - Rate limiting for agent endpoints
 * - Input/output sanitization
 *
 * Date: 2026-02-06
 */

const { query } = require('../../database/config');
const agentService = require('../../services/agent-service');

// Default permissions for new users
const DEFAULT_PERMISSIONS = ['read:projects', 'read:assets', 'read:activity'];

// Permission scopes and their descriptions
const PERMISSION_SCOPES = {
  'read:projects': 'View projects and their details',
  'read:assets': 'View assets and files',
  'read:activity': 'View activity feed and notifications',
  'read:messages': 'View messages in conversations',
  'write:projects': 'Create and modify projects',
  'write:assets': 'Upload and modify assets',
  'write:messages': 'Send messages',
  'admin:all': 'Full administrative access',
};

/**
 * Get user's agent permissions from database
 */
async function getUserPermissions(userId) {
  try {
    const result = await query(`
      SELECT permissions, auto_approve, max_daily_requests, requests_today, last_reset_date
      FROM agent_permissions
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      // Create default permissions for new user
      await query(`
        INSERT INTO agent_permissions (user_id, permissions, auto_approve, max_daily_requests, requests_today, last_reset_date, updated_at)
        VALUES ($1, $2, ARRAY[]::TEXT[], 100, 0, CURRENT_DATE, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [userId, DEFAULT_PERMISSIONS]);

      return {
        permissions: DEFAULT_PERMISSIONS,
        autoApprove: [],
        maxDailyRequests: 100,
        requestsToday: 0,
      };
    }

    const row = result.rows[0];

    // Reset daily count if needed
    const today = new Date().toISOString().split('T')[0];
    if (row.last_reset_date !== today) {
      await query(`
        UPDATE agent_permissions
        SET requests_today = 0, last_reset_date = CURRENT_DATE
        WHERE user_id = $1
      `, [userId]);
      row.requests_today = 0;
    }

    return {
      permissions: row.permissions || DEFAULT_PERMISSIONS,
      autoApprove: row.auto_approve || [],
      maxDailyRequests: row.max_daily_requests || 100,
      requestsToday: row.requests_today || 0,
    };
  } catch (error) {
    console.error('[AgentMiddleware] getUserPermissions error:', error);
    return {
      permissions: DEFAULT_PERMISSIONS,
      autoApprove: [],
      maxDailyRequests: 100,
      requestsToday: 0,
    };
  }
}

/**
 * Increment user's daily request count
 */
async function incrementRequestCount(userId) {
  try {
    await query(`
      UPDATE agent_permissions
      SET requests_today = requests_today + 1, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);
  } catch (error) {
    console.error('[AgentMiddleware] incrementRequestCount error:', error);
  }
}

/**
 * Agent Permission Middleware
 *
 * Checks if user has required permission scope for the agent action.
 *
 * Usage:
 * router.get('/projects', authenticateToken, agentPermissions('read:projects'), handler);
 *
 * @param {string} requiredScope - Required permission scope
 * @returns {Function} Express middleware
 */
function agentPermissions(requiredScope) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required for agent access',
        });
      }

      const userId = req.user.id;
      const userPermissions = await getUserPermissions(userId);

      // Check daily limit
      if (userPermissions.requestsToday >= userPermissions.maxDailyRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Daily agent request limit reached. Try again tomorrow.',
          limit: userPermissions.maxDailyRequests,
        });
      }

      // Check permission
      const hasPermission = userPermissions.permissions.includes(requiredScope)
        || userPermissions.permissions.includes('admin:all');

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Agent permission denied. Required: ${requiredScope}`,
          requiredScope,
        });
      }

      // Attach permissions to request for downstream use
      req.agentPermissions = userPermissions;

      // Increment request count
      await incrementRequestCount(userId);

      next();
    } catch (error) {
      console.error('[AgentMiddleware] agentPermissions error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check agent permissions',
      });
    }
  };
}

/**
 * Agent Audit Logging Middleware
 *
 * Logs agent actions to the audit table.
 *
 * Usage:
 * router.get('/action', authenticateToken, auditLog('search_projects'), handler);
 *
 * @param {string} skill - The skill/action being performed
 * @returns {Function} Express middleware
 */
function auditLog(skill) {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Capture original send function
    const originalSend = res.send;

    // Override send to log the response
    res.send = function(body) {
      const latencyMs = Date.now() - startTime;
      const status = res.statusCode < 400 ? 'success' : 'error';

      // Log asynchronously (don't block response)
      setImmediate(async () => {
        try {
          const userId = req.user?.id;
          const sessionId = req.body?.sessionId || req.query?.sessionId || null;

          // Sanitize input/output for logging
          const sanitizedInput = sanitizeForLog(req.body || req.query);
          const sanitizedOutput = sanitizeForLog(typeof body === 'string' ? JSON.parse(body) : body);

          await agentService.logAction(
            sessionId,
            userId,
            skill,
            skill,
            sanitizedInput,
            sanitizedOutput,
            latencyMs,
            status,
            status === 'error' ? sanitizedOutput.error : null
          );
        } catch (error) {
          console.error('[AgentMiddleware] auditLog error:', error);
        }
      });

      // Call original send
      return originalSend.call(this, body);
    };

    next();
  };
}

/**
 * Sanitize data for logging (remove sensitive fields)
 */
function sanitizeForLog(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Truncate large content fields
  if (sanitized.content && typeof sanitized.content === 'string' && sanitized.content.length > 500) {
    sanitized.content = sanitized.content.substring(0, 500) + '... [truncated]';
  }

  if (sanitized.response && typeof sanitized.response === 'string' && sanitized.response.length > 500) {
    sanitized.response = sanitized.response.substring(0, 500) + '... [truncated]';
  }

  return sanitized;
}

/**
 * Agent Rate Limiter Middleware
 *
 * Rate limits agent requests per user using Redis or in-memory fallback.
 *
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
function agentRateLimit(maxRequests = 30, windowMs = 60000) {
  const memoryStore = new Map();

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const key = `agent:ratelimit:${userId}`;

      let userData = memoryStore.get(key);

      if (!userData || now - userData.windowStart > windowMs) {
        userData = { windowStart: now, count: 0 };
      }

      userData.count++;
      memoryStore.set(key, userData);

      if (userData.count > maxRequests) {
        const retryAfter = Math.ceil((userData.windowStart + windowMs - now) / 1000);
        return res.status(429).json({
          error: 'Too many requests',
          message: `Agent rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        });
      }

      res.set('X-Agent-RateLimit-Limit', maxRequests.toString());
      res.set('X-Agent-RateLimit-Remaining', Math.max(0, maxRequests - userData.count).toString());

      next();
    } catch (error) {
      console.error('[AgentMiddleware] agentRateLimit error:', error);
      next(); // Fail open
    }
  };
}

/**
 * Validate Agent Session Middleware
 *
 * Ensures a valid session exists or creates one.
 */
function validateSession() {
  return async (req, res, next) => {
    try {
      const sessionId = req.body?.sessionId || req.query?.sessionId;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      if (sessionId) {
        const session = await agentService.getSession(sessionId, userId);
        if (!session) {
          return res.status(404).json({
            error: 'Not found',
            message: 'Agent session not found or access denied',
          });
        }
        req.agentSession = session;
      }

      next();
    } catch (error) {
      console.error('[AgentMiddleware] validateSession error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate session',
      });
    }
  };
}

module.exports = {
  agentPermissions,
  auditLog,
  sanitizeForLog,
  agentRateLimit,
  validateSession,
  getUserPermissions,
  PERMISSION_SCOPES,
  DEFAULT_PERMISSIONS,
};
