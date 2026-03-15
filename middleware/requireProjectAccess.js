/**
 * requireProjectAccess Middleware
 *
 * Verifies that the authenticated user is a member of the project
 * (via project_members table or as the project manager).
 *
 * Usage:
 *   router.get('/:projectId/foo', authenticateToken, requireProjectAccess(), handler);
 *   router.get('/:projectId/foo', authenticateToken, requireProjectAccess('projectId'), handler);
 *
 * The param name defaults to 'projectId'. Pass a different name if the route
 * uses a different parameter (e.g. 'id').
 */

const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('Auth:ProjectAccess');

/**
 * Check if a user can access a project (member or manager).
 * Shared helper that can also be called directly from route handlers.
 */
async function canUserAccessProject(userId, projectId) {
  try {
    const result = await query(`
      SELECT 1 FROM project_members
      WHERE project_id = $1 AND user_id = $2
      UNION
      SELECT 1 FROM projects
      WHERE id = $1 AND manager_id = $2
    `, [projectId, userId]);
    return result.rows.length > 0;
  } catch (error) {
    log.error('Error checking project access', error);
    return false;
  }
}

/**
 * Express middleware factory.
 * @param {string} [paramName='projectId'] - Route param holding the project ID
 */
function requireProjectAccess(paramName = 'projectId') {
  return async (req, res, next) => {
    const projectId = req.params[paramName];
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required',
        code: 'PROJECT_ID_REQUIRED'
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this project',
        code: 'PROJECT_ACCESS_DENIED'
      });
    }

    next();
  };
}

module.exports = { requireProjectAccess, canUserAccessProject };
