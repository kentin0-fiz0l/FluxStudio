/**
 * Referral Routes — code generation, stats, tracking, and rewards.
 *
 * Sprint 44: Phase 6.3 Growth & Engagement
 *
 * Endpoints:
 * - GET  /api/referrals/code      — get or create the user's referral code
 * - GET  /api/referrals/stats     — referral stats for the current user
 * - GET  /api/referrals/validate/:code — validate a referral code (public)
 * - POST /api/referrals/convert   — mark referred user as converted and grant rewards
 */

const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('Referrals');
const { zodValidateParams } = require('../middleware/zodValidateParams');
const { validateReferralCodeParamsSchema } = require('../lib/schemas');
const emailService = require('../lib/email/emailService');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * Generate a short, URL-safe referral code.
 */
function generateCode() {
  return crypto.randomBytes(5).toString('base64url').slice(0, 8).toUpperCase();
}

/**
 * GET /api/referrals/code
 * Get the authenticated user's referral code, creating one if needed.
 */
router.get('/code', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check for existing active code
  let result = await query(
    `SELECT code, created_at FROM referral_codes
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (result.rows.length > 0) {
    return res.json({ success: true, code: result.rows[0].code });
  }

  // Generate a new code (retry on collision)
  let code;
  for (let i = 0; i < 5; i++) {
    code = generateCode();
    try {
      await query(
        `INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)`,
        [userId, code]
      );
      break;
    } catch (err) {
      if (err.code === '23505' && i < 4) continue; // unique violation — retry
      throw err;
    }
  }

  res.json({ success: true, code });
}));

/**
 * GET /api/referrals/stats
 * Referral dashboard stats for the current user.
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await query(
    `SELECT
       COUNT(*) AS total_referrals,
       COUNT(*) FILTER (WHERE rs.converted = TRUE) AS converted,
       MIN(rs.created_at) AS first_referral,
       MAX(rs.created_at) AS latest_referral
     FROM referral_signups rs
     WHERE rs.referrer_user_id = $1`,
    [userId]
  );

  const row = result.rows[0];

  // Recent referral list
  const recent = await query(
    `SELECT u.name, u.email, rs.created_at, rs.converted
     FROM referral_signups rs
     JOIN users u ON u.id = rs.referred_user_id
     WHERE rs.referrer_user_id = $1
     ORDER BY rs.created_at DESC
     LIMIT 10`,
    [userId]
  );

  res.json({
    success: true,
    stats: {
      totalReferrals: parseInt(row.total_referrals, 10) || 0,
      converted: parseInt(row.converted, 10) || 0,
      firstReferral: row.first_referral,
      latestReferral: row.latest_referral,
    },
    recentReferrals: recent.rows.map((r) => ({
      name: r.name,
      email: r.email ? r.email.replace(/(.{2}).*(@.*)/, '$1***$2') : null,
      signedUpAt: r.created_at,
      converted: r.converted,
    })),
  });
}));

/**
 * GET /api/referrals/validate/:code
 * Public endpoint — validate a referral code before signup.
 */
router.get('/validate/:code', zodValidateParams(validateReferralCodeParamsSchema), asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT rc.code, u.name AS referrer_name
     FROM referral_codes rc
     JOIN users u ON u.id = rc.user_id
     WHERE rc.code = $1 AND rc.is_active = TRUE`,
    [req.params.code.toUpperCase()]
  );

  if (result.rows.length === 0) {
    return res.json({ success: true, valid: false });
  }

  res.json({
    success: true,
    valid: true,
    referrerName: result.rows[0].referrer_name,
  });
}));

/**
 * Process referral rewards for both the referrer and the referred user.
 *
 * Reward: both users receive 1 free month of Pro (30 days added to trial_ends_at).
 * If a user is on the free plan, their plan is upgraded to 'pro'.
 *
 * @param {string} referrerUserId - The user who shared the referral code
 * @param {string} referredUserId - The user who signed up via the referral
 */
async function processReferralReward(referrerUserId, referredUserId) {
  const userIds = [referrerUserId, referredUserId];

  for (const userId of userIds) {
    // Extend or set trial_ends_at by 30 days; upgrade plan to 'pro' if currently 'free'
    await query(
      `UPDATE users
       SET trial_ends_at = CASE
             WHEN trial_ends_at IS NOT NULL AND trial_ends_at > NOW()
               THEN trial_ends_at + INTERVAL '30 days'
             ELSE NOW() + INTERVAL '30 days'
           END,
           plan_id = CASE
             WHEN plan_id = 'free' THEN 'pro'
             ELSE plan_id
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }

  // Mark the referral signup row as rewarded
  await query(
    `UPDATE referral_signups
     SET rewarded_at = NOW()
     WHERE referrer_user_id = $1
       AND referred_user_id = $2`,
    [referrerUserId, referredUserId]
  );

  // Send notification emails (non-blocking)
  const usersResult = await query(
    `SELECT id, name, email FROM users WHERE id = ANY($1::uuid[])`,
    [userIds]
  );

  const usersById = {};
  for (const row of usersResult.rows) {
    usersById[row.id] = row;
  }

  const referrer = usersById[referrerUserId];
  const referred = usersById[referredUserId];

  if (referrer?.email) {
    try {
      emailService.sendEmail({
        to: referrer.email,
        subject: 'You earned a free month of Pro!',
        text: `Hi ${referrer.name || 'there'}, your referral ${referred?.name || 'a new user'} just created their first project on FluxStudio. You've been rewarded with 1 free month of Pro! Enjoy unlimited access to all Pro features.`,
        html: `<div style="font-family: sans-serif; max-width: 480px;">
  <h2>You earned a free month of Pro!</h2>
  <p>Hi ${referrer.name || 'there'},</p>
  <p>Great news! Your referral <strong>${referred?.name || 'a new user'}</strong> just created their first project on FluxStudio.</p>
  <p>As a thank you, you've been rewarded with <strong>1 free month of Pro</strong>. Enjoy unlimited access to all Pro features including unlimited projects, advanced collaboration, and priority support.</p>
  <p>Keep sharing your referral link to earn even more rewards!</p>
  <p style="color: #888;">— The FluxStudio Team</p>
</div>`,
      });
    } catch { /* non-blocking */ }
  }

  if (referred?.email) {
    try {
      emailService.sendEmail({
        to: referred.email,
        subject: 'You earned a free month of Pro!',
        text: `Hi ${referred.name || 'there'}, congratulations on creating your first project on FluxStudio! Because you signed up through a referral, you've been rewarded with 1 free month of Pro. Enjoy unlimited access to all Pro features.`,
        html: `<div style="font-family: sans-serif; max-width: 480px;">
  <h2>Welcome to FluxStudio Pro!</h2>
  <p>Hi ${referred.name || 'there'},</p>
  <p>Congratulations on creating your first project! Because you signed up through a referral, you've been rewarded with <strong>1 free month of Pro</strong>.</p>
  <p>You now have access to all Pro features including unlimited projects, advanced collaboration, and priority support.</p>
  <p>Invite your friends with your own referral link to keep earning rewards!</p>
  <p style="color: #888;">— The FluxStudio Team</p>
</div>`,
      });
    } catch { /* non-blocking */ }
  }

  log.info('Referral reward processed', { referrerUserId, referredUserId });
}

/**
 * POST /api/referrals/convert
 * Mark the current user as a converted referral and grant rewards to both parties.
 * Should be called when a referred user creates their first project.
 */
router.post('/convert', authenticateToken, asyncHandler(async (req, res) => {
  const referredUserId = req.user.id;

  // Check if this user was referred and hasn't already been converted
  const signup = await query(
    `SELECT id, referrer_user_id, converted, rewarded_at
     FROM referral_signups
     WHERE referred_user_id = $1
     LIMIT 1`,
    [referredUserId]
  );

  if (signup.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No referral found for this user',
      code: 'REFERRAL_NOT_FOUND',
    });
  }

  const referralRow = signup.rows[0];

  if (referralRow.converted) {
    return res.status(409).json({
      success: false,
      error: 'Referral has already been converted',
      code: 'REFERRAL_ALREADY_CONVERTED',
    });
  }

  // Mark as converted
  await query(
    `UPDATE referral_signups
     SET converted = TRUE, converted_at = NOW()
     WHERE id = $1`,
    [referralRow.id]
  );

  // Process rewards for both users
  await processReferralReward(referralRow.referrer_user_id, referredUserId);

  res.json({
    success: true,
    message: 'Referral converted — both you and your referrer earned 1 free month of Pro!',
  });
}));

module.exports = router;
