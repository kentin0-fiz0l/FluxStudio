/**
 * Content Security Policy (CSP) Middleware
 *
 * Implements CSP headers to prevent XSS, clickjacking, and other injection attacks.
 *
 * CSP Strategy:
 * - Strict default policy (deny all)
 * - Whitelist trusted sources
 * - No inline scripts/styles (use nonces for exceptions)
 * - Report violations for monitoring
 *
 * Part of: Week 1 Security Sprint - Day 5
 * Date: 2025-10-14
 */

const crypto = require('crypto');

/**
 * Generate CSP Nonce
 *
 * Generates a cryptographically secure nonce for inline scripts/styles.
 * Each request gets a unique nonce.
 *
 * @returns {string} Base64-encoded nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Build CSP Header
 *
 * Constructs the Content-Security-Policy header value.
 *
 * @param {Object} options - CSP configuration
 * @param {string} options.nonce - Nonce for inline scripts
 * @param {boolean} options.isDevelopment - Development mode flag
 * @param {string} options.reportUri - URI for CSP violation reports
 * @returns {string} CSP header value
 */
function buildCSPHeader(options = {}) {
  const { nonce, isDevelopment = false, reportUri } = options;

  const directives = [];

  // Default source: only same origin
  directives.push("default-src 'self'");

  // Scripts: same origin + nonce for inline scripts
  const scriptSources = ["'self'"];
  if (nonce) {
    scriptSources.push(`'nonce-${nonce}'`);
  }
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'"); // For HMR in development
  }
  // Google OAuth
  scriptSources.push('https://accounts.google.com');
  scriptSources.push('https://apis.google.com');
  directives.push(`script-src ${scriptSources.join(' ')}`);

  // Styles: same origin + nonce for inline styles
  const styleSources = ["'self'"];
  if (nonce) {
    styleSources.push(`'nonce-${nonce}'`);
  }
  // Allow inline styles for React
  styleSources.push("'unsafe-inline'"); // TODO: Remove and use nonces
  directives.push(`style-src ${styleSources.join(' ')}`);

  // Images: same origin + data URIs + external CDNs
  directives.push(
    "img-src 'self' data: https: blob:"
  );

  // Fonts: same origin + data URIs
  directives.push("font-src 'self' data:");

  // Connect (AJAX/fetch): same origin + API domains
  const connectSources = ["'self'"];
  // Add WebSocket for real-time features
  connectSources.push('ws://localhost:*');
  connectSources.push('wss://fluxstudio.art');
  // Google OAuth
  connectSources.push('https://accounts.google.com');
  connectSources.push('https://oauth2.googleapis.com');
  directives.push(`connect-src ${connectSources.join(' ')}`);

  // Media: same origin + blob for media
  directives.push("media-src 'self' blob:");

  // Object/Embed: deny all (prevent Flash, Java, etc.)
  directives.push("object-src 'none'");

  // Base URI: restrict to same origin
  directives.push("base-uri 'self'");

  // Form actions: same origin only
  directives.push("form-action 'self'");

  // Frame ancestors: deny (prevent clickjacking)
  directives.push("frame-ancestors 'none'");

  // Frames (iframes): same origin
  directives.push("frame-src 'self' https://accounts.google.com");

  // Upgrade insecure requests (HTTP -> HTTPS)
  if (!isDevelopment) {
    directives.push('upgrade-insecure-requests');
  }

  // Block mixed content
  directives.push('block-all-mixed-content');

  // Report violations
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
    directives.push(`report-to csp-endpoint`);
  }

  return directives.join('; ');
}

/**
 * CSP Middleware
 *
 * Adds Content-Security-Policy headers to all responses.
 *
 * Usage:
 * app.use(cspMiddleware({ isDevelopment: process.env.NODE_ENV === 'development' }));
 *
 * @param {Object} config - CSP configuration
 * @returns {Function} Express middleware
 */
function cspMiddleware(config = {}) {
  const isDevelopment = config.isDevelopment || process.env.NODE_ENV === 'development';
  const reportUri = config.reportUri || '/api/security/csp-report';

  return (req, res, next) => {
    // Generate nonce for this request
    const nonce = generateNonce();

    // Store nonce in res.locals for templates to use
    res.locals.cspNonce = nonce;

    // Build CSP header
    const cspHeader = buildCSPHeader({
      nonce,
      isDevelopment,
      reportUri
    });

    // Set CSP header
    res.setHeader('Content-Security-Policy', cspHeader);

    // Also set report-only header for monitoring (optional)
    if (config.reportOnly) {
      res.setHeader('Content-Security-Policy-Report-Only', cspHeader);
    }

    next();
  };
}

/**
 * CSP Report Endpoint
 *
 * Handles CSP violation reports from browsers.
 *
 * Usage:
 * app.post('/api/security/csp-report', express.json(), cspReportHandler);
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
function cspReportHandler(req, res) {
  const report = req.body;

  // Log CSP violation
  console.warn('CSP Violation:', JSON.stringify(report, null, 2));

  // TODO: Send to monitoring service (Sentry, Grafana)
  // - Track violation types
  // - Alert on suspicious patterns
  // - Identify policy improvements

  res.status(204).end();
}

/**
 * Additional Security Headers
 *
 * Sets various security-related HTTP headers.
 *
 * Headers:
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - X-Frame-Options: Prevent clickjacking
 * - X-XSS-Protection: Enable browser XSS filter
 * - Referrer-Policy: Control referrer information
 * - Permissions-Policy: Control browser features
 *
 * @returns {Function} Express middleware
 */
function securityHeadersMiddleware() {
  return (req, res, next) => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking (also in CSP, but defense in depth)
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable browser XSS protection (legacy, but doesn't hurt)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );

    // Strict Transport Security (HTTPS only)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    next();
  };
}

/**
 * CORS Security Headers
 *
 * Configures CORS with security in mind.
 *
 * @param {Object} options - CORS configuration
 * @returns {Function} Express middleware
 */
function secureCORS(options = {}) {
  const allowedOrigins = options.allowedOrigins || [
    'https://fluxstudio.art',
    'https://www.fluxstudio.art',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  return (req, res, next) => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  };
}

/**
 * Helmet Integration
 *
 * Configures helmet with our security requirements.
 * Helmet sets many security headers automatically.
 *
 * @returns {Object} Helmet configuration
 */
function getHelmetConfig() {
  return {
    contentSecurityPolicy: false, // We handle CSP ourselves
    crossOriginEmbedderPolicy: false, // Allows embedding
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // For OAuth
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  };
}

// Export all functions
module.exports = {
  generateNonce,
  buildCSPHeader,
  cspMiddleware,
  cspReportHandler,
  securityHeadersMiddleware,
  secureCORS,
  getHelmetConfig
};
