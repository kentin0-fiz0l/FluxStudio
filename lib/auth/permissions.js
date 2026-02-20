/**
 * Permission Catalog & Middleware
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Fine-grained permission system for organizations.
 */

const { query } = require('../../database/config');

// Permission catalog — all available permissions
const PERMISSIONS = {
  'projects.view': 'View projects',
  'projects.create': 'Create projects',
  'projects.delete': 'Delete projects',
  'projects.manage': 'Manage project settings',
  'files.view': 'View files',
  'files.upload': 'Upload files',
  'files.delete': 'Delete files',
  'members.invite': 'Invite members',
  'members.remove': 'Remove members',
  'billing.manage': 'Manage billing',
  'settings.manage': 'Manage org settings',
  'admin.access': 'Access admin panel',
};

/**
 * Check if a user has a specific permission within an organization.
 * Owner role (*) grants all permissions.
 */
async function hasPermission(userId, orgId, permission) {
  try {
    // Check org membership role
    const memberResult = await query(
      `SELECT om.role, om.permissions, cr.permissions AS role_permissions
       FROM organization_members om
       LEFT JOIN custom_roles cr ON cr.slug = om.role
         AND (cr.organization_id = om.organization_id OR cr.organization_id IS NULL)
       WHERE om.user_id = $1 AND om.organization_id = $2
       LIMIT 1`,
      [userId, orgId]
    );

    if (memberResult.rows.length === 0) return false;

    const member = memberResult.rows[0];

    // Owner has all permissions
    if (member.role === 'owner') return true;

    // Check role-level permissions
    const rolePerms = member.role_permissions || [];
    if (Array.isArray(rolePerms) && (rolePerms.includes('*') || rolePerms.includes(permission))) {
      return true;
    }

    // Check user-level permission overrides (JSONB on org_members)
    const userPerms = member.permissions || [];
    if (Array.isArray(userPerms) && userPerms.includes(permission)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Permissions] Check failed:', error.message);
    return false;
  }
}

/**
 * Express middleware factory — requires a specific permission for the org in :orgId param.
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    const orgId = req.params.orgId || req.body?.organizationId;
    if (!orgId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const allowed = await hasPermission(req.user.id, orgId, permission);
    if (!allowed) {
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    }

    next();
  };
}

module.exports = { PERMISSIONS, hasPermission, requirePermission };
