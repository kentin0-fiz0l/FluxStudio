/**
 * Authentication Middleware
 *
 * Provides middleware functions for:
 * - JWT access token verification
 * - Role-based access control
 * - Optional authentication
 *
 * Works with the new refresh token system.
 *
 * Part of: Week 1 Security Sprint - JWT Refresh Tokens
 * Date: 2025-10-14
 */

const tokenService = require('./tokenService');

/**
 * Authenticate Token Middleware
 *
 * Verifies JWT access token from Authorization header.
 * Attaches decoded user to req.user if valid.
 *
 * Usage:
 * router.get('/protected', authenticateToken, (req, res) => {
 *   res.json({ user: req.user });
 * });
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify access token
    const decoded = tokenService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is invalid or expired',
        code: 'INVALID_TOKEN'
      });
    }

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional Authentication Middleware
 *
 * Verifies JWT if present, but doesn't require it.
 * Useful for endpoints that work with or without authentication.
 *
 * Usage:
 * router.get('/public-or-private', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     // Authenticated user
 *   } else {
 *     // Anonymous user
 *   }
 * });
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = tokenService.verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue even if auth fails
  }
}

/**
 * Require User Type Middleware
 *
 * Ensures the authenticated user has one of the allowed user types.
 *
 * Usage:
 * router.post('/admin', authenticateToken, requireUserType(['admin']), (req, res) => {
 *   // Only admins can access
 * });
 *
 * @param {Array<string>} allowedTypes - Allowed user types
 * @returns {Function} Middleware function
 */
function requireUserType(allowedTypes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Required user types: ${allowedTypes.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}

/**
 * Require Admin Middleware
 *
 * Shorthand for requireUserType(['admin'])
 *
 * Usage:
 * router.post('/admin', authenticateToken, requireAdmin, (req, res) => {
 *   // Only admins
 * });
 */
const requireAdmin = requireUserType(['admin']);

/**
 * Require Client Middleware
 *
 * Shorthand for requireUserType(['client'])
 */
const requireClient = requireUserType(['client']);

/**
 * Require Freelancer Middleware
 *
 * Shorthand for requireUserType(['freelancer'])
 */
const requireFreelancer = requireUserType(['freelancer']);

/**
 * Require Client or Freelancer Middleware
 *
 * For endpoints accessible to both clients and freelancers
 */
const requireClientOrFreelancer = requireUserType(['client', 'freelancer']);

/**
 * Extract User ID Middleware
 *
 * Ensures req.user.id exists (for convenience)
 *
 * Usage:
 * router.get('/me', authenticateToken, extractUserId, (req, res) => {
 *   const userId = req.userId; // Guaranteed to exist
 * });
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function extractUserId(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token payload'
    });
  }

  req.userId = req.user.id;
  next();
}

/**
 * Rate Limit by User Middleware (Redis-backed)
 *
 * Redis-based rate limiter per user ID for production scalability.
 * Falls back to in-memory storage if Redis is unavailable.
 *
 * Usage:
 * router.post('/action', authenticateToken, rateLimitByUser(10, 60000), (req, res) => {
 *   // Max 10 requests per minute per user
 * });
 *
 * @param {number} maxRequests - Max requests in window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Middleware function
 */
function rateLimitByUser(maxRequests = 100, windowMs = 60000) {
  // Fallback in-memory storage
  const memoryStore = new Map();
  let redis = null;
  let useRedis = false;

  // Try to initialize Redis connection
  try {
    const cache = require('../cache');
    if (cache && cache.client) {
      redis = cache;
      useRedis = true;
    }
  } catch (_e) {
    console.warn('⚠️  Redis not available for rate limiting, using in-memory fallback');
  }

  // Clean up in-memory entries periodically (fallback only)
  const cleanupInterval = setInterval(() => {
    if (!useRedis) {
      const now = Date.now();
      for (const [userId, data] of memoryStore.entries()) {
        if (now - data.windowStart > windowMs) {
          memoryStore.delete(userId);
        }
      }
    }
  }, 60000);

  // Prevent memory leak by unreferencing the interval
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next(); // No rate limiting for unauthenticated requests
    }

    const userId = req.user.id;
    const windowSeconds = Math.ceil(windowMs / 1000);
    const key = `ratelimit:user:${userId}`;

    try {
      if (useRedis && redis) {
        // Redis-based rate limiting using sliding window
        const currentCount = await redis.get(key);
        const count = currentCount ? parseInt(currentCount, 10) : 0;

        if (count >= maxRequests) {
          const ttl = await redis.ttl(key);
          const retryAfter = ttl > 0 ? ttl : windowSeconds;

          return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            retryAfter
          });
        }

        // Increment counter
        if (count === 0) {
          await redis.set(key, '1', windowSeconds);
        } else {
          await redis.incr(key);
        }

        // Set rate limit headers
        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - count - 1).toString());

        return next();
      }

      // Fallback to in-memory rate limiting
      const now = Date.now();
      let userData = memoryStore.get(userId);

      if (!userData || now - userData.windowStart > windowMs) {
        // New window
        userData = {
          windowStart: now,
          requests: 1
        };
        memoryStore.set(userId, userData);

        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', (maxRequests - 1).toString());

        return next();
      }

      userData.requests++;

      if (userData.requests > maxRequests) {
        const retryAfter = Math.ceil((userData.windowStart + windowMs - now) / 1000);

        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter
        });
      }

      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - userData.requests).toString());

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request on error
      next();
    }
  };
}

/**
 * Validate User Owns Resource Middleware
 *
 * Factory function for checking if user owns a resource
 *
 * Usage:
 * router.get('/projects/:projectId', authenticateToken,
 *   validateOwnership('project', 'projectId'),
 *   (req, res) => {
 *     // User owns this project
 *   }
 * );
 *
 * @param {string} resourceType - Resource type (for error messages)
 * @param {string} paramName - URL parameter name containing resource ID
 * @param {Function} checkOwnership - Async function (userId, resourceId) => boolean
 * @returns {Function} Middleware function
 */
function validateOwnership(resourceType, paramName, checkOwnership) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({
          error: 'Bad request',
          message: `Missing ${paramName} parameter`
        });
      }

      const owns = await checkOwnership(req.user.id, resourceId);

      if (!owns) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `You don't have access to this ${resourceType}`,
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership validation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate ownership'
      });
    }
  };
}

/**
 * CORS with Credentials Middleware
 *
 * Allows credentials (cookies, auth headers) in CORS requests
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function corsWithCredentials(req, res, next) {
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'https://fluxstudio.art',
    'https://www.fluxstudio.art',
    'http://localhost:5173'
  ];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

// Export all middleware
module.exports = {
  authenticateToken,
  optionalAuth,
  requireUserType,
  requireAdmin,
  requireClient,
  requireFreelancer,
  requireClientOrFreelancer,
  extractUserId,
  rateLimitByUser,
  validateOwnership,
  corsWithCredentials
};
