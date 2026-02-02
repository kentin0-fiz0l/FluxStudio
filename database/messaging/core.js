/**
 * Messaging Core Adapter
 * Base CRUD operations for messages and conversations
 */

const { query, messagingQueries } = require('../config');

// Data transformation helpers
function transformMessage(dbMessage) {
  return {
    id: dbMessage.id,
    conversationId: dbMessage.conversation_id,
    authorId: dbMessage.author_id,
    authorName: dbMessage.author_name,
    authorAvatar: dbMessage.author_avatar,
    content: dbMessage.content,
    messageType: dbMessage.message_type,
    priority: dbMessage.priority,
    status: dbMessage.status,
    replyToId: dbMessage.reply_to_id,
    threadId: dbMessage.thread_id,
    mentions: dbMessage.mentions || [],
    attachments: dbMessage.attachments || [],
    metadata: dbMessage.metadata || {},
    editedAt: dbMessage.edited_at,
    deletedAt: dbMessage.deleted_at,
    createdAt: dbMessage.created_at,
    isThreadRoot: dbMessage.is_thread_root || false,
    threadCount: dbMessage.thread_count || 0,
    searchRank: dbMessage.search_rank || null,
    highlightedContent: dbMessage.highlighted_content || null
  };
}

function transformConversation(dbConversation) {
  return {
    id: dbConversation.id,
    name: dbConversation.name,
    description: dbConversation.description,
    type: dbConversation.type,
    organizationId: dbConversation.organization_id,
    projectId: dbConversation.project_id,
    teamId: dbConversation.team_id,
    createdBy: dbConversation.created_by,
    creatorName: dbConversation.creator_name,
    lastMessageAt: dbConversation.last_message_at,
    metadata: dbConversation.metadata || {},
    settings: dbConversation.settings || {},
    isArchived: dbConversation.is_archived,
    createdAt: dbConversation.created_at,
    updatedAt: dbConversation.updated_at,
    participantCount: dbConversation.participant_count || 0,
    unreadCount: dbConversation.unread_count || 0,
    lastMessage: dbConversation.last_message_content ? {
      content: dbConversation.last_message_content,
      authorName: dbConversation.last_message_author,
      createdAt: dbConversation.last_message_at
    } : null
  };
}

// Message CRUD
async function getMessages(conversationId = null, limit = 50, offset = 0, userId = null) {
  try {
    if (conversationId) {
      return await messagingQueries.getMessages(conversationId, limit, offset, userId);
    } else {
      const queryText = `
        SELECT m.*, u.name as author_name, u.avatar_url as author_avatar
        FROM messages m
        LEFT JOIN users u ON m.author_id = u.id
        ORDER BY m.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await query(queryText, [limit, offset]);
      return result.rows.map(transformMessage);
    }
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
}

async function createMessage(messageData) {
  try {
    const result = await query(
      `INSERT INTO messages (conversation_id, author_id, content, message_type, priority, attachments, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        messageData.conversationId || null,
        messageData.authorId,
        messageData.content,
        messageData.messageType || 'text',
        messageData.priority || 'normal',
        JSON.stringify(messageData.attachments || []),
        JSON.stringify(messageData.metadata || {})
      ]
    );

    const message = transformMessage(result.rows[0]);

    if (messageData.conversationId) {
      await updateConversationActivity(messageData.conversationId);
    }

    return message;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

async function updateMessage(messageId, updates) {
  try {
    const dbUpdates = {};
    if (updates.content) dbUpdates.content = updates.content;
    if (updates.edited) dbUpdates.edited_at = new Date();
    if (updates.deleted) dbUpdates.deleted_at = new Date();

    const fields = Object.keys(dbUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [messageId, ...Object.values(dbUpdates)];

    const result = await query(`UPDATE messages SET ${fields} WHERE id = $1 RETURNING *`, values);
    return result.rows.length > 0 ? transformMessage(result.rows[0]) : null;
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
}

async function deleteMessage(messageId) {
  try {
    const result = await query(
      `UPDATE messages SET deleted_at = NOW() WHERE id = $1 RETURNING *`,
      [messageId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}

// Conversation CRUD
async function getConversations(userId = null, limit = 20, offset = 0) {
  try {
    if (userId) {
      return await messagingQueries.getConversationsWithLatestMessage(userId, limit, offset);
    } else {
      const queryText = `
        SELECT c.*, u.name as creator_name
        FROM conversations c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.is_archived = false
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await query(queryText, [limit, offset]);
      return result.rows.map(transformConversation);
    }
  } catch (error) {
    console.error('Error getting conversations:', error);
    return [];
  }
}

async function createConversation(conversationData) {
  try {
    const result = await query(
      `INSERT INTO conversations (name, description, type, organization_id, project_id, team_id, created_by, metadata, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        conversationData.name,
        conversationData.description,
        conversationData.type || 'group',
        conversationData.organizationId || null,
        conversationData.projectId || null,
        conversationData.teamId || null,
        conversationData.createdBy,
        JSON.stringify(conversationData.metadata || {}),
        JSON.stringify(conversationData.settings || {})
      ]
    );

    const conversation = transformConversation(result.rows[0]);
    await addParticipant(conversation.id, conversationData.createdBy, 'owner');

    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

async function updateConversation(conversationId, updates) {
  try {
    const dbUpdates = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.archived !== undefined) dbUpdates.is_archived = updates.archived;
    if (updates.metadata) dbUpdates.metadata = JSON.stringify(updates.metadata);
    if (updates.settings) dbUpdates.settings = JSON.stringify(updates.settings);

    dbUpdates.updated_at = new Date();

    const fields = Object.keys(dbUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [conversationId, ...Object.values(dbUpdates)];

    const result = await query(`UPDATE conversations SET ${fields} WHERE id = $1 RETURNING *`, values);
    return result.rows.length > 0 ? transformConversation(result.rows[0]) : null;
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

async function updateConversationActivity(conversationId) {
  try {
    await query(
      `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
      [conversationId]
    );
  } catch (error) {
    console.error('Error updating conversation activity:', error);
  }
}

// Participant management
async function addParticipant(conversationId, userId, role = 'member') {
  try {
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, userId, role]
    );
    return true;
  } catch (error) {
    console.error('Error adding participant:', error);
    return false;
  }
}

async function removeParticipant(conversationId, userId) {
  try {
    const result = await query(
      `DELETE FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error removing participant:', error);
    return false;
  }
}

async function getParticipants(conversationId) {
  try {
    const result = await query(
      `SELECT cp.*, u.name, u.email, u.avatar_url
       FROM conversation_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.conversation_id = $1`,
      [conversationId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting participants:', error);
    return [];
  }
}

async function isParticipant(conversationId, userId) {
  try {
    const result = await query(
      `SELECT 1 FROM conversation_participants
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking participant:', error);
    return false;
  }
}

async function getConversationWithMessages(conversationId, userId, messageLimit = 50, messageOffset = 0) {
  try {
    const participantCheck = await isParticipant(conversationId, userId);
    if (!participantCheck) {
      return null;
    }

    const convResult = await query(
      `SELECT c.*, u.name as creator_name
       FROM conversations c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      return null;
    }

    const conversation = transformConversation(convResult.rows[0]);
    const messages = await getMessages(conversationId, messageLimit, messageOffset, userId);
    const participants = await getParticipants(conversationId);

    return {
      ...conversation,
      messages,
      participants
    };
  } catch (error) {
    console.error('Error getting conversation with messages:', error);
    return null;
  }
}

// Backward compatibility methods
async function saveMessages(_messages) {
  console.warn('saveMessages() called - this method is deprecated in database mode');
  return true;
}

async function saveChannels(_channels) {
  console.warn('saveChannels() called - this method is deprecated in database mode');
  return true;
}

module.exports = {
  // Transformers
  transformMessage,
  transformConversation,
  // Messages
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  saveMessages,
  // Conversations
  getConversations,
  createConversation,
  updateConversation,
  updateConversationActivity,
  saveChannels,
  // Participants
  addParticipant,
  removeParticipant,
  getParticipants,
  isParticipant,
  getConversationWithMessages
};
