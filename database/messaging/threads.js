/**
 * Messaging Threads Adapter
 * Thread management and reply functionality
 */

const { query, messagingQueries } = require('../config');
const { transformMessage, updateConversationActivity } = require('./core');
const { createLogger } = require('../../lib/logger');
const log = createLogger('DB:Msg:Threads');

function transformThread(dbThread) {
  return {
    id: dbThread.id,
    rootMessageId: dbThread.root_message_id,
    conversationId: dbThread.conversation_id,
    threadTitle: dbThread.thread_title,
    participantCount: dbThread.participant_count || 0,
    messageCount: dbThread.message_count || 0,
    lastActivityAt: dbThread.last_activity_at,
    createdAt: dbThread.created_at,
    updatedAt: dbThread.updated_at,
    rootContent: dbThread.root_content,
    rootAuthor: dbThread.root_author
  };
}

// Thread management
async function createThread(rootMessageId, conversationId, threadTitle = null) {
  try {
    const result = await query(
      `INSERT INTO message_threads (root_message_id, conversation_id, thread_title)
       VALUES ($1, $2, $3) RETURNING *`,
      [rootMessageId, conversationId, threadTitle]
    );
    return result.rows[0];
  } catch (error) {
    log.error('Error creating thread', error);
    throw error;
  }
}

async function getThreads(conversationId, limit = 20) {
  try {
    const result = await query(
      `SELECT mt.*, m.content as root_content, m.author_id as root_author
       FROM message_threads mt
       JOIN messages m ON mt.root_message_id = m.id
       WHERE mt.conversation_id = $1
       ORDER BY mt.last_activity_at DESC
       LIMIT $2`,
      [conversationId, limit]
    );
    return result.rows;
  } catch (error) {
    log.error('Error getting threads', error);
    return [];
  }
}

async function getMessageThread(parentMessageId, limit = 50) {
  try {
    return await messagingQueries.getMessageThread(parentMessageId, limit);
  } catch (error) {
    log.error('Error getting message thread', error);
    return [];
  }
}

// Reply functionality
async function createReply(messageData) {
  try {
    const result = await query(
      `INSERT INTO messages (conversation_id, author_id, content, message_type, reply_to_id, attachments, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        messageData.conversationId,
        messageData.authorId,
        messageData.content,
        messageData.messageType || 'text',
        messageData.replyToId,
        JSON.stringify(messageData.attachments || []),
        JSON.stringify(messageData.metadata || {})
      ]
    );

    const message = transformMessage(result.rows[0]);
    await updateConversationActivity(messageData.conversationId);

    return message;
  } catch (error) {
    log.error('Error creating reply', error);
    throw error;
  }
}

async function getMessageWithReplies(messageId, limit = 50) {
  try {
    const parentResult = await query(
      `SELECT m.*, u.name as author_name, u.avatar_url as author_avatar
       FROM messages m
       LEFT JOIN users u ON m.author_id = u.id
       WHERE m.id = $1`,
      [messageId]
    );

    if (parentResult.rows.length === 0) return null;

    const parentMessage = transformMessage(parentResult.rows[0]);

    const repliesResult = await query(
      `SELECT m.*, u.name as author_name, u.avatar_url as author_avatar
       FROM messages m
       LEFT JOIN users u ON m.author_id = u.id
       WHERE m.reply_to_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2`,
      [messageId, limit]
    );

    const replies = repliesResult.rows.map(transformMessage);

    return {
      message: parentMessage,
      replies,
      replyCount: replies.length
    };
  } catch (error) {
    log.error('Error getting message with replies', error);
    return null;
  }
}

/**
 * Mark a thread as read for a user by updating their last-read timestamp.
 * Uses an upsert to create or update the thread_read_state row.
 */
async function markThreadRead({ threadRootMessageId, userId }) {
  try {
    await query(
      `INSERT INTO thread_read_states (thread_root_message_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (thread_root_message_id, user_id)
       DO UPDATE SET last_read_at = NOW()`,
      [threadRootMessageId, userId]
    );
    return true;
  } catch (error) {
    // Table may not exist yet; log and return gracefully
    log.warn('markThreadRead: could not update thread read state', error.message);
    return false;
  }
}

/**
 * Get the unread thread reply count for a specific message thread and user.
 */
async function getThreadUnreadCount({ threadRootMessageId, userId }) {
  try {
    const result = await query(
      `SELECT COUNT(*) AS unread_count
       FROM messages m
       WHERE m.reply_to_message_id = $1
         AND m.created_at > COALESCE(
           (SELECT last_read_at FROM thread_read_states
            WHERE thread_root_message_id = $1 AND user_id = $2),
           '1970-01-01'::timestamptz
         )`,
      [threadRootMessageId, userId]
    );
    return parseInt(result.rows[0]?.unread_count || '0', 10);
  } catch (error) {
    log.warn('getThreadUnreadCount: could not query', error.message);
    return 0;
  }
}

module.exports = {
  transformThread,
  createThread,
  getThreads,
  getMessageThread,
  createReply,
  getMessageWithReplies,
  markThreadRead,
  getThreadUnreadCount
};
