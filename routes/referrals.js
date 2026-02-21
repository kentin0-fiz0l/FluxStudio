/**
 * Referral Routes — code generation, stats, and tracking.
 *
 * Sprint 44: Phase 6.3 Growth & Engagement
 *
 * Endpoints:
 * - GET  /api/referrals/code      — get or create the user's referral code
 * - GET  /api/referrals/stats     — referral stats for the current user
 * - GET  /api/referrals/validate/:code — validate a referral code (public)
 */

const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');

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
router.get('/code', authenticateToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('[Referrals] Code generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

/**
 * GET /api/referrals/stats
 * Referral dashboard stats for the current user.
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('[Referrals] Stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

/**
 * GET /api/referrals/validate/:code
 * Public endpoint — validate a referral code before signup.
 */
router.get('/validate/:code', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('[Referrals] Validate error:', error.message);
    res.status(500).json({ error: 'Failed to validate code' });
  }
});

module.exports = router;
