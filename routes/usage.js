/**
 * Usage Routes — Track and enforce plan usage quotas
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('Usage');

const router = express.Router();

// Plan limits (mirrors src/config/plans.ts)
const PLAN_LIMITS = {
  free: { projects: 3, storageBytes: 500 * 1024 * 1024, aiCallsPerMonth: 10, collaborators: 1 },
  pro: { projects: -1, storageBytes: 10 * 1024 * 1024 * 1024, aiCallsPerMonth: 100, collaborators: 10 },
  team: { projects: -1, storageBytes: 100 * 1024 * 1024 * 1024, aiCallsPerMonth: -1, collaborators: -1 },
};

function getLimits(planId) {
  return PLAN_LIMITS[planId] || PLAN_LIMITS.free;
}

/**
 * Get the current billing period boundaries
 */
function getCurrentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get or create usage record for current period
 */
async function getOrCreateUsage(userId) {
  const period = getCurrentPeriod();

  // Try to get existing usage record
  let result = await query(
    'SELECT * FROM user_usage WHERE user_id = $1 AND period_start = $2',
    [userId, period.start]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Create new usage record, compute live counts
  let projectsCount = 0;
  let storageBytes = 0;
  let aiCallsCount = 0;
  let collaboratorsCount = 0;

  try {
    // Count active projects
    const projResult = await query(
      "SELECT COUNT(*) as count FROM projects WHERE (created_by = $1 OR manager_id = $1) AND status != 'cancelled'",
      [userId]
    );
    projectsCount = parseInt(projResult.rows[0]?.count || '0', 10);
  } catch { /* table may not exist */ }

  try {
    // Sum file storage
    const storageResult = await query(
      'SELECT COALESCE(SUM(file_size), 0) as total FROM files WHERE uploaded_by = $1',
      [userId]
    );
    storageBytes = parseInt(storageResult.rows[0]?.total || '0', 10);
  } catch { /* table may not exist */ }

  try {
    // Count AI calls this period
    const aiResult = await query(
      'SELECT COUNT(*) as count FROM ai_chat_messages WHERE user_id = $1 AND role = $2 AND created_at >= $3',
      [userId, 'user', period.start]
    );
    aiCallsCount = parseInt(aiResult.rows[0]?.count || '0', 10);
  } catch { /* table may not exist */ }

  try {
    // Count unique collaborators across user's projects
    const collabResult = await query(
      `SELECT COUNT(DISTINCT pm.user_id) as count
       FROM project_members pm
       JOIN projects p ON pm.project_id = p.id
       WHERE (p.created_by = $1 OR p.manager_id = $1) AND pm.user_id != $1`,
      [userId]
    );
    collaboratorsCount = parseInt(collabResult.rows[0]?.count || '0', 10);
  } catch { /* table may not exist */ }

  // Insert the usage record
  result = await query(
    `INSERT INTO user_usage (user_id, period_start, period_end, projects_count, storage_bytes, ai_calls_count, collaborators_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, period_start) DO UPDATE SET
       projects_count = EXCLUDED.projects_count,
       storage_bytes = EXCLUDED.storage_bytes,
       ai_calls_count = EXCLUDED.ai_calls_count,
       collaborators_count = EXCLUDED.collaborators_count,
       updated_at = NOW()
     RETURNING *`,
    [userId, period.start, period.end, projectsCount, storageBytes, aiCallsCount, collaboratorsCount]
  );

  return result.rows[0];
}

/**
 * GET /api/usage
 * Current period usage for authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const usage = await getOrCreateUsage(req.user.id);

    // Get user's plan
    let planId = 'free';
    try {
      const userResult = await query('SELECT plan_id FROM users WHERE id = $1', [req.user.id]);
      if (userResult.rows.length > 0) {
        planId = userResult.rows[0].plan_id || 'free';
      }
    } catch { /* column may not exist yet */ }

    const limits = getLimits(planId);

    res.json({
      success: true,
      usage: {
        projects: { current: usage.projects_count, limit: limits.projects },
        storage: { current: parseInt(usage.storage_bytes, 10), limit: limits.storageBytes },
        aiCalls: { current: usage.ai_calls_count, limit: limits.aiCallsPerMonth },
        collaborators: { current: usage.collaborators_count, limit: limits.collaborators },
      },
      plan: planId,
      period: {
        start: usage.period_start,
        end: usage.period_end,
      },
    });
  } catch (error) {
    log.error('Get usage error', error);
    res.status(500).json({ success: false, error: 'Failed to get usage', code: 'GET_USAGE_ERROR' });
  }
});

/**
 * GET /api/usage/limits
 * Plan limits for authenticated user
 */
router.get('/limits', authenticateToken, async (req, res) => {
  try {
    let planId = 'free';
    try {
      const userResult = await query('SELECT plan_id FROM users WHERE id = $1', [req.user.id]);
      if (userResult.rows.length > 0) {
        planId = userResult.rows[0].plan_id || 'free';
      }
    } catch { /* column may not exist yet */ }

    const limits = getLimits(planId);

    res.json({
      success: true,
      plan: planId,
      limits,
    });
  } catch (error) {
    log.error('Get limits error', error);
    res.status(500).json({ success: false, error: 'Failed to get limits', code: 'GET_LIMITS_ERROR' });
  }
});

// Export helpers for use by quota middleware
router.getOrCreateUsage = getOrCreateUsage;
router.getLimits = getLimits;
router.getCurrentPeriod = getCurrentPeriod;

module.exports = router;
