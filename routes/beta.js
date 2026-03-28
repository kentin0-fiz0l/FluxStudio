/**
 * Beta Waitlist Routes — signup, admin management, and invites.
 *
 * Sprint 92: Beta waitlist for public beta launch
 *
 * Endpoints:
 * - POST /api/beta           — join the waitlist (public, rate-limited)
 * - GET  /api/beta           — list waitlist entries (admin only)
 * - POST /api/beta/invite    — invite a user from the waitlist (admin only)
 * - GET  /api/beta/stats     — waitlist and invite code stats (admin only)
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { query } = require('../database/config');
const { authenticateToken, requireAdmin, rateLimitByUser } = require('../lib/auth/middleware');
const { rateLimit } = require('../middleware/security');
const { zodValidate } = require('../middleware/zodValidate');
const { joinBetaWaitlistSchema, inviteBetaUserSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('BetaRoutes');
const { asyncHandler } = require('../middleware/errorHandler');

let emailService;
try {
  emailService = require('../lib/email/emailService');
} catch {
  emailService = { sendEmail: async () => false, isConfigured: () => false };
}

const VALID_ROLES = ['band_director', 'drill_writer', 'color_guard', 'educator', 'other'];

/**
 * POST /api/beta
 * Join the beta waitlist (public, rate-limited).
 */
router.post('/', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), zodValidate(joinBetaWaitlistSchema), asyncHandler(async (req, res) => {
  const { email, name, role, organization } = req.body;

  const result = await query(
    `INSERT INTO beta_waitlist (email, name, role, organization)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING *`,
    [email, name || null, role || null, organization || null]
  );

  let status = 'waiting';
  if (result.rows.length === 0) {
    const existing = await query('SELECT status FROM beta_waitlist WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      status = existing.rows[0].status;
    }
  } else {
    status = result.rows[0].status;
  }

  log.info(`Waitlist signup: ${email}`);
  res.json({
    success: true,
    message: "You're on the list! We'll email you when it's your turn.",
    status
  });
}));

/**
 * GET /api/beta
 * List waitlist entries (admin only).
 */
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const status = req.query.status || null;
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  const entries = await query(
    `SELECT * FROM beta_waitlist
     WHERE ($1::text IS NULL OR status = $1)
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM beta_waitlist WHERE ($1::text IS NULL OR status = $1)`,
    [status]
  );

  res.json({
    success: true,
    entries: entries.rows,
    total: parseInt(countResult.rows[0].count),
    limit,
    offset
  });
}));

/**
 * POST /api/beta/invite
 * Invite a user from the waitlist (admin only).
 */
router.post('/invite', authenticateToken, requireAdmin, zodValidate(inviteBetaUserSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  const waitlistEntry = await query('SELECT * FROM beta_waitlist WHERE email = $1', [email]);
  if (waitlistEntry.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Email not found in waitlist.' });
  }

  const code = crypto.randomBytes(4).toString('hex').toUpperCase();

  const codeResult = await query(
    `INSERT INTO beta_invite_codes (code, email, max_uses, created_by)
     VALUES ($1, $2, 1, $3)
     RETURNING *`,
    [code, email, req.user.id]
  );

  await query(
    `UPDATE beta_waitlist
     SET status = 'invited', invite_code_id = $1, invited_at = NOW()
     WHERE email = $2`,
    [codeResult.rows[0].id, email]
  );

  let emailSent = false;
  if (emailService.isConfigured()) {
    emailSent = await emailService.sendEmail({
      to: email,
      subject: "You're invited to FluxStudio Beta!",
      html: `
        <h1>Welcome to FluxStudio Beta!</h1>
        <p>You've been invited to join the FluxStudio beta program.</p>
        <p>Your invite code: <strong>${code}</strong></p>
        <p><a href="https://fluxstudio.art/signup?invite=${code}">Click here to sign up</a></p>
        <p>This code can only be used once, so don't share it.</p>
        <p>— The FluxStudio Team</p>
      `
    });
  }

  log.info(`Invited ${email} with code ${code}`);
  res.json({ success: true, inviteCode: code, emailSent });
}));

/**
 * GET /api/beta/stats
 * Waitlist and invite code stats (admin only).
 */
router.get('/stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const waitlistStats = await query(
    `SELECT status, COUNT(*) as count FROM beta_waitlist GROUP BY status`
  );

  const codeStats = await query(
    `SELECT COUNT(*) as total_codes, COALESCE(SUM(uses_count), 0) as total_uses FROM beta_invite_codes`
  );

  const statusCounts = {};
  for (const row of waitlistStats.rows) {
    statusCounts[row.status] = parseInt(row.count);
  }

  res.json({
    success: true,
    waitlist: {
      waiting: statusCounts.waiting || 0,
      invited: statusCounts.invited || 0,
      signed_up: statusCounts.signed_up || 0
    },
    inviteCodes: {
      total: parseInt(codeStats.rows[0].total_codes),
      used: parseInt(codeStats.rows[0].total_uses)
    }
  });
}));

module.exports = router;
