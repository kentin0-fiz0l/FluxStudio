/**
 * Messaging - Message Routes
 *
 * Handles message CRUD, reactions, pins, threads, search, and read states
 * for both conversation-scoped and individual message operations.
 */

const express = require('express');
const { createLogger } = require('../../lib/logger');
const log = createLogger('Messaging');
const { authenticateToken } = require('../../lib/auth/middleware');
const { requireConversationAccess } = require('../../middleware/requireConversationAccess');
const { zodValidate } = require('../../middleware/zodValidate');
const { sanitizeRichText } = require('../../middleware/security');
const { createMessageSchema } = require('../../lib/schemas/messaging');
const messagingConversationsAdapter = require('../../database/messaging-conversations-adapter');
const { query } = require('../../database/config');
const { asyncHandler } = require('../../middleware/errorHandler');

// Try to load activity logger for audit trails
let activityLogger = null;
try {
  activityLogger = require('../../lib/activityLogger');
} catch (error) {
  log.warn('Activity logger not available for messaging');
}

const router = express.Router();

// ----- Conversation-scoped Messages -----

/**
 * GET /api/conversations/:id/messages
 * List messages in a conversation
 */
router.get('/:id/messages', authenticateToken, requireConversationAccess('id'), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const conversationId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const before = req.query.before || null;

  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId,
    userId
  });

  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
  }

  let messages = await messagingConversationsAdapter.listMessages({
    conversationId,
    limit,
    before
  });

  messages = await messagingConversationsAdapter.hydrateMessagesWithAssets(messages);

  res.json({
    success: true,
    messages,
    pagination: { limit, before }
  });
}));

/**
 * POST /api/conversations/:id/messages
 * Create a message in a conversation
 */
router.post('/:id/messages', authenticateToken, requireConversationAccess('id'), zodValidate(createMessageSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const conversationId = req.params.id;
  const { text, assetId, replyToMessageId, projectId, isSystemMessage } = req.body;

  if (!text && !assetId) {
    return res.status(400).json({ success: false, error: 'Either text or assetId is required', code: 'MESSAGING_MISSING_CONTENT' });
  }

  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId,
    userId
  });

  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
  }

  const sanitizedText = text ? sanitizeRichText(text) : '';

  let message = await messagingConversationsAdapter.createMessage({
    conversationId,
    userId,
    text: sanitizedText,
    assetId: assetId || null,
    replyToMessageId: replyToMessageId || null,
    projectId: projectId || null,
    isSystemMessage: !!isSystemMessage
  });

  if (assetId) {
    const asset = await messagingConversationsAdapter.getAssetById(assetId);
    message = { ...message, asset };
  }

  // Log activity for non-system messages
  if (activityLogger && !isSystemMessage) {
    await activityLogger.messageSent(
      userId,
      conversation.projectId || projectId,
      conversationId
    );
  }

  // Auto-generate link previews
  const urls = text ? text.match(/https?:\/\/[^\s]+/g) : null;
  if (urls?.length) {
    for (const url of urls.slice(0, 3)) {
      try {
        await query(
          'INSERT INTO browser_jobs (type, input, created_by) VALUES ($1, $2::jsonb, $3)',
          ['link_preview', JSON.stringify({ url, messageId: message.id, conversationId }), userId]
        );
      } catch (err) {
        log.error('Failed to queue link preview', err);
      }
    }
  }

  res.status(201).json({ success: true, message });
}));

/**
 * GET /api/conversations/:id/pins
 * List pinned messages for a conversation
 */
router.get('/:id/pins', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const conversationId = req.params.id;

  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId,
    userId
  });
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found or not a member', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
  }

  const pins = await messagingConversationsAdapter.listPinnedMessages({ conversationId, limit: 20 });
  return res.json({ success: true, pins });
}));

// ----- Threads -----

/**
 * GET /api/conversations/:conversationId/threads/:threadRootMessageId/messages
 * Get messages in a thread
 */
router.get('/:conversationId/threads/:threadRootMessageId/messages', authenticateToken, requireConversationAccess(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, threadRootMessageId } = req.params;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const result = await messagingConversationsAdapter.listThreadMessages({
    conversationId,
    threadRootMessageId,
    userId,
    limit
  });

  if (!result) {
    return res.status(404).json({ success: false, error: 'Thread not found or access denied', code: 'MESSAGING_THREAD_NOT_FOUND' });
  }

  return res.json({
    success: true,
    rootMessage: result.rootMessage,
    messages: result.messages,
    replyCount: result.replyCount,
    conversationId,
    threadRootMessageId
  });
}));

/**
 * GET /api/conversations/:conversationId/threads/:threadRootMessageId/summary
 * Get thread summary
 */
router.get('/:conversationId/threads/:threadRootMessageId/summary', authenticateToken, requireConversationAccess(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, threadRootMessageId } = req.params;

  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId,
    userId
  });
  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
  }

  const summary = await messagingConversationsAdapter.getThreadSummary({
    conversationId,
    threadRootMessageId
  });

  return res.json({
    success: true,
    summary,
    conversationId,
    threadRootMessageId
  });
}));

// ----- Message Edit/Delete (conversation-scoped) -----

/**
 * PUT /api/conversations/:conversationId/messages/:messageId
 * Edit a message (only by original author within time limit)
 */
router.put('/:conversationId/messages/:messageId', authenticateToken, requireConversationAccess(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, messageId } = req.params;
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Text content is required', code: 'MESSAGING_MISSING_CONTENT' });
  }

  // Verify user is in conversation
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId,
    userId
  });

  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found or not a member', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
  }

  // Get the message to verify ownership
  const messages = await messagingConversationsAdapter.listMessages({
    conversationId,
    limit: 1,
    messageId
  });

  const message = messages.find(m => m.id === messageId);

  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  if (message.userId !== userId && message.user_id !== userId) {
    return res.status(403).json({ success: false, error: 'You can only edit your own messages', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  // Check edit time limit (15 minutes)
  const messageTime = new Date(message.createdAt || message.created_at);
  const editWindowMs = 15 * 60 * 1000; // 15 minutes
  if (Date.now() - messageTime.getTime() > editWindowMs) {
    return res.status(403).json({
      success: false,
      error: 'Messages can only be edited within 15 minutes of sending'
    });
  }

  // Sanitize and update the message
  const sanitizedText = sanitizeRichText(text.trim());
  const updatedMessage = await messagingConversationsAdapter.editMessage({
    messageId,
    userId,
    content: sanitizedText
  });

  // Emit real-time event
  const { getMessagingNamespace } = require('../messaging');
  const messagingNamespace = getMessagingNamespace();
  if (messagingNamespace) {
    messagingNamespace.to(conversationId).emit('message:edited', {
      messageId,
      conversationId,
      text: sanitizedText,
      editedAt: new Date().toISOString(),
      editedBy: userId
    });
  }

  // Log activity
  if (activityLogger) {
    await activityLogger.log({
      userId,
      projectId: conversation.projectId,
      action: 'message_edited',
      resourceType: 'message',
      resourceId: messageId,
      metadata: { conversationId }
    });
  }

  res.json({ success: true, message: updatedMessage });
}));

/**
 * DELETE /api/conversations/:conversationId/messages/:messageId
 * Delete a message (soft delete - marks as deleted)
 */
router.delete('/:conversationId/messages/:messageId', authenticateToken, requireConversationAccess(), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId, messageId } = req.params;

  // Verify user is in conversation
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId,
    userId
  });

  if (!conversation) {
    return res.status(404).json({ success: false, error: 'Conversation not found or not a member', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
  }

  // Get the message to verify ownership
  const messages = await messagingConversationsAdapter.listMessages({
    conversationId,
    limit: 1,
    messageId
  });

  const message = messages.find(m => m.id === messageId);

  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  // Allow deletion by message author or conversation admin
  const isAuthor = message.userId === userId || message.user_id === userId;
  const isAdmin = conversation.createdBy === userId || conversation.created_by === userId;

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'You can only delete your own messages or must be conversation admin'
    });
  }

  // Delete the message (matches adapter function signature)
  const deleteUserId = isAuthor ? userId : (message.userId || message.user_id);
  await messagingConversationsAdapter.deleteMessage({
    messageId,
    userId: deleteUserId
  });

  // Emit real-time event
  const { getMessagingNamespace } = require('../messaging');
  const messagingNamespace = getMessagingNamespace();
  if (messagingNamespace) {
    messagingNamespace.to(conversationId).emit('message:deleted', {
      messageId,
      conversationId,
      deletedAt: new Date().toISOString(),
      deletedBy: userId
    });
  }

  // Log activity
  if (activityLogger) {
    await activityLogger.log({
      userId,
      projectId: conversation.projectId,
      action: 'message_deleted',
      resourceType: 'message',
      resourceId: messageId,
      metadata: { conversationId }
    });
  }

  res.json({ success: true, messageId, deleted: true });
}));

// ==============================================
// INDIVIDUAL MESSAGE OPERATIONS
// (Merged from routes/messages.js - Sprint 18)
// ==============================================
// These routes are mounted at /messages and /api/messages
// They handle operations on individual messages by ID

const messagesRouter = express.Router();

/**
 * DELETE /api/messages/:id
 * Delete a message (author only)
 */
messagesRouter.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const messageId = req.params.id;

  const deleted = await messagingConversationsAdapter.deleteMessage({
    messageId,
    userId
  });

  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Message not found or not authorized', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  res.json({ success: true, deleted: true });
}));

/**
 * PATCH /api/messages/:messageId
 * Edit a message
 */
messagesRouter.patch('/:messageId', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ success: false, error: 'Content is required', code: 'MESSAGING_MISSING_CONTENT' });
  }

  // Get the message to check ownership and conversation membership
  const message = await messagingConversationsAdapter.getMessageById({ messageId });
  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  // Verify conversation membership
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId: message.conversationId,
    userId
  });
  if (!conversation) {
    return res.status(403).json({ success: false, error: 'Not authorized to edit messages in this conversation', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  // Sanitize and edit the message (adapter will verify ownership)
  const sanitizedContent = sanitizeRichText(content.trim());
  const updated = await messagingConversationsAdapter.editMessage({
    messageId,
    userId,
    content: sanitizedContent
  });

  if (!updated) {
    return res.status(403).json({ success: false, error: 'Could not edit message - you may not be the author', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  return res.json({
    success: true,
    message: updated
  });
}));

// ----- Message Reactions -----

/**
 * POST /api/messages/:messageId/reactions
 * Add a reaction to a message
 */
messagesRouter.post('/:messageId/reactions', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;
  const { emoji } = req.body;

  // Validate emoji
  if (!emoji || typeof emoji !== 'string' || emoji.length > 10) {
    return res.status(400).json({
      success: false,
      error: 'Invalid emoji. Must be a non-empty string up to 10 characters.'
    });
  }

  // Check if message exists and user has access
  const message = await messagingConversationsAdapter.getMessageById({ messageId });
  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  // Verify user is a member of the conversation
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId: message.conversationId,
    userId
  });
  if (!conversation) {
    return res.status(403).json({ success: false, error: 'Not authorized to react to this message', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  const result = await messagingConversationsAdapter.addReaction({
    messageId,
    userId,
    emoji
  });

  res.json({
    success: true,
    messageId: result.messageId,
    reactions: result.reactions
  });
}));

/**
 * DELETE /api/messages/:messageId/reactions/:emoji
 * Remove a reaction from a message
 */
messagesRouter.delete('/:messageId/reactions/:emoji', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId, emoji } = req.params;

  // Decode emoji from URL
  const decodedEmoji = decodeURIComponent(emoji);

  // Check if message exists
  const message = await messagingConversationsAdapter.getMessageById({ messageId });
  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  // Verify user is a member of the conversation
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId: message.conversationId,
    userId
  });
  if (!conversation) {
    return res.status(403).json({ success: false, error: 'Not authorized to remove reaction from this message', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  const result = await messagingConversationsAdapter.removeReaction({
    messageId,
    userId,
    emoji: decodedEmoji
  });

  res.json({
    success: true,
    messageId: result.messageId,
    reactions: result.reactions
  });
}));

/**
 * GET /api/messages/:messageId/reactions
 * List reactions for a message
 */
messagesRouter.get('/:messageId/reactions', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  // Check if message exists
  const message = await messagingConversationsAdapter.getMessageById({ messageId });
  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  // Verify user is a member of the conversation
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId: message.conversationId,
    userId
  });
  if (!conversation) {
    return res.status(403).json({ success: false, error: 'Not authorized to view reactions for this message', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  const result = await messagingConversationsAdapter.listReactionsForMessage({ messageId });

  res.json({
    success: true,
    messageId: result.messageId,
    reactions: result.reactions
  });
}));

// ----- Message Pins -----

/**
 * POST /api/messages/:messageId/pin
 * Pin a message
 */
messagesRouter.post('/:messageId/pin', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  // Check if message exists
  const message = await messagingConversationsAdapter.getMessageById({ messageId });
  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  // Verify conversation membership
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId: message.conversationId,
    userId
  });
  if (!conversation) {
    return res.status(403).json({ success: false, error: 'Not authorized to pin messages in this conversation', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  const pins = await messagingConversationsAdapter.pinMessage({ messageId, userId });
  return res.json({
    success: true,
    conversationId: message.conversationId,
    pins
  });
}));

/**
 * DELETE /api/messages/:messageId/pin
 * Unpin a message
 */
messagesRouter.delete('/:messageId/pin', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  // Check if message exists
  const message = await messagingConversationsAdapter.getMessageById({ messageId });
  if (!message) {
    return res.status(404).json({ success: false, error: 'Message not found', code: 'MESSAGING_MESSAGE_NOT_FOUND' });
  }

  // Verify conversation membership
  const conversation = await messagingConversationsAdapter.getConversationById({
    conversationId: message.conversationId,
    userId
  });
  if (!conversation) {
    return res.status(403).json({ success: false, error: 'Not authorized to unpin messages in this conversation', code: 'MESSAGING_PERMISSION_DENIED' });
  }

  const pins = await messagingConversationsAdapter.unpinMessage({ messageId });
  return res.json({
    success: true,
    conversationId: message.conversationId,
    pins
  });
}));

// ----- Message Search -----

/**
 * GET /api/messages/search
 * Search messages across conversations
 */
messagesRouter.get('/search', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const searchQuery = req.query.q;
  const conversationId = req.query.conversationId || null;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be at least 2 characters'
    });
  }

  const results = await messagingConversationsAdapter.searchMessages({
    userId,
    query: searchQuery,
    conversationId,
    limit,
    offset
  });

  return res.json({
    success: true,
    results,
    query: searchQuery.trim(),
    conversationId,
    pagination: { limit, offset }
  });
}));

module.exports = router;
module.exports.messagesRouter = messagesRouter;
