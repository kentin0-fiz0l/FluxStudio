/**
 * MessagingService - Domain service for messaging operations
 *
 * Extracts business logic from route handlers into a testable,
 * reusable service layer. Accepts only primitives/plain objects,
 * handles validation and authorization, returns standardized results.
 */

const { createLogger } = require('../logger');
const log = createLogger('MessagingService');

// Lazy-load adapter
let messagingAdapter = null;

function getAdapter() {
  if (!messagingAdapter) {
    try {
      messagingAdapter = require('../../database/messaging-conversations-adapter');
    } catch (e) {
      log.warn('Messaging adapter not available');
    }
  }
  return messagingAdapter;
}

/**
 * Send a message to a conversation
 * @param {string} conversationId - Target conversation ID
 * @param {string} userId - Sender user ID
 * @param {Object} content - Message content ({ text, assetId, replyToMessageId, isSystemMessage })
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function sendMessage(conversationId, userId, content) {
  try {
    const { text, assetId, replyToMessageId, isSystemMessage } = content;

    if (!text && !assetId) {
      return { success: false, error: 'Either text or assetId is required' };
    }

    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    // Verify conversation membership
    const conversation = await adapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found or access denied' };
    }

    const message = await adapter.createMessage({
      conversationId,
      userId,
      text: text || '',
      assetId: assetId || null,
      replyToMessageId: replyToMessageId || null,
      projectId: null,
      isSystemMessage: !!isSystemMessage
    });

    // Hydrate with asset data if needed
    let enrichedMessage = message;
    if (assetId) {
      const asset = await adapter.getAssetById(assetId);
      enrichedMessage = { ...message, asset };
    }

    return { success: true, data: enrichedMessage };
  } catch (error) {
    log.error('Send message error', error);
    return { success: false, error: 'Failed to send message' };
  }
}

/**
 * Edit a message (author only, within time limit)
 * @param {string} messageId - Message ID
 * @param {string} userId - Requesting user ID
 * @param {string} newContent - New text content
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function editMessage(messageId, userId, newContent) {
  try {
    if (!newContent || typeof newContent !== 'string' || newContent.trim().length === 0) {
      return { success: false, error: 'Text content is required' };
    }

    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    // Get the message to check ownership
    const message = await adapter.getMessageById({ messageId });
    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    const messageUserId = message.userId || message.user_id;
    if (messageUserId !== userId) {
      return { success: false, error: 'You can only edit your own messages' };
    }

    // Check edit time limit (15 minutes)
    const messageTime = new Date(message.createdAt || message.created_at);
    const editWindowMs = 15 * 60 * 1000;
    if (Date.now() - messageTime.getTime() > editWindowMs) {
      return { success: false, error: 'Messages can only be edited within 15 minutes of sending' };
    }

    const updatedMessage = await adapter.editMessage({
      messageId,
      userId,
      content: newContent.trim()
    });

    return { success: true, data: updatedMessage };
  } catch (error) {
    log.error('Edit message error', error);
    return { success: false, error: 'Failed to edit message' };
  }
}

/**
 * Delete a message (author or conversation admin)
 * @param {string} messageId - Message ID
 * @param {string} userId - Requesting user ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteMessage(messageId, userId) {
  try {
    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const message = await adapter.getMessageById({ messageId });
    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    // Verify conversation membership
    const conversation = await adapter.getConversationById({
      conversationId: message.conversationId || message.conversation_id,
      userId
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found or access denied' };
    }

    const messageUserId = message.userId || message.user_id;
    const conversationCreator = conversation.createdBy || conversation.created_by;
    const isAuthor = messageUserId === userId;
    const isAdmin = conversationCreator === userId;

    if (!isAuthor && !isAdmin) {
      return { success: false, error: 'You can only delete your own messages or must be conversation admin' };
    }

    const deleteUserId = isAuthor ? userId : messageUserId;
    await adapter.deleteMessage({ messageId, userId: deleteUserId });

    return { success: true };
  } catch (error) {
    log.error('Delete message error', error);
    return { success: false, error: 'Failed to delete message' };
  }
}

/**
 * Get a conversation by ID with access check
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Requesting user ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function getConversation(conversationId, userId) {
  try {
    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const conversation = await adapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found or access denied' };
    }

    return { success: true, data: conversation };
  } catch (error) {
    log.error('Get conversation error', error);
    return { success: false, error: 'Failed to get conversation' };
  }
}

/**
 * List conversations for a user
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options (projectId, limit, offset)
 * @returns {Promise<{success: boolean, data?: Object[], error?: string}>}
 */
async function listConversations(userId, filters = {}) {
  try {
    const { projectId, limit = 50, offset = 0 } = filters;

    const adapter = getAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const conversations = await adapter.getConversationsForUser({
      userId,
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
      projectId: projectId || null
    });

    return { success: true, data: conversations };
  } catch (error) {
    log.error('List conversations error', error);
    return { success: false, error: 'Failed to list conversations' };
  }
}

module.exports = {
  sendMessage,
  editMessage,
  deleteMessage,
  getConversation,
  listConversations,
};
