/**
 * Two-Factor Authentication Routes
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Endpoints:
 * - POST /api/2fa/setup        — Generate TOTP secret + QR code
 * - POST /api/2fa/verify-setup — Verify code and enable 2FA
 * - POST /api/2fa/disable      — Disable 2FA (requires current code)
 * - POST /api/2fa/verify       — Verify TOTP during login (temp token flow)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { logAction } = require('../lib/auditLog');
const { zodValidate } = require('../middleware/zodValidate');
const { twoFactorCodeSchema, twoFactorVerifySchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('TwoFactor');

// Lazy-load otplib and qrcode (optional dependencies)
let authenticator, toDataURL;
try {
  ({ authenticator } = require('otplib'));
  ({ toDataURL } = require('qrcode'));
} catch {
  log.warn('otplib or qrcode not installed — 2FA endpoints will return 503');
}

/**
 * POST /api/2fa/setup
 *
 * Generates a TOTP secret and returns the QR code data URL.
 * Does NOT enable 2FA yet — caller must verify with /verify-setup.
 */
router.post('/setup', authenticateToken, async (req, res) => {
  if (!authenticator || !toDataURL) {
    return res.status(503).json({ success: false, error: '2FA service not available', code: 'TWO_FACTOR_SERVICE_UNAVAILABLE' });
  }

  try {
    const userId = req.user.id;

    // Check if already enabled
    const userResult = await query(
      `SELECT totp_enabled FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'TWO_FACTOR_USER_NOT_FOUND' });
    }
    if (userResult.rows[0].totp_enabled) {
      return res.status(400).json({ success: false, error: '2FA is already enabled. Disable it first to reconfigure.', code: 'TWO_FACTOR_ALREADY_ENABLED' });
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Store secret (not yet enabled)
    await query(
      `UPDATE users SET totp_secret = $2 WHERE id = $1`,
      [userId, secret]
    );

    // Generate QR code
    const email = req.user.email || 'user';
    const otpauthUrl = authenticator.keyuri(email, 'FluxStudio', secret);
    const qrCodeDataUrl = await toDataURL(otpauthUrl);

    res.json({
      success: true,
      secret,
      qrCode: qrCodeDataUrl,
    });
  } catch (error) {
    log.error('Setup failed', error);
    res.status(500).json({ success: false, error: 'Failed to set up 2FA', code: 'TWO_FACTOR_SETUP_ERROR' });
  }
});

/**
 * POST /api/2fa/verify-setup
 *
 * Body: { code: "123456" }
 *
 * Verifies the TOTP code against the stored secret.
 * If valid, enables 2FA and generates backup codes.
 */
router.post('/verify-setup', authenticateToken, zodValidate(twoFactorCodeSchema), async (req, res) => {
  if (!authenticator) {
    return res.status(503).json({ success: false, error: '2FA service not available', code: 'TWO_FACTOR_SERVICE_UNAVAILABLE' });
  }

  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Verification code is required', code: 'TWO_FACTOR_MISSING_CODE' });
    }

    // Fetch secret
    const userResult = await query(
      `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'TWO_FACTOR_USER_NOT_FOUND' });
    }

    const { totp_secret, totp_enabled } = userResult.rows[0];
    if (totp_enabled) {
      return res.status(400).json({ success: false, error: '2FA is already enabled', code: 'TWO_FACTOR_ALREADY_ENABLED' });
    }
    if (!totp_secret) {
      return res.status(400).json({ success: false, error: 'Run /api/2fa/setup first', code: 'TWO_FACTOR_SETUP_REQUIRED' });
    }

    // Verify code
    const isValid = authenticator.verify({ token: code, secret: totp_secret });
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid verification code', code: 'TWO_FACTOR_INVALID_CODE' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex')
    );

    // Enable 2FA
    await query(
      `UPDATE users
       SET totp_enabled = true,
           totp_backup_codes = $2,
           totp_enabled_at = NOW()
       WHERE id = $1`,
      [userId, backupCodes]
    );

    await logAction(userId, '2fa_enabled', 'user', userId, {}, req);

    res.json({
      success: true,
      backupCodes,
      message: 'Two-factor authentication enabled',
    });
  } catch (error) {
    log.error('Verify setup failed', error);
    res.status(500).json({ success: false, error: 'Failed to verify 2FA setup', code: 'TWO_FACTOR_VERIFY_SETUP_ERROR' });
  }
});

/**
 * POST /api/2fa/disable
 *
 * Body: { code: "123456" }
 *
 * Disables 2FA after verifying the current TOTP code.
 */
router.post('/disable', authenticateToken, zodValidate(twoFactorCodeSchema), async (req, res) => {
  if (!authenticator) {
    return res.status(503).json({ success: false, error: '2FA service not available', code: 'TWO_FACTOR_SERVICE_UNAVAILABLE' });
  }

  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Verification code is required', code: 'TWO_FACTOR_MISSING_CODE' });
    }

    const userResult = await query(
      `SELECT totp_secret, totp_enabled FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'TWO_FACTOR_USER_NOT_FOUND' });
    }

    if (!userResult.rows[0].totp_enabled) {
      return res.status(400).json({ success: false, error: '2FA is not enabled', code: 'TWO_FACTOR_NOT_ENABLED' });
    }

    const isValid = authenticator.verify({
      token: code,
      secret: userResult.rows[0].totp_secret,
    });
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid verification code', code: 'TWO_FACTOR_INVALID_CODE' });
    }

    await query(
      `UPDATE users
       SET totp_enabled = false,
           totp_secret = NULL,
           totp_backup_codes = NULL,
           totp_enabled_at = NULL
       WHERE id = $1`,
      [userId]
    );

    await logAction(userId, '2fa_disabled', 'user', userId, {}, req);

    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (error) {
    log.error('Disable failed', error);
    res.status(500).json({ success: false, error: 'Failed to disable 2FA', code: 'TWO_FACTOR_DISABLE_ERROR' });
  }
});

/**
 * POST /api/2fa/verify
 *
 * Body: { tempToken: "...", code: "123456" }
 *
 * Called during login when 2FA is required.
 * Validates the TOTP code (or backup code) and returns full auth tokens.
 */
router.post('/verify', zodValidate(twoFactorVerifySchema), async (req, res) => {
  if (!authenticator) {
    return res.status(503).json({ success: false, error: '2FA service not available', code: 'TWO_FACTOR_SERVICE_UNAVAILABLE' });
  }

  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ success: false, error: 'tempToken and code are required', code: 'TWO_FACTOR_MISSING_FIELDS' });
    }

    // Verify temp token
    const jwt = require('jsonwebtoken');
    const { config } = require('../config/environment');
    let payload;
    try {
      payload = jwt.verify(tempToken, config.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token', code: 'TWO_FACTOR_TOKEN_EXPIRED' });
    }

    if (payload.type !== '2fa_pending') {
      return res.status(400).json({ success: false, error: 'Invalid token type', code: 'TWO_FACTOR_INVALID_TOKEN_TYPE' });
    }

    const userId = payload.id;

    // Fetch user 2FA info
    const userResult = await query(
      `SELECT id, email, name, user_type, totp_secret, totp_backup_codes
       FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'TWO_FACTOR_USER_NOT_FOUND' });
    }

    const user = userResult.rows[0];

    // Try TOTP code first
    let isValid = authenticator.verify({ token: code, secret: user.totp_secret });

    // Fall back to backup code
    if (!isValid && Array.isArray(user.totp_backup_codes)) {
      const codeIndex = user.totp_backup_codes.indexOf(code);
      if (codeIndex !== -1) {
        isValid = true;
        // Consume the backup code
        const remaining = [...user.totp_backup_codes];
        remaining.splice(codeIndex, 1);
        await query(
          `UPDATE users SET totp_backup_codes = $2 WHERE id = $1`,
          [userId, remaining]
        );
      }
    }

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid verification code', code: 'TWO_FACTOR_INVALID_CODE' });
    }

    // Issue full auth tokens
    const { generateAuthResponse } = require('../lib/auth/authHelpers');
    const authResponse = await generateAuthResponse(user);

    await logAction(userId, 'login_2fa', 'user', userId, {}, req);

    res.json({
      success: true,
      ...authResponse,
    });
  } catch (error) {
    log.error('Verify failed', error);
    res.status(500).json({ success: false, error: 'Failed to verify 2FA code', code: 'TWO_FACTOR_VERIFY_ERROR' });
  }
});

module.exports = router;
