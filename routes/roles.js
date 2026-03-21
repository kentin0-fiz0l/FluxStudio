/**
 * Custom Roles Routes — RBAC Management
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Endpoints:
 * - GET    /api/organizations/:orgId/roles       — List roles
 * - POST   /api/organizations/:orgId/roles       — Create custom role
 * - PUT    /api/organizations/:orgId/roles/:slug  — Update role
 * - DELETE /api/organizations/:orgId/roles/:slug  — Delete custom role
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateToken } = require('../lib/auth/middleware');
const { requirePermission, PERMISSIONS } = require('../lib/auth/permissions');
const { query } = require('../database/config');
const { logAction } = require('../lib/auditLog');
const { zodValidate } = require('../middleware/zodValidate');
const { createRoleSchema, updateRoleSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('Roles');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticateToken);

/**
 * GET /api/organizations/:orgId/roles
 *
 * Returns global default roles + org-specific custom roles.
 */
router.get('/', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const result = await query(
    `SELECT id, name, slug, permissions, is_default, created_at
     FROM custom_roles
     WHERE organization_id = $1 OR organization_id IS NULL
     ORDER BY is_default DESC, name ASC`,
    [orgId]
  );

  res.json({
    success: true,
    roles: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      permissions: r.permissions,
      isDefault: r.is_default,
      createdAt: r.created_at,
    })),
    availablePermissions: PERMISSIONS,
  });
}));

/**
 * POST /api/organizations/:orgId/roles
 *
 * Body: { name, slug, permissions: string[] }
 */
router.post('/', requirePermission('settings.manage'), zodValidate(createRoleSchema), asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { name, slug, permissions } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ success: false, error: 'name and slug are required', code: 'ROLE_NAME_SLUG_REQUIRED' });
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ success: false, error: 'slug must be lowercase alphanumeric with hyphens', code: 'ROLE_INVALID_SLUG' });
  }

  // Validate permissions against catalog
  if (permissions && Array.isArray(permissions)) {
    const invalid = permissions.filter(p => !PERMISSIONS[p] && p !== '*');
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, error: `Unknown permissions: ${invalid.join(', ')}`, code: 'ROLE_INVALID_PERMISSIONS' });
    }
  }

  const result = await query(
    `INSERT INTO custom_roles (organization_id, name, slug, permissions, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, slug, permissions, created_at`,
    [orgId, name, slug, JSON.stringify(permissions || []), req.user.id]
  );

  await logAction(req.user.id, 'create', 'role', result.rows[0].id, { name, slug, orgId }, req);

  res.status(201).json({
    success: true,
    role: result.rows[0],
  });
}));

/**
 * PUT /api/organizations/:orgId/roles/:slug
 *
 * Body: { name?, permissions? }
 */
router.put('/:slug', requirePermission('settings.manage'), zodValidate(updateRoleSchema), asyncHandler(async (req, res) => {
  const { orgId, slug } = req.params;
  const { name, permissions } = req.body;

  // Don't allow editing default roles
  const existing = await query(
    `SELECT id, is_default FROM custom_roles
     WHERE slug = $1 AND (organization_id = $2 OR organization_id IS NULL)
     LIMIT 1`,
    [slug, orgId]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Role not found', code: 'ROLE_NOT_FOUND' });
  }
  if (existing.rows[0].is_default) {
    return res.status(403).json({ success: false, error: 'Cannot edit default roles', code: 'ROLE_DEFAULT_IMMUTABLE' });
  }

  const updates = [];
  const params = [existing.rows[0].id];
  let idx = 2;

  if (name) {
    updates.push(`name = $${idx++}`);
    params.push(name);
  }
  if (permissions) {
    updates.push(`permissions = $${idx++}`);
    params.push(JSON.stringify(permissions));
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, error: 'No fields to update', code: 'ROLE_NO_FIELDS' });
  }

  updates.push(`updated_at = NOW()`);

  const result = await query(
    `UPDATE custom_roles SET ${updates.join(', ')} WHERE id = $1
     RETURNING id, name, slug, permissions, updated_at`,
    params
  );

  await logAction(req.user.id, 'update', 'role', result.rows[0].id, { name, permissions, orgId }, req);

  res.json({ success: true, role: result.rows[0] });
}));

/**
 * DELETE /api/organizations/:orgId/roles/:slug
 */
router.delete('/:slug', requirePermission('settings.manage'), asyncHandler(async (req, res) => {
  const { orgId, slug } = req.params;

  // Don't delete default roles
  const existing = await query(
    `SELECT id, is_default FROM custom_roles
     WHERE slug = $1 AND organization_id = $2
     LIMIT 1`,
    [slug, orgId]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Custom role not found', code: 'ROLE_NOT_FOUND' });
  }
  if (existing.rows[0].is_default) {
    return res.status(403).json({ success: false, error: 'Cannot delete default roles', code: 'ROLE_DEFAULT_IMMUTABLE' });
  }

  // Check if any members use this role
  const memberCount = await query(
    `SELECT COUNT(*) FROM organization_members
     WHERE organization_id = $1 AND role = $2`,
    [orgId, slug]
  );

  if (parseInt(memberCount.rows[0].count) > 0) {
    return res.status(409).json({
      success: false,
      error: 'Cannot delete role — reassign members first',
      code: 'ROLE_HAS_MEMBERS',
      memberCount: parseInt(memberCount.rows[0].count),
    });
  }

  await query(`DELETE FROM custom_roles WHERE id = $1`, [existing.rows[0].id]);

  await logAction(req.user.id, 'delete', 'role', existing.rows[0].id, { slug, orgId }, req);

  res.json({ success: true });
}));

module.exports = router;
