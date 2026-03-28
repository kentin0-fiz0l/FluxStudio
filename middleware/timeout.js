/**
 * Request Timeout Middleware for FluxStudio
 *
 * Applies configurable timeouts per route pattern.  When a request exceeds
 * its allotted time a clean 504 Gateway Timeout JSON response is sent.
 *
 * Default timeouts:
 *   - Health endpoints:  5 s
 *   - Upload routes:    60 s
 *   - AI routes:       120 s
 *   - Everything else:  30 s
 */

const { createLogger } = require('../lib/logger');
const log = createLogger('TimeoutMiddleware');

/**
 * Route-specific timeout rules (checked in order, first match wins).
 * @type {Array<{ pattern: RegExp, timeout: number }>}
 */
const TIMEOUT_RULES = [
  { pattern: /^\/(?:api\/)?health/,                   timeout: 5000 },
  { pattern: /^\/(?:api\/)?(?:uploads|files|media|assets)/, timeout: 60000 },
  { pattern: /^\/(?:api\/)?ai/,                        timeout: 120000 },
];

const DEFAULT_TIMEOUT = 30000;

/**
 * Resolve the timeout for a given request path.
 * @param {string} path
 * @returns {number} timeout in milliseconds
 */
function resolveTimeout(path) {
  for (const rule of TIMEOUT_RULES) {
    if (rule.pattern.test(path)) {
      return rule.timeout;
    }
  }
  return DEFAULT_TIMEOUT;
}

/**
 * Timeout middleware factory.
 * @param {Object} [options]
 * @param {number} [options.defaultTimeout=30000] - Fallback timeout in ms
 * @returns {Function} Express middleware
 */
function timeout(options = {}) {
  const { defaultTimeout = DEFAULT_TIMEOUT } = options;

  return (req, res, next) => {
    const ms = resolveTimeout(req.path) || defaultTimeout;

    const timer = setTimeout(() => {
      if (res.headersSent) return;

      log.warn('Request timeout', {
        method: req.method,
        path: req.path,
        timeout: ms,
        traceId: req.traceId,
      });

      res.status(504).json({
        success: false,
        error: 'Gateway Timeout',
        code: 'GATEWAY_TIMEOUT',
        message: `Request exceeded the ${ms / 1000}s time limit`,
      });
    }, ms);

    // Clear the timer when the response finishes (success or early close)
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = timeout;
