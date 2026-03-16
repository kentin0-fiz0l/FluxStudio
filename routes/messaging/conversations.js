/**
 * Messaging - Conversation Routes
 *
 * Handles conversation CRUD, membership, mute/archive, and read states.
 */

const express = require('express');
const { createLogger } = require('../../lib/logger');
const log = createLogger('Messaging');
const { authenticateToken } = require('../../lib/auth/middleware');
const { requireConversationAccess } = require('../../middleware/requireConversationAccess');
const { zodValidate } = require('../../middleware/zodValidate');
const { createConversationSchema } = require('../../lib/schemas/messaging');
const messagingConversationsAdapter = require('../../database/messaging-conversations-adapter');
const presenceAdapter = require('../../database/messaging/presence');
const { query } = require('../../database/config');

// Try to load AI summary service (may not be available)
let aiSummaryService = null;
try {
  aiSummaryService = require('../../services/ai-summary-service').aiSummaryService;
} catch (error) {
  log.warn('AI summary service not available');
}

const router = express.Router();

// ----- Conversations -----

/**
 * GET /api/conversations
 * List conversations for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const projectId = req.query.projectId || null;

    const conversations = await messagingConversationsAdapter.getConversationsForUser({
      userId,
      limit,
      offset,
      projectId
    });

    res.json({
      success: true,
      conversations,
      pagination: { limit, offset },
      filter: { projectId }
    });
  } catch (error) {
    log.error('Error listing conversations', error, { userId: req.user?.id });
    res.status(500).json({ success: false, error: 'Failed to list conversations', code: 'MESSAGING_LIST_ERROR' });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', authenticateToken, zodValidate(createConversationSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, isGroup, memberUserIds, organizationId, projectId } = req.body;

    if (memberUserIds && !Array.isArray(memberUserIds)) {
      return res.status(400).json({ success: false, error: 'memberUserIds must be an array', code: 'MESSAGING_INVALID_MEMBERS' });
    }

    if (isGroup && !name) {
      return res.status(400).json({ success: false, error: 'Group conversations require a name', code: 'MESSAGING_MISSING_GROUP_NAME' });
    }

    const conversation = await messagingConversationsAdapter.createConversation({
      organizationId: organizationId || null,
      projectId: projectId || null,
      name: name || null,
      isGroup: !!isGroup,
      creatorUserId: userId,
      memberUserIds: memberUserIds || []
    });

    res.status(201).json({ success: true, conversation });
  } catch (error) {
    log.error('Error creating conversation', error, { userId: req.user?.id });
    res.status(500).json({ success: false, error: 'Failed to create conversation', code: 'MESSAGING_CREATE_ERROR' });
  }
});

/**
 * GET /api/conversations/:id
 * Get conversation details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    res.json({ success: true, conversation });
  } catch (error) {
    log.error('Error getting conversation', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation', code: 'MESSAGING_GET_ERROR' });
  }
});

/**
 * PATCH /api/conversations/:id
 * Update conversation metadata
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { name, isGroup } = req.body;

    const existing = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    const updated = await messagingConversationsAdapter.updateConversation({
      conversationId,
      name,
      isGroup
    });

    res.json({ success: true, conversation: updated });
  } catch (error) {
    log.error('Error updating conversation', error);
    res.status(500).json({ success: false, error: 'Failed to update conversation', code: 'MESSAGING_UPDATE_ERROR' });
  }
});

// ----- Mute / Archive / Leave -----

/**
 * POST /api/conversations/:id/mute
 * Mute a conversation for the current user
 */
router.post('/:id/mute', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { duration } = req.body; // hours

    const mutedUntil = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;
    const result = await presenceAdapter.muteConversation(conversationId, userId, mutedUntil);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Conversation not found or not a member', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    res.json({ success: true, muted: true, mutedUntil });
  } catch (error) {
    log.error('Error muting conversation', error);
    res.status(500).json({ success: false, error: 'Failed to mute conversation', code: 'MESSAGING_MUTE_ERROR' });
  }
});

/**
 * DELETE /api/conversations/:id/mute
 * Unmute a conversation for the current user
 */
router.delete('/:id/mute', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const result = await presenceAdapter.unmuteConversation(conversationId, userId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Conversation not found or not a member', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    res.json({ success: true, muted: false });
  } catch (error) {
    log.error('Error unmuting conversation', error);
    res.status(500).json({ success: false, error: 'Failed to unmute conversation', code: 'MESSAGING_UNMUTE_ERROR' });
  }
});

/**
 * GET /api/conversations/:id/mute
 * Get mute status for the current user
 */
router.get('/:id/mute', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const status = await presenceAdapter.getMuteStatus(conversationId, userId);

    if (!status) {
      return res.status(404).json({ success: false, error: 'Not a member of this conversation', code: 'MESSAGING_NOT_A_MEMBER' });
    }

    res.json({ success: true, ...status });
  } catch (error) {
    log.error('Error getting mute status', error);
    res.status(500).json({ success: false, error: 'Failed to get mute status', code: 'MESSAGING_MUTE_STATUS_ERROR' });
  }
});

/**
 * PATCH /api/conversations/:id/archive
 * Archive a conversation
 */
router.patch('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const archived = req.body.archived !== false; // default true

    const existing = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    await query(
      'UPDATE conversations SET is_archived = $1, updated_at = NOW() WHERE id = $2',
      [archived, conversationId]
    );

    res.json({ success: true, archived });
  } catch (error) {
    log.error('Error updating conversation archive status', error);
    res.status(500).json({ success: false, error: 'Failed to update archive status', code: 'MESSAGING_ARCHIVE_ERROR' });
  }
});

/**
 * DELETE /api/conversations/:id/members/me
 * Leave a conversation (remove self from members)
 */
router.delete('/:id/members/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const existing = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    const removed = await messagingConversationsAdapter.removeMember({
      conversationId,
      userId
    });

    res.json({ success: true, removed });
  } catch (error) {
    log.error('Error leaving conversation', error);
    res.status(500).json({ success: false, error: 'Failed to leave conversation', code: 'MESSAGING_LEAVE_ERROR' });
  }
});

/**
 * POST /api/conversations/:id/members
 * Add a member to conversation
 */
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { userId: memberUserId, role } = req.body;

    if (!memberUserId) {
      return res.status(400).json({ success: false, error: 'userId is required', code: 'MESSAGING_MISSING_USER_ID' });
    }

    const member = await messagingConversationsAdapter.addMember({
      conversationId,
      userId: memberUserId,
      role: role || 'member'
    });

    res.status(201).json({ success: true, member });
  } catch (error) {
    log.error('Error adding member', error);
    res.status(500).json({ success: false, error: 'Failed to add member', code: 'MESSAGING_ADD_MEMBER_ERROR' });
  }
});

/**
 * DELETE /api/conversations/:id/members/:userId
 * Remove a member from conversation
 */
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const memberUserId = req.params.userId;

    const removed = await messagingConversationsAdapter.removeMember({
      conversationId,
      userId: memberUserId
    });

    res.json({ success: true, removed });
  } catch (error) {
    log.error('Error removing member', error);
    res.status(500).json({ success: false, error: 'Failed to remove member', code: 'MESSAGING_REMOVE_MEMBER_ERROR' });
  }
});

/**
 * POST /api/conversations/:id/read
 * Update last-read message for user
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ success: false, error: 'messageId is required', code: 'MESSAGING_MISSING_MESSAGE_ID' });
    }

    const updated = await messagingConversationsAdapter.setLastRead({
      conversationId,
      userId,
      messageId
    });

    res.json({ success: true, updated });
  } catch (error) {
    log.error('Error updating last read', error);
    res.status(500).json({ success: false, error: 'Failed to update last read', code: 'MESSAGING_UPDATE_READ_ERROR' });
  }
});

// ----- Read States & Summaries -----

/**
 * GET /api/conversations/:conversationId/read-states
 * Get read states for all members
 */
router.get('/:conversationId/read-states', authenticateToken, requireConversationAccess(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    const readStates = await messagingConversationsAdapter.getConversationReadStates({ conversationId });

    return res.json({
      success: true,
      readStates,
      conversationId
    });
  } catch (error) {
    log.error('Error fetching read states', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch read states', code: 'MESSAGING_READ_STATES_ERROR' });
  }
});

/**
 * POST /api/conversations/:conversationId/read
 * Mark conversation as read (with WebSocket broadcast)
 */
router.post('/:conversationId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { lastReadMessageId } = req.body;

    if (!lastReadMessageId) {
      return res.status(400).json({ success: false, error: 'lastReadMessageId is required', code: 'MESSAGING_MISSING_MESSAGE_ID' });
    }

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    const readState = await messagingConversationsAdapter.updateReadState({
      conversationId,
      userId,
      messageId: lastReadMessageId
    });

    // Broadcast read receipt via WebSocket
    const { getMessagingNamespace } = require('../messaging');
    const messagingNamespace = getMessagingNamespace();
    if (messagingNamespace) {
      messagingNamespace.to(`conversation:${conversationId}`).emit('conversation:read-receipt', {
        conversationId,
        userId,
        userName: readState?.userName,
        avatarUrl: readState?.avatarUrl,
        lastReadMessageId
      });
    }

    return res.json({
      success: true,
      readState
    });
  } catch (error) {
    log.error('Error marking conversation as read', error);
    return res.status(500).json({ success: false, error: 'Failed to mark as read', code: 'MESSAGING_MARK_READ_ERROR' });
  }
});

// ----- AI Conversation Summaries -----

/**
 * GET /api/conversations/:conversationId/summary
 * Get stored summary for a conversation
 */
router.get('/:conversationId/summary', authenticateToken, requireConversationAccess(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied'
      });
    }

    if (!aiSummaryService) {
      return res.json({
        success: true,
        summary: null,
        message: 'AI summary service not available',
        aiEnabled: false
      });
    }

    const summary = await aiSummaryService.getSummary(conversationId);

    res.json({
      success: true,
      summary: summary ? {
        id: summary.id,
        conversationId: summary.conversationId,
        content: summary.summary,
        pulseTone: summary.pulseTone,
        clarityState: summary.clarityState,
        generatedBy: summary.generatedBy,
        messageCount: summary.messageCount,
        updatedAt: summary.updatedAt
      } : null,
      aiEnabled: aiSummaryService.isEnabled()
    });
  } catch (error) {
    log.error('Error fetching conversation summary', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation summary'
    });
  }
});

/**
 * POST /api/conversations/:conversationId/summary/generate
 * Generate AI summary for a conversation
 */
router.post('/:conversationId/summary/generate', authenticateToken, requireConversationAccess(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found or access denied'
      });
    }

    if (!aiSummaryService) {
      // Fallback: generate a simple summary from recent messages
      const fallbackMessages = await messagingConversationsAdapter.listMessages({
        conversationId,
        limit: 20,
        includeReactions: false
      });

      if (!fallbackMessages || fallbackMessages.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Conversation needs at least 3 messages to generate a summary'
        });
      }

      const recentMessages = fallbackMessages.reverse();
      const participants = [...new Set(recentMessages.map(m => m.sender_name || m.sender_id))];
      const previewLines = recentMessages.slice(-5).map(m => {
        const name = m.sender_name || 'Unknown';
        const text = (m.content || '').slice(0, 120);
        return `${name}: ${text}`;
      });

      return res.json({
        success: true,
        summary: {
          id: null,
          conversationId,
          content: {
            overview: `Conversation with ${recentMessages.length} recent messages involving ${participants.join(', ')}`,
            highlights: previewLines,
          },
          pulseTone: 'neutral',
          clarityState: 'fallback',
          generatedBy: 'fallback',
        },
        warning: 'AI summary service unavailable — showing basic fallback summary',
      });
    }

    // Fetch messages
    const messages = await messagingConversationsAdapter.listMessages({
      conversationId,
      limit: 100,
      includeReactions: false
    });

    if (!messages || messages.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Conversation needs at least 3 messages to generate a summary'
      });
    }

    const chronologicalMessages = messages.reverse();

    // Generate summary
    const summaryResult = await aiSummaryService.generateSummary({
      conversationId,
      projectId: null,
      projectMeta: {},
      messages: chronologicalMessages
    });

    if (!summaryResult.success) {
      return res.status(400).json({
        success: false,
        error: summaryResult.error || 'Failed to generate summary'
      });
    }

    // Store the summary
    const storedSummary = await aiSummaryService.storeSummary(summaryResult);

    res.json({
      success: true,
      summary: {
        id: storedSummary.id,
        conversationId: storedSummary.conversation_id,
        content: storedSummary.summary_json,
        pulseTone: storedSummary.pulse_tone,
        clarityState: storedSummary.clarity_state,
        generatedBy: storedSummary.generated_by,
        messageCount: storedSummary.message_count,
        updatedAt: storedSummary.updated_at
      },
      aiEnabled: aiSummaryService.isEnabled()
    });
  } catch (error) {
    log.error('Error generating conversation summary', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate conversation summary'
    });
  }
});

module.exports = router;
