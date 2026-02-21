/**
 * Account Deletor — GDPR Article 17 Right to Erasure
 *
 * Sprint 41 T2: GDPR/CCPA Compliance Tools
 *
 * Handles account deletion workflow:
 * - 30-day grace period before hard delete
 * - Anonymizes data in shared resources (messages, project contributions)
 * - Revokes all tokens
 * - Logs deletion to audit trail
 */

const { query } = require('../../database/config');

const GRACE_PERIOD_DAYS = 30;

/**
 * Request account deletion with a 30-day grace period.
 *
 * @param {string} userId
 * @param {string|null} reason - Optional reason for deletion
 * @returns {Promise<object>} The deletion request record
 */
async function requestDeletion(userId, reason = null) {
  const gracePeriodEnds = new Date();
  gracePeriodEnds.setDate(gracePeriodEnds.getDate() + GRACE_PERIOD_DAYS);

  const result = await query(
    `INSERT INTO deletion_requests (user_id, reason, status, scheduled_at, grace_period_ends)
     VALUES ($1, $2, 'pending', $3, $3)
     ON CONFLICT (user_id) DO UPDATE SET
       reason = EXCLUDED.reason,
       status = 'pending',
       scheduled_at = EXCLUDED.scheduled_at,
       grace_period_ends = EXCLUDED.grace_period_ends,
       completed_at = NULL,
       cancelled_at = NULL,
       created_at = NOW()
     RETURNING *`,
    [userId, reason, gracePeriodEnds]
  );

  console.log(`[AccountDeletor] Deletion requested for user ${userId}, grace period ends ${gracePeriodEnds.toISOString()}`);

  return result.rows[0];
}

/**
 * Cancel a pending deletion request.
 *
 * @param {string} userId
 * @returns {Promise<object|null>} The cancelled request or null if none found
 */
async function cancelDeletion(userId) {
  const result = await query(
    `UPDATE deletion_requests
     SET status = 'cancelled', cancelled_at = NOW()
     WHERE user_id = $1 AND status = 'pending'
     RETURNING *`,
    [userId]
  );

  if (result.rows.length > 0) {
    console.log(`[AccountDeletor] Deletion cancelled for user ${userId}`);
  }

  return result.rows[0] || null;
}

/**
 * Get the current deletion request status for a user.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getDeletionStatus(userId) {
  const result = await query(
    `SELECT id, status, reason, scheduled_at, grace_period_ends, created_at, cancelled_at, completed_at
     FROM deletion_requests
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Execute hard deletion for a user whose grace period has expired.
 * Anonymizes shared data, revokes tokens, and deletes personal data.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function executeHardDelete(userId) {
  console.log(`[AccountDeletor] Executing hard delete for user ${userId}`);

  // 1. Anonymize messages in shared conversations
  await query(
    `UPDATE messages SET sender_id = NULL, content = '[deleted]'
     WHERE sender_id = $1`,
    [userId]
  );

  // 2. Revoke all active sessions
  await query(
    `DELETE FROM active_sessions WHERE user_id = $1`,
    [userId]
  );

  // 3. Remove refresh tokens
  await query(
    `DELETE FROM refresh_tokens WHERE user_id = $1`,
    [userId]
  );

  // 4. Remove consent records
  await query(
    `DELETE FROM consent_records WHERE user_id = $1`,
    [userId]
  );

  // 5. Remove data export requests
  await query(
    `DELETE FROM data_export_requests WHERE user_id = $1`,
    [userId]
  );

  // 6. Mark deletion as completed
  await query(
    `UPDATE deletion_requests SET status = 'completed', completed_at = NOW()
     WHERE user_id = $1 AND status = 'pending'`,
    [userId]
  );

  // 7. Anonymize the user record (keep for FK integrity)
  await query(
    `UPDATE users SET
       name = 'Deleted User',
       email = CONCAT('deleted_', id, '@deleted.fluxstudio.art'),
       avatar_url = NULL,
       bio = NULL,
       location = NULL,
       website = NULL,
       totp_secret = NULL,
       totp_enabled = false,
       totp_backup_codes = NULL,
       updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );

  console.log(`[AccountDeletor] Hard delete completed for user ${userId}`);
}

/**
 * Find all deletion requests whose grace period has expired and are still pending.
 *
 * @returns {Promise<object[]>}
 */
async function findExpiredDeletionRequests() {
  const result = await query(
    `SELECT dr.id, dr.user_id
     FROM deletion_requests dr
     WHERE dr.status = 'pending'
       AND dr.grace_period_ends <= NOW()`
  );
  return result.rows;
}

module.exports = {
  requestDeletion,
  cancelDeletion,
  getDeletionStatus,
  executeHardDelete,
  findExpiredDeletionRequests,
  GRACE_PERIOD_DAYS,
};
