/**
 * Tier-Based Feature Gating Middleware
 *
 * Checks the authenticated user's subscription plan before allowing
 * access to tier-restricted features.
 *
 * Usage:
 *   const { requireTier } = require('../middleware/requireTier');
 *   router.post('/ai/generate', requireAuth, requireTier('pro'), handler);
 *
 * Tier hierarchy: free < pro < team
 */

const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('RequireTier');

const TIER_LEVELS = { free: 0, pro: 1, team: 2 };

/**
 * Feature definitions: maps feature names to their minimum required tier.
 * Use requireFeature('ai_drill_writing') instead of requireTier('pro')
 * for more readable, maintainable route definitions.
 */
const FEATURE_TIERS = {
  // AI features — Pro+
  ai_drill_writing: 'pro',
  ai_show_critic: 'pro',
  ai_design_analysis: 'pro',

  // Collaboration — Pro+
  realtime_collaboration: 'pro',
  collaborator_invite: 'pro',

  // Advanced exports — Pro+
  export_video: 'pro',
  export_pyware: 'pro',

  // Team-only features
  api_access: 'team',
  priority_support: 'team',
  custom_branding: 'team',
  sso_authentication: 'team',
};

/**
 * Get the user's current subscription tier from the database.
 * Falls back to 'free' if no subscription or DB error.
 */
async function getUserTier(userId) {
  try {
    // First check user's plan_id column and trial status
    const userResult = await query(
      'SELECT plan_id, trial_ends_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length > 0) {
      const { plan_id: planId, trial_ends_at: trialEndsAt } = userResult.rows[0];

      // Active trial: if trial_ends_at is in the future, user has Pro access
      if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
        return 'pro';
      }

      // Trial expired: downgrade to free (lazy cleanup)
      if (trialEndsAt && new Date(trialEndsAt) <= new Date() && planId === 'pro') {
        query('UPDATE users SET plan_id = $1 WHERE id = $2 AND trial_ends_at IS NOT NULL AND trial_ends_at <= NOW()', ['free', userId]).catch(() => {});
        return 'free';
      }

      if (planId && TIER_LEVELS[planId] !== undefined) return planId;
    }

    // Fallback: check active subscription against subscription_plans
    const subResult = await query(`
      SELECT sp.slug
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY sp.price_monthly DESC
      LIMIT 1
    `, [userId]);

    if (subResult.rows.length > 0) {
      const slug = subResult.rows[0].slug;
      if (TIER_LEVELS[slug] !== undefined) return slug;
    }

    return 'free';
  } catch (error) {
    log.error('Error fetching user tier', { userId, error: error.message });
    return 'free';
  }
}

/**
 * Middleware that requires a minimum subscription tier.
 * @param {'free' | 'pro' | 'team'} minimumTier
 */
function requireTier(minimumTier) {
  const requiredLevel = TIER_LEVELS[minimumTier];

  if (requiredLevel === undefined) {
    throw new Error(`Invalid tier: ${minimumTier}. Must be one of: ${Object.keys(TIER_LEVELS).join(', ')}`);
  }

  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      const userTier = await getUserTier(req.user.id);
      const userLevel = TIER_LEVELS[userTier] ?? 0;

      if (userLevel >= requiredLevel) {
        req.userTier = userTier;
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `This feature requires a ${minimumTier} plan or higher`,
        code: 'TIER_REQUIRED',
        requiredTier: minimumTier,
        currentTier: userTier,
        upgradeUrl: '/pricing',
      });
    } catch (error) {
      log.error('Tier check error', error);
      // Don't block on tier check failures — default deny for safety
      return res.status(500).json({
        success: false,
        error: 'Unable to verify subscription status',
        code: 'TIER_CHECK_ERROR',
      });
    }
  };
}

/**
 * Middleware that requires a specific named feature.
 * Maps feature names to tier requirements via FEATURE_TIERS.
 *
 * @param {string} featureName — key from FEATURE_TIERS
 */
function requireFeature(featureName) {
  const tier = FEATURE_TIERS[featureName];

  if (!tier) {
    throw new Error(`Unknown feature: ${featureName}. Known features: ${Object.keys(FEATURE_TIERS).join(', ')}`);
  }

  return requireTier(tier);
}

module.exports = { requireTier, requireFeature, getUserTier, FEATURE_TIERS, TIER_LEVELS };
