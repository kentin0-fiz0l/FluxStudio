/**
 * Messaging Routes - Conversations & Messages API
 *
 * Provides endpoints for:
 * - Conversation CRUD and membership
 * - Message CRUD, reactions, pins, editing
 * - File uploads to conversations
 * - Message search
 * - Read receipts and threads
 * - AI conversation summaries
 *
 * All endpoints require authentication.
 */

const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../lib/auth/middleware');
const messagingConversationsAdapter = require('../database/messaging-conversations-adapter');
const filesAdapter = require('../database/files-adapter');
const assetsAdapter = require('../database/assets-adapter');
const fileStorage = require('../storage');
const { query } = require('../database/config');

// Try to load AI summary service (may not be available)
let aiSummaryService = null;
try {
  aiSummaryService = require('../services/ai-summary-service').aiSummaryService;
} catch (error) {
  console.warn('AI summary service not available');
}

// Try to load projects adapter for project metadata
let projectsAdapter = null;
try {
  projectsAdapter = require('../database/projects-adapter');
} catch (error) {
  console.warn('Projects adapter not available for messaging');
}

// Try to load activity logger for audit trails
let activityLogger = null;
try {
  activityLogger = require('../lib/activityLogger');
} catch (error) {
  console.warn('Activity logger not available for messaging');
}

const router = express.Router();

// Configure multer for file uploads
const fileUploadStorage = multer.memoryStorage();
const fileUpload = multer({
  storage: fileUploadStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for chat files
    files: 1
  }
});

// Reference to messaging Socket.IO namespace (set by server)
let messagingNamespace = null;

/**
 * Set the Socket.IO messaging namespace for real-time events
 */
function setMessagingNamespace(namespace) {
  messagingNamespace = namespace;
}

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
    console.error('Error listing conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to list conversations' });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, isGroup, memberUserIds, organizationId, projectId } = req.body;

    if (memberUserIds && !Array.isArray(memberUserIds)) {
      return res.status(400).json({ success: false, error: 'memberUserIds must be an array' });
    }

    if (isGroup && !name) {
      return res.status(400).json({ success: false, error: 'Group conversations require a name' });
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
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
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
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
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
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const updated = await messagingConversationsAdapter.updateConversation({
      conversationId,
      name,
      isGroup
    });

    res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to update conversation' });
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
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const member = await messagingConversationsAdapter.addMember({
      conversationId,
      userId: memberUserId,
      role: role || 'member'
    });

    res.status(201).json({ success: true, member });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ success: false, error: 'Failed to add member' });
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
    console.error('Error removing member:', error);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
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
      return res.status(400).json({ success: false, error: 'messageId is required' });
    }

    const updated = await messagingConversationsAdapter.setLastRead({
      conversationId,
      userId,
      messageId
    });

    res.json({ success: true, updated });
  } catch (error) {
    console.error('Error updating last read:', error);
    res.status(500).json({ success: false, error: 'Failed to update last read' });
  }
});

// ----- Messages -----

/**
 * GET /api/conversations/:id/messages
 * List messages in a conversation
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before || null;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
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
  } catch (error) {
    console.error('Error listing messages:', error);
    res.status(500).json({ success: false, error: 'Failed to list messages' });
  }
});

/**
 * POST /api/conversations/:id/upload
 * Upload a file to a conversation and create an asset
 */
router.post('/:id/upload', authenticateToken, fileUpload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const file = req.file;

    // Save file to storage
    const storageResult = await fileStorage.saveFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      userId: userId,
      originalName: file.originalname
    });

    // Create file record
    const fileRecord = await filesAdapter.createFile({
      userId: userId,
      organizationId: conversation.organizationId || null,
      projectId: null,
      source: 'chat',
      name: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      extension: storageResult.extension,
      sizeBytes: storageResult.sizeBytes,
      storageKey: storageResult.storageKey,
      fileUrl: `/files/${storageResult.storageKey}`,
      metadata: {
        hash: storageResult.hash,
        conversationId: conversationId
      }
    });

    // Generate thumbnail for images
    let thumbnailUrl = null;
    if (file.mimetype.startsWith('image/')) {
      try {
        const previewResult = await fileStorage.savePreview({
          buffer: file.buffer,
          mimeType: file.mimetype,
          fileId: fileRecord.id,
          previewType: 'thumbnail'
        });

        await filesAdapter.createPreview({
          fileId: fileRecord.id,
          previewType: 'thumbnail',
          storageKey: previewResult.storageKey,
          mimeType: file.mimetype,
          sizeBytes: previewResult.sizeBytes,
          status: 'completed'
        });

        thumbnailUrl = `/files/${previewResult.storageKey}`;
      } catch (previewError) {
        console.error('Preview generation error:', previewError);
      }
    }

    // Determine asset kind from mime type
    let assetKind = 'other';
    if (file.mimetype.startsWith('image/')) assetKind = 'image';
    else if (file.mimetype.startsWith('video/')) assetKind = 'video';
    else if (file.mimetype.startsWith('audio/')) assetKind = 'audio';
    else if (file.mimetype === 'application/pdf') assetKind = 'pdf';
    else if (file.mimetype.startsWith('text/') || file.mimetype.includes('document') || file.mimetype.includes('word')) assetKind = 'document';

    // Create asset from file
    const asset = await assetsAdapter.createAsset({
      organizationId: conversation.organizationId || null,
      ownerId: userId,
      name: file.originalname,
      kind: assetKind,
      primaryFileId: fileRecord.id,
      description: 'Shared in conversation',
      tags: ['chat-attachment']
    });

    res.status(201).json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.name,
        kind: asset.kind,
        ownerId: userId,
        createdAt: asset.createdAt,
        file: {
          id: fileRecord.id,
          name: fileRecord.name,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: storageResult.sizeBytes,
          url: fileRecord.fileUrl,
          thumbnailUrl: thumbnailUrl,
          storageKey: storageResult.storageKey
        }
      }
    });
  } catch (error) {
    console.error('Error uploading conversation file:', error);
    res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Create a message in a conversation
 */
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const { text, assetId, replyToMessageId, projectId, isSystemMessage } = req.body;

    if (!text && !assetId) {
      return res.status(400).json({ success: false, error: 'Either text or assetId is required' });
    }

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    let message = await messagingConversationsAdapter.createMessage({
      conversationId,
      userId,
      text: text || '',
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
          console.error('Failed to queue link preview:', err.message);
        }
      }
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
});

/**
 * GET /api/conversations/:id/pins
 * List pinned messages for a conversation
 */
router.get('/:id/pins', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found or not a member' });
    }

    const pins = await messagingConversationsAdapter.listPinnedMessages({ conversationId, limit: 20 });
    return res.json({ success: true, pins });
  } catch (error) {
    console.error('Error listing pins:', error);
    return res.status(500).json({ success: false, error: 'Failed to list pinned messages' });
  }
});

/**
 * GET /api/conversations/:conversationId/read-states
 * Get read states for all members
 */
router.get('/:conversationId/read-states', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const readStates = await messagingConversationsAdapter.getConversationReadStates({ conversationId });

    return res.json({
      success: true,
      readStates,
      conversationId
    });
  } catch (error) {
    console.error('Error fetching read states:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch read states' });
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
      return res.status(400).json({ success: false, error: 'lastReadMessageId is required' });
    }

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const readState = await messagingConversationsAdapter.updateReadState({
      conversationId,
      userId,
      messageId: lastReadMessageId
    });

    // Broadcast read receipt via WebSocket
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
    console.error('Error marking conversation as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

// ----- Threads -----

/**
 * GET /api/conversations/:conversationId/threads/:threadRootMessageId/messages
 * Get messages in a thread
 */
router.get('/:conversationId/threads/:threadRootMessageId/messages', authenticateToken, async (req, res) => {
  try {
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
      return res.status(404).json({ success: false, error: 'Thread not found or access denied' });
    }

    return res.json({
      success: true,
      rootMessage: result.rootMessage,
      messages: result.messages,
      replyCount: result.replyCount,
      conversationId,
      threadRootMessageId
    });
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch thread messages' });
  }
});

/**
 * GET /api/conversations/:conversationId/threads/:threadRootMessageId/summary
 * Get thread summary
 */
router.get('/:conversationId/threads/:threadRootMessageId/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, threadRootMessageId } = req.params;

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
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
  } catch (error) {
    console.error('Error fetching thread summary:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch thread summary' });
  }
});

// ----- AI Conversation Summaries -----

/**
 * GET /api/conversations/:conversationId/summary
 * Get stored summary for a conversation
 */
router.get('/:conversationId/summary', authenticateToken, async (req, res) => {
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
    console.error('Error fetching conversation summary:', error);
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
router.post('/:conversationId/summary/generate', authenticateToken, async (req, res) => {
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
      return res.status(501).json({
        success: false,
        error: 'AI summary service not available'
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
    console.error('Error generating conversation summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate conversation summary'
    });
  }
});

// ----- Message Edit/Delete -----

/**
 * PUT /api/conversations/:conversationId/messages/:messageId
 * Edit a message (only by original author within time limit)
 */
router.put('/:conversationId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, messageId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text content is required' });
    }

    // Verify user is in conversation
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found or not a member' });
    }

    // Get the message to verify ownership
    const messages = await messagingConversationsAdapter.listMessages({
      conversationId,
      limit: 1,
      messageId
    });

    const message = messages.find(m => m.id === messageId);

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    if (message.userId !== userId && message.user_id !== userId) {
      return res.status(403).json({ success: false, error: 'You can only edit your own messages' });
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

    // Update the message using editMessage (matches adapter function signature)
    const updatedMessage = await messagingConversationsAdapter.editMessage({
      messageId,
      userId,
      content: text.trim()
    });

    // Emit real-time event
    if (messagingNamespace) {
      messagingNamespace.to(conversationId).emit('message:edited', {
        messageId,
        conversationId,
        text: text.trim(),
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
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, error: 'Failed to edit message' });
  }
});

/**
 * DELETE /api/conversations/:conversationId/messages/:messageId
 * Delete a message (soft delete - marks as deleted)
 */
router.delete('/:conversationId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, messageId } = req.params;

    // Verify user is in conversation
    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found or not a member' });
    }

    // Get the message to verify ownership
    const messages = await messagingConversationsAdapter.listMessages({
      conversationId,
      limit: 1,
      messageId
    });

    const message = messages.find(m => m.id === messageId);

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
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
    // Note: The adapter does a hard delete and requires author ownership
    // For admin deletes, we pass the message author's ID
    const deleteUserId = isAuthor ? userId : (message.userId || message.user_id);
    await messagingConversationsAdapter.deleteMessage({
      messageId,
      userId: deleteUserId
    });

    // Emit real-time event
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
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// ==============================================
// INDIVIDUAL MESSAGE OPERATIONS
// (Merged from routes/messages.js - Sprint 18)
// ==============================================
// These routes are mounted at /messages and /api/messages
// They handle operations on individual messages by ID
// (as opposed to conversation-scoped message operations above)

const messagesRouter = express.Router();

/**
 * DELETE /api/messages/:id
 * Delete a message (author only)
 */
messagesRouter.delete('/:id', authenticateToken, async (req, res) => {
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
messagesRouter.patch('/:messageId', authenticateToken, async (req, res) => {
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
messagesRouter.post('/:messageId/reactions', authenticateToken, async (req, res) => {
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
messagesRouter.delete('/:messageId/reactions/:emoji', authenticateToken, async (req, res) => {
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
messagesRouter.get('/:messageId/reactions', authenticateToken, async (req, res) => {
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
messagesRouter.post('/:messageId/pin', authenticateToken, async (req, res) => {
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
messagesRouter.delete('/:messageId/pin', authenticateToken, async (req, res) => {
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
messagesRouter.get('/search', authenticateToken, async (req, res) => {
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
module.exports.messagesRouter = messagesRouter;
module.exports.setMessagingNamespace = setMessagingNamespace;
