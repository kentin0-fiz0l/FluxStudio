/**
 * Messaging Notifications Adapter
 * Notification management functionality
 */

const { query } = require('../config');

function transformNotification(dbNotification) {
  return {
    id: dbNotification.id,
    userId: dbNotification.user_id,
    type: dbNotification.type,
    title: dbNotification.title,
    message: dbNotification.message,
    data: dbNotification.data || {},
    priority: dbNotification.priority,
    isRead: dbNotification.is_read,
    readAt: dbNotification.read_at,
    actionUrl: dbNotification.action_url,
    expiresAt: dbNotification.expires_at,
    createdAt: dbNotification.created_at
  };
}

async function getNotifications(userId, limit = 20, offset = 0) {
  try {
    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows.map(transformNotification);
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

async function getUnreadNotificationCount(userId) {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

async function createNotification(notificationData) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, data, priority, action_url, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        notificationData.userId,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        JSON.stringify(notificationData.data || {}),
        notificationData.priority || 'medium',
        notificationData.actionUrl || null,
        notificationData.expiresAt || null
      ]
    );
    return transformNotification(result.rows[0]);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

async function markNotificationAsRead(notificationId, userId) {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    return result.rows.length > 0 ? transformNotification(result.rows[0]) : null;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
}

async function markAllNotificationsAsRead(userId) {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false RETURNING *`,
      [userId]
    );
    return result.rows.map(transformNotification);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return [];
  }
}

async function markNotificationsByIds(notificationIds, userId) {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = ANY($1) AND user_id = $2 RETURNING *`,
      [notificationIds, userId]
    );
    return result.rows.map(transformNotification);
  } catch (error) {
    console.error('Error marking notifications by ids:', error);
    return [];
  }
}

async function deleteNotification(notificationId, userId) {
  try {
    const result = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

module.exports = {
  transformNotification,
  getNotifications,
  getUnreadNotificationCount,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationsByIds,
  deleteNotification
};
