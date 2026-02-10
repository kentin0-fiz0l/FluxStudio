/**
 * Structured Logger for FluxStudio Backend
 * Sprint 19: Foundation Hardening
 *
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Request trace ID integration
 * - Structured JSON output for production
 * - Pretty console output for development
 * - Sentry integration for error tracking
 * - Request/response logging middleware
 *
 * @example
 * const { logger, createLogger } = require('./lib/logger');
 *
 * // Use default logger
 * logger.info('Server started', { port: 3001 });
 *
 * // Create context-specific logger
 * const authLogger = createLogger('Auth');
 * authLogger.error('Login failed', new Error('Invalid credentials'), { email: 'user@example.com' });
 *
 * // With request context
 * const reqLogger = createLogger('API').withRequest(req);
 * reqLogger.info('Request received', { body: req.body });
 */

// ============================================================================
// Constants
// ============================================================================

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m',  // cyan
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
};

// ============================================================================
// Environment Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV !== 'production';
const isProduction = !isDevelopment;

const DEFAULT_CONFIG = {
  minLevel: isDevelopment ? 'debug' : 'info',
  enableConsole: true,
  enableJson: isProduction,
  enablePretty: isDevelopment,
  includeTimestamp: true,
  includePid: isProduction,
};

// ============================================================================
// Sentry Integration
// ============================================================================

let Sentry = null;
try {
  Sentry = require('@sentry/node');
} catch {
  // Sentry not available
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  constructor(context = 'App', config = {}) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.requestContext = null;
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    const childLogger = new Logger(`${this.context}:${context}`, this.config);
    childLogger.requestContext = this.requestContext;
    return childLogger;
  }

  /**
   * Attach request context for trace ID correlation
   */
  withRequest(req) {
    const childLogger = new Logger(this.context, this.config);
    childLogger.requestContext = {
      traceId: req.traceId || req.headers['x-trace-id'] || null,
      userId: req.user?.id || null,
      ip: req.ip || req.connection?.remoteAddress || null,
      method: req.method,
      path: req.path || req.url,
    };
    return childLogger;
  }

  /**
   * Debug level - development information
   */
  debug(message, data) {
    this._log('debug', message, data);
  }

  /**
   * Info level - general operational information
   */
  info(message, data) {
    this._log('info', message, data);
  }

  /**
   * Warning level - potential issues
   */
  warn(message, data) {
    this._log('warn', message, data);
  }

  /**
   * Error level - errors and exceptions
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   * @param {Object} [data] - Additional data
   */
  error(message, error, data) {
    const errorObj = error instanceof Error ? error : null;
    const errorData = error instanceof Error ? data : error;

    this._log('error', message, errorData, errorObj);
  }

  /**
   * Core logging method
   */
  _log(level, message, data, error) {
    // Check minimum level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry = this._buildEntry(level, message, data, error);

    // Console output
    if (this.config.enableConsole) {
      if (this.config.enableJson) {
        this._outputJson(entry);
      } else if (this.config.enablePretty) {
        this._outputPretty(entry);
      }
    }

    // Sentry integration
    if (level === 'error' && Sentry && process.env.SENTRY_DSN) {
      this._sendToSentry(entry, error);
    }
  }

  /**
   * Build structured log entry
   */
  _buildEntry(level, message, data, error) {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
    };

    if (this.config.includePid) {
      entry.pid = process.pid;
    }

    if (this.requestContext) {
      if (this.requestContext.traceId) {
        entry.traceId = this.requestContext.traceId;
      }
      if (this.requestContext.userId) {
        entry.userId = this.requestContext.userId;
      }
      if (this.requestContext.ip) {
        entry.ip = this.requestContext.ip;
      }
      if (this.requestContext.method) {
        entry.method = this.requestContext.method;
      }
      if (this.requestContext.path) {
        entry.path = this.requestContext.path;
      }
    }

    if (data !== undefined && data !== null) {
      entry.data = this._sanitizeData(data);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * Sanitize sensitive data from logs
   */
  _sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'credential', 'refreshToken', 'accessToken',
      'apiKey', 'privateKey', 'jwt', 'session',
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this._sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Output as JSON (production)
   */
  _outputJson(entry) {
    const output = JSON.stringify(entry);
    if (entry.level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  /**
   * Output with pretty formatting (development)
   */
  _outputPretty(entry) {
    const { level, message, timestamp, context, traceId, data, error } = entry;

    const color = LOG_COLORS[level];
    const reset = LOG_COLORS.reset;

    // Build prefix parts
    const parts = [];

    if (this.config.includeTimestamp) {
      const time = timestamp.split('T')[1].split('.')[0];
      parts.push(`${color}[${time}]${reset}`);
    }

    parts.push(`${color}[${level.toUpperCase().padEnd(5)}]${reset}`);
    parts.push(`${color}[${context}]${reset}`);

    if (traceId) {
      parts.push(`${color}[${traceId.substring(0, 12)}]${reset}`);
    }

    const prefix = parts.join(' ');
    let output = `${prefix} ${message}`;

    // Append data
    if (data !== undefined) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      output += ` ${color}${dataStr}${reset}`;
    }

    // Output to appropriate stream
    if (level === 'error' || level === 'warn') {
      console.error(output);
      if (error && error.stack) {
        console.error(`${color}${error.stack}${reset}`);
      }
    } else {
      console.log(output);
    }
  }

  /**
   * Send to Sentry for error tracking
   */
  _sendToSentry(entry, error) {
    if (!Sentry) return;

    const tags = {
      context: entry.context,
    };

    if (entry.traceId) {
      tags.traceId = entry.traceId;
    }

    const extra = {
      message: entry.message,
      data: entry.data,
      userId: entry.userId,
      path: entry.path,
      method: entry.method,
    };

    if (error) {
      Sentry.captureException(error, { tags, extra });
    } else {
      Sentry.captureMessage(entry.message, { level: 'error', tags, extra });
    }
  }

  /**
   * Create timed operation logger
   */
  time(label) {
    const start = process.hrtime.bigint();
    this.debug(`${label} started`);

    return () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      this.debug(`${label} completed`, { durationMs: Math.round(durationMs * 100) / 100 });
    };
  }
}

// ============================================================================
// Request/Response Logging Middleware
// ============================================================================

/**
 * Request logging middleware
 * Logs incoming requests and their responses with timing
 */
function requestLoggingMiddleware(options = {}) {
  const {
    logBody = false,
    logHeaders = false,
    excludePaths = ['/health', '/metrics', '/favicon.ico'],
  } = options;

  const middlewareLogger = new Logger('HTTP');

  return (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const start = process.hrtime.bigint();
    const reqLogger = middlewareLogger.withRequest(req);

    // Log request
    const requestData = {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    };

    if (logHeaders) {
      requestData.headers = req.headers;
    }

    if (logBody && req.body && Object.keys(req.body).length > 0) {
      requestData.body = req.body;
    }

    reqLogger.info('Request received', requestData);

    // Capture response
    const originalSend = res.send.bind(res);
    res.send = function(body) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;

      const responseData = {
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      };

      // Log based on status code
      if (res.statusCode >= 500) {
        reqLogger.error('Request failed', responseData);
      } else if (res.statusCode >= 400) {
        reqLogger.warn('Request error', responseData);
      } else {
        reqLogger.info('Request completed', responseData);
      }

      return originalSend(body);
    };

    next();
  };
}

/**
 * Error logging middleware
 * Logs unhandled errors with full context
 */
function errorLoggingMiddleware() {
  const errorLogger = new Logger('Error');

  return (err, req, res, next) => {
    const reqLogger = errorLogger.withRequest(req);

    reqLogger.error('Unhandled error', err, {
      statusCode: err.status || err.statusCode || 500,
      path: req.path,
      method: req.method,
    });

    next(err);
  };
}

// ============================================================================
// Factory Functions & Exports
// ============================================================================

/**
 * Create a new logger with custom context
 */
function createLogger(context, config) {
  return new Logger(context, config);
}

// Default application logger
const logger = new Logger('App');

// Pre-configured loggers for common contexts
const apiLogger = createLogger('API');
const authLogger = createLogger('Auth');
const dbLogger = createLogger('Database');
const socketLogger = createLogger('Socket');
const securityLogger = createLogger('Security');

/**
 * Configure all loggers globally
 */
function configureLogging(config) {
  const loggers = [logger, apiLogger, authLogger, dbLogger, socketLogger, securityLogger];
  loggers.forEach(l => {
    l.config = { ...l.config, ...config };
  });
}

module.exports = {
  Logger,
  logger,
  createLogger,
  apiLogger,
  authLogger,
  dbLogger,
  socketLogger,
  securityLogger,
  configureLogging,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
};
