/**
 * Messaging Search Adapter
 * Full-text search and message editing functionality
 */

const { query, messagingQueries } = require('../config');
const { transformMessage, updateConversationActivity } = require('./core');
const { createLogger } = require('../../lib/logger');
const log = createLogger('DB:Msg:Search');

// Search functionality
async function searchMessages(searchTerm, conversationId = null, limit = 20, offset = 0) {
  try {
    return await messagingQueries.searchMessages(searchTerm, conversationId, limit, offset);
  } catch (error) {
    log.error('Error searching messages', error);
    return [];
  }
}

// Message editing
async function editMessage(messageId, userId, newContent) {
  try {
    // First get the current message
    const current = await query(
      `SELECT content, edit_history FROM messages WHERE id = $1 AND author_id = $2`,
      [messageId, userId]
    );

    if (current.rows.length === 0) {
      return null; // Message not found or user doesn't own it
    }

    const oldContent = current.rows[0].content;
    const editHistory = current.rows[0].edit_history || [];

    // Add current content to edit history
    editHistory.push({
      content: oldContent,
      editedAt: new Date().toISOString()
    });

    const result = await query(
      `UPDATE messages
       SET content = $2, is_edited = true, edited_at = NOW(), edit_history = $3, updated_at = NOW()
       WHERE id = $1 AND author_id = $4
       RETURNING *`,
      [messageId, newContent, JSON.stringify(editHistory), userId]
    );

    return result.rows.length > 0 ? transformMessage(result.rows[0]) : null;
  } catch (error) {
    log.error('Error editing message', error);
    return null;
  }
}

async function getEditHistory(messageId) {
  try {
    const result = await query(
      `SELECT edit_history FROM messages WHERE id = $1`,
      [messageId]
    );
    return result.rows.length > 0 ? result.rows[0].edit_history || [] : [];
  } catch (error) {
    log.error('Error getting edit history', error);
    return [];
  }
}

// Forward messages
async function forwardMessage(originalMessageId, toConversationId, forwardedByUserId) {
  try {
    // Get original message
    const originalResult = await query(
      `SELECT * FROM messages WHERE id = $1`,
      [originalMessageId]
    );

    if (originalResult.rows.length === 0) return null;

    const original = originalResult.rows[0];

    // Create forwarded message
    const result = await query(
      `INSERT INTO messages (conversation_id, author_id, content, message_type, attachments, metadata, forwarded_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        toConversationId,
        forwardedByUserId,
        original.content,
        original.message_type,
        original.attachments,
        JSON.stringify({ ...original.metadata, forwarded: true }),
        originalMessageId
      ]
    );

    const forwardedMessage = transformMessage(result.rows[0]);

    // Update conversation activity
    await updateConversationActivity(toConversationId);

    return forwardedMessage;
  } catch (error) {
    log.error('Error forwarding message', error);
    return null;
  }
}

// Health check
async function healthCheck() {
  try {
    const result = await query(`
      SELECT
        NOW() as timestamp,
        COUNT(DISTINCT m.id) as message_count,
        COUNT(DISTINCT c.id) as conversation_count,
        COUNT(DISTINCT cp.user_id) as active_users,
        COUNT(DISTINCT mt.id) as thread_count,
        COUNT(DISTINCT ma.id) as attachment_count
      FROM messages m
      FULL OUTER JOIN conversations c ON true
      FULL OUTER JOIN conversation_participants cp ON true
      FULL OUTER JOIN message_threads mt ON true
      FULL OUTER JOIN message_attachments ma ON true
    `);

    return {
      status: 'ok',
      service: 'messaging',
      timestamp: result.rows[0].timestamp,
      messageCount: parseInt(result.rows[0].message_count) || 0,
      conversationCount: parseInt(result.rows[0].conversation_count) || 0,
      activeUsers: parseInt(result.rows[0].active_users) || 0,
      threadCount: parseInt(result.rows[0].thread_count) || 0,
      attachmentCount: parseInt(result.rows[0].attachment_count) || 0
    };
  } catch (error) {
    log.error('Messaging health check failed', error);
    return {
      status: 'error',
      service: 'messaging',
      error: error.message
    };
  }
}

module.exports = {
  searchMessages,
  editMessage,
  getEditHistory,
  forwardMessage,
  healthCheck
};
