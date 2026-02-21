/**
 * Data Exporter — GDPR Article 20 Data Portability
 *
 * Sprint 41 T2: GDPR/CCPA Compliance Tools
 *
 * Generates a complete data export package for a user.
 * Collects: profile, projects, files metadata, messages, activity logs, settings, consents.
 * Returns a JSON object with all user data keyed by category.
 */

const { query } = require('../../database/config');

/**
 * Export all personal data for a user.
 *
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} Data export keyed by category
 */
async function exportUserData(userId) {
  const [
    profileResult,
    projectsResult,
    filesResult,
    messagesResult,
    activityResult,
    orgsResult,
    consentsResult,
    teamsResult,
  ] = await Promise.all([
    // Profile
    query(
      `SELECT id, name, email, user_type, avatar_url, bio, location, website, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    ),
    // Projects (owned)
    query(
      `SELECT id, name, description, status, created_at, updated_at
       FROM projects WHERE manager_id = $1
       ORDER BY created_at DESC`,
      [userId]
    ),
    // Files metadata (uploaded by user)
    query(
      `SELECT id, original_name, file_type, file_size, created_at
       FROM files WHERE uploaded_by = $1
       ORDER BY created_at DESC`,
      [userId]
    ),
    // Messages sent
    query(
      `SELECT id, content, channel_id, created_at
       FROM messages WHERE sender_id = $1
       ORDER BY created_at DESC
       LIMIT 5000`,
      [userId]
    ),
    // Activity / audit logs
    query(
      `SELECT action, resource_type, resource_id, details, ip_address, created_at
       FROM audit_logs WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 2000`,
      [userId]
    ),
    // Organization memberships
    query(
      `SELECT o.id, o.name, om.role, om.joined_at
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1`,
      [userId]
    ),
    // Consent records
    query(
      `SELECT consent_type, granted, created_at
       FROM consent_records WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    ),
    // Team memberships
    query(
      `SELECT t.id, t.name, tm.role, tm.joined_at
       FROM team_members tm
       JOIN teams t ON t.id = tm.team_id
       WHERE tm.user_id = $1`,
      [userId]
    ),
  ]);

  return {
    exportDate: new Date().toISOString(),
    exportVersion: '1.0',
    profile: profileResult.rows[0] || null,
    organizations: orgsResult.rows,
    teams: teamsResult.rows,
    projects: projectsResult.rows,
    files: filesResult.rows.map(f => ({
      id: f.id,
      name: f.original_name,
      type: f.file_type,
      size: f.file_size,
      uploadedAt: f.created_at,
    })),
    messages: messagesResult.rows,
    activityLog: activityResult.rows,
    consents: consentsResult.rows,
  };
}

/**
 * Create a data export request record.
 *
 * @param {string} userId
 * @returns {Promise<object>} The created request row
 */
async function createExportRequest(userId) {
  const result = await query(
    `INSERT INTO data_export_requests (user_id, status)
     VALUES ($1, 'processing')
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

/**
 * Mark an export request as completed.
 *
 * @param {string} requestId
 * @param {number} dataSize - Approximate size of export in bytes
 */
async function completeExportRequest(requestId, dataSize) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

  await query(
    `UPDATE data_export_requests
     SET status = 'completed', file_size = $2, completed_at = NOW(), expires_at = $3
     WHERE id = $1`,
    [requestId, dataSize, expiresAt]
  );
}

/**
 * Mark an export request as failed.
 *
 * @param {string} requestId
 */
async function failExportRequest(requestId) {
  await query(
    `UPDATE data_export_requests SET status = 'failed', completed_at = NOW() WHERE id = $1`,
    [requestId]
  );
}

/**
 * Check if a user has requested an export in the last 24 hours.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function hasRecentExport(userId) {
  const result = await query(
    `SELECT id FROM data_export_requests
     WHERE user_id = $1 AND requested_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
}

/**
 * Get an export request by ID, scoped to a user.
 *
 * @param {string} requestId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getExportRequest(requestId, userId) {
  const result = await query(
    `SELECT * FROM data_export_requests WHERE id = $1 AND user_id = $2`,
    [requestId, userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  exportUserData,
  createExportRequest,
  completeExportRequest,
  failExportRequest,
  hasRecentExport,
  getExportRequest,
};
