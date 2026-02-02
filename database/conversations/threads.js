/**
 * Conversations Threads Adapter
 * Thread listing and summary operations
 */

const { query } = require('../config');
const { transformMessage } = require('./messages');

/**
 * List messages in a thread
 */
async function listThreadMessages({ conversationId, threadRootMessageId, userId, limit = 50 }) {
  // Verify membership
  const memberCheck = await query(`
    SELECT 1 FROM conversation_members
    WHERE conversation_id = $1 AND user_id = $2
  `, [conversationId, userId]);
  if (memberCheck.rows.length === 0) return null;

  // Get root message
  const rootResult = await query(`
    SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.id = $1 AND m.conversation_id = $2
  `, [threadRootMessageId, conversationId]);

  if (rootResult.rows.length === 0) return null;
  const rootMessage = transformMessage(rootResult.rows[0]);

  // Get thread replies
  const repliesResult = await query(`
    SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.conversation_id = $1
      AND (m.thread_root_message_id = $2 OR m.reply_to_message_id = $2)
      AND m.id != $2
    ORDER BY m.created_at ASC
    LIMIT $3
  `, [conversationId, threadRootMessageId, limit]);

  const messages = repliesResult.rows.map(row => transformMessage(row));

  // Get reply count
  const countResult = await query(`
    SELECT COUNT(*) as count
    FROM messages
    WHERE conversation_id = $1
      AND (thread_root_message_id = $2 OR reply_to_message_id = $2)
      AND id != $2
  `, [conversationId, threadRootMessageId]);

  return {
    rootMessage,
    messages,
    replyCount: parseInt(countResult.rows[0].count, 10) || 0
  };
}

/**
 * Get thread summary for a message
 */
async function getThreadSummary({ conversationId, threadRootMessageId }) {
  const result = await query(`
    SELECT
      COUNT(*) as reply_count,
      MAX(m.created_at) as last_reply_at,
      ARRAY_AGG(DISTINCT m.user_id) as participant_ids
    FROM messages m
    WHERE m.conversation_id = $1
      AND (m.thread_root_message_id = $2 OR m.reply_to_message_id = $2)
      AND m.id != $2
  `, [conversationId, threadRootMessageId]);

  const row = result.rows[0];
  const participantIds = row.participant_ids?.filter(id => id) || [];

  // Get participant info
  let participants = [];
  if (participantIds.length > 0) {
    const usersResult = await query(`
      SELECT id, name, avatar_url
      FROM users
      WHERE id = ANY($1)
    `, [participantIds]);
    participants = usersResult.rows.map(u => ({
      userId: u.id,
      userName: u.name,
      avatarUrl: u.avatar_url
    }));
  }

  return {
    replyCount: parseInt(row.reply_count, 10) || 0,
    lastReplyAt: row.last_reply_at,
    participants
  };
}

module.exports = {
  listThreadMessages,
  getThreadSummary
};
