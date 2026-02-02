/**
 * Messaging Reactions Adapter
 * Reactions and pinned messages functionality
 */

const { query } = require('../config');

// Basic reactions
async function addReaction(messageId, userId, reaction) {
  try {
    await query(
      `INSERT INTO message_reactions (message_id, user_id, reaction)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, reaction) DO NOTHING`,
      [messageId, userId, reaction]
    );
    return true;
  } catch (error) {
    console.error('Error adding reaction:', error);
    return false;
  }
}

async function removeReaction(messageId, userId, reaction) {
  try {
    const result = await query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3`,
      [messageId, userId, reaction]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error removing reaction:', error);
    return false;
  }
}

async function getReactions(messageId) {
  try {
    const result = await query(
      `SELECT mr.*, u.name as user_name
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1`,
      [messageId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting reactions:', error);
    return [];
  }
}

// Reactions with counts
async function getReactionCounts(messageId) {
  try {
    const result = await query(
      `SELECT reaction, COUNT(*) as count,
              array_agg(user_id) as user_ids,
              array_agg(u.name) as user_names
       FROM message_reactions mr
       LEFT JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       GROUP BY reaction
       ORDER BY count DESC`,
      [messageId]
    );
    return result.rows.map(row => ({
      reaction: row.reaction,
      count: parseInt(row.count),
      userIds: row.user_ids,
      userNames: row.user_names
    }));
  } catch (error) {
    console.error('Error getting reaction counts:', error);
    return [];
  }
}

async function toggleReaction(messageId, userId, reaction) {
  try {
    const existing = await query(
      `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3`,
      [messageId, userId, reaction]
    );

    if (existing.rows.length > 0) {
      await removeReaction(messageId, userId, reaction);
      return { action: 'removed', reaction };
    } else {
      await addReaction(messageId, userId, reaction);
      return { action: 'added', reaction };
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    return null;
  }
}

// Pinned messages
async function pinMessage(messageId, conversationId, userId) {
  try {
    const id = `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await query(
      `INSERT INTO pinned_messages (id, message_id, conversation_id, pinned_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (message_id, conversation_id) DO NOTHING
       RETURNING *`,
      [id, messageId, conversationId, userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error pinning message:', error);
    return null;
  }
}

async function unpinMessage(messageId, conversationId) {
  try {
    const result = await query(
      `DELETE FROM pinned_messages WHERE message_id = $1 AND conversation_id = $2`,
      [messageId, conversationId]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error unpinning message:', error);
    return false;
  }
}

async function getPinnedMessages(conversationId, limit = 20) {
  try {
    const result = await query(
      `SELECT pm.*, m.content, m.author_id, m.created_at as message_created_at,
              u.name as author_name, u.avatar_url as author_avatar,
              pinner.name as pinned_by_name
       FROM pinned_messages pm
       JOIN messages m ON pm.message_id = m.id
       LEFT JOIN users u ON m.author_id = u.id
       LEFT JOIN users pinner ON pm.pinned_by = pinner.id
       WHERE pm.conversation_id = $1
       ORDER BY pm.pinned_at DESC
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting pinned messages:', error);
    return [];
  }
}

module.exports = {
  addReaction,
  removeReaction,
  getReactions,
  getReactionCounts,
  toggleReaction,
  pinMessage,
  unpinMessage,
  getPinnedMessages
};
