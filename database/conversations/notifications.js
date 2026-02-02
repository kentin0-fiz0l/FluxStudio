/**
 * Conversations Notifications Adapter
 * User notification operations
 */

const { query } = require('../config');
const { v4: uuidv4 } = require('uuid');

function transformNotification(row) {
  if (!row) return null;
  const notification = {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    entityId: row.entity_id,
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    readAt: row.read_at,
    createdAt: row.created_at,
    // New v2 fields
    actorUserId: row.actor_user_id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    threadRootMessageId: row.thread_root_message_id,
    assetId: row.asset_id,
    metadata: row.metadata_json || {}
  };

  // Include actor details if joined from users table
  if (row.actor_id) {
    notification.actor = {
      id: row.actor_id,
      name: row.actor_name,
      email: row.actor_email,
      avatarUrl: row.actor_avatar
    };
  }

  return notification;
}

/**
 * Create a notification for a user (v2 with enhanced fields)
 */
async function createNotification({
  userId,
  type,
  title,
  body = null,
  actorUserId = null,
  conversationId = null,
  messageId = null,
  threadRootMessageId = null,
  assetId = null,
  metadata = {},
  entityId = null
}) {
  const id = uuidv4();

  const result = await query(`
    INSERT INTO notifications (
      id, user_id, type, entity_id, title, body, is_read, created_at,
      actor_user_id, conversation_id, message_id, thread_root_message_id, asset_id, metadata_json
    )
    VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW(), $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    id, userId, type, entityId, title, body,
    actorUserId, conversationId, messageId, threadRootMessageId, assetId,
    JSON.stringify(metadata)
  ]);

  return transformNotification(result.rows[0]);
}

/**
 * List notifications for a user with actor info
 */
async function listNotifications({ userId, limit = 20, offset = 0, onlyUnread = false, projectId = null }) {
  // Build where conditions
  const conditions = ['n.user_id = $1'];
  const params = [userId];
  let paramIndex = 2;

  if (onlyUnread) {
    conditions.push('n.is_read = FALSE');
  }

  if (projectId) {
    conditions.push(`n.project_id = $${paramIndex}`);
    params.push(projectId);
    paramIndex++;
  }

  params.push(limit, offset);
  const limitOffset = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  const queryText = `
    SELECT
      n.*,
      u.id as actor_id,
      u.name as actor_name,
      u.email as actor_email,
      u.avatar_url as actor_avatar
    FROM notifications n
    LEFT JOIN users u ON n.actor_user_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY n.created_at DESC
    ${limitOffset}
  `;

  const result = await query(queryText, params);
  return result.rows.map(row => transformNotification(row));
}

/**
 * Mark a notification as read
 */
async function markNotificationRead({ notificationId, userId }) {
  const result = await query(`
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `, [notificationId, userId]);

  return result.rows[0] ? transformNotification(result.rows[0]) : null;
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsRead({ userId }) {
  const result = await query(`
    UPDATE notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = $1 AND is_read = FALSE
  `, [userId]);

  return result.rowCount;
}

/**
 * Get unread notification count for a user
 */
async function getUnreadNotificationCount({ userId }) {
  const result = await query(`
    SELECT COUNT(*) as count
    FROM notifications
    WHERE user_id = $1 AND is_read = FALSE
  `, [userId]);

  return parseInt(result.rows[0].count, 10) || 0;
}

module.exports = {
  transformNotification,
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount
};
