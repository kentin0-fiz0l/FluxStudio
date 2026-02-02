/**
 * Conversations Pins Adapter
 * Message pinning operations
 */

const { query } = require('../config');
const { v4: uuidv4 } = require('uuid');
const { getMessageById, transformMessage } = require('./messages');

/**
 * Pin a message in its conversation.
 * If it is already pinned, update pinned_by and pinned_at.
 */
async function pinMessage({ messageId, userId }) {
  const message = await getMessageById({ messageId });
  if (!message) return null;

  const id = uuidv4();
  const conversationId = message.conversationId;
  const projectId = message.projectId || null;

  await query(`
    INSERT INTO message_pins (id, message_id, conversation_id, project_id, pinned_by, pinned_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (message_id, conversation_id)
    DO UPDATE SET pinned_by = EXCLUDED.pinned_by, pinned_at = NOW()
  `, [id, messageId, conversationId, projectId, userId]);

  return listPinnedMessages({ conversationId, limit: 20 });
}

/**
 * Unpin a message in its conversation.
 */
async function unpinMessage({ messageId }) {
  const message = await getMessageById({ messageId });
  if (!message) return null;

  const conversationId = message.conversationId;

  await query(
    `DELETE FROM message_pins WHERE message_id = $1 AND conversation_id = $2`,
    [messageId, conversationId]
  );

  return listPinnedMessages({ conversationId, limit: 20 });
}

/**
 * List pinned messages for a conversation.
 * Returns basic message info plus pin metadata.
 */
async function listPinnedMessages({ conversationId, limit = 20 }) {
  const result = await query(`
    SELECT
      mp.id as pin_id,
      mp.pinned_by,
      mp.pinned_at,
      m.*,
      u.name as user_name,
      u.avatar_url as user_avatar
    FROM message_pins mp
    JOIN messages m ON m.id = mp.message_id
    LEFT JOIN users u ON m.user_id = u.id
    WHERE mp.conversation_id = $1
    ORDER BY mp.pinned_at DESC
    LIMIT $2
  `, [conversationId, limit]);

  return result.rows.map(row => ({
    pinId: row.pin_id,
    pinnedBy: row.pinned_by,
    pinnedAt: row.pinned_at,
    message: transformMessage(row),
  }));
}

/**
 * Check if a message is pinned
 */
async function isMessagePinned({ messageId }) {
  const result = await query(
    `SELECT id FROM message_pins WHERE message_id = $1 LIMIT 1`,
    [messageId]
  );
  return result.rows.length > 0;
}

module.exports = {
  pinMessage,
  unpinMessage,
  listPinnedMessages,
  isMessagePinned
};
