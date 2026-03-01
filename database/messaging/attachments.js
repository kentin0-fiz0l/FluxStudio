/**
 * Messaging Attachments Adapter
 * File attachments, voice messages, and link previews
 */

const { query } = require('../config');
const { createLogger } = require('../../lib/logger');
const log = createLogger('DB:Msg:Attachments');

function transformAttachment(dbAttachment) {
  return {
    id: dbAttachment.id,
    messageId: dbAttachment.message_id,
    filename: dbAttachment.filename,
    originalFilename: dbAttachment.original_filename,
    url: dbAttachment.url,
    fileType: dbAttachment.file_type,
    fileSize: dbAttachment.file_size,
    mimeType: dbAttachment.mime_type,
    securityScanStatus: dbAttachment.security_scan_status,
    securityScanResult: dbAttachment.security_scan_result,
    uploadedAt: dbAttachment.uploaded_at,
    createdAt: dbAttachment.created_at
  };
}

function transformLinkPreview(dbPreview) {
  return {
    id: dbPreview.id,
    url: dbPreview.url,
    title: dbPreview.title,
    description: dbPreview.description,
    imageUrl: dbPreview.image_url,
    siteName: dbPreview.site_name,
    faviconUrl: dbPreview.favicon_url,
    fetchedAt: dbPreview.fetched_at,
    expiresAt: dbPreview.expires_at
  };
}

function transformVoiceMessage(dbVoice) {
  return {
    id: dbVoice.id,
    messageId: dbVoice.message_id,
    durationSeconds: dbVoice.duration_seconds,
    waveform: dbVoice.waveform || [],
    transcription: dbVoice.transcription,
    transcriptionStatus: dbVoice.transcription_status,
    fileUrl: dbVoice.file_url,
    fileSize: dbVoice.file_size,
    createdAt: dbVoice.created_at
  };
}

// File attachments
async function addAttachment(messageId, attachmentData) {
  try {
    const result = await query(
      `INSERT INTO message_attachments (message_id, filename, original_filename, url, file_type, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        messageId,
        attachmentData.filename,
        attachmentData.originalFilename,
        attachmentData.url,
        attachmentData.fileType,
        attachmentData.fileSize,
        attachmentData.mimeType
      ]
    );
    return result.rows[0];
  } catch (error) {
    log.error('Error adding attachment', error);
    throw error;
  }
}

async function getAttachments(messageId) {
  try {
    const result = await query(
      `SELECT * FROM message_attachments WHERE message_id = $1 ORDER BY created_at`,
      [messageId]
    );
    return result.rows;
  } catch (error) {
    log.error('Error getting attachments', error);
    return [];
  }
}

// Link previews
async function getLinkPreview(url) {
  try {
    const result = await query(
      `SELECT * FROM link_previews
       WHERE url = $1 AND expires_at > NOW()`,
      [url]
    );
    return result.rows.length > 0 ? transformLinkPreview(result.rows[0]) : null;
  } catch (error) {
    log.error('Error getting link preview', error);
    return null;
  }
}

async function saveLinkPreview(previewData) {
  try {
    const id = `lp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await query(
      `INSERT INTO link_previews (id, url, title, description, image_url, site_name, favicon_url, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '7 days')
       ON CONFLICT (url) DO UPDATE SET
         title = $3, description = $4, image_url = $5, site_name = $6, favicon_url = $7,
         fetched_at = NOW(), expires_at = NOW() + INTERVAL '7 days', updated_at = NOW()
       RETURNING *`,
      [id, previewData.url, previewData.title, previewData.description,
       previewData.imageUrl, previewData.siteName, previewData.faviconUrl]
    );
    return result.rows.length > 0 ? transformLinkPreview(result.rows[0]) : null;
  } catch (error) {
    log.error('Error saving link preview', error);
    return null;
  }
}

async function linkPreviewToMessage(messageId, linkPreviewId, position = 0) {
  try {
    const id = `mlp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await query(
      `INSERT INTO message_link_previews (id, message_id, link_preview_id, position)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (message_id, link_preview_id) DO NOTHING`,
      [id, messageId, linkPreviewId, position]
    );
    return true;
  } catch (error) {
    log.error('Error linking preview to message', error);
    return false;
  }
}

async function getMessageLinkPreviews(messageId) {
  try {
    const result = await query(
      `SELECT lp.* FROM link_previews lp
       JOIN message_link_previews mlp ON lp.id = mlp.link_preview_id
       WHERE mlp.message_id = $1
       ORDER BY mlp.position`,
      [messageId]
    );
    return result.rows.map(transformLinkPreview);
  } catch (error) {
    log.error('Error getting message link previews', error);
    return [];
  }
}

// Voice messages
async function createVoiceMessage(messageId, voiceData) {
  try {
    const id = `vm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await query(
      `INSERT INTO voice_messages (id, message_id, duration_seconds, waveform, file_url, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, messageId, voiceData.durationSeconds, JSON.stringify(voiceData.waveform || []),
       voiceData.fileUrl, voiceData.fileSize]
    );
    return result.rows.length > 0 ? transformVoiceMessage(result.rows[0]) : null;
  } catch (error) {
    log.error('Error creating voice message', error);
    return null;
  }
}

async function getVoiceMessage(messageId) {
  try {
    const result = await query(
      `SELECT * FROM voice_messages WHERE message_id = $1`,
      [messageId]
    );
    return result.rows.length > 0 ? transformVoiceMessage(result.rows[0]) : null;
  } catch (error) {
    log.error('Error getting voice message', error);
    return null;
  }
}

module.exports = {
  transformAttachment,
  transformLinkPreview,
  transformVoiceMessage,
  addAttachment,
  getAttachments,
  getLinkPreview,
  saveLinkPreview,
  linkPreviewToMessage,
  getMessageLinkPreviews,
  createVoiceMessage,
  getVoiceMessage
};
