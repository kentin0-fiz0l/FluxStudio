/**
 * CSRF Protection Middleware
 * Implements Double-Submit Cookie pattern for CSRF protection
 *
 * Security Note: The deprecated 'csurf' package is no longer maintained.
 * This implementation uses the modern double-submit cookie pattern with:
 * - HttpOnly cookies for token storage
 * - SameSite=Strict cookie policy
 * - Secure flag in production
 * - Constant-time token comparison
 */

const crypto = require('crypto');
const { config } = require('../config/environment');

// CSRF token length (32 bytes = 64 hex characters)
const TOKEN_LENGTH = 32;

// Cookie name for CSRF token
const CSRF_COOKIE_NAME = '_csrf';

// Header name for CSRF token
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} Hex-encoded token
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Constant-time comparison to prevent timing attacks
 * @param {string} a - First token
 * @param {string} b - Second token
 * @returns {boolean} True if tokens match
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
}

/**
 * CSRF Protection Middleware Factory
 * @param {Object} options - Configuration options
 * @param {string[]} options.ignoreMethods - HTTP methods to skip CSRF check (default: ['GET', 'HEAD', 'OPTIONS'])
 * @param {string[]} options.ignorePaths - Paths to skip CSRF check
 * @returns {Function} Express middleware
 */
function csrfProtection(options = {}) {
  const {
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    ignorePaths = []
  } = options;

  return function csrf(req, res, next) {
    // Skip CSRF check for ignored methods
    if (ignoreMethods.includes(req.method)) {
      // Generate and set CSRF token for GET requests
      if (req.method === 'GET') {
        const token = generateToken();

        // Set CSRF token in cookie
        res.cookie(CSRF_COOKIE_NAME, token, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600000, // 1 hour
          path: '/'
        });

        // Expose token to client via response header or locals
        res.locals.csrfToken = token;
        res.setHeader('X-CSRF-Token', token);
      }

      return next();
    }

    // Skip CSRF check for ignored paths
    if (ignorePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Get CSRF token from cookie
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    // Get CSRF token from header or body
    const headerToken = req.headers[CSRF_HEADER_NAME] ||
                       req.body?._csrf ||
                       req.query?._csrf;

    // Validate tokens exist
    if (!cookieToken || !headerToken) {
      return res.status(403).json({
        error: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token missing. Please refresh the page and try again.'
      });
    }

    // Verify tokens match using constant-time comparison
    if (!safeCompare(cookieToken, headerToken)) {
      return res.status(403).json({
        error: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token invalid. Please refresh the page and try again.'
      });
    }

    // CSRF validation passed
    next();
  };
}

/**
 * Endpoint to generate a new CSRF token
 * Use this in your Express app:
 * app.get('/api/csrf-token', getCsrfToken);
 */
function getCsrfToken(req, res) {
  const token = generateToken();

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
    path: '/'
  });

  res.json({
    csrfToken: token
  });
}

module.exports = {
  csrfProtection,
  getCsrfToken,
  generateToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
