/**
 * Audit Logging Helper
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Records user actions for compliance auditing.
 * Actions: create, update, delete, invite, remove, login, logout, settings_change
 * Resource types: project, organization, team, user, file, plugin, template
 */

let dbQuery = null;
try {
  const { query } = require('../database/config');
  dbQuery = query;
} catch {
  // Database not available — log to console only
}

/**
 * Log a user action to the audit_logs table.
 *
 * @param {string|null} userId - Acting user's ID (null for system actions)
 * @param {string} action - Action performed (create, update, delete, etc.)
 * @param {string} resourceType - Resource type (project, user, file, etc.)
 * @param {string|null} resourceId - Affected resource ID
 * @param {object} details - Additional context (JSONB)
 * @param {object} req - Express request (for IP and user-agent)
 */
async function logAction(userId, action, resourceType, resourceId, details = {}, req = null) {
  const ip = req?.ip || req?.connection?.remoteAddress || null;
  const userAgent = req?.headers?.['user-agent'] || null;

  try {
    if (dbQuery) {
      await dbQuery(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, action, resourceType, resourceId, JSON.stringify(details), ip, userAgent]
      );
    }
  } catch (error) {
    // Don't let audit failures break the request
    console.error('[AuditLog] Failed to write:', error.message);
  }
}

module.exports = { logAction };
