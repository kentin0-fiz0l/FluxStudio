/**
 * Sentry Integration for Error Tracking & Performance Monitoring
 * Sprint 13, Day 2: Sentry Integration & Anomaly Detection
 *
 * Features:
 * - Error tracking with context
 * - Performance monitoring
 * - Custom security event tracking
 * - Sensitive data filtering
 * - Release tracking
 *
 * Date: 2025-10-15
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry with Express app
 *
 * @param {Express} app - Express application instance
 * @returns {void}
 */
function initSentry(app) {
  // Skip initialization if no DSN provided
  if (!process.env.SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version ?
        `fluxstudio-auth@${process.env.npm_package_version}` :
        'fluxstudio-auth@unknown',

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Integrations
      integrations: [
        new ProfilingIntegration(),
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
      ],

      // Sensitive data filtering
      beforeSend(event, hint) {
        // Filter sensitive data from requests
        if (event.request) {
          // Remove cookies
          delete event.request.cookies;

          // Remove passwords and tokens from request data
          if (event.request.data) {
            if (typeof event.request.data === 'object') {
              delete event.request.data.password;
              delete event.request.data.refreshToken;
              delete event.request.data.accessToken;
              delete event.request.data.credential; // OAuth credential
            }
          }

          // Remove authorization headers
          if (event.request.headers) {
            delete event.request.headers.authorization;
            delete event.request.headers.cookie;
          }
        }

        // Filter sensitive data from extra context
        if (event.extra) {
          delete event.extra.password;
          delete event.extra.token;
          delete event.extra.secret;
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Network errors
        'NetworkError',
        'Failed to fetch',
        'Network request failed',

        // CSRF errors (handled by security middleware)
        'CSRF_TOKEN_MISSING',
        'CSRF_TOKEN_INVALID',

        // Expected authentication errors
        'Invalid or expired token',
        'Authentication required',
      ],
    });

    console.log('✅ Sentry initialized successfully');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   Release: fluxstudio-auth@${process.env.npm_package_version || 'unknown'}`);
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error.message);
  }
}

/**
 * Get Sentry request handler middleware
 * Must be used before all controllers
 */
function requestHandler() {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next(); // No-op middleware
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Get Sentry tracing handler middleware
 * Must be used before all controllers
 */
function tracingHandler() {
  if (!process.env.SENTRY_DSN) {
    return (req, res, next) => next(); // No-op middleware
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Get Sentry error handler middleware
 * Must be used after all controllers
 */
function errorHandler() {
  if (!process.env.SENTRY_DSN) {
    return (err, req, res, next) => next(err); // No-op error middleware
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 500
      if (error.status && error.status >= 500) {
        return true;
      }

      // Capture all uncaught errors
      if (!error.status) {
        return true;
      }

      return false;
    }
  });
}

/**
 * Capture security event in Sentry
 *
 * @param {string} eventType - Type of security event
 * @param {string} severity - Event severity (info, warning, error, fatal)
 * @param {Object} metadata - Event metadata
 * @returns {string} Event ID
 */
function captureSecurityEvent(eventType, severity, metadata = {}) {
  if (!process.env.SENTRY_DSN) {
    return null;
  }

  const sentryLevel = mapSeverityToSentryLevel(severity);

  return Sentry.captureMessage(`Security Event: ${eventType}`, {
    level: sentryLevel,
    tags: {
      event_type: eventType,
      severity: severity,
      security_event: true
    },
    extra: {
      ...metadata,
      timestamp: new Date().toISOString()
    },
    user: metadata.userId ? { id: metadata.userId } : undefined,
    request: {
      url: metadata.url,
      method: metadata.method,
      headers: {
        'user-agent': metadata.userAgent
      }
    }
  });
}

/**
 * Capture authentication error
 *
 * @param {Error} error - Error object
 * @param {Object} context - Authentication context
 * @returns {string} Event ID
 */
function captureAuthError(error, context = {}) {
  if (!process.env.SENTRY_DSN) {
    return null;
  }

  return Sentry.captureException(error, {
    tags: {
      auth_error: true,
      endpoint: context.endpoint || 'unknown'
    },
    extra: {
      email: context.email,
      userType: context.userType,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString()
    },
    user: context.userId ? {
      id: context.userId,
      email: context.email
    } : undefined
  });
}

/**
 * Capture performance metric
 *
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
function capturePerformanceMetric(operation, duration, metadata = {}) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  const transaction = Sentry.startTransaction({
    op: operation,
    name: metadata.name || operation,
    tags: {
      ...metadata.tags
    }
  });

  // Simulate duration
  setTimeout(() => {
    transaction.finish();
  }, duration);
}

/**
 * Map security severity to Sentry level
 *
 * @param {string} severity - Security event severity
 * @returns {string} Sentry level
 */
function mapSeverityToSentryLevel(severity) {
  const mapping = {
    'info': 'info',
    'low': 'info',
    'warning': 'warning',
    'high': 'error',
    'critical': 'fatal'
  };

  return mapping[severity] || 'info';
}

/**
 * Set user context for Sentry
 *
 * @param {Object} user - User object
 */
function setUser(user) {
  if (!process.env.SENTRY_DSN || !user) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    userType: user.userType
  });
}

/**
 * Clear user context
 */
function clearUser() {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 *
 * @param {string} message - Breadcrumb message
 * @param {Object} data - Additional data
 */
function addBreadcrumb(message, data = {}) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000
  });
}

module.exports = {
  initSentry,
  requestHandler,
  tracingHandler,
  errorHandler,
  captureSecurityEvent,
  captureAuthError,
  capturePerformanceMetric,
  setUser,
  clearUser,
  addBreadcrumb,
  Sentry // Export Sentry instance for advanced usage
};
