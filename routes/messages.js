/**
 * Messages Routes - Individual Message Operations API
 *
 * Provides endpoints for:
 * - Message deletion
 * - Message editing
 * - Message reactions (add, remove, list)
 * - Message pins (pin, unpin)
 * - Message search
 *
 * All endpoints require authentication.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const messagingConversationsAdapter = require('../database/messaging-conversations-adapter');

const router = express.Router();

/**
 * DELETE /api/messages/:id
 * Delete a message (author only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    const deleted = await messagingConversationsAdapter.deleteMessage({
      messageId,
      userId
    });

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Message not found or not authorized' });
    }

    res.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

/**
 * PATCH /api/messages/:messageId
 * Edit a message
 */
router.patch('/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    // Get the message to check ownership and conversation membership
    const message = await messagingConversationsAdapter.getMessageById({ messageId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Verify conversation membership
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId: message.conversationId,
      userId
    });
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized to edit messages in this conversation' });
    }

    // Edit the message (adapter will verify ownership)
    const updated = await messagingConversationsAdapter.editMessage({
      messageId,
      userId,
      content: content.trim()
    });

    if (!updated) {
      return res.status(403).json({ success: false, error: 'Could not edit message - you may not be the author' });
    }

    return res.json({
      success: true,
      message: updated
    });
  } catch (error) {
    console.error('Error editing message:', error);
    if (error.message && error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: 'Failed to edit message' });
  }
});

// ----- Message Reactions -----

/**
 * POST /api/messages/:messageId/reactions
 * Add a reaction to a message
 */
router.post('/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
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
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Verify user is a member of the conversation
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId: message.conversationId,
      userId
    });
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized to react to this message' });
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
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ success: false, error: 'Failed to add reaction' });
  }
});

/**
 * DELETE /api/messages/:messageId/reactions/:emoji
 * Remove a reaction from a message
 */
router.delete('/:messageId/reactions/:emoji', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId, emoji } = req.params;

    // Decode emoji from URL
    const decodedEmoji = decodeURIComponent(emoji);

    // Check if message exists
    const message = await messagingConversationsAdapter.getMessageById({ messageId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Verify user is a member of the conversation
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId: message.conversationId,
      userId
    });
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized to remove reaction from this message' });
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
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ success: false, error: 'Failed to remove reaction' });
  }
});

/**
 * GET /api/messages/:messageId/reactions
 * List reactions for a message
 */
router.get('/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Check if message exists
    const message = await messagingConversationsAdapter.getMessageById({ messageId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Verify user is a member of the conversation
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId: message.conversationId,
      userId
    });
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized to view reactions for this message' });
    }

    const result = await messagingConversationsAdapter.listReactionsForMessage({ messageId });

    res.json({
      success: true,
      messageId: result.messageId,
      reactions: result.reactions
    });
  } catch (error) {
    console.error('Error listing reactions:', error);
    res.status(500).json({ success: false, error: 'Failed to list reactions' });
  }
});

// ----- Message Pins -----

/**
 * POST /api/messages/:messageId/pin
 * Pin a message
 */
router.post('/:messageId/pin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Check if message exists
    const message = await messagingConversationsAdapter.getMessageById({ messageId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Verify conversation membership
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId: message.conversationId,
      userId
    });
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized to pin messages in this conversation' });
    }

    const pins = await messagingConversationsAdapter.pinMessage({ messageId, userId });
    return res.json({
      success: true,
      conversationId: message.conversationId,
      pins
    });
  } catch (error) {
    console.error('Error pinning message:', error);
    return res.status(500).json({ success: false, error: 'Failed to pin message' });
  }
});

/**
 * DELETE /api/messages/:messageId/pin
 * Unpin a message
 */
router.delete('/:messageId/pin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Check if message exists
    const message = await messagingConversationsAdapter.getMessageById({ messageId });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    // Verify conversation membership
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId: message.conversationId,
      userId
    });
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized to unpin messages in this conversation' });
    }

    const pins = await messagingConversationsAdapter.unpinMessage({ messageId });
    return res.json({
      success: true,
      conversationId: message.conversationId,
      pins
    });
  } catch (error) {
    console.error('Error unpinning message:', error);
    return res.status(500).json({ success: false, error: 'Failed to unpin message' });
  }
});

// ----- Message Search -----

/**
 * GET /api/messages/search
 * Search messages across conversations
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error searching messages:', error);
    return res.status(500).json({ success: false, error: 'Failed to search messages' });
  }
});

module.exports = router;
