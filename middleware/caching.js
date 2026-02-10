/**
 * HTTP Caching Middleware for FluxStudio
 *
 * Provides:
 * - Cache-Control headers for static assets
 * - ETag support for API responses
 * - Conditional request handling (If-None-Match)
 * - Configurable cache durations by route pattern
 */

const crypto = require('crypto');

/**
 * Cache durations (in seconds)
 */
const CACHE_DURATIONS = {
  // Static assets - long cache with immutable
  immutable: 31536000, // 1 year
  static: 604800,      // 1 week

  // API responses
  short: 60,           // 1 minute
  medium: 300,         // 5 minutes
  long: 3600,          // 1 hour

  // No cache
  none: 0,
};

/**
 * Generate ETag from response body
 * Uses MD5 hash for fast computation
 */
function generateETag(body) {
  if (!body) return null;
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Static asset caching middleware
 * Applies long cache headers to static files
 */
const staticAssetCaching = (options = {}) => {
  const {
    maxAge = CACHE_DURATIONS.static,
    immutable = true,
  } = options;

  return (req, res, next) => {
    // Only apply to GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check for static asset patterns
    const staticPatterns = [
      /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i,
      /^\/assets\//,
      /^\/static\//,
    ];

    const isStatic = staticPatterns.some(pattern => pattern.test(req.path));

    if (isStatic) {
      // Check for hashed assets (contain hash in filename)
      const hasHash = /[-_.][a-f0-9]{8,}\./.test(req.path);

      if (hasHash) {
        // Immutable assets with content hash
        res.setHeader('Cache-Control', `public, max-age=${CACHE_DURATIONS.immutable}, immutable`);
      } else {
        // Regular static assets
        const cacheControl = immutable
          ? `public, max-age=${maxAge}, immutable`
          : `public, max-age=${maxAge}`;
        res.setHeader('Cache-Control', cacheControl);
      }
    }

    next();
  };
};

/**
 * API response caching middleware with ETag support
 * Enables conditional requests and cache validation
 */
const apiCaching = (options = {}) => {
  const {
    defaultMaxAge = CACHE_DURATIONS.short,
    routes = {},
    excludePatterns = [/\/auth\//, /\/csrf/, /\/refresh/],
  } = options;

  return (req, res, next) => {
    // Only apply to GET requests
    if (req.method !== 'GET') {
      // Disable caching for mutations
      res.setHeader('Cache-Control', 'no-store');
      return next();
    }

    // Check if route should be excluded
    const isExcluded = excludePatterns.some(pattern => pattern.test(req.path));
    if (isExcluded) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next();
    }

    // Determine cache duration for this route
    let maxAge = defaultMaxAge;
    for (const [pattern, duration] of Object.entries(routes)) {
      if (new RegExp(pattern).test(req.path)) {
        maxAge = duration;
        break;
      }
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to add ETag
    res.json = function(body) {
      // Generate ETag
      const etag = generateETag(body);

      if (etag) {
        res.setHeader('ETag', etag);

        // Check for conditional request
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          res.status(304);
          return res.end();
        }
      }

      // Set cache headers
      if (maxAge > 0) {
        res.setHeader('Cache-Control', `private, max-age=${maxAge}, must-revalidate`);
      } else {
        res.setHeader('Cache-Control', 'no-store');
      }

      // Add Vary header for proper caching with auth
      res.setHeader('Vary', 'Authorization, Accept-Encoding');

      return originalJson(body);
    };

    next();
  };
};

/**
 * Configure API route caching durations
 * Returns middleware configured for FluxStudio API patterns
 */
const configuredApiCaching = () => {
  return apiCaching({
    defaultMaxAge: CACHE_DURATIONS.none, // Default to no cache for safety
    routes: {
      // User-specific data - short cache
      '^/api/projects$': CACHE_DURATIONS.short,
      '^/api/projects/[^/]+$': CACHE_DURATIONS.short,

      // Activity feeds - very short cache
      '^/api/activities': CACHE_DURATIONS.short,
      '^/api/dashboard': CACHE_DURATIONS.short,

      // Static-ish data - longer cache
      '^/api/organizations$': CACHE_DURATIONS.medium,
      '^/api/teams$': CACHE_DURATIONS.medium,

      // User settings - short cache
      '^/api/settings': CACHE_DURATIONS.short,

      // File metadata - medium cache
      '^/api/files/[^/]+$': CACHE_DURATIONS.medium,
      '^/api/assets$': CACHE_DURATIONS.medium,

      // Health checks - no cache
      '^/health': CACHE_DURATIONS.none,
      '^/api/health': CACHE_DURATIONS.none,
    },
    excludePatterns: [
      /\/auth\//,     // Auth endpoints
      /\/csrf/,       // CSRF tokens
      /\/refresh/,    // Token refresh
      /\/messages/,   // Real-time messaging
      /\/notifications/, // Real-time notifications
      /\/typing/,     // Typing indicators
      /\/presence/,   // User presence
    ],
  });
};

/**
 * Security headers for caching
 * Prevents caching of sensitive data in shared caches
 */
const securityCacheHeaders = () => {
  return (req, res, next) => {
    // Prevent caching in shared caches (CDN, proxy)
    // for authenticated requests
    if (req.headers.authorization) {
      res.setHeader('Cache-Control', 'private, no-transform');
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');

    next();
  };
};

/**
 * Combined caching middleware
 * Applies all caching strategies
 */
const cachingMiddleware = () => {
  const staticCaching = staticAssetCaching();
  const apiCache = configuredApiCaching();
  const securityHeaders = securityCacheHeaders();

  return (req, res, next) => {
    // Apply security headers first
    securityHeaders(req, res, () => {
      // Check if static asset
      if (req.path.startsWith('/assets/') || req.path.startsWith('/static/')) {
        return staticCaching(req, res, next);
      }

      // Check if API request
      if (req.path.startsWith('/api/')) {
        return apiCache(req, res, next);
      }

      // Default - no special caching
      next();
    });
  };
};

module.exports = {
  staticAssetCaching,
  apiCaching,
  configuredApiCaching,
  securityCacheHeaders,
  cachingMiddleware,
  generateETag,
  CACHE_DURATIONS,
};
