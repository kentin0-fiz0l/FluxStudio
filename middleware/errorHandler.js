/**
 * Centralized Error Handling Middleware for FluxStudio
 *
 * Provides consistent error responses, logging, and error classification.
 * All route handlers should use async wrapper or pass errors to next().
 */

const Sentry = require('@sentry/node');

/**
 * Custom API Error class for consistent error handling
 */
class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || this.deriveCode(statusCode);
    this.details = details;
    this.isOperational = true; // Distinguishes from programming errors

    Error.captureStackTrace(this, this.constructor);
  }

  deriveCode(statusCode) {
    const codeMap = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE'
    };
    return codeMap[statusCode] || 'UNKNOWN_ERROR';
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details })
    };
  }
}

/**
 * Common error factory methods
 */
const Errors = {
  badRequest: (message = 'Invalid request', details = null) =>
    new ApiError(400, message, 'BAD_REQUEST', details),

  unauthorized: (message = 'Authentication required') =>
    new ApiError(401, message, 'UNAUTHORIZED'),

  forbidden: (message = 'Access denied') =>
    new ApiError(403, message, 'FORBIDDEN'),

  notFound: (resource = 'Resource') =>
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),

  conflict: (message = 'Resource already exists') =>
    new ApiError(409, message, 'CONFLICT'),

  validation: (errors) =>
    new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', errors),

  tooManyRequests: (retryAfter = 900) =>
    new ApiError(429, 'Too many requests', 'RATE_LIMITED', { retryAfter }),

  internal: (message = 'Internal server error') =>
    new ApiError(500, message, 'INTERNAL_ERROR'),

  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new ApiError(503, message, 'SERVICE_UNAVAILABLE')
};

/**
 * Async route handler wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 *
 * Usage:
 *   app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not Found Handler (404)
 * Place after all routes
 */
const notFoundHandler = (req, res, next) => {
  const error = Errors.notFound(`Route ${req.method} ${req.path}`);
  next(error);
};

/**
 * Classify error for logging and monitoring
 */
function classifyError(err) {
  // Operational errors (expected, handled)
  if (err instanceof ApiError && err.isOperational) {
    return 'operational';
  }

  // Database errors
  if (err.code && (err.code.startsWith('22') || err.code.startsWith('23') || err.code.startsWith('42'))) {
    return 'database';
  }

  // Network/timeout errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
    return 'network';
  }

  // Validation errors from libraries
  if (err.name === 'ValidationError' || err.name === 'JsonWebTokenError') {
    return 'validation';
  }

  // Programming errors (unexpected)
  return 'programming';
}

/**
 * Convert known errors to ApiError
 */
function normalizeError(err) {
  // Already an ApiError
  if (err instanceof ApiError) {
    return err;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Token expired', 'TOKEN_EXPIRED');
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ApiError(413, 'File too large', 'FILE_TOO_LARGE', { maxSize: '50MB' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ApiError(400, 'Unexpected file field', 'UNEXPECTED_FILE');
  }

  // PostgreSQL errors
  if (err.code === '23505') { // unique_violation
    return new ApiError(409, 'Resource already exists', 'DUPLICATE_ENTRY');
  }
  if (err.code === '23503') { // foreign_key_violation
    return new ApiError(400, 'Invalid reference', 'INVALID_REFERENCE');
  }
  if (err.code === '22P02') { // invalid_text_representation
    return new ApiError(400, 'Invalid input format', 'INVALID_INPUT');
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return new ApiError(403, 'Cross-origin request not allowed', 'CORS_ERROR');
  }

  // Validation errors (express-validator, etc.)
  if (err.name === 'ValidationError') {
    return new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', err.errors || err.message);
  }

  // SyntaxError (bad JSON)
  if (err instanceof SyntaxError && err.status === 400) {
    return new ApiError(400, 'Invalid JSON in request body', 'INVALID_JSON');
  }

  // Default to internal error
  return new ApiError(500, 'An unexpected error occurred', 'INTERNAL_ERROR');
}

/**
 * Main error handler middleware
 * Place at the end of middleware chain
 */
const errorHandler = (err, req, res, next) => {
  // Normalize error to ApiError
  const error = normalizeError(err);
  const errorClass = classifyError(err);

  // Build log context
  const logContext = {
    traceId: req.traceId || 'unknown',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
    userId: req.user?.id || 'anonymous',
    ip: req.ip,
    errorClass,
    userAgent: req.headers['user-agent']
  };

  // Log based on severity
  if (error.statusCode >= 500 || errorClass === 'programming') {
    console.error('SERVER ERROR:', JSON.stringify({
      ...logContext,
      stack: err.stack,
      originalError: err.message
    }));

    // Report to Sentry
    try {
      Sentry.withScope((scope) => {
        scope.setTag('error_class', errorClass);
        scope.setTag('status_code', error.statusCode);
        scope.setUser({ id: req.user?.id || 'anonymous' });
        scope.setExtra('request', {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body
        });
        Sentry.captureException(err);
      });
    } catch (sentryErr) {
      // Sentry not available, continue
    }
  } else if (error.statusCode >= 400) {
    console.warn('CLIENT ERROR:', JSON.stringify(logContext));
  }

  // Don't leak error details in production for 500 errors
  const isProduction = process.env.NODE_ENV === 'production';
  const responseError = isProduction && error.statusCode >= 500
    ? new ApiError(500, 'An unexpected error occurred', 'INTERNAL_ERROR')
    : error;

  // Send response
  res.status(responseError.statusCode).json(responseError.toJSON());
};

/**
 * Validation error helper
 * Formats validation errors from express-validator or similar
 */
const formatValidationErrors = (errors) => {
  if (Array.isArray(errors)) {
    return errors.reduce((acc, err) => {
      const field = err.path || err.param || 'unknown';
      if (!acc[field]) acc[field] = [];
      acc[field].push(err.msg || err.message);
      return acc;
    }, {});
  }
  return errors;
};

module.exports = {
  ApiError,
  Errors,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  formatValidationErrors
};
