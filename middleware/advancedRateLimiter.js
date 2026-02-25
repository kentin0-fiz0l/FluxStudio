/**
 * Advanced Rate Limiter with IP Reputation Integration
 * Sprint 13, Day 3: Token Cleanup & Enhanced Rate Limiting
 *
 * Features:
 * - Sliding window rate limiting (more accurate than fixed window)
 * - Per-endpoint configurable limits
 * - IP reputation-based dynamic limits
 * - Whitelist/blacklist support
 * - Rate limit headers (X-RateLimit-*)
 * - Graceful degradation on Redis failures
 *
 * Date: 2025-10-15
 */

const cache = require('../lib/cache');
const securityLogger = require('../lib/auth/securityLogger');

class AdvancedRateLimiter {
  constructor() {
    // Default rate limits per endpoint
    this.limits = {
      'POST /api/auth/login': { max: 5, window: 300, tier: 'auth' },        // 5 per 5 min
      'POST /api/auth/signup': { max: 3, window: 3600, tier: 'auth' },      // 3 per hour
      'POST /api/auth/refresh': { max: 10, window: 600, tier: 'auth' },     // 10 per 10 min
      'POST /api/files/upload': { max: 50, window: 3600, tier: 'upload' },  // 50 per hour
      'GET /api/files': { max: 200, window: 3600, tier: 'api' },            // 200 per hour
      'POST /api/teams': { max: 10, window: 3600, tier: 'api' },            // 10 per hour
      'default': { max: 100, window: 3600, tier: 'api' }                    // 100 per hour default
    };

    // Whitelist (never rate limited)
    this.whitelist = new Set([
      '127.0.0.1',
      '::1',
      'localhost'
    ]);

    // IP reputation integration
    this.ipReputationEnabled = true;
  }

  /**
   * Add IP to whitelist
   * @param {string} ipAddress
   */
  addToWhitelist(ipAddress) {
    this.whitelist.add(ipAddress);
    console.log(`✅ IP added to whitelist: ${ipAddress}`);
  }

  /**
   * Remove IP from whitelist
   * @param {string} ipAddress
   */
  removeFromWhitelist(ipAddress) {
    this.whitelist.delete(ipAddress);
    console.log(`✅ IP removed from whitelist: ${ipAddress}`);
  }

  /**
   * Check if IP is whitelisted
   * @param {string} ipAddress
   * @returns {boolean}
   */
  isWhitelisted(ipAddress) {
    return this.whitelist.has(ipAddress);
  }

  /**
   * Get rate limit configuration for endpoint
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @returns {Object} Limit configuration
   * @private
   */
  getLimitConfig(method, path) {
    const endpoint = `${method} ${path}`;
    return this.limits[endpoint] || this.limits['default'];
  }

  /**
   * Check rate limit using sliding window algorithm
   *
   * @param {string} key - Rate limit key (usually IP + endpoint)
   * @param {number} max - Maximum requests allowed
   * @param {number} window - Time window in seconds
   * @returns {Promise<Object>} Rate limit status
   */
  async checkLimit(key, max, window) {
    try {
      const now = Date.now();
      const windowMs = window * 1000;
      const windowStart = now - windowMs;

      // Sliding window key
      const cacheKey = `ratelimit:sliding:${key}`;

      // Get current request timestamps
      const requestsJson = await cache.get(cacheKey);
      let requests = requestsJson ? JSON.parse(requestsJson) : [];

      // Remove requests outside the window
      requests = requests.filter(timestamp => timestamp > windowStart);

      // Add current request
      requests.push(now);

      // Save updated requests with TTL
      await cache.set(cacheKey, JSON.stringify(requests), window + 10);

      const count = requests.length;
      const allowed = count <= max;
      const remaining = Math.max(0, max - count);

      // Calculate reset time (oldest request + window)
      const oldestRequest = requests[0] || now;
      const resetTime = oldestRequest + windowMs;

      return {
        allowed,
        current: count,
        limit: max,
        remaining,
        reset: resetTime,
        retryAfter: allowed ? 0 : Math.ceil((resetTime - now) / 1000)
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        current: 0,
        limit: max,
        remaining: max,
        reset: Date.now() + (window * 1000),
        retryAfter: 0,
        error: true
      };
    }
  }

  /**
   * Get IP reputation multiplier
   * @param {string} ipAddress
   * @returns {Promise<number>} Multiplier (0.5 = stricter, 2.0 = more relaxed)
   * @private
   */
  async getReputationMultiplier(ipAddress) {
    if (!this.ipReputationEnabled) {
      return 1.0;
    }

    try {
      // Try to load IP reputation module
      const ipReputation = require('../lib/security/ipReputation');
      return await ipReputation.getRateLimitMultiplier(ipAddress);
    } catch (error) {
      // IP reputation module not available yet
      return 1.0;
    }
  }

  /**
   * Express middleware for rate limiting
   *
   * @returns {Function} Express middleware
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

        // Skip rate limiting for whitelisted IPs
        if (this.isWhitelisted(ipAddress)) {
          return next();
        }

        // Get limit configuration for this endpoint
        const config = this.getLimitConfig(req.method, req.path);

        // Apply IP reputation multiplier
        const multiplier = await this.getReputationMultiplier(ipAddress);

        // If multiplier is 0, IP is banned
        if (multiplier === 0) {
          await securityLogger.logEvent(
            'rate_limit_banned_ip',
            securityLogger.SEVERITY.WARNING,
            {
              ipAddress,
              endpoint: `${req.method} ${req.path}`,
              reason: 'IP reputation score too low'
            }
          );

          return res.status(403).json({
            message: 'Access denied. Your IP address has been blocked due to suspicious activity.',
            code: 'IP_BANNED'
          });
        }

        // Adjust limit based on reputation
        const adjustedMax = Math.ceil(config.max * multiplier);

        // Check rate limit
        const key = `${ipAddress}:${req.method}:${req.path}`;
        const result = await this.checkLimit(key, adjustedMax, config.window);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString()
        });

        if (!result.allowed) {
          // Set Retry-After header
          res.set('Retry-After', result.retryAfter.toString());

          // Log rate limit exceeded
          await securityLogger.logEvent(
            'rate_limit_exceeded',
            securityLogger.SEVERITY.WARNING,
            {
              ipAddress,
              endpoint: `${req.method} ${req.path}`,
              limit: result.limit,
              current: result.current,
              retryAfter: result.retryAfter,
              userAgent: req.get('user-agent'),
              reputationMultiplier: multiplier
            }
          );

          return res.status(429).json({
            message: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfter,
            limit: result.limit,
            current: result.current,
            code: 'RATE_LIMIT_EXCEEDED'
          });
        }

        // Rate limit passed
        next();
      } catch (error) {
        console.error('Rate limiter middleware error:', error);
        // Fail open - allow request if error occurs
        next();
      }
    };
  }

  /**
   * Create endpoint-specific rate limiter
   *
   * @param {number} max - Maximum requests
   * @param {number} window - Window in seconds
   * @param {string} tier - Rate limit tier name
   * @returns {Function} Express middleware
   */
  createLimiter(max, window, tier = 'custom') {
    return async (req, res, next) => {
      try {
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

        // Skip whitelisted IPs
        if (this.isWhitelisted(ipAddress)) {
          return next();
        }

        // Apply IP reputation
        const multiplier = await this.getReputationMultiplier(ipAddress);

        if (multiplier === 0) {
          return res.status(403).json({
            message: 'Access denied.',
            code: 'IP_BANNED'
          });
        }

        const adjustedMax = Math.ceil(max * multiplier);
        const key = `${ipAddress}:${tier}:${req.path}`;
        const result = await this.checkLimit(key, adjustedMax, window);

        // Set headers
        res.set({
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(result.reset / 1000).toString()
        });

        if (!result.allowed) {
          res.set('Retry-After', result.retryAfter.toString());

          await securityLogger.logEvent(
            'custom_rate_limit_exceeded',
            securityLogger.SEVERITY.WARNING,
            {
              ipAddress,
              tier,
              endpoint: req.path,
              limit: result.limit,
              current: result.current
            }
          );

          return res.status(429).json({
            message: 'Too many requests.',
            retryAfter: result.retryAfter,
            code: 'RATE_LIMIT_EXCEEDED'
          });
        }

        next();
      } catch (error) {
        console.error('Custom rate limiter error:', error);
        next();
      }
    };
  }

  /**
   * Get rate limit status for IP
   *
   * @param {string} ipAddress
   * @param {string} endpoint
   * @returns {Promise<Object>} Current status
   */
  async getStatus(ipAddress, endpoint) {
    try {
      const [method, path] = endpoint.split(' ');
      const config = this.getLimitConfig(method, path);
      const key = `${ipAddress}:${method}:${path}`;

      const cacheKey = `ratelimit:sliding:${key}`;
      const requestsJson = await cache.get(cacheKey);
      const requests = requestsJson ? JSON.parse(requestsJson) : [];

      const now = Date.now();
      const windowMs = config.window * 1000;
      const windowStart = now - windowMs;

      const validRequests = requests.filter(timestamp => timestamp > windowStart);

      return {
        ipAddress,
        endpoint,
        current: validRequests.length,
        limit: config.max,
        remaining: Math.max(0, config.max - validRequests.length),
        window: config.window,
        isWhitelisted: this.isWhitelisted(ipAddress)
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Reset rate limit for IP
   *
   * @param {string} ipAddress
   * @param {string} endpoint
   */
  async resetLimit(ipAddress, endpoint) {
    try {
      const [method, path] = endpoint.split(' ');
      const key = `${ipAddress}:${method}:${path}`;
      const cacheKey = `ratelimit:sliding:${key}`;

      await cache.del(cacheKey);
      console.log(`✅ Rate limit reset for ${ipAddress} on ${endpoint}`);
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }
}

// Export singleton instance
module.exports = new AdvancedRateLimiter();
