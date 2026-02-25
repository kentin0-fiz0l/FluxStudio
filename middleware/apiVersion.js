/**
 * API Version Middleware for FluxStudio
 *
 * Sets the X-API-Version header on every response so clients
 * can identify which API version they are communicating with.
 *
 * Version scheme: YYYY.minor (calendar-based)
 */

const API_VERSION = '2025.1';

/**
 * Middleware that attaches X-API-Version to all responses.
 *
 * @returns {Function} Express middleware
 */
function apiVersionMiddleware(req, res, next) {
  res.setHeader('X-API-Version', API_VERSION);
  next();
}

module.exports = { apiVersionMiddleware, API_VERSION };
