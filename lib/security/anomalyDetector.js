/**
 * Anomaly Detector for Security Threat Detection
 * Sprint 13, Day 2: Sentry Integration & Anomaly Detection
 *
 * Detects suspicious patterns:
 * - Brute force login attempts
 * - Multiple device logins
 * - Rapid token refresh
 * - Geographic anomalies
 * - Bot/scanner activity
 *
 * Date: 2025-10-15
 */

const cache = require('../cache');
const securityLogger = require('../auth/securityLogger');
const { captureSecurityEvent } = require('../monitoring/sentry');

class AnomalyDetector {
  constructor() {
    // Detection thresholds
    this.thresholds = {
      failedLogin: {
        count: 5,
        window: 300 // 5 minutes in seconds
      },
      multipleDevices: {
        count: 3,
        window: 3600 // 1 hour in seconds
      },
      tokenRefresh: {
        count: 10,
        window: 600 // 10 minutes in seconds
      },
      rapidRequests: {
        count: 50,
        window: 60 // 1 minute in seconds
      }
    };
  }

  /**
   * Check for brute force login attempts
   *
   * @param {string} email - User email
   * @param {string} ipAddress - IP address
   * @returns {Promise<boolean>} True if anomaly detected
   */
  async checkFailedLoginRate(email, ipAddress) {
    try {
      const key = `failed_login:${email}:${ipAddress}`;
      const count = await this.incrementCounter(key, this.thresholds.failedLogin.window);

      if (count >= this.thresholds.failedLogin.count) {
        await this.reportAnomaly({
          type: 'brute_force_detected',
          severity: 'high',
          email,
          ipAddress,
          count,
          threshold: this.thresholds.failedLogin.count,
          window: this.thresholds.failedLogin.window
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking failed login rate:', error);
      return false; // Fail open - don't block on errors
    }
  }

  /**
   * Reset failed login counter (on successful login)
   *
   * @param {string} email - User email
   * @param {string} ipAddress - IP address
   */
  async resetFailedLoginCounter(email, ipAddress) {
    try {
      const key = `failed_login:${email}:${ipAddress}`;
      await cache.del(key);
    } catch (error) {
      console.error('Error resetting failed login counter:', error);
    }
  }

  /**
   * Check for multiple device logins
   *
   * @param {string} userId - User ID
   * @param {Array} sessions - Active user sessions
   * @returns {Promise<boolean>} True if anomaly detected
   */
  async checkMultipleDevices(userId, sessions) {
    try {
      // Get unique device fingerprints
      const uniqueFingerprints = new Set(
        sessions
          .filter(s => s.device_fingerprint)
          .map(s => s.device_fingerprint)
      );

      if (uniqueFingerprints.size >= this.thresholds.multipleDevices.count) {
        await this.reportAnomaly({
          type: 'multiple_device_login',
          severity: 'warning',
          userId,
          deviceCount: uniqueFingerprints.size,
          threshold: this.thresholds.multipleDevices.count,
          sessions: sessions.map(s => ({
            deviceName: s.device_name,
            lastUsed: s.last_used_at,
            ipAddress: s.ip_address
          }))
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking multiple devices:', error);
      return false;
    }
  }

  /**
   * Check for rapid token refresh (possible token theft)
   *
   * @param {string} userId - User ID
   * @param {string} tokenId - Token ID
   * @returns {Promise<boolean>} True if anomaly detected
   */
  async checkTokenRefreshRate(userId, tokenId) {
    try {
      const key = `token_refresh:${userId}:${tokenId}`;
      const count = await this.incrementCounter(key, this.thresholds.tokenRefresh.window);

      if (count >= this.thresholds.tokenRefresh.count) {
        await this.reportAnomaly({
          type: 'rapid_token_refresh',
          severity: 'high',
          userId,
          tokenId,
          count,
          threshold: this.thresholds.tokenRefresh.count,
          window: this.thresholds.tokenRefresh.window
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking token refresh rate:', error);
      return false;
    }
  }

  /**
   * Check for rapid requests from same IP (possible bot/scanner)
   *
   * @param {string} ipAddress - IP address
   * @param {string} endpoint - Endpoint being accessed
   * @returns {Promise<boolean>} True if anomaly detected
   */
  async checkRequestRate(ipAddress, endpoint) {
    try {
      const key = `request_rate:${ipAddress}:${endpoint}`;
      const count = await this.incrementCounter(key, this.thresholds.rapidRequests.window);

      if (count >= this.thresholds.rapidRequests.count) {
        await this.reportAnomaly({
          type: 'bot_activity_detected',
          severity: 'warning',
          ipAddress,
          endpoint,
          count,
          threshold: this.thresholds.rapidRequests.count,
          window: this.thresholds.rapidRequests.window
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking request rate:', error);
      return false;
    }
  }

  /**
   * Check for suspicious user agent (bots, scanners)
   *
   * @param {string} userAgent - User agent string
   * @returns {boolean} True if suspicious
   */
  checkSuspiciousUserAgent(userAgent) {
    if (!userAgent) {
      return true;
    }

    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
      /go-http-client/i,
      /nikto/i,
      /sqlmap/i,
      /nmap/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Detect account takeover patterns
   *
   * @param {string} userId - User ID
   * @param {string} currentIp - Current IP address
   * @param {string} previousIp - Previous IP address
   * @param {string} currentLocation - Current geographic location
   * @param {string} previousLocation - Previous geographic location
   * @returns {Promise<boolean>} True if anomaly detected
   */
  async checkAccountTakeover(userId, currentIp, previousIp, currentLocation, previousLocation) {
    try {
      // Check for sudden IP change
      if (currentIp !== previousIp) {
        // Check for impossible travel (different countries in short time)
        if (currentLocation && previousLocation && currentLocation !== previousLocation) {
          await this.reportAnomaly({
            type: 'geographic_anomaly',
            severity: 'high',
            userId,
            currentIp,
            previousIp,
            currentLocation,
            previousLocation
          });

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking account takeover:', error);
      return false;
    }
  }

  /**
   * Increment counter in Redis with expiration
   *
   * @param {string} key - Redis key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<number>} Current count
   * @private
   */
  async incrementCounter(key, ttl) {
    try {
      // Get current count
      const current = await cache.get(key);
      const count = current ? parseInt(current, 10) + 1 : 1;

      // Set new count with TTL
      await cache.set(key, count.toString(), ttl);

      return count;
    } catch (error) {
      console.error('Error incrementing counter:', error);
      return 0;
    }
  }

  /**
   * Report detected anomaly
   *
   * @param {Object} anomaly - Anomaly details
   * @private
   */
  async reportAnomaly(anomaly) {
    try {
      // Log to security events
      await securityLogger.logEvent(
        anomaly.type,
        securityLogger.SEVERITY[anomaly.severity.toUpperCase()] || securityLogger.SEVERITY.WARNING,
        {
          ...anomaly,
          detectedAt: new Date().toISOString(),
          source: 'anomaly_detector'
        }
      );

      // Send to Sentry
      captureSecurityEvent(
        anomaly.type,
        anomaly.severity,
        {
          ...anomaly,
          detectedAt: new Date().toISOString()
        }
      );

      // Log to console
      console.warn(`⚠️  Security Anomaly Detected: ${anomaly.type}`, {
        severity: anomaly.severity,
        details: anomaly
      });

      // Update IP reputation (Sprint 13 Day 3)
      if (anomaly.ipAddress) {
        try {
          const ipReputation = require('./ipReputation');
          await ipReputation.adjustScore(anomaly.ipAddress, anomaly.type, anomaly);
        } catch (error) {
          console.error('Error updating IP reputation:', error);
        }
      }

      // Send email alerts for high/critical severity (Sprint 13 Day 3)
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        try {
          const emailAlerts = require('../alerts/emailAlerts');
          await emailAlerts.sendSecurityAlert(anomaly.type, anomaly);
        } catch (error) {
          console.error('Error sending email alert:', error);
        }
      }

    } catch (error) {
      console.error('Error reporting anomaly:', error);
    }
  }

  /**
   * Get anomaly statistics for a user
   *
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Anomaly statistics
   */
  async getUserAnomalyStats(userId, days = 30) {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const events = await securityLogger.getRecentEvents({
        userId,
        fromDate,
        limit: 1000
      });

      // Count by type
      const byType = {};
      const bySeverity = {};

      events.forEach(event => {
        // Count by type
        byType[event.event_type] = (byType[event.event_type] || 0) + 1;

        // Count by severity
        bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
      });

      return {
        userId,
        period: {
          days,
          from: fromDate.toISOString(),
          to: new Date().toISOString()
        },
        totalEvents: events.length,
        byType,
        bySeverity,
        lastEvent: events[0] || null
      };
    } catch (error) {
      console.error('Error getting user anomaly stats:', error);
      return null;
    }
  }

  /**
   * Block IP address temporarily
   *
   * @param {string} ipAddress - IP address to block
   * @param {number} duration - Block duration in seconds
   * @param {string} reason - Block reason
   */
  async blockIpAddress(ipAddress, duration = 3600, reason = 'suspicious_activity') {
    try {
      const key = `blocked_ip:${ipAddress}`;
      await cache.set(key, JSON.stringify({ reason, blockedAt: new Date().toISOString() }), duration);

      console.warn(`🚫 IP Blocked: ${ipAddress} for ${duration}s (${reason})`);

      // Log the block
      await securityLogger.logEvent(
        'ip_address_blocked',
        securityLogger.SEVERITY.WARNING,
        {
          ipAddress,
          duration,
          reason,
          blockedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error blocking IP address:', error);
    }
  }

  /**
   * Check if IP address is blocked
   *
   * @param {string} ipAddress - IP address to check
   * @returns {Promise<boolean>} True if blocked
   */
  async isIpBlocked(ipAddress) {
    try {
      const key = `blocked_ip:${ipAddress}`;
      const blocked = await cache.get(key);
      return !!blocked;
    } catch (error) {
      console.error('Error checking IP block:', error);
      return false; // Fail open
    }
  }
}

// Export singleton instance
module.exports = new AnomalyDetector();
