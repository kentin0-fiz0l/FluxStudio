/**
 * Conversations Messages Adapter
 * Message CRUD, search, edit, and forward operations
 */

const { query, transaction } = require('../config');
const { v4: uuidv4 } = require('uuid');
const { getConversationById } = require('./core');

function transformMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    text: row.text,
    assetId: row.asset_id,
    replyToMessageId: row.reply_to_message_id,
    threadRootMessageId: row.thread_root_message_id || null,
    projectId: row.project_id,
    isSystemMessage: row.is_system_message,
    createdAt: row.created_at,
    editedAt: row.edited_at || null,
    originalMessageId: row.original_message_id || null,
    // Optional user info from JOIN
    userName: row.user_name || null,
    userAvatar: row.user_avatar || null
  };
}

/**
 * Create a new message in a conversation
 */
async function createMessage({
  conversationId,
  userId,
  text,
  assetId = null,
  replyToMessageId = null,
  threadRootMessageId = null,
  projectId = null,
  isSystemMessage = false
}) {
  const messageId = uuidv4();

  // If replying to a message, determine the thread root
  let effectiveThreadRoot = threadRootMessageId;
  if (replyToMessageId && !threadRootMessageId) {
    // Check if the parent message is in a thread
    const parentResult = await query(`
      SELECT id, thread_root_message_id FROM messages WHERE id = $1
    `, [replyToMessageId]);
    if (parentResult.rows.length > 0) {
      const parent = parentResult.rows[0];
      // If parent is in a thread, use its root; otherwise parent becomes the root
      effectiveThreadRoot = parent.thread_root_message_id || parent.id;
    }
  }

  return await transaction(async (client) => {
    // Insert message
    const msgResult = await client.query(`
      INSERT INTO messages (
        id, user_id, conversation_id, text, asset_id,
        reply_to_message_id, thread_root_message_id, project_id, is_system_message, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      messageId,
      userId,
      conversationId,
      text,
      assetId,
      replyToMessageId,
      effectiveThreadRoot,
      projectId,
      isSystemMessage
    ]);

    // Update conversation updated_at
    await client.query(`
      UPDATE conversations SET updated_at = NOW() WHERE id = $1
    `, [conversationId]);

    // Update sender's last_read_message_id to this message
    await client.query(`
      UPDATE conversation_members
      SET last_read_message_id = $1
      WHERE conversation_id = $2 AND user_id = $3
    `, [messageId, conversationId, userId]);

    return transformMessage(msgResult.rows[0]);
  });
}

/**
 * List messages in a conversation with cursor-based pagination
 */
async function listMessages({ conversationId, limit = 50, before = null, includeReactions = true }) {
  let queryText;
  let params;

  if (before) {
    queryText = `
      SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.conversation_id = $1
        AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
      ORDER BY m.created_at DESC
      LIMIT $3
    `;
    params = [conversationId, before, limit];
  } else {
    queryText = `
      SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `;
    params = [conversationId, limit];
  }

  const result = await query(queryText, params);
  const messages = result.rows.map(row => transformMessage(row));

  // Fetch link previews for all messages
  if (messages.length > 0) {
    const messageIds = messages.map(m => m.id);
    try {
      const previewResult = await query(`
        SELECT mlp.message_id, lp.url, lp.title, lp.description, lp.image_url, lp.site_name, lp.favicon_url
        FROM message_link_previews mlp
        JOIN link_previews lp ON mlp.link_preview_id = lp.id
        WHERE mlp.message_id = ANY($1)
        ORDER BY mlp.position
      `, [messageIds]);

      const previewsByMessage = {};
      for (const row of previewResult.rows) {
        if (!previewsByMessage[row.message_id]) {
          previewsByMessage[row.message_id] = [];
        }
        previewsByMessage[row.message_id].push({
          url: row.url,
          title: row.title,
          description: row.description,
          imageUrl: row.image_url,
          siteName: row.site_name,
          faviconUrl: row.favicon_url,
        });
      }

      for (const message of messages) {
        message.linkPreviews = previewsByMessage[message.id] || [];
      }
    } catch (err) {
      // link_previews table may not exist yet — skip silently
      console.error('Failed to fetch link previews:', err.message);
    }
  }

  // Fetch reactions for all messages if requested
  if (includeReactions && messages.length > 0) {
    const messageIds = messages.map(m => m.id);
    // Import reactions module dynamically to avoid circular dependency
    const { listReactionsForMessages } = require('./reactions');
    const reactionsMap = await listReactionsForMessages({ messageIds });

    // Attach reactions to each message
    for (const message of messages) {
      message.reactions = reactionsMap[message.id] || [];
    }
  }

  return messages;
}

/**
 * Get a message by ID
 */
async function getMessageById({ messageId }) {
  const result = await query(`
    SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.id = $1
  `, [messageId]);

  if (result.rows.length === 0) return null;
  return transformMessage(result.rows[0]);
}

/**
 * Search messages across conversations the user has access to
 */
async function searchMessages({ userId, query: searchQuery, conversationId = null, limit = 50, offset = 0 }) {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return [];
  }

  const searchPattern = `%${searchQuery.trim()}%`;
  let queryText;
  let params;

  if (conversationId) {
    // Scoped search: search within a specific conversation (with membership check)
    queryText = `
      SELECT
        m.*,
        u.name as user_name,
        u.avatar_url as user_avatar,
        c.name as conversation_name,
        c.is_group as conversation_is_group
      FROM messages m
      INNER JOIN conversation_members cm
        ON cm.conversation_id = m.conversation_id AND cm.user_id = $1
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN conversations c ON m.conversation_id = c.id
      WHERE m.conversation_id = $2
        AND LOWER(m.text) LIKE LOWER($3)
      ORDER BY m.created_at DESC
      LIMIT $4 OFFSET $5
    `;
    params = [userId, conversationId, searchPattern, limit, offset];
  } else {
    // Global search: search across all conversations the user is a member of
    queryText = `
      SELECT
        m.*,
        u.name as user_name,
        u.avatar_url as user_avatar,
        c.name as conversation_name,
        c.is_group as conversation_is_group
      FROM messages m
      INNER JOIN conversation_members cm
        ON cm.conversation_id = m.conversation_id AND cm.user_id = $1
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN conversations c ON m.conversation_id = c.id
      WHERE LOWER(m.text) LIKE LOWER($2)
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `;
    params = [userId, searchPattern, limit, offset];
  }

  const result = await query(queryText, params);

  return result.rows.map(row => ({
    ...transformMessage(row),
    conversationName: row.conversation_name,
    conversationIsGroup: row.conversation_is_group
  }));
}

/**
 * Delete a message (hard delete, restricted to author)
 */
async function deleteMessage({ messageId, userId }) {
  const result = await query(`
    DELETE FROM messages
    WHERE id = $1 AND user_id = $2
  `, [messageId, userId]);

  return result.rowCount > 0;
}

/**
 * Edit a message (only the author can edit their own messages)
 */
async function editMessage({ messageId, userId, content }) {
  // First verify the message exists and belongs to this user
  const message = await getMessageById({ messageId });
  if (!message) {
    return null;
  }

  if (message.userId !== userId) {
    throw new Error('Unauthorized: You can only edit your own messages');
  }

  // Update the message content and set edited_at timestamp
  const result = await query(`
    UPDATE messages
    SET text = $1, edited_at = NOW()
    WHERE id = $2 AND user_id = $3
    RETURNING *
  `, [content, messageId, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  // Fetch the full message with user info
  return getMessageById({ messageId });
}

/**
 * Forward a message to another conversation.
 */
async function forwardMessage({ messageId, sourceConversationId, targetConversationId, userId }) {
  // 1. Fetch the original message (ensure it belongs to sourceConversationId)
  const original = await getMessageById({ messageId });
  if (!original || original.conversationId !== sourceConversationId) {
    return null;
  }

  // 2. Verify user membership in BOTH conversations
  const [sourceConv, targetConv] = await Promise.all([
    getConversationById({ conversationId: sourceConversationId, userId }),
    getConversationById({ conversationId: targetConversationId, userId }),
  ]);
  if (!sourceConv || !targetConv) {
    return null;
  }

  // 3. Insert a new message in target conversation
  const newMessageId = uuidv4();

  return await transaction(async (client) => {
    const result = await client.query(`
      INSERT INTO messages (
        id, conversation_id, project_id, user_id,
        text, asset_id, is_system_message, original_message_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, NOW())
      RETURNING *
    `, [
      newMessageId,
      targetConversationId,
      original.projectId || null,
      userId,
      original.text,
      original.assetId || null,
      original.id
    ]);

    if (!result.rows[0]) return null;

    // Update target conversation's updated_at
    await client.query(`
      UPDATE conversations SET updated_at = NOW() WHERE id = $1
    `, [targetConversationId]);

    // Update sender's last_read_message_id in target conversation
    await client.query(`
      UPDATE conversation_members
      SET last_read_message_id = $1
      WHERE conversation_id = $2 AND user_id = $3
    `, [newMessageId, targetConversationId, userId]);

    // Transform and return with user info
    const row = result.rows[0];
    return transformMessage(row);
  });
}

module.exports = {
  transformMessage,
  createMessage,
  listMessages,
  getMessageById,
  searchMessages,
  deleteMessage,
  editMessage,
  forwardMessage
};
