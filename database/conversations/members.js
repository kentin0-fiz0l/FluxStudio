/**
 * Conversations Members Adapter
 * Member management and read state operations
 */

const { query } = require('../config');
const { v4: uuidv4 } = require('uuid');
const { transformMember } = require('./core');
const { createLogger } = require('../../lib/logger');
const log = createLogger('DB:Conv:Members');

/**
 * Add a member to a conversation
 */
async function addMember({ conversationId, userId, role = 'member' }) {
  const id = uuidv4();

  try {
    const result = await query(`
      INSERT INTO conversation_members (id, conversation_id, user_id, role, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (conversation_id, user_id) DO NOTHING
      RETURNING *
    `, [id, conversationId, userId, role]);

    if (result.rows.length === 0) {
      // Already a member, fetch existing
      const existing = await query(`
        SELECT * FROM conversation_members
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);
      return transformMember(existing.rows[0]);
    }

    return transformMember(result.rows[0]);
  } catch (error) {
    log.error('Error adding member', error);
    throw error;
  }
}

/**
 * Remove a member from a conversation
 */
async function removeMember({ conversationId, userId }) {
  const result = await query(`
    DELETE FROM conversation_members
    WHERE conversation_id = $1 AND user_id = $2
  `, [conversationId, userId]);

  return result.rowCount > 0;
}

/**
 * Set last read message for a user in a conversation
 */
async function setLastRead({ conversationId, userId, messageId }) {
  const result = await query(`
    UPDATE conversation_members
    SET last_read_message_id = $1
    WHERE conversation_id = $2 AND user_id = $3
  `, [messageId, conversationId, userId]);

  return result.rowCount > 0;
}

/**
 * Get read states for all members of a conversation
 */
async function getConversationReadStates({ conversationId }) {
  const result = await query(`
    SELECT
      cm.user_id,
      cm.last_read_message_id,
      u.name as user_name,
      u.avatar_url
    FROM conversation_members cm
    LEFT JOIN users u ON cm.user_id = u.id
    WHERE cm.conversation_id = $1
  `, [conversationId]);

  return result.rows.map(row => ({
    userId: row.user_id,
    userName: row.user_name,
    avatarUrl: row.avatar_url,
    lastReadMessageId: row.last_read_message_id
  }));
}

/**
 * Update the last read message for a user in a conversation
 * (enhanced version of setLastRead with timestamp)
 */
async function updateReadState({ conversationId, userId, messageId }) {
  const result = await query(`
    UPDATE conversation_members
    SET last_read_message_id = $1
    WHERE conversation_id = $2 AND user_id = $3
    RETURNING *
  `, [messageId, conversationId, userId]);

  if (result.rows.length === 0) return null;

  // Get user info
  const userResult = await query(`
    SELECT name, avatar_url FROM users WHERE id = $1
  `, [userId]);
  const userInfo = userResult.rows[0] || {};

  return {
    userId,
    userName: userInfo.name,
    avatarUrl: userInfo.avatar_url,
    lastReadMessageId: messageId,
    conversationId
  };
}

/**
 * Get unread counts for all conversations a user is in
 */
async function getUnreadCountForUser({ userId }) {
  const result = await query(`
    SELECT
      cm.conversation_id,
      COUNT(
        CASE
          WHEN m.id IS NOT NULL AND (
            cm.last_read_message_id IS NULL
            OR m.created_at > (
              SELECT created_at FROM messages WHERE id = cm.last_read_message_id
            )
          ) THEN 1
        END
      ) as unread_count
    FROM conversation_members cm
    LEFT JOIN messages m ON m.conversation_id = cm.conversation_id
    WHERE cm.user_id = $1
    GROUP BY cm.conversation_id
  `, [userId]);

  return result.rows.map(row => ({
    conversationId: row.conversation_id,
    unreadCount: parseInt(row.unread_count, 10) || 0
  }));
}

/**
 * Get user by ID (for typing indicators, etc.)
 */
async function getUserById(userId) {
  if (!userId) return null;
  const result = await query(`
    SELECT id, name, email, avatar_url
    FROM users
    WHERE id = $1
  `, [userId]);
  return result.rows[0] || null;
}

module.exports = {
  addMember,
  removeMember,
  setLastRead,
  getConversationReadStates,
  updateReadState,
  getUnreadCountForUser,
  getUserById
};
