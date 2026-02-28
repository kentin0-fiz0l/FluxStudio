/**
 * Admin Feature Flag Routes
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Endpoints:
 * - GET    /api/admin/flags          — List all feature flags
 * - GET    /api/admin/flags/evaluate — Evaluate all flags for current user
 * - POST   /api/admin/flags          — Create a new flag
 * - PATCH  /api/admin/flags/:id      — Update flag (toggle, rollout %, etc.)
 * - DELETE /api/admin/flags/:id      — Delete a flag
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { invalidateCache, evaluateAllFlags } = require('../lib/featureFlags');
const { logAction } = require('../lib/auditLog');
const { zodValidate } = require('../middleware/zodValidate');
const { createFeatureFlagSchema, updateFeatureFlagSchema } = require('../lib/schemas');

router.use(authenticateToken);

function requireAdmin(req, res, next) {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * GET /api/admin/flags
 * List all feature flags (admin only)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, description, enabled, rollout_percentage,
              user_allowlist, metadata, created_by, created_at, updated_at
       FROM feature_flags
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List flags error:', err);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

/**
 * GET /api/admin/flags/evaluate
 * Evaluate all flags for the current user (any authenticated user)
 */
router.get('/evaluate', async (req, res) => {
  try {
    const flags = await evaluateAllFlags(req.user.id);
    res.json(flags);
  } catch (err) {
    console.error('Evaluate flags error:', err);
    res.status(500).json({ error: 'Failed to evaluate feature flags' });
  }
});

/**
 * POST /api/admin/flags
 * Create a new feature flag (admin only)
 */
router.post('/', requireAdmin, zodValidate(createFeatureFlagSchema), async (req, res) => {
  try {
    const { name, description, enabled, rollout_percentage, user_allowlist, metadata } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Flag name is required' });
    }

    // Validate name format: lowercase, hyphens, alphanumeric
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ error: 'Flag name must be lowercase alphanumeric with hyphens only' });
    }

    const result = await query(
      `INSERT INTO feature_flags (name, description, enabled, rollout_percentage, user_allowlist, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        enabled ?? false,
        rollout_percentage ?? 100,
        user_allowlist || [],
        metadata || {},
        req.user.id,
      ]
    );

    invalidateCache(name);
    logAction(req.user.id, 'create', 'feature_flag', result.rows[0].id, { name, enabled: enabled ?? false }, req);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A flag with this name already exists' });
    }
    console.error('Create flag error:', err);
    res.status(500).json({ error: 'Failed to create feature flag' });
  }
});

/**
 * PATCH /api/admin/flags/:id
 * Update a feature flag (admin only)
 */
router.patch('/:id', requireAdmin, zodValidate(updateFeatureFlagSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, description, rollout_percentage, user_allowlist, metadata } = req.body;

    // Build dynamic SET clause
    const updates = [];
    const params = [];
    let idx = 1;

    if (typeof enabled === 'boolean') {
      updates.push(`enabled = $${idx++}`);
      params.push(enabled);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(description);
    }
    if (typeof rollout_percentage === 'number') {
      if (rollout_percentage < 0 || rollout_percentage > 100) {
        return res.status(400).json({ error: 'rollout_percentage must be 0-100' });
      }
      updates.push(`rollout_percentage = $${idx++}`);
      params.push(rollout_percentage);
    }
    if (Array.isArray(user_allowlist)) {
      updates.push(`user_allowlist = $${idx++}`);
      params.push(user_allowlist);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${idx++}`);
      params.push(metadata);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    invalidateCache(result.rows[0].name);
    logAction(req.user.id, 'update', 'feature_flag', id, { changes: req.body }, req);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update flag error:', err);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

/**
 * DELETE /api/admin/flags/:id
 * Delete a feature flag (admin only)
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM feature_flags WHERE id = $1 RETURNING name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    invalidateCache(result.rows[0].name);
    logAction(req.user.id, 'delete', 'feature_flag', id, { name: result.rows[0].name }, req);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete flag error:', err);
    res.status(500).json({ error: 'Failed to delete feature flag' });
  }
});

module.exports = router;
