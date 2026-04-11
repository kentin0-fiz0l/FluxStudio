/**
 * Email Service for FluxStudio
 * Handles transactional emails: verification, password reset, welcome
 *
 * Features:
 * - SMTP/SendGrid support via environment variables
 * - HTML + plain text templates
 * - Rate limiting integration
 * - Graceful degradation
 *
 * Environment Variables Required:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * - Or: SENDGRID_API_KEY
 */

const crypto = require('crypto');
const securityLogger = require('../auth/securityLogger');
const { createLogger } = require('../logger');
const log = createLogger('EmailService');
const { createCircuitBreaker } = require('../circuitBreaker');

const emailBreaker = createCircuitBreaker({
  name: 'email-smtp',
  failureThreshold: 5,
  recoveryTimeout: 30000,
});

class EmailService {
  constructor() {
    this.enabled = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER ||
      process.env.SENDGRID_API_KEY
    );
    this.fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@fluxstudio.art';
    this.fromName = process.env.SMTP_FROM_NAME || 'FluxStudio';
    this.frontendUrl = process.env.FRONTEND_URL || 'https://fluxstudio.art';
    this._transporter = null;
  }

  /**
   * Check if email service is configured
   */
  isConfigured() {
    return this.enabled;
  }

  /**
   * Get or create nodemailer transporter
   * @private
   */
  getTransporter() {
    if (this._transporter) {
      return this._transporter;
    }

    if (!this.enabled) {
      return null;
    }

    try {
      const nodemailer = require('nodemailer');

      // SendGrid takes priority
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
        // Generic SMTP
        this._transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD
          }
        });
      }

      return this._transporter;
    } catch (error) {
      log.error('Error creating email transporter', error);
      return null;
    }
  }

  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default 32)
   * @returns {string} Hex-encoded token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate token expiry timestamp
   * @param {number} hours - Hours until expiry
   * @returns {Date} Expiry timestamp
   */
  generateExpiry(hours = 24) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  /**
   * Send an email
   * @private
   */
  async sendEmail(options) {
    if (!this.isConfigured()) {
      log.warn('Email service not configured - email not sent', { to: options.to, subject: options.subject });
      return false;
    }

    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        log.error('Failed to get email transporter');
        return false;
      }

      await emailBreaker.execute(() => transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo || undefined
      }));

      log.info('Email sent successfully', { to: options.to, subject: options.subject });
      return true;
    } catch (error) {
      log.error('Error sending email', error);
      await securityLogger.logEvent(
        'email_send_failed',
        securityLogger.SEVERITY.WARNING,
        {
          to: options.to,
          subject: options.subject,
          error: error.message
        }
      );
      return false;
    }
  }

  /**
   * Send email verification email
   * @param {string} email - Recipient email
   * @param {string} token - Verification token
   * @param {string} userName - User's name for personalization
   */
  async sendVerificationEmail(email, token, userName = 'there') {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    const subject = 'Verify your FluxStudio email';

    const text = `
Hi ${userName},

Welcome to FluxStudio! Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account with FluxStudio, you can safely ignore this email.

Best,
The FluxStudio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">FluxStudio</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="font-size: 24px; color: white; margin: 0 0 16px 0;">Verify your email</h2>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${userName},<br><br>
        Welcome to FluxStudio! Click the button below to verify your email address and get started.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #71717a; font-size: 14px; margin: 0 0 16px 0;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color: #3b82f6; font-size: 12px; word-break: break-all; background: rgba(59,130,246,0.1); padding: 12px; border-radius: 6px; margin: 0 0 24px 0;">
        ${verifyUrl}
      </p>
      <p style="color: #52525b; font-size: 13px; margin: 0;">
        This link expires in 24 hours. If you didn't create a FluxStudio account, you can ignore this email.
      </p>
    </div>
    <div style="background: #0a0a0a; padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.05);">
      <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} FluxStudio. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} token - Reset token
   * @param {string} userName - User's name for personalization
   */
  async sendPasswordResetEmail(email, token, userName = 'there') {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const subject = 'Reset your FluxStudio password';

    const text = `
Hi ${userName},

We received a request to reset your FluxStudio password. Click the link below to choose a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best,
The FluxStudio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">FluxStudio</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="font-size: 24px; color: white; margin: 0 0 16px 0;">Reset your password</h2>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${userName},<br><br>
        We received a request to reset your password. Click the button below to choose a new password.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      <p style="color: #71717a; font-size: 14px; margin: 0 0 16px 0;">
        Or copy and paste this link into your browser:
      </p>
      <p style="color: #f59e0b; font-size: 12px; word-break: break-all; background: rgba(245,158,11,0.1); padding: 12px; border-radius: 6px; margin: 0 0 24px 0;">
        ${resetUrl}
      </p>
      <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <p style="color: #ef4444; font-size: 13px; margin: 0;">
          ⚠️ This link expires in 1 hour. If you didn't request this reset, please ignore this email.
        </p>
      </div>
    </div>
    <div style="background: #0a0a0a; padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.05);">
      <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} FluxStudio. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send welcome email after verification
   * @param {string} email - Recipient email
   * @param {string} userName - User's name for personalization
   */
  async sendWelcomeEmail(email, userName = 'there') {
    const dashboardUrl = `${this.frontendUrl}/projects`;
    const helpUrl = `${this.frontendUrl}/help`;

    const subject = 'Welcome to FluxStudio! 🎉';

    const text = `
Hi ${userName},

Your email has been verified and your FluxStudio account is ready!

Here's how to get started:
1. Create your first project
2. Invite team members to collaborate
3. Start designing amazing visual performances

Visit your dashboard: ${dashboardUrl}

Need help? Check out our help center: ${helpUrl}

We're excited to see what you create!

Best,
The FluxStudio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">Welcome to FluxStudio! 🎉</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="font-size: 24px; color: white; margin: 0 0 16px 0;">You're all set, ${userName}!</h2>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your email has been verified and your account is ready. Let's create something amazing together.
      </p>

      <div style="margin: 32px 0;">
        <h3 style="color: white; font-size: 16px; margin: 0 0 16px 0;">Get started in 3 steps:</h3>
        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px;">1</span>
            <span style="color: #e4e4e7;">Create your first project</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <span style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px;">2</span>
            <span style="color: #e4e4e7;">Invite team members to collaborate</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px;">3</span>
            <span style="color: #e4e4e7;">Start designing amazing performances</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>

      <p style="color: #71717a; font-size: 14px; margin: 0; text-align: center;">
        Need help? <a href="${helpUrl}" style="color: #3b82f6; text-decoration: none;">Visit our Help Center</a>
      </p>
    </div>
    <div style="background: #0a0a0a; padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.05);">
      <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">
        © ${new Date().getFullYear()} FluxStudio. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  // ===================================================================
  // Sprint 44: Collaboration Email Templates
  // ===================================================================

  /**
   * Send collaboration email based on type.
   * @param {'mention'|'project_shared'|'comment_reply'|'weekly_digest'} type
   * @param {string} recipientEmail
   * @param {Object} data - Template-specific data
   */
  async sendCollaborationEmail(type, recipientEmail, data) {
    switch (type) {
      case 'mention':
        return this.sendMentionEmail(recipientEmail, data);
      case 'project_shared':
        return this.sendProjectSharedEmail(recipientEmail, data);
      case 'comment_reply':
        return this.sendCommentReplyEmail(recipientEmail, data);
      case 'weekly_digest':
        return this.sendWeeklyDigestEmail(recipientEmail, data);
      default:
        log.warn('Unknown collaboration email type', { type });
        return false;
    }
  }

  /**
   * "@user mentioned you in Project X"
   */
  async sendMentionEmail(email, { senderName, projectName, commentPreview, deepLink }) {
    const subject = `${senderName} mentioned you in ${projectName}`;
    const ctaUrl = deepLink || `${this.frontendUrl}/projects`;

    const text = `
${senderName} mentioned you in ${projectName}:

"${commentPreview}"

View the full conversation: ${ctaUrl}

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      heading: `${senderName} mentioned you`,
      subtext: `in <strong>${projectName}</strong>`,
      quote: commentPreview,
      ctaLabel: 'View Conversation',
      ctaUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * "User shared Project X with you"
   */
  async sendProjectSharedEmail(email, { senderName, projectName, role, deepLink }) {
    const subject = `${senderName} shared ${projectName} with you`;
    const ctaUrl = deepLink || `${this.frontendUrl}/projects`;

    const text = `
${senderName} invited you to collaborate on ${projectName} as ${role || 'a member'}.

Open the project: ${ctaUrl}

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      heading: `${senderName} shared a project`,
      subtext: `You've been added to <strong>${projectName}</strong> as ${role || 'a member'}`,
      ctaLabel: 'Open Project',
      ctaUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * "User replied to your comment"
   */
  async sendCommentReplyEmail(email, { senderName, commentPreview, deepLink }) {
    const subject = `${senderName} replied to your comment`;
    const ctaUrl = deepLink || `${this.frontendUrl}/projects`;

    const text = `
${senderName} replied to your comment:

"${commentPreview}"

View the thread: ${ctaUrl}

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      heading: `${senderName} replied to your comment`,
      quote: commentPreview,
      ctaLabel: 'View Thread',
      ctaUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * "Your week in FluxStudio — X projects, Y comments"
   */
  async sendWeeklyDigestEmail(email, { userName, projectCount, commentCount, taskCount, topProject, ctaUrl }) {
    const subject = `Your week in FluxStudio — ${projectCount} projects, ${commentCount} comments`;
    const url = ctaUrl || `${this.frontendUrl}/projects`;

    const text = `
Hi ${userName},

Here's your week in FluxStudio:
- ${projectCount} project${projectCount !== 1 ? 's' : ''} active
- ${commentCount} comment${commentCount !== 1 ? 's' : ''} posted
- ${taskCount} task${taskCount !== 1 ? 's' : ''} completed
${topProject ? `- Most active project: ${topProject}` : ''}

Keep the momentum going: ${url}

— The FluxStudio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; color: white; font-weight: 700;">Your Week in FluxStudio</h1>
    </div>
    <div style="padding: 40px 32px;">
      <p style="color: #a1a1aa; font-size: 16px; margin: 0 0 24px 0;">Hi ${userName},</p>
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        ${this._digestStat(projectCount, 'Projects')}
        ${this._digestStat(commentCount, 'Comments')}
        ${this._digestStat(taskCount, 'Tasks Done')}
      </div>
      ${topProject ? `<p style="color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0;">Most active: <strong style="color: white;">${topProject}</strong></p>` : ''}
      <div style="text-align: center; margin: 32px 0;">
        <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
      </div>
    </div>
    <div style="background: #0a0a0a; padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.05);">
      <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">© ${new Date().getFullYear()} FluxStudio. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  /** Reusable digest stat block */
  _digestStat(count, label) {
    return `<div style="flex: 1; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-size: 28px; font-weight: 700; color: white;">${count}</div>
      <div style="font-size: 12px; color: #71717a; margin-top: 4px;">${label}</div>
    </div>`;
  }

  /** Reusable collaboration email wrapper */
  _collaborationTemplate({ gradient, heading, subtext, quote, ctaLabel, ctaUrl }) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
    <div style="background: ${gradient}; padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">FluxStudio</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="font-size: 24px; color: white; margin: 0 0 8px 0;">${heading}</h2>
      ${subtext ? `<p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">${subtext}</p>` : ''}
      ${quote ? `<div style="background: rgba(255,255,255,0.05); border-left: 3px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 24px 0;">
        <p style="color: #e4e4e7; font-size: 14px; margin: 0; font-style: italic;">"${quote}"</p>
      </div>` : ''}
      <div style="text-align: center; margin: 32px 0;">
        <a href="${ctaUrl}" style="display: inline-block; background: ${gradient}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">${ctaLabel}</a>
      </div>
    </div>
    <div style="background: #0a0a0a; padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.05);">
      <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">© ${new Date().getFullYear()} FluxStudio. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim();
  }

  // ===================================================================
  // Phase 4: Subscription Lifecycle Emails
  // ===================================================================

  /**
   * Trial started — sent when user activates 14-day Pro trial
   */
  async sendTrialStartedEmail(email, userName = 'there') {
    const dashboardUrl = `${this.frontendUrl}/projects`;
    const subject = 'Your 14-day Pro trial has started!';

    const text = `
Hi ${userName},

Your 14-day Pro trial is now active! You have full access to all Pro features:

- AI drill writing assistant (200 calls/month)
- Real-time collaboration (up to 5 users)
- All export formats (PDF, Pyware, Dot Book)
- Audio sync & 3D preview

Your trial ends in 14 days. No credit card required.

Go to your dashboard: ${dashboardUrl}

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      heading: 'Your Pro trial is active!',
      subtext: `Hi ${userName}, you now have full access to all Pro features for 14 days. No credit card required.`,
      ctaLabel: 'Go to Dashboard',
      ctaUrl: dashboardUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Trial expiring — sent 3 days before trial ends
   */
  async sendTrialExpiringEmail(email, userName = 'there', daysRemaining = 3) {
    const pricingUrl = `${this.frontendUrl}/pricing`;
    const subject = `Your Pro trial ends in ${daysRemaining} days`;

    const text = `
Hi ${userName},

Your FluxStudio Pro trial ends in ${daysRemaining} days. After that, you'll be moved to the Free plan.

Don't lose access to:
- AI drill writing
- Real-time collaboration
- Advanced exports

Upgrade now and save 2 months with annual billing: ${pricingUrl}

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      heading: `Your trial ends in ${daysRemaining} days`,
      subtext: `Hi ${userName}, upgrade now to keep your Pro features. Save 2 months with annual billing.`,
      ctaLabel: 'Upgrade Now',
      ctaUrl: pricingUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Subscription confirmed — sent on checkout.session.completed
   */
  async sendSubscriptionConfirmedEmail(email, userName = 'there', planName = 'Pro') {
    const dashboardUrl = `${this.frontendUrl}/projects`;
    const subject = `Welcome to FluxStudio ${planName}!`;

    const text = `
Hi ${userName},

Thank you for subscribing to FluxStudio ${planName}! Your subscription is now active.

You now have full access to all ${planName} features. Visit your dashboard to get started: ${dashboardUrl}

If you have any questions, reply to this email or visit our help center.

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      heading: `Welcome to FluxStudio ${planName}!`,
      subtext: `Hi ${userName}, your subscription is now active. Thank you for choosing FluxStudio!`,
      ctaLabel: 'Go to Dashboard',
      ctaUrl: dashboardUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Payment failed — sent on invoice.payment_failed
   */
  async sendPaymentFailedEmail(email, userName = 'there') {
    const billingUrl = `${this.frontendUrl}/settings/billing`;
    const subject = 'Action required: Payment failed for FluxStudio';

    const text = `
Hi ${userName},

We were unable to process your latest payment for FluxStudio. Please update your payment method to avoid losing access to your Pro features.

Update your billing info: ${billingUrl}

If this was unexpected, please check with your bank or try a different payment method.

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      heading: 'Payment failed',
      subtext: `Hi ${userName}, we couldn't process your latest payment. Please update your payment method to keep your subscription active.`,
      ctaLabel: 'Update Payment Method',
      ctaUrl: billingUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Subscription cancelled — sent on customer.subscription.deleted
   */
  async sendSubscriptionCancelledEmail(email, userName = 'there') {
    const pricingUrl = `${this.frontendUrl}/pricing`;
    const subject = 'Your FluxStudio subscription has been cancelled';

    const text = `
Hi ${userName},

Your FluxStudio subscription has been cancelled. You still have access until the end of your current billing period.

After that, your account will be moved to the Free plan. Your projects and data will be preserved.

Changed your mind? You can resubscribe at any time: ${pricingUrl}

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      heading: 'Subscription cancelled',
      subtext: `Hi ${userName}, your subscription has been cancelled. You'll retain access until the end of your current billing period. Your data is safe.`,
      ctaLabel: 'Resubscribe',
      ctaUrl: pricingUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  // ===================================================================
  // Phase 5: Trial Countdown Emails
  // ===================================================================

  /**
   * Trial expires today — sent on the day the trial ends
   */
  async sendTrialExpiryTodayEmail(email, userName = 'there') {
    const checkoutUrl = `${this.frontendUrl}/checkout?plan=pro&interval=year`;
    const subject = 'Your Pro trial expires today';

    const text = `
Hi ${userName},

Your FluxStudio Pro trial expires today. After today, you'll lose access to:

- AI drill writing assistant
- Real-time collaboration
- Advanced exports (PDF, Pyware, Dot Book)
- Audio sync & 3D preview

Upgrade now to keep all your Pro features: ${checkoutUrl}

Save 2 months with annual billing ($190/yr vs $19/mo).

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      heading: 'Your trial expires today',
      subtext: `Hi ${userName}, upgrade now to keep your Pro features. Don't lose access to AI drill writing, collaboration, and advanced exports.`,
      ctaLabel: 'Upgrade Now — Keep Pro',
      ctaUrl: checkoutUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Trial expired — sent when trial is reverted to free plan
   */
  async sendTrialExpiredEmail(email, userName = 'there') {
    const pricingUrl = `${this.frontendUrl}/pricing`;
    const subject = 'Your Pro trial has ended';

    const text = `
Hi ${userName},

Your FluxStudio Pro trial has ended and your account has been moved to the Free plan.

Your projects and data are safe — they're not going anywhere.

You can upgrade anytime to get Pro features back: ${pricingUrl}

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      heading: 'Your trial has ended',
      subtext: `Hi ${userName}, your account is now on the Free plan. Your projects and data are safe. Upgrade anytime to restore Pro features.`,
      ctaLabel: 'View Plans',
      ctaUrl: pricingUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Post-expiry win-back — sent 1 day after trial ends, includes 20% discount
   */
  async sendTrialExpiredWinbackEmail(email, userName = 'there') {
    const checkoutUrl = `${this.frontendUrl}/checkout?plan=pro&interval=year&coupon=TRIALWINBACK20`;
    const subject = 'Get 20% off FluxStudio Pro — limited time';

    const text = `
Hi ${userName},

We noticed you haven't upgraded after your Pro trial. We'd love to have you back!

Here's an exclusive offer: 20% off your first year of FluxStudio Pro.

Use code TRIALWINBACK20 or click the link below:

${checkoutUrl}

This offer expires in 7 days.

— The FluxStudio Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0a0a0a;">
  <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px; color: white; font-weight: 700;">FluxStudio</h1>
    </div>
    <div style="padding: 40px 32px;">
      <h2 style="font-size: 24px; color: white; margin: 0 0 16px 0;">We miss you, ${userName}!</h2>
      <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Your Pro trial ended, but we'd love to have you back. Here's an exclusive offer just for you:
      </p>
      <div style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
        <p style="color: #c4b5fd; font-size: 14px; margin: 0 0 8px 0;">EXCLUSIVE OFFER</p>
        <p style="color: white; font-size: 32px; font-weight: 700; margin: 0 0 8px 0;">20% OFF</p>
        <p style="color: #a1a1aa; font-size: 14px; margin: 0;">your first year of FluxStudio Pro</p>
        <p style="color: #71717a; font-size: 12px; margin: 8px 0 0 0;">Code: TRIALWINBACK20 — expires in 7 days</p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${checkoutUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Claim Your 20% Discount</a>
      </div>
    </div>
    <div style="background: #0a0a0a; padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.05);">
      <p style="color: #52525b; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} FluxStudio. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`.trim();

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Renewal receipt — sent on invoice.paid (recurring)
   */
  async sendRenewalReceiptEmail(email, userName = 'there', amount = '', planName = 'Pro') {
    const billingUrl = `${this.frontendUrl}/settings/billing`;
    const subject = `FluxStudio ${planName} renewal receipt`;

    const text = `
Hi ${userName},

Your FluxStudio ${planName} subscription has been renewed${amount ? ` for ${amount}` : ''}.

View your billing details: ${billingUrl}

Thank you for continuing to use FluxStudio!

— The FluxStudio Team
    `.trim();

    const html = this._collaborationTemplate({
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      heading: 'Payment received',
      subtext: `Hi ${userName}, your ${planName} subscription has been renewed${amount ? ` for ${amount}` : ''}. Thank you!`,
      ctaLabel: 'View Billing',
      ctaUrl: billingUrl,
    });

    return this.sendEmail({ to: email, subject, text, html });
  }
}

// Export singleton instance
const emailService = new EmailService();

// Also export methods directly for convenience
module.exports = {
  emailService,
  EmailService,
  // Direct method exports for simpler imports
  sendEmail: (options) => emailService.sendEmail(options),
  sendVerificationEmail: (...args) => emailService.sendVerificationEmail(...args),
  sendPasswordResetEmail: (...args) => emailService.sendPasswordResetEmail(...args),
  sendWelcomeEmail: (...args) => emailService.sendWelcomeEmail(...args),
  generateToken: (length) => emailService.generateToken(length),
  generateExpiry: (hours) => emailService.generateExpiry(hours),
  isConfigured: () => emailService.isConfigured(),
  emailBreaker
};
