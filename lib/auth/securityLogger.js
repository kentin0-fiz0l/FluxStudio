/**
 * Security Events Logger
 * Sprint 13: Security Monitoring & Observability
 *
 * Centralized security event logging service that captures all security-relevant
 * events across the authentication system.
 */

const db = require('../db');

// Security event types
const EVENT_TYPES = {
  // Authentication Events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failed',
  SIGNUP_SUCCESS: 'signup_success',
  SIGNUP_FAILURE: 'signup_failed',
  OAUTH_SUCCESS: 'oauth_success',
  OAUTH_FAILURE: 'oauth_failed',
  LOGOUT: 'logout',
  LOGOUT_ALL: 'logout_all',

  // Token Events
  TOKEN_GENERATED: 'token_generated',
  TOKEN_REFRESHED: 'token_refreshed',
  TOKEN_REVOKED: 'token_revoked',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  TOKEN_VERIFICATION_FAILED: 'token_verification_failed',

  // Security Events
  FAILED_LOGIN_ATTEMPT: 'failed_login_attempt',
  DEVICE_FINGERPRINT_MISMATCH: 'device_fingerprint_mismatch',
  SUSPICIOUS_TOKEN_USAGE: 'suspicious_token_usage',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  MULTIPLE_DEVICE_LOGIN: 'multiple_device_login',
  SESSION_HIJACK_ATTEMPT: 'session_hijack_attempt',
  INVALID_CSRF_TOKEN: 'invalid_csrf_token',
  BRUTE_FORCE_DETECTED: 'brute_force_detected',

  // Administrative Events
  MASS_TOKEN_REVOCATION: 'mass_token_revocation',
  TOKEN_CLEANUP: 'token_cleanup',
  USER_ACCOUNT_LOCKED: 'user_account_locked',
  USER_ACCOUNT_UNLOCKED: 'user_account_unlocked',
};

// Severity levels
const SEVERITY = {
  INFO: 'info',
  LOW: 'low',
  WARNING: 'warning',
  HIGH: 'high',
  CRITICAL: 'critical',
};

class SecurityLogger {
  constructor() {
    this.EVENT_TYPES = EVENT_TYPES;
    this.SEVERITY = SEVERITY;
  }

  /**
   * Log a security event to the database
   * @param {string} eventType - Type of security event
   * @param {string} severity - Severity level
   * @param {object} metadata - Event metadata
   * @returns {Promise<string|null>} Event ID or null if failed
   */
  async logEvent(eventType, severity, metadata = {}) {
    const query = `
      INSERT INTO security_events (
        event_type, severity, user_id, token_id,
        ip_address, user_agent, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id
    `;

    const values = [
      eventType,
      severity,
      metadata.userId || null,
      metadata.tokenId || null,
      metadata.ipAddress || null,
      metadata.userAgent || null,
      JSON.stringify(metadata)
    ];

    try {
      const result = await db.query(query, values);
      const eventId = result.rows[0].id;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔐 Security Event [${severity}]: ${eventType}`, {
          eventId,
          userId: metadata.userId,
          ipAddress: metadata.ipAddress,
        });
      }

      return eventId;
    } catch (error) {
      console.error('❌ Failed to log security event:', error);
      // Fail gracefully - never block auth flow due to logging failure
      return null;
    }
  }

  /**
   * Log a successful login
   */
  async logLoginSuccess(userId, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.LOGIN_SUCCESS, SEVERITY.INFO, {
      userId,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      deviceFingerprint: metadata.deviceFingerprint,
      deviceName: metadata.deviceName,
      email: metadata.email,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log a failed login attempt
   */
  async logLoginFailure(email, reason, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.FAILED_LOGIN_ATTEMPT, SEVERITY.WARNING, {
      email,
      reason,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log a successful signup
   */
  async logSignupSuccess(userId, email, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.SIGNUP_SUCCESS, SEVERITY.INFO, {
      userId,
      email,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      userType: metadata.userType,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log a failed signup attempt
   */
  async logSignupFailure(email, reason, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.SIGNUP_FAILURE, SEVERITY.WARNING, {
      email,
      reason,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log a successful OAuth authentication
   */
  async logOAuthSuccess(userId, provider, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.OAUTH_SUCCESS, SEVERITY.INFO, {
      userId,
      provider,
      email: metadata.email,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log a failed OAuth attempt
   */
  async logOAuthFailure(provider, reason, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.OAUTH_FAILURE, SEVERITY.WARNING, {
      provider,
      reason,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log token generation
   */
  async logTokenGenerated(userId, tokenId, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.TOKEN_GENERATED, SEVERITY.INFO, {
      userId,
      tokenId,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      deviceFingerprint: metadata.deviceFingerprint,
      expiresAt: metadata.expiresAt,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log token refresh
   */
  async logTokenRefreshed(userId, oldTokenId, newTokenId, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.TOKEN_REFRESHED, SEVERITY.INFO, {
      userId,
      tokenId: newTokenId,
      oldTokenId,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log token revocation
   */
  async logTokenRevoked(userId, tokenId, reason, metadata = {}) {
    return this.logEvent(EVENT_TYPES.TOKEN_REVOKED, SEVERITY.INFO, {
      userId,
      tokenId,
      reason,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(userId, activityType, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.SUSPICIOUS_TOKEN_USAGE, SEVERITY.HIGH, {
      userId,
      activityType,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log device fingerprint mismatch
   */
  async logDeviceMismatch(userId, tokenId, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.DEVICE_FINGERPRINT_MISMATCH, SEVERITY.WARNING, {
      userId,
      tokenId,
      expectedFingerprint: metadata.expectedFingerprint,
      actualFingerprint: metadata.actualFingerprint,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(endpoint, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.RATE_LIMIT_EXCEEDED, SEVERITY.WARNING, {
      endpoint,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log logout event
   */
  async logLogout(userId, tokenId, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.LOGOUT, SEVERITY.INFO, {
      userId,
      tokenId,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Log logout all devices
   */
  async logLogoutAll(userId, tokensRevoked, request, metadata = {}) {
    return this.logEvent(EVENT_TYPES.LOGOUT_ALL, SEVERITY.INFO, {
      userId,
      tokensRevoked,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  /**
   * Get recent security events
   */
  async getRecentEvents(filters = {}) {
    const {
      eventType,
      severity,
      userId,
      limit = 100,
      offset = 0,
      fromDate,
      toDate
    } = filters;

    let query = `
      SELECT * FROM security_events
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (eventType) {
      query += ` AND event_type = $${paramIndex++}`;
      values.push(eventType);
    }

    if (severity) {
      query += ` AND severity = $${paramIndex++}`;
      values.push(severity);
    }

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      values.push(userId);
    }

    if (fromDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      values.push(fromDate);
    }

    if (toDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      values.push(toDate);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Failed to retrieve security events:', error);
      return [];
    }
  }

  /**
   * Get security event counts by type
   */
  async getEventCounts(filters = {}) {
    const { fromDate, toDate } = filters;

    let query = `
      SELECT event_type, severity, COUNT(*) as count
      FROM security_events
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (fromDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      values.push(fromDate);
    }

    if (toDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      values.push(toDate);
    }

    query += ` GROUP BY event_type, severity ORDER BY count DESC`;

    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Failed to get event counts:', error);
      return [];
    }
  }

  /**
   * Get security summary for a user
   */
  async getUserSecuritySummary(userId, days = 30) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const query = `
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'login_success') as successful_logins,
        COUNT(*) FILTER (WHERE event_type = 'failed_login_attempt') as failed_logins,
        COUNT(*) FILTER (WHERE severity IN ('high', 'critical')) as high_severity_events,
        COUNT(DISTINCT ip_address) as unique_ips,
        MAX(created_at) as last_activity
      FROM security_events
      WHERE user_id = $1
        AND created_at >= $2
    `;

    try {
      const result = await db.query(query, [userId, fromDate]);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to get user security summary:', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new SecurityLogger();
