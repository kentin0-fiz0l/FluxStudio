/**
 * Messaging - Attachment Routes
 *
 * Handles file upload and voice message routes for conversations.
 */

const express = require('express');
const multer = require('multer');
const { createLogger } = require('../../lib/logger');
const log = createLogger('Messaging');
const { authenticateToken } = require('../../lib/auth/middleware');
const { requireConversationAccess } = require('../../middleware/requireConversationAccess');
const messagingConversationsAdapter = require('../../database/messaging-conversations-adapter');
const filesAdapter = require('../../database/files-adapter');
const assetsAdapter = require('../../database/assets-adapter');
const fileStorage = require('../../storage');
const { query } = require('../../database/config');

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

/**
 * POST /api/conversations/:id/upload
 * Upload a file to a conversation and create an asset
 */
router.post('/:id/upload', authenticateToken, requireConversationAccess('id'), fileUpload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded', code: 'MESSAGING_MISSING_FILE' });
    }

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
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
        log.error('Preview generation error', previewError);
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
    log.error('Error uploading conversation file', error);
    res.status(500).json({ success: false, error: 'Failed to upload file', code: 'MESSAGING_UPLOAD_ERROR' });
  }
});

/**
 * POST /api/conversations/:id/voice-message
 * Upload a voice recording and create a message + voice_messages record
 */
router.post('/:id/voice-message', authenticateToken, requireConversationAccess('id'), fileUpload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.id;
    const duration = parseFloat(req.body.duration) || 0;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file uploaded', code: 'MESSAGING_MISSING_AUDIO' });
    }

    const conversation = await messagingConversationsAdapter.getConversationById({
      conversationId,
      userId
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found', code: 'MESSAGING_CONVERSATION_NOT_FOUND' });
    }

    const file = req.file;

    // Save file to storage
    const storageResult = await fileStorage.saveFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      userId: userId,
      originalName: file.originalname || 'voice-message.webm'
    });

    // Create file record
    const fileRecord = await filesAdapter.createFile({
      userId: userId,
      organizationId: conversation.organizationId || null,
      projectId: null,
      source: 'voice',
      name: file.originalname || 'voice-message.webm',
      originalName: file.originalname || 'voice-message.webm',
      mimeType: file.mimetype,
      extension: storageResult.extension,
      sizeBytes: storageResult.sizeBytes,
      storageKey: storageResult.storageKey,
      fileUrl: `/files/${storageResult.storageKey}`,
      metadata: {
        hash: storageResult.hash,
        conversationId: conversationId,
        type: 'voice'
      }
    });

    // Create asset from file
    const asset = await assetsAdapter.createAsset({
      organizationId: conversation.organizationId || null,
      ownerId: userId,
      name: file.originalname || 'Voice message',
      kind: 'audio',
      primaryFileId: fileRecord.id,
      description: 'Voice message',
      tags: ['voice-message']
    });

    // Create the message with the asset
    let message = await messagingConversationsAdapter.createMessage({
      conversationId,
      userId,
      text: '',
      assetId: asset.id,
      replyToMessageId: null,
      projectId: null,
      isSystemMessage: false
    });

    // Attach asset data to message for the response
    message = {
      ...message,
      asset: {
        id: asset.id,
        name: asset.name,
        kind: 'audio',
        ownerId: userId,
        createdAt: asset.createdAt,
        file: {
          id: fileRecord.id,
          name: fileRecord.name,
          originalName: file.originalname || 'voice-message.webm',
          mimeType: file.mimetype,
          sizeBytes: storageResult.sizeBytes,
          url: fileRecord.fileUrl,
          storageKey: storageResult.storageKey
        }
      }
    };

    // Create voice_messages record for duration/waveform
    try {
      await query(
        'INSERT INTO voice_messages (message_id, file_id, duration, created_at) VALUES ($1, $2, $3, NOW())',
        [message.id, fileRecord.id, duration]
      );
    } catch (vmErr) {
      // voice_messages table may not exist yet - log but don't fail the request
      log.warn('Could not insert voice_messages record', vmErr.message);
    }

    // Broadcast via WebSocket
    const { getMessagingNamespace } = require('../messaging');
    const messagingNamespace = getMessagingNamespace();
    if (messagingNamespace) {
      // Look up user info for the broadcast
      let userName = null;
      let userAvatar = null;
      try {
        const userResult = await query('SELECT name, avatar_url FROM users WHERE id = $1', [userId]);
        if (userResult.rows[0]) {
          userName = userResult.rows[0].name;
          userAvatar = userResult.rows[0].avatar_url;
        }
      } catch { /* ignore */ }

      messagingNamespace.to(`conversation:${conversationId}`).emit('conversation:new-message', {
        conversationId,
        message: {
          ...message,
          userName,
          userAvatar,
          voiceMessage: {
            duration,
            url: fileRecord.fileUrl,
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: {
        ...message,
        voiceMessage: {
          duration,
          url: fileRecord.fileUrl,
        }
      }
    });
  } catch (error) {
    log.error('Error creating voice message', error);
    res.status(500).json({ success: false, error: 'Failed to create voice message', code: 'MESSAGING_VOICE_MESSAGE_ERROR' });
  }
});

module.exports = router;
