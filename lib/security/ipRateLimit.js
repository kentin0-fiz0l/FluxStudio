/**
 * IP-Based Rate Limiter
 *
 * Sprint 43: Phase 6.1 — Abuse Prevention
 *
 * Redis-backed rate limiter keyed by client IP address.
 * Protects against credential stuffing, distributed abuse, and
 * brute-force attacks on unauthenticated endpoints.
 *
 * Falls back to in-memory Map if Redis is unavailable.
 *
 * Usage:
 *   // Global: 100 requests per minute per IP
 *   app.use(ipRateLimit());
 *
 *   // Strict: 5 login attempts per 15 minutes per IP
 *   router.post('/login', ipRateLimit(5, 15 * 60 * 1000), handler);
 */

let redis = null;
let useRedis = false;

try {
  const cache = require('../cache');
  if (cache && cache.client) {
    redis = cache;
    useRedis = true;
  }
} catch (_e) {
  // Redis not available — use in-memory fallback
}

/**
 * Create an IP-based rate limiter middleware.
 *
 * @param {number} maxRequests - Max requests in window (default: 100)
 * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 min)
 * @param {string} [prefix] - Redis key prefix for grouping (default: 'ip')
 * @returns {Function} Express middleware
 */
function ipRateLimit(maxRequests = 100, windowMs = 60000, prefix = 'ip') {
  const memoryStore = new Map();

  // Periodic cleanup for in-memory fallback
  const cleanupInterval = setInterval(() => {
    if (!useRedis) {
      const now = Date.now();
      for (const [key, data] of memoryStore.entries()) {
        if (now - data.windowStart > windowMs) {
          memoryStore.delete(key);
        }
      }
    }
  }, 60000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return async (req, res, next) => {
    // Skip rate limiting in development (all traffic shares localhost IP)
    if (process.env.NODE_ENV === 'development') return next();

    // Extract client IP — trust X-Forwarded-For behind reverse proxy
    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    const windowSeconds = Math.ceil(windowMs / 1000);
    const key = `ratelimit:${prefix}:${ip}`;

    try {
      if (useRedis && redis) {
        const currentCount = await redis.get(key);
        const count = currentCount ? parseInt(currentCount, 10) : 0;

        if (count >= maxRequests) {
          const ttl = await redis.ttl(key);
          const retryAfter = ttl > 0 ? ttl : windowSeconds;

          res.set('Retry-After', retryAfter.toString());
          res.set('X-RateLimit-Limit', maxRequests.toString());
          res.set('X-RateLimit-Remaining', '0');
          res.set('X-RateLimit-Reset', new Date(Date.now() + retryAfter * 1000).toISOString());

          return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            retryAfter,
          });
        }

        if (count === 0) {
          await redis.set(key, '1', windowSeconds);
        } else {
          await redis.incr(key);
        }

        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - count - 1).toString());

        return next();
      }

      // In-memory fallback
      const now = Date.now();
      let entry = memoryStore.get(key);

      if (!entry || now - entry.windowStart > windowMs) {
        entry = { windowStart: now, requests: 1 };
        memoryStore.set(key, entry);

        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', (maxRequests - 1).toString());

        return next();
      }

      entry.requests++;

      if (entry.requests > maxRequests) {
        const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);

        res.set('Retry-After', retryAfter.toString());
        res.set('X-RateLimit-Limit', maxRequests.toString());
        res.set('X-RateLimit-Remaining', '0');

        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        });
      }

      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.requests).toString());

      return next();
    } catch (err) {
      // On rate-limit error, allow request through (fail-open)
      console.error('IP rate limit error:', err.message);
      return next();
    }
  };
}

// Pre-configured limiters for common endpoints
const ipRateLimiters = {
  /** Global: 100 req/min per IP */
  global: () => ipRateLimit(100, 60 * 1000, 'global'),

  /** Login: 5 attempts per 15 min per IP */
  login: () => ipRateLimit(5, 15 * 60 * 1000, 'login'),

  /** Signup: 3 per hour per IP */
  signup: () => ipRateLimit(3, 60 * 60 * 1000, 'signup'),

  /** Password reset: 3 per hour per IP */
  passwordReset: () => ipRateLimit(3, 60 * 60 * 1000, 'pwreset'),
};

module.exports = { ipRateLimit, ipRateLimiters };
