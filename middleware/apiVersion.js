/**
 * API Version Middleware for FluxStudio
 *
 * Sets the X-API-Version header on every response so clients
 * can identify which API version they are communicating with.
 * Reads client-requested version from Accept-Version or X-API-Version headers.
 * Enforces minimum supported version and signals deprecation.
 *
 * Version scheme: YYYY.minor (calendar-based)
 */

const API_VERSION = '2026.1';
const MIN_SUPPORTED_VERSION = '2025.1';

/**
 * Parse a "YYYY.minor" version string into a comparable number.
 * Returns NaN for invalid strings.
 */
function parseVersion(v) {
  const parts = String(v).split('.');
  if (parts.length !== 2) return NaN;
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  if (isNaN(major) || isNaN(minor)) return NaN;
  return major * 1000 + minor;
}

/**
 * Middleware that attaches X-API-Version to all responses and enforces
 * minimum version when clients send Accept-Version or X-API-Version headers.
 *
 * @returns {void}
 */
function apiVersionMiddleware(req, res, next) {
  res.setHeader('X-API-Version', API_VERSION);

  const requestedVersion = req.get('Accept-Version') || req.get('X-API-Version');

  if (requestedVersion) {
    const requested = parseVersion(requestedVersion);
    const minimum = parseVersion(MIN_SUPPORTED_VERSION);

    if (isNaN(requested)) {
      return res.status(400).json({
        success: false,
        error: `Invalid API version format: "${requestedVersion}". Expected YYYY.minor (e.g. 2026.1).`,
        code: 'INVALID_API_VERSION'
      });
    }

    if (requested < minimum) {
      return res.status(410).json({
        success: false,
        error: `API version ${requestedVersion} is no longer supported. Minimum supported version is ${MIN_SUPPORTED_VERSION}.`,
        code: 'API_VERSION_GONE'
      });
    }

    req.apiVersion = requestedVersion;
  } else {
    req.apiVersion = API_VERSION;
  }

  next();
}

/**
 * Route-level middleware factory that marks a route as deprecated.
 * Adds Deprecation and Sunset headers to the response.
 *
 * @param {string} sunsetDate - ISO 8601 date when the route will be removed (e.g. "2026-09-15")
 * @returns {Function} Express middleware
 */
function deprecateRoute(sunsetDate) {
  return function (req, res, next) {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', new Date(sunsetDate).toUTCString());
    next();
  };
}

module.exports = { apiVersionMiddleware, deprecateRoute, API_VERSION, MIN_SUPPORTED_VERSION };
