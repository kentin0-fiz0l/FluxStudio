/**
 * Security Middleware for FluxStudio
 * Provides rate limiting, CORS, validation, and security headers
 */

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const validator = require('validator');
const crypto = require('crypto');
const { securityLogger } = require('../lib/logger');

/**
 * Rate limiting configuration
 */
const createRateLimit = (options = {}) => {
  const defaults = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path.includes('/health');
    }
  };

  return rateLimit({ ...defaults, ...options });
};

/**
 * Stricter rate limiting for authentication endpoints
 */
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again in 15 minutes.',
    retryAfter: 900
  }
});

/**
 * Rate limiting for 3D print endpoints
 * Prevents abuse of expensive print operations
 */
const printRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // limit each IP to 10 print jobs per hour
  message: {
    error: 'Too many print jobs queued. Maximum 10 print jobs per hour allowed.',
    retryAfter: 3600
  },
  skipSuccessfulRequests: false, // Count all requests, not just errors
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to properly normalized IP
    return req.user?.id || ipKeyGenerator(req);
  }
});

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://fluxstudio.art').split(',');

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  maxAge: 86400 // 24 hours
};

/**
 * Security headers configuration
 */
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://lh3.googleusercontent.com"], // Allow Google profile images
      scriptSrc: ["'self'", "https://accounts.google.com"], // Allow Google Sign-in scripts
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"], // Allow Google Sign-in iframe
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for OAuth compatibility
  crossOriginOpenerPolicy: false // Disable COOP for Google Sign-in compatibility
};

/**
 * Input validation middleware
 */
const validateInput = {
  email: (req, res, next) => {
    const { email } = req.body;
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        field: 'email'
      });
    }
    next();
  },

  password: (req, res, next) => {
    const { password } = req.body;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long',
          field: 'password'
        });
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return res.status(400).json({
          error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          field: 'password'
        });
      }
    }
    next();
  },

  sanitizeInput: (req, res, next) => {
    // Sanitize string inputs
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = validator.escape(req.body[key].trim());
      }
    }
    next();
  },

  fileUpload: (req, res, next) => {
    if (req.file) {
      const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|zip|mp4|mov|avi|mp3|wav/;
      const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

      if (!allowedTypes.test(fileExtension)) {
        return res.status(400).json({
          error: 'Invalid file type. Please upload images, documents, or media files only.',
          allowedTypes: 'jpeg, jpg, png, gif, webp, svg, pdf, doc, docx, txt, zip, mp4, mov, avi, mp3, wav'
        });
      }

      // Check file size (50MB limit)
      if (req.file.size > 50 * 1024 * 1024) {
        return res.status(400).json({
          error: 'File size too large. Maximum size is 50MB.',
          maxSize: '50MB'
        });
      }
    }
    next();
  }
};

/**
 * Error handling middleware for security violations
 */
const securityErrorHandler = (err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Cross-origin request not allowed',
      origin: req.headers.origin
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      limit: '50MB'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field'
    });
  }

  next(err);
};

/**
 * Request tracing middleware
 * Generates a unique trace ID for each request to enable log correlation
 * across services, debugging, and distributed tracing.
 */
const traceIdMiddleware = (req, res, next) => {
  // Use existing trace ID from upstream proxy/load balancer, or generate new one
  const traceId = req.headers['x-trace-id'] ||
                  req.headers['x-request-id'] ||
                  `flux-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

  // Attach to request for use in logging throughout the request lifecycle
  req.traceId = traceId;

  // Add to response headers so clients can correlate their logs
  res.setHeader('X-Trace-ID', traceId);

  next();
};

/**
 * Security audit logging
 * Now includes trace ID for request correlation
 */
const auditLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      traceId: req.traceId || 'unknown',
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      duration: duration,
      userId: req.user?.id || 'anonymous'
    };

    // Log suspicious activity
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
      securityLogger.warn('Security alert', logData);
    }

    // Log errors
    if (res.statusCode >= 400) {
      securityLogger.error('Request error', null, logData);
    }
  });

  next();
};

module.exports = {
  rateLimit: createRateLimit,
  authRateLimit,
  printRateLimit,
  cors: cors(corsOptions),
  helmet: helmet(helmetConfig),
  validateInput,
  securityErrorHandler,
  auditLogger,
  traceIdMiddleware
};