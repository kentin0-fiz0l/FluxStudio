/**
 * Conversations Reactions Adapter
 * Message reaction operations
 */

const { query } = require('../config');
const { v4: uuidv4 } = require('uuid');
const { getMessageById } = require('./messages');

/**
 * Add a reaction to a message
 */
async function addReaction({ messageId, userId, emoji }) {
  const id = uuidv4();

  // First get the message to get conversationId and projectId
  const message = await getMessageById({ messageId });
  if (!message) {
    throw new Error('Message not found');
  }

  try {
    // Upsert reaction (ignore if already exists)
    await query(`
      INSERT INTO message_reactions (id, message_id, user_id, emoji, conversation_id, project_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (message_id, user_id, emoji) DO NOTHING
    `, [id, messageId, userId, emoji, message.conversationId, message.projectId]);

    // Return aggregated reactions
    return await listReactionsForMessage({ messageId });
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
}

/**
 * Remove a reaction from a message
 */
async function removeReaction({ messageId, userId, emoji }) {
  try {
    await query(`
      DELETE FROM message_reactions
      WHERE message_id = $1 AND user_id = $2 AND emoji = $3
    `, [messageId, userId, emoji]);

    // Return aggregated reactions
    return await listReactionsForMessage({ messageId });
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
}

/**
 * List aggregated reactions for a message
 */
async function listReactionsForMessage({ messageId }) {
  const result = await query(`
    SELECT
      emoji,
      COUNT(*) as count,
      array_agg(user_id ORDER BY created_at ASC) as user_ids
    FROM message_reactions
    WHERE message_id = $1
    GROUP BY emoji
    ORDER BY count DESC, emoji ASC
  `, [messageId]);

  return {
    messageId,
    reactions: result.rows.map(row => ({
      emoji: row.emoji,
      count: parseInt(row.count, 10),
      userIds: row.user_ids || []
    }))
  };
}

/**
 * List reactions for multiple messages (batch query for efficiency)
 */
async function listReactionsForMessages({ messageIds }) {
  if (!messageIds || messageIds.length === 0) {
    return {};
  }

  const result = await query(`
    SELECT
      message_id,
      emoji,
      COUNT(*) as count,
      array_agg(user_id ORDER BY created_at ASC) as user_ids
    FROM message_reactions
    WHERE message_id = ANY($1)
    GROUP BY message_id, emoji
    ORDER BY message_id, count DESC, emoji ASC
  `, [messageIds]);

  // Group by messageId
  const reactionsMap = {};
  for (const row of result.rows) {
    if (!reactionsMap[row.message_id]) {
      reactionsMap[row.message_id] = [];
    }
    reactionsMap[row.message_id].push({
      emoji: row.emoji,
      count: parseInt(row.count, 10),
      userIds: row.user_ids || []
    });
  }

  return reactionsMap;
}

module.exports = {
  addReaction,
  removeReaction,
  listReactionsForMessage,
  listReactionsForMessages
};
