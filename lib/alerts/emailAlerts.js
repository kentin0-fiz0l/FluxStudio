/**
 * Email Alert System for Security Events
 * Sprint 13, Day 3: Token Cleanup & Enhanced Rate Limiting
 *
 * Features:
 * - SMTP integration (SendGrid, AWS SES, or custom)
 * - Template system for different alert types
 * - Priority-based alerting
 * - Rate limiting to prevent spam
 * - Batch similar alerts
 * - Graceful degradation when SMTP not configured
 *
 * Date: 2025-10-15
 */

const securityLogger = require('../auth/securityLogger');
const cache = require('../cache');
const { createLogger } = require('../logger');
const log = createLogger('EmailAlerts');

class EmailAlertSystem {
  constructor() {
    // Alert type configurations
    this.alertTypes = {
      BRUTE_FORCE: {
        priority: 'high',
        threshold: 'immediate',
        subject: '🚨 Brute Force Attack Detected - FluxStudio',
        batchable: false
      },
      ACCOUNT_TAKEOVER: {
        priority: 'critical',
        threshold: 'immediate',
        subject: '🔴 Possible Account Takeover - FluxStudio',
        batchable: false
      },
      RAPID_TOKEN_REFRESH: {
        priority: 'high',
        threshold: 'immediate',
        subject: '⚠️  Suspicious Token Activity - FluxStudio',
        batchable: false
      },
      BOT_ACTIVITY: {
        priority: 'medium',
        threshold: 'batch_5min',
        subject: '🤖 Bot Activity Detected - FluxStudio',
        batchable: true
      },
      MULTIPLE_DEVICES: {
        priority: 'low',
        threshold: 'batch_1hour',
        subject: 'ℹ️  Multiple Device Login - FluxStudio',
        batchable: true
      },
      IP_BANNED: {
        priority: 'high',
        threshold: 'immediate',
        subject: '🚫 IP Address Auto-Banned - FluxStudio',
        batchable: false
      },
      RATE_LIMIT_ABUSE: {
        priority: 'medium',
        threshold: 'batch_5min',
        subject: '⏱️  Rate Limit Abuse Detected - FluxStudio',
        batchable: true
      },
      SECURITY_EVENT: {
        priority: 'medium',
        threshold: 'batch_15min',
        subject: '🔒 Security Event - FluxStudio',
        batchable: true
      }
    };

    // Configuration
    this.enabled = process.env.ALERT_ENABLED === 'true';
    this.smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@fluxstudio.art';

    // Alert rate limiting (prevent spam)
    this.alertRateLimits = {
      perType: {
        max: 10,      // Max 10 alerts per type
        window: 3600  // Per hour
      },
      global: {
        max: 50,      // Max 50 total alerts
        window: 3600  // Per hour
      }
    };

    // Batch queue
    this.batchQueue = new Map();
  }

  /**
   * Check if email alerts are enabled and configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.enabled && this.smtpConfigured;
  }

  /**
   * Get or create nodemailer transporter
   * @returns {Object|null} Nodemailer transporter
   * @private
   */
  getTransporter() {
    if (this._transporter) {
      return this._transporter;
    }

    if (!this.smtpConfigured) {
      return null;
    }

    try {
      const nodemailer = require('nodemailer');

      // Support multiple providers via environment variables
      const transportConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      // SendGrid specific configuration
      if (process.env.SENDGRID_API_KEY) {
        this._transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        });
      } else {
        this._transporter = nodemailer.createTransport(transportConfig);
      }

      return this._transporter;
    } catch (error) {
      log.error('Error creating email transporter', error);
      return null;
    }
  }

  /**
   * Send email alert
   *
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {Promise<boolean>} Success status
   * @private
   */
  async sendEmail(type, data) {
    if (!this.isConfigured()) {
      log.warn('Email alerts not configured - skipping email send');
      return false;
    }

    try {
      const config = this.alertTypes[type] || this.alertTypes.SECURITY_EVENT;
      const fromEmail = process.env.SMTP_FROM || 'alerts@fluxstudio.art';

      const emailData = {
        from: fromEmail,
        to: this.adminEmail,
        subject: config.subject,
        text: this.formatEmailBody(type, data),
        html: this.formatEmailBodyHTML(type, data),
        priority: config.priority === 'critical' ? 'high' : 'normal'
      };

      // Log the alert attempt
      log.info('Email Alert', {
        type,
        to: emailData.to,
        subject: emailData.subject,
        priority: config.priority
      });

      // Get transporter and send
      const transporter = this.getTransporter();
      if (transporter) {
        await transporter.sendMail(emailData);
        log.info('Email sent successfully');
      } else {
        log.warn('No email transporter available - alert logged only');
      }

      return true;
    } catch (error) {
      log.error('Error sending email alert', error);
      return false;
    }
  }

  /**
   * Format email body as HTML
   *
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {string} Formatted HTML email body
   * @private
   */
  formatEmailBodyHTML(type, data) {
    const timestamp = new Date().toISOString();
    const priority = this.alertTypes[type]?.priority || 'medium';
    const priorityColor = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a'
    }[priority] || '#6b7280';

    let detailsHtml = '';
    for (const [key, value] of Object.entries(data)) {
      const displayValue = typeof value === 'object'
        ? `<pre style="margin: 0; font-size: 12px;">${JSON.stringify(value, null, 2)}</pre>`
        : String(value);
      detailsHtml += `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${key}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${displayValue}</td></tr>`;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 24px; color: white;">
      <h1 style="margin: 0; font-size: 20px;">FluxStudio Security Alert</h1>
    </div>
    <div style="padding: 24px;">
      <div style="display: flex; gap: 16px; margin-bottom: 20px;">
        <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 6px; flex: 1;">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Alert Type</div>
          <div style="font-weight: 600; margin-top: 4px;">${type}</div>
        </div>
        <div style="background: #f3f4f6; padding: 12px 16px; border-radius: 6px; flex: 1;">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Priority</div>
          <div style="font-weight: 600; margin-top: 4px; color: ${priorityColor};">${priority.toUpperCase()}</div>
        </div>
      </div>
      <div style="font-size: 12px; color: #6b7280; margin-bottom: 16px;">Time: ${timestamp}</div>
      <h2 style="font-size: 16px; margin: 0 0 12px 0; color: #374151;">Details</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${detailsHtml}
      </table>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        This is an automated alert from FluxStudio Security System.<br>
        Please review and take appropriate action if necessary.
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Format email body from alert data
   *
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {string} Formatted email body
   * @private
   */
  formatEmailBody(type, data) {
    const timestamp = new Date().toISOString();

    let body = `FluxStudio Security Alert\n`;
    body += `=====================================\n\n`;
    body += `Alert Type: ${type}\n`;
    body += `Time: ${timestamp}\n`;
    body += `Priority: ${this.alertTypes[type]?.priority || 'medium'}\n\n`;

    body += `Details:\n`;
    body += `--------\n`;

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') {
        body += `${key}: ${JSON.stringify(value, null, 2)}\n`;
      } else {
        body += `${key}: ${value}\n`;
      }
    }

    body += `\n`;
    body += `This is an automated alert from FluxStudio Security System.\n`;
    body += `Please review and take appropriate action if necessary.\n`;

    return body;
  }

  /**
   * Check if alert should be sent based on rate limits
   *
   * @param {string} type - Alert type
   * @returns {Promise<boolean>} True if alert should be sent
   * @private
   */
  async checkRateLimit(type) {
    try {
      // Check per-type rate limit
      const typeKey = `alert_ratelimit:type:${type}`;
      const typeCount = await cache.get(typeKey);
      const currentTypeCount = typeCount ? parseInt(typeCount, 10) : 0;

      if (currentTypeCount >= this.alertRateLimits.perType.max) {
        log.warn(`Alert rate limit exceeded for type: ${type}`);
        return false;
      }

      // Check global rate limit
      const globalKey = `alert_ratelimit:global`;
      const globalCount = await cache.get(globalKey);
      const currentGlobalCount = globalCount ? parseInt(globalCount, 10) : 0;

      if (currentGlobalCount >= this.alertRateLimits.global.max) {
        log.warn('Global alert rate limit exceeded');
        return false;
      }

      // Increment counters
      await cache.set(
        typeKey,
        (currentTypeCount + 1).toString(),
        this.alertRateLimits.perType.window
      );

      await cache.set(
        globalKey,
        (currentGlobalCount + 1).toString(),
        this.alertRateLimits.global.window
      );

      return true;
    } catch (error) {
      log.error('Error checking alert rate limit', error);
      return true; // Fail open - allow alert on error
    }
  }

  /**
   * Send immediate alert
   *
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   * @returns {Promise<boolean>} Success status
   */
  async sendImmediateAlert(type, data) {
    try {
      // Check rate limits
      const allowed = await this.checkRateLimit(type);
      if (!allowed) {
        return false;
      }

      // Send email
      const sent = await this.sendEmail(type, data);

      // Log alert
      await securityLogger.logEvent(
        'security_alert_sent',
        securityLogger.SEVERITY.INFO,
        {
          alertType: type,
          sent,
          configured: this.isConfigured(),
          ...data
        }
      );

      return sent;
    } catch (error) {
      log.error('Error sending immediate alert', error);
      return false;
    }
  }

  /**
   * Add alert to batch queue
   *
   * @param {string} type - Alert type
   * @param {Object} data - Alert data
   */
  async addToBatch(type, data) {
    try {
      const config = this.alertTypes[type];

      if (!config || !config.batchable) {
        // Not batchable - send immediately
        return await this.sendImmediateAlert(type, data);
      }

      // Add to queue
      if (!this.batchQueue.has(type)) {
        this.batchQueue.set(type, []);
      }

      this.batchQueue.get(type).push({
        ...data,
        timestamp: new Date().toISOString()
      });

      log.info(`Alert added to batch queue: ${type} (${this.batchQueue.get(type).length} queued)`);

      return true;
    } catch (error) {
      log.error('Error adding alert to batch', error);
      return false;
    }
  }

  /**
   * Send batched alerts
   *
   * @param {string} type - Alert type to send
   * @returns {Promise<boolean>} Success status
   */
  async sendBatchedAlerts(type) {
    try {
      const alerts = this.batchQueue.get(type);

      if (!alerts || alerts.length === 0) {
        return false;
      }

      // Prepare batched data
      const batchData = {
        alertType: type,
        count: alerts.length,
        alerts: alerts,
        batchedAt: new Date().toISOString()
      };

      // Send email with all batched alerts
      const sent = await this.sendEmail(type, batchData);

      if (sent) {
        // Clear queue for this type
        this.batchQueue.delete(type);
        log.info(`Sent ${alerts.length} batched alerts: ${type}`);
      }

      return sent;
    } catch (error) {
      log.error('Error sending batched alerts', error);
      return false;
    }
  }

  /**
   * Send all queued batched alerts
   * Call this periodically via cron
   *
   * @returns {Promise<number>} Number of batches sent
   */
  async sendAllBatched() {
    try {
      let sent = 0;

      for (const type of this.batchQueue.keys()) {
        const success = await this.sendBatchedAlerts(type);
        if (success) sent++;
      }

      if (sent > 0) {
        log.info(`Sent ${sent} batched alert emails`);
      }

      return sent;
    } catch (error) {
      log.error('Error sending all batched alerts', error);
      return 0;
    }
  }

  /**
   * Send security event alert
   * Automatically determines if immediate or batched
   *
   * @param {string} eventType - Security event type
   * @param {Object} data - Event data
   * @returns {Promise<boolean>} Success status
   */
  async sendSecurityAlert(eventType, data) {
    try {
      // Map event types to alert types
      const alertTypeMap = {
        brute_force_detected: 'BRUTE_FORCE',
        account_takeover_attempt: 'ACCOUNT_TAKEOVER',
        rapid_token_refresh: 'RAPID_TOKEN_REFRESH',
        bot_activity_detected: 'BOT_ACTIVITY',
        multiple_device_login: 'MULTIPLE_DEVICES',
        ip_auto_banned: 'IP_BANNED',
        rate_limit_exceeded: 'RATE_LIMIT_ABUSE',
        default: 'SECURITY_EVENT'
      };

      const alertType = alertTypeMap[eventType] || alertTypeMap.default;
      const config = this.alertTypes[alertType];

      // Immediate vs batched
      if (config.threshold === 'immediate') {
        return await this.sendImmediateAlert(alertType, data);
      } else {
        return await this.addToBatch(alertType, data);
      }
    } catch (error) {
      log.error('Error sending security alert', error);
      return false;
    }
  }

  /**
   * Get alert statistics
   *
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    try {
      const stats = {
        configured: this.isConfigured(),
        enabled: this.enabled,
        smtpConfigured: this.smtpConfigured,
        adminEmail: this.adminEmail,
        queuedBatches: this.batchQueue.size,
        queuedAlerts: 0,
        rateLimits: this.alertRateLimits
      };

      // Count queued alerts
      for (const alerts of this.batchQueue.values()) {
        stats.queuedAlerts += alerts.length;
      }

      return stats;
    } catch (error) {
      log.error('Error getting alert statistics', error);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new EmailAlertSystem();
