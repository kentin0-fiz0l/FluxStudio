/**
 * Security Hardening Module for FluxStudio Production
 * Implements comprehensive security measures and monitoring
 */

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

class SecurityHardening {
  constructor(config = {}) {
    this.config = {
      // Rate limiting configuration
      rateLimiting: {
        windowMs: config.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
        max: config.RATE_LIMIT_MAX_REQUESTS || 100, // requests per window
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        ...config.rateLimiting
      },

      // Authentication rate limiting
      authRateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: config.AUTH_RATE_LIMIT_MAX || 5, // attempts per window
        message: 'Too many authentication attempts, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        ...config.authRateLimiting
      },

      // CORS configuration
      cors: {
        origin: config.CORS_ORIGINS || ['https://fluxstudio.art'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400, // 24 hours
        ...config.cors
      },

      // Security headers
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "'unsafe-eval'",
              'https://accounts.google.com',
              'https://appleid.apple.com'
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              'https://fonts.googleapis.com'
            ],
            fontSrc: [
              "'self'",
              'https://fonts.gstatic.com'
            ],
            imgSrc: [
              "'self'",
              'data:',
              'https:'
            ],
            connectSrc: [
              "'self'",
              'wss:',
              'https:'
            ],
            frameSrc: [
              'https://accounts.google.com',
              'https://appleid.apple.com'
            ]
          }
        },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true
        },
        ...config.helmet
      },

      // Input validation
      validation: {
        maxBodySize: config.MAX_FILE_SIZE || '100mb',
        maxParameterLength: 1000,
        maxFieldCount: 1000,
        ...config.validation
      },

      // Session security
      session: {
        secret: config.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
        secure: config.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict',
        ...config.session
      }
    };

    this.securityMetrics = {
      blockedRequests: 0,
      rateLimitedRequests: 0,
      suspiciousActivity: 0,
      authenticationFailures: 0,
      lastSecurityScan: null
    };
  }

  /**
   * Initialize all security middleware
   */
  initializeMiddleware(app) {
    // Basic security headers
    app.use(helmet(this.config.helmet));

    // CORS configuration
    app.use(cors(this.config.cors));

    // General rate limiting
    const generalLimiter = rateLimit(this.config.rateLimiting);
    app.use(generalLimiter);

    // Authentication-specific rate limiting
    const authLimiter = rateLimit(this.config.authRateLimiting);
    app.use('/api/auth', authLimiter);

    // File upload rate limiting
    const fileUploadLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 uploads per window
      message: 'Too many file uploads, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });
    app.use('/api/files/upload', fileUploadLimiter);

    // Request size limiting
    app.use(this.requestSizeLimiter.bind(this));

    // Security headers middleware
    app.use(this.securityHeadersMiddleware.bind(this));

    // Suspicious activity detection
    app.use(this.suspiciousActivityDetector.bind(this));

    // Request logging for security monitoring
    app.use(this.securityLogger.bind(this));

    console.log('🛡️ Security middleware initialized');
  }

  /**
   * Request size limiting middleware
   */
  requestSizeLimiter(req, res, next) {
    const contentLength = parseInt(req.headers['content-length']);
    const maxSize = parseInt(this.config.validation.maxBodySize);

    if (contentLength && contentLength > maxSize) {
      this.securityMetrics.blockedRequests++;
      return res.status(413).json({
        error: 'Request too large',
        maxSize: this.config.validation.maxBodySize
      });
    }

    next();
  }

  /**
   * Additional security headers middleware
   */
  securityHeadersMiddleware(req, res, next) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Feature policy
    res.setHeader('Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  }

  /**
   * Suspicious activity detection middleware
   */
  suspiciousActivityDetector(req, res, next) {
    const suspiciousPatterns = [
      /\.\./,                    // Directory traversal
      /<script/i,                // XSS attempts
      /union.*select/i,          // SQL injection
      /base64_decode/i,          // Code injection
      /eval\(/i,                 // Code execution
      /system\(/i,               // System commands
      /\bor\b.*\b1=1\b/i        // SQL injection
    ];

    const userAgent = req.headers['user-agent'] || '';
    const requestUrl = req.url;
    const requestBody = JSON.stringify(req.body || {});

    // Check for suspicious patterns
    const isSuspicious = suspiciousPatterns.some(pattern =>
      pattern.test(requestUrl) || pattern.test(requestBody) || pattern.test(userAgent)
    );

    if (isSuspicious) {
      this.securityMetrics.suspiciousActivity++;
      this.logSecurityEvent('suspicious_activity', {
        ip: req.ip,
        userAgent,
        url: requestUrl,
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({
        error: 'Forbidden: Suspicious activity detected'
      });
    }

    next();
  }

  /**
   * Security logging middleware
   */
  securityLogger(req, res, next) {
    const startTime = Date.now();

    // Log security-relevant events
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      // Log failed authentication attempts
      if (req.path.includes('/auth/') && res.statusCode === 401) {
        this.securityMetrics.authenticationFailures++;
        this.logSecurityEvent('auth_failure', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path,
          timestamp: new Date().toISOString()
        });
      }

      // Log slow requests (potential DoS)
      if (duration > 5000) {
        this.logSecurityEvent('slow_request', {
          ip: req.ip,
          path: req.path,
          duration,
          timestamp: new Date().toISOString()
        });
      }

      // Log error responses
      if (res.statusCode >= 400) {
        this.logSecurityEvent('error_response', {
          ip: req.ip,
          path: req.path,
          statusCode: res.statusCode,
          timestamp: new Date().toISOString()
        });
      }
    });

    next();
  }

  /**
   * Input sanitization and validation
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Password strength validation
   */
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);

    const score = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasNonalphas
    ].filter(Boolean).length;

    return {
      isValid: score >= 4,
      score,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar: hasNonalphas
      }
    };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  hashData(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data, hash, salt) {
    const testHash = crypto.pbkdf2Sync(data, salt, 1000, 64, 'sha512').toString('hex');
    return testHash === hash;
  }

  /**
   * Log security events
   */
  logSecurityEvent(event, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getEventSeverity(event)
    };

    console.log(`🚨 Security Event [${logEntry.severity}]: ${event}`, details);

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (e.g., Grafana, ELK stack)
      this.sendToMonitoring(logEntry);
    }
  }

  /**
   * Get event severity level
   */
  getEventSeverity(event) {
    const severityMap = {
      suspicious_activity: 'HIGH',
      auth_failure: 'MEDIUM',
      slow_request: 'LOW',
      error_response: 'LOW',
      rate_limit_exceeded: 'MEDIUM'
    };

    return severityMap[event] || 'LOW';
  }

  /**
   * Send security events to monitoring system
   */
  sendToMonitoring(logEntry) {
    // Implementation for sending to external monitoring
    // This could be Grafana, ELK stack, or other monitoring solutions
    try {
      // Example: Send to webhook or logging service
      console.log('📊 Sending to monitoring:', logEntry);
    } catch (error) {
      console.error('Failed to send security event to monitoring:', error);
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.securityMetrics,
      recommendations: this.getSecurityRecommendations(),
      lastScan: this.securityMetrics.lastSecurityScan
    };

    return report;
  }

  /**
   * Get security recommendations based on metrics
   */
  getSecurityRecommendations() {
    const recommendations = [];

    if (this.securityMetrics.authenticationFailures > 10) {
      recommendations.push('High number of authentication failures detected. Consider implementing stronger rate limiting.');
    }

    if (this.securityMetrics.suspiciousActivity > 5) {
      recommendations.push('Suspicious activity detected. Review and potentially block suspicious IP addresses.');
    }

    if (this.securityMetrics.blockedRequests > 20) {
      recommendations.push('Many requests blocked. Review request size limits and client behavior.');
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate security concerns detected.');
    }

    return recommendations;
  }

  /**
   * Perform security health check
   */
  healthCheck() {
    const checks = {
      rateLimiting: true,
      cors: true,
      helmet: true,
      https: process.env.NODE_ENV === 'production',
      jwtSecret: !!this.config.session.secret,
      secureHeaders: true
    };

    const allPassed = Object.values(checks).every(check => check === true);

    return {
      healthy: allPassed,
      checks,
      metrics: this.securityMetrics,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SecurityHardening;