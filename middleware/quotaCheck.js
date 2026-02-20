/**
 * Quota Check Middleware — Enforce plan usage limits
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 */

const { query } = require('../database/config');
const usageRoutes = require('../routes/usage');

/**
 * Create middleware that checks a specific resource quota before allowing the request
 * @param {'projects' | 'storage' | 'aiCalls' | 'collaborators'} resource
 */
function checkQuota(resource) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return next(); // No auth — let auth middleware handle it
      }

      const usage = await usageRoutes.getOrCreateUsage(req.user.id);

      // Get user's plan
      let planId = 'free';
      try {
        const userResult = await query('SELECT plan_id FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length > 0) {
          planId = userResult.rows[0].plan_id || 'free';
        }
      } catch { /* column may not exist yet */ }

      const limits = usageRoutes.getLimits(planId);

      let current, limit;
      switch (resource) {
        case 'projects':
          current = usage.projects_count;
          limit = limits.projects;
          break;
        case 'storage':
          current = parseInt(usage.storage_bytes, 10);
          limit = limits.storageBytes;
          break;
        case 'aiCalls':
          current = usage.ai_calls_count;
          limit = limits.aiCallsPerMonth;
          break;
        case 'collaborators':
          current = usage.collaborators_count;
          limit = limits.collaborators;
          break;
        default:
          return next();
      }

      // -1 means unlimited
      if (limit === -1) {
        return next();
      }

      if (current >= limit) {
        return res.status(403).json({
          error: 'Plan limit reached',
          resource,
          limit,
          current,
          plan: planId,
          upgrade_url: '/pricing',
        });
      }

      next();
    } catch (error) {
      console.error('Quota check error:', error);
      // Don't block on quota check failures — let the request through
      next();
    }
  };
}

module.exports = { checkQuota };
