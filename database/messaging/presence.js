/**
 * Messaging Presence Adapter
 * Real-time presence and typing status functionality
 */

const { query } = require('../config');
const { createLogger } = require('../../lib/logger');
const log = createLogger('DB:Msg:Presence');

async function updateUserPresence(userId, conversationId, _status = 'active') {
  try {
    await query(
      `INSERT INTO user_presence (user_id, conversation_id, last_active_at, is_typing)
       VALUES ($1, $2, NOW(), false)
       ON CONFLICT (user_id, conversation_id)
       DO UPDATE SET last_active_at = NOW(), updated_at = NOW()`,
      [userId, conversationId]
    );
    return true;
  } catch (error) {
    log.error('Error updating user presence', error);
    return false;
  }
}

async function getUserPresence(userId, conversationId = null) {
  try {
    let queryText = `
      SELECT up.*, c.name as conversation_name
      FROM user_presence up
      LEFT JOIN conversations c ON up.conversation_id = c.id
      WHERE up.user_id = $1
    `;
    const params = [userId];

    if (conversationId) {
      queryText += ` AND up.conversation_id = $2`;
      params.push(conversationId);
    }

    queryText += ` ORDER BY up.last_active_at DESC`;

    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    log.error('Error getting user presence', error);
    return [];
  }
}

async function updateTypingStatus(userId, conversationId, isTyping = false) {
  try {
    await query(
      `INSERT INTO user_presence (user_id, conversation_id, is_typing, typing_started_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, conversation_id)
       DO UPDATE SET
         is_typing = $3,
         typing_started_at = $4,
         updated_at = NOW()`,
      [userId, conversationId, isTyping, isTyping ? new Date() : null]
    );
    return true;
  } catch (error) {
    log.error('Error updating typing status', error);
    return false;
  }
}

async function markMessageAsRead(userId, conversationId, _messageId = null) {
  try {
    await query(
      `INSERT INTO user_presence (user_id, conversation_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, conversation_id)
       DO UPDATE SET last_read_at = NOW(), updated_at = NOW()`,
      [userId, conversationId]
    );
    return true;
  } catch (error) {
    log.error('Error marking message as read', error);
    return false;
  }
}

// Mute / Notification settings
async function muteConversation(conversationId, userId, mutedUntil = null) {
  try {
    const result = await query(
      `UPDATE conversation_participants
       SET is_muted = true, muted_until = $3, updated_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2
       RETURNING *`,
      [conversationId, userId, mutedUntil]
    );
    return result.rows.length > 0;
  } catch (error) {
    log.error('Error muting conversation', error);
    return false;
  }
}

async function unmuteConversation(conversationId, userId) {
  try {
    const result = await query(
      `UPDATE conversation_participants
       SET is_muted = false, muted_until = NULL, updated_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2
       RETURNING *`,
      [conversationId, userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    log.error('Error unmuting conversation', error);
    return false;
  }
}

async function updateNotificationPreference(conversationId, userId, preference) {
  try {
    const result = await query(
      `UPDATE conversation_participants
       SET notification_preference = $3, updated_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2
       RETURNING *`,
      [conversationId, userId, preference]
    );
    return result.rows.length > 0;
  } catch (error) {
    log.error('Error updating notification preference', error);
    return false;
  }
}

async function getMuteStatus(conversationId, userId) {
  try {
    const result = await query(
      `SELECT is_muted, muted_until, notification_preference
       FROM conversation_participants
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];

    // Check if mute has expired
    if (row.is_muted && row.muted_until && new Date(row.muted_until) < new Date()) {
      await unmuteConversation(conversationId, userId);
      return { isMuted: false, mutedUntil: null, notificationPreference: row.notification_preference };
    }
    return {
      isMuted: row.is_muted,
      mutedUntil: row.muted_until,
      notificationPreference: row.notification_preference
    };
  } catch (error) {
    log.error('Error getting mute status', error);
    return null;
  }
}

module.exports = {
  updateUserPresence,
  getUserPresence,
  updateTypingStatus,
  markMessageAsRead,
  muteConversation,
  unmuteConversation,
  updateNotificationPreference,
  getMuteStatus
};
