/**
 * Admin Authentication Middleware
 * Sprint 13, Day 5: Security Dashboard & Admin Endpoints
 *
 * Features:
 * - JWT verification
 * - Admin role checking
 * - Strict rate limiting (10 req/min)
 * - Admin action logging
 * - Support for multiple admin roles (admin, moderator, analyst)
 *
 * Date: 2025-10-17
 */

const jwt = require('jsonwebtoken');
const securityLogger = require('../lib/auth/securityLogger');
const cache = require('../lib/cache');
const { createLogger } = require('../lib/logger');
const log = createLogger('AdminAuth');

/**
 * Admin roles and their permissions
 */
const ADMIN_ROLES = {
  admin: {
    level: 3,
    description: 'Full access to all admin endpoints'
  },
  moderator: {
    level: 2,
    description: 'Read-only access to security data, can unblock IPs'
  },
  analyst: {
    level: 1,
    description: 'Access to metrics and analytics only'
  }
};

/**
 * Endpoint permission requirements
 */
const ENDPOINT_PERMISSIONS = {
  // Read-only endpoints - analysts can access
  'GET /api/admin/performance': 1,
  'GET /api/admin/tokens/stats': 1,
  'GET /api/admin/security/events': 1,
  'GET /api/admin/security/ip-reputation': 1,
  'GET /api/admin/health': 1,

  // Moderator endpoints - can unblock/whitelist
  'POST /api/admin/security/blocked-ips/*/unblock': 2,
  'POST /api/admin/security/blocked-ips/*/whitelist': 2,
  'POST /api/admin/security/ip-reputation/*/adjust': 2,

  // Admin-only endpoints - full control
  'POST /api/admin/security/blocked-ips/*/block': 3,
  'POST /api/admin/tokens/*/revoke': 3,
  'POST /api/admin/maintenance/cleanup': 3,
  'DELETE': 3  // All DELETE operations require admin
};

/**
 * Check if user has permission for endpoint
 *
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {number} userLevel - User's role level
 * @returns {boolean} - Whether user has permission
 */
function hasPermission(method, path, userLevel) {
  // Construct endpoint key
  const endpointKey = `${method} ${path}`;

  // Check exact match
  if (ENDPOINT_PERMISSIONS[endpointKey] !== undefined) {
    return userLevel >= ENDPOINT_PERMISSIONS[endpointKey];
  }

  // Check wildcard match
  const wildcardKey = Object.keys(ENDPOINT_PERMISSIONS).find(key => {
    if (!key.includes('*')) return false;
    const regex = new RegExp('^' + key.replace(/\*/g, '[^/]+') + '$');
    return regex.test(endpointKey);
  });

  if (wildcardKey) {
    return userLevel >= ENDPOINT_PERMISSIONS[wildcardKey];
  }

  // Check method-based permissions (e.g., all DELETE requires admin)
  if (ENDPOINT_PERMISSIONS[method] !== undefined) {
    return userLevel >= ENDPOINT_PERMISSIONS[method];
  }

  // Default: require moderator level for unknown endpoints
  return userLevel >= 2;
}

/**
 * Check rate limit for admin actions
 *
 * @param {string} userId - User ID
 * @param {string} path - Request path
 * @returns {Promise<Object>} - Rate limit result
 */
async function checkAdminRateLimit(userId, path) {
  const key = `admin_ratelimit:${userId}`;
  const now = Date.now();
  const window = 60 * 1000; // 1 minute
  const maxRequests = 10;

  try {
    // Get request timestamps
    const requestsJson = await cache.get(key);
    let requests = requestsJson ? JSON.parse(requestsJson) : [];

    // Remove requests outside window
    requests = requests.filter(timestamp => timestamp > now - window);

    // Check if limit exceeded
    if (requests.length >= maxRequests) {
      const oldestRequest = Math.min(...requests);
      const retryAfter = Math.ceil((oldestRequest + window - now) / 1000);

      return {
        allowed: false,
        current: requests.length,
        limit: maxRequests,
        retryAfter
      };
    }

    // Add current request
    requests.push(now);
    await cache.set(key, JSON.stringify(requests), 70); // 70 seconds TTL

    return {
      allowed: true,
      current: requests.length,
      limit: maxRequests,
      remaining: maxRequests - requests.length
    };
  } catch (error) {
    log.error('Admin rate limit check error', error);
    // On error, allow request (fail open for admin actions)
    return { allowed: true, current: 0, limit: maxRequests };
  }
}

/**
 * Admin authentication middleware
 *
 * Verifies JWT token, checks admin role, applies rate limiting,
 * and logs all admin actions.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminAuth = async (req, res, next) => {
  try {
    // Extract JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT
    let decoded;
    try {
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, message: 'Server misconfiguration: JWT_SECRET not set' });
      }
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check admin role
    const userRole = decoded.role || 'user';
    const roleConfig = ADMIN_ROLES[userRole];

    if (!roleConfig) {
      // Log unauthorized access attempt
      await securityLogger.logEvent('unauthorized_admin_access', 'HIGH', {
        userId: decoded.id,
        email: decoded.email,
        role: userRole,
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Check endpoint-specific permissions
    const hasAccess = hasPermission(req.method, req.path, roleConfig.level);

    if (!hasAccess) {
      await securityLogger.logEvent('insufficient_admin_permissions', 'MEDIUM', {
        userId: decoded.id,
        email: decoded.email,
        role: userRole,
        roleLevel: roleConfig.level,
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRole: 'admin'
      });
    }

    // Apply strict rate limiting
    const rateLimit = await checkAdminRateLimit(decoded.id, req.path);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit.limit,
      'X-RateLimit-Remaining': rateLimit.remaining || 0,
      'X-RateLimit-Window': '60'
    });

    if (!rateLimit.allowed) {
      res.set('Retry-After', rateLimit.retryAfter);

      await securityLogger.logEvent('admin_rate_limit_exceeded', 'MEDIUM', {
        userId: decoded.id,
        email: decoded.email,
        role: userRole,
        endpoint: req.path,
        method: req.method,
        requestCount: rateLimit.current,
        limit: rateLimit.limit
      });

      return res.status(429).json({
        success: false,
        message: 'Too many admin requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimit.retryAfter
      });
    }

    // Log admin action (INFO level for read operations, MEDIUM for write)
    const severity = req.method === 'GET' ? 'INFO' : 'MEDIUM';
    await securityLogger.logEvent('admin_action', severity, {
      userId: decoded.id,
      email: decoded.email,
      role: userRole,
      roleLevel: roleConfig.level,
      action: `${req.method} ${req.path}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: userRole,
      roleLevel: roleConfig.level
    };

    next();
  } catch (error) {
    log.error('Admin auth middleware error', error);

    // Log the error
    try {
      await securityLogger.logEvent('admin_auth_error', 'HIGH', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ipAddress: req.ip
      });
    } catch (logError) {
      log.error('Failed to log admin auth error', logError);
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Create admin user helper
 * (For initial setup - should be run once via CLI or migration)
 *
 * @param {string} email - Admin email
 * @param {string} role - Admin role (admin, moderator, analyst)
 * @returns {Promise<string>} - JWT token
 */
async function createAdminToken(email, role = 'admin') {
  if (!ADMIN_ROLES[role]) {
    throw new Error(`Invalid admin role: ${role}`);
  }

  const token = jwt.sign(
    {
      id: `admin_${Date.now()}`,
      email,
      role,
      userType: 'admin',
      type: 'access'  // Required by tokenService.verifyAccessToken()
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Admin tokens last 7 days
  );

  log.info('Admin token created', { email, role, tokenLength: token.length });

  return token;
}

module.exports = adminAuth;
module.exports.createAdminToken = createAdminToken;
module.exports.ADMIN_ROLES = ADMIN_ROLES;
