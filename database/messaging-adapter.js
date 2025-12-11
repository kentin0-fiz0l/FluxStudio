/**
 * Messaging Database Adapter
 * Provides database operations for the messaging service
 */

const { query, transaction, messagingQueries } = require('./config');

class MessagingAdapter {

  // Message management
  async getMessages(conversationId = null, limit = 50, offset = 0, userId = null) {
    try {
      if (conversationId) {
        return await messagingQueries.getMessages(conversationId, limit, offset, userId);
      } else {
        // Fallback to legacy query for backward compatibility
        const queryText = `
          SELECT m.*, u.name as author_name, u.avatar_url as author_avatar
          FROM messages m
          LEFT JOIN users u ON m.author_id = u.id
          ORDER BY m.created_at DESC
          LIMIT $1 OFFSET $2
        `;
        const result = await query(queryText, [limit, offset]);
        return result.rows.map(this.transformMessage);
      }
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async createMessage(messageData) {
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

      const message = this.transformMessage(result.rows[0]);

      // Update conversation last_message_at
      if (messageData.conversationId) {
        await this.updateConversationActivity(messageData.conversationId);
      }

      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async updateMessage(messageId, updates) {
    try {
      const dbUpdates = {};
      if (updates.content) dbUpdates.content = updates.content;
      if (updates.edited) dbUpdates.edited_at = new Date();
      if (updates.deleted) dbUpdates.deleted_at = new Date();

      const fields = Object.keys(dbUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [messageId, ...Object.values(dbUpdates)];

      const result = await query(`UPDATE messages SET ${fields} WHERE id = $1 RETURNING *`, values);
      return result.rows.length > 0 ? this.transformMessage(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId) {
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

  async saveMessages(messages) {
    // Backward compatibility method
    console.warn('saveMessages() called - this method is deprecated in database mode');
    return true;
  }

  // Message search functionality
  async searchMessages(searchTerm, conversationId = null, limit = 20, offset = 0) {
    try {
      return await messagingQueries.searchMessages(searchTerm, conversationId, limit, offset);
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  // Message threading functionality
  async getMessageThread(parentMessageId, limit = 50) {
    try {
      return await messagingQueries.getMessageThread(parentMessageId, limit);
    } catch (error) {
      console.error('Error getting message thread:', error);
      return [];
    }
  }

  // Conversation management (channels in the legacy system)
  async getConversations(userId = null, limit = 20, offset = 0) {
    try {
      if (userId) {
        return await messagingQueries.getConversationsWithLatestMessage(userId, limit, offset);
      } else {
        // Fallback to legacy query for backward compatibility
        const queryText = `
          SELECT c.*, u.name as creator_name
          FROM conversations c
          LEFT JOIN users u ON c.created_by = u.id
          WHERE c.is_archived = false
          ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
          LIMIT $1 OFFSET $2
        `;
        const result = await query(queryText, [limit, offset]);
        return result.rows.map(this.transformConversation);
      }
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  async createConversation(conversationData) {
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

      const conversation = this.transformConversation(result.rows[0]);

      // Add creator as participant
      await this.addParticipant(conversation.id, conversationData.createdBy, 'owner');

      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async updateConversation(conversationId, updates) {
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
      return result.rows.length > 0 ? this.transformConversation(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  async updateConversationActivity(conversationId) {
    try {
      await query(
        `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
        [conversationId]
      );
    } catch (error) {
      console.error('Error updating conversation activity:', error);
    }
  }

  async saveChannels(channels) {
    // Backward compatibility method
    console.warn('saveChannels() called - this method is deprecated in database mode');
    return true;
  }

  // Participant management
  async addParticipant(conversationId, userId, role = 'member') {
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

  async removeParticipant(conversationId, userId) {
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

  async getParticipants(conversationId) {
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

  // Message reactions
  async addReaction(messageId, userId, reaction) {
    try {
      await query(
        `INSERT INTO message_reactions (message_id, user_id, reaction)
         VALUES ($1, $2, $3)
         ON CONFLICT (message_id, user_id, reaction) DO NOTHING`,
        [messageId, userId, reaction]
      );
      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }

  async removeReaction(messageId, userId, reaction) {
    try {
      const result = await query(
        `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3`,
        [messageId, userId, reaction]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error removing reaction:', error);
      return false;
    }
  }

  async getReactions(messageId) {
    try {
      const result = await query(
        `SELECT mr.*, u.name as user_name
         FROM message_reactions mr
         JOIN users u ON mr.user_id = u.id
         WHERE mr.message_id = $1`,
        [messageId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting reactions:', error);
      return [];
    }
  }

  // Data transformation helpers
  transformMessage(dbMessage) {
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
      // Threading support
      isThreadRoot: dbMessage.is_thread_root || false,
      threadCount: dbMessage.thread_count || 0,
      // Search support
      searchRank: dbMessage.search_rank || null,
      highlightedContent: dbMessage.highlighted_content || null
    };
  }

  transformConversation(dbConversation) {
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
      // Enhanced conversation data
      participantCount: dbConversation.participant_count || 0,
      unreadCount: dbConversation.unread_count || 0,
      lastMessage: dbConversation.last_message_content ? {
        content: dbConversation.last_message_content,
        authorName: dbConversation.last_message_author,
        createdAt: dbConversation.last_message_at
      } : null
    };
  }

  transformThread(dbThread) {
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

  transformAttachment(dbAttachment) {
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

  // Real-time presence features
  async updateUserPresence(userId, conversationId, status = 'active') {
    try {
      await query(
        `INSERT INTO user_presence (user_id, conversation_id, last_active_at, is_typing)
         VALUES ($1, $2, NOW(), false)
         ON CONFLICT (user_id, conversation_id)
         DO UPDATE SET last_active_at = NOW(), updated_at = NOW()`,
        [userId, conversationId]
      );
      return true;
    } catch (error) {
      console.error('Error updating user presence:', error);
      return false;
    }
  }

  async getUserPresence(userId, conversationId = null) {
    try {
      let queryText = `
        SELECT up.*, c.name as conversation_name
        FROM user_presence up
        LEFT JOIN conversations c ON up.conversation_id = c.id
        WHERE up.user_id = $1
      `;
      const params = [userId];

      if (conversationId) {
        queryText += ` AND up.conversation_id = $2`;
        params.push(conversationId);
      }

      queryText += ` ORDER BY up.last_active_at DESC`;

      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting user presence:', error);
      return [];
    }
  }

  async updateTypingStatus(userId, conversationId, isTyping = false) {
    try {
      await query(
        `INSERT INTO user_presence (user_id, conversation_id, is_typing, typing_started_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, conversation_id)
         DO UPDATE SET
           is_typing = $3,
           typing_started_at = $4,
           updated_at = NOW()`,
        [userId, conversationId, isTyping, isTyping ? new Date() : null]
      );
      return true;
    } catch (error) {
      console.error('Error updating typing status:', error);
      return false;
    }
  }

  async markMessageAsRead(userId, conversationId, messageId = null) {
    try {
      await query(
        `INSERT INTO user_presence (user_id, conversation_id, last_read_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, conversation_id)
         DO UPDATE SET last_read_at = NOW(), updated_at = NOW()`,
        [userId, conversationId]
      );
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  // Message attachments
  async addAttachment(messageId, attachmentData) {
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
      console.error('Error adding attachment:', error);
      throw error;
    }
  }

  async getAttachments(messageId) {
    try {
      const result = await query(
        `SELECT * FROM message_attachments WHERE message_id = $1 ORDER BY created_at`,
        [messageId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting attachments:', error);
      return [];
    }
  }

  // Thread management
  async createThread(rootMessageId, conversationId, threadTitle = null) {
    try {
      const result = await query(
        `INSERT INTO message_threads (root_message_id, conversation_id, thread_title)
         VALUES ($1, $2, $3) RETURNING *`,
        [rootMessageId, conversationId, threadTitle]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    }
  }

  async getThreads(conversationId, limit = 20) {
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
      console.error('Error getting threads:', error);
      return [];
    }
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  async getNotifications(userId, limit = 20, offset = 0) {
    try {
      const result = await query(
        `SELECT * FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return result.rows.map(this.transformNotification);
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async getUnreadNotificationCount(userId) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM notifications
         WHERE user_id = $1 AND is_read = false`,
        [userId]
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  async createNotification(notificationData) {
    try {
      const result = await query(
        `INSERT INTO notifications (user_id, type, title, message, data, priority, action_url, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          notificationData.userId,
          notificationData.type,
          notificationData.title,
          notificationData.message,
          JSON.stringify(notificationData.data || {}),
          notificationData.priority || 'medium',
          notificationData.actionUrl || null,
          notificationData.expiresAt || null
        ]
      );
      return this.transformNotification(result.rows[0]);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId, userId) {
    try {
      const result = await query(
        `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [notificationId, userId]
      );
      return result.rows.length > 0 ? this.transformNotification(result.rows[0]) : null;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return null;
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const result = await query(
        `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE user_id = $1 AND is_read = false RETURNING *`,
        [userId]
      );
      return result.rows.map(this.transformNotification);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return [];
    }
  }

  async markNotificationsByIds(notificationIds, userId) {
    try {
      const result = await query(
        `UPDATE notifications SET is_read = true, read_at = NOW()
         WHERE id = ANY($1) AND user_id = $2 RETURNING *`,
        [notificationIds, userId]
      );
      return result.rows.map(this.transformNotification);
    } catch (error) {
      console.error('Error marking notifications by ids:', error);
      return [];
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const result = await query(
        `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  transformNotification(dbNotification) {
    return {
      id: dbNotification.id,
      userId: dbNotification.user_id,
      type: dbNotification.type,
      title: dbNotification.title,
      message: dbNotification.message,
      data: dbNotification.data || {},
      priority: dbNotification.priority,
      isRead: dbNotification.is_read,
      readAt: dbNotification.read_at,
      actionUrl: dbNotification.action_url,
      expiresAt: dbNotification.expires_at,
      createdAt: dbNotification.created_at
    };
  }

  // ========================================
  // PARTICIPANT VERIFICATION
  // ========================================

  async isParticipant(conversationId, userId) {
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

  async getConversationWithMessages(conversationId, userId, messageLimit = 50, messageOffset = 0) {
    try {
      // First verify user is a participant
      const isParticipant = await this.isParticipant(conversationId, userId);
      if (!isParticipant) {
        return null;
      }

      // Get conversation details
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

      const conversation = this.transformConversation(convResult.rows[0]);

      // Get messages
      const messages = await this.getMessages(conversationId, messageLimit, messageOffset, userId);

      // Get participants
      const participants = await this.getParticipants(conversationId);

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

  // ========================================
  // PINNED MESSAGES
  // ========================================

  async pinMessage(messageId, conversationId, userId) {
    try {
      const id = `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await query(
        `INSERT INTO pinned_messages (id, message_id, conversation_id, pinned_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (message_id, conversation_id) DO NOTHING
         RETURNING *`,
        [id, messageId, conversationId, userId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error pinning message:', error);
      return null;
    }
  }

  async unpinMessage(messageId, conversationId) {
    try {
      const result = await query(
        `DELETE FROM pinned_messages WHERE message_id = $1 AND conversation_id = $2`,
        [messageId, conversationId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error unpinning message:', error);
      return false;
    }
  }

  async getPinnedMessages(conversationId, limit = 20) {
    try {
      const result = await query(
        `SELECT pm.*, m.content, m.author_id, m.created_at as message_created_at,
                u.name as author_name, u.avatar_url as author_avatar,
                pinner.name as pinned_by_name
         FROM pinned_messages pm
         JOIN messages m ON pm.message_id = m.id
         LEFT JOIN users u ON m.author_id = u.id
         LEFT JOIN users pinner ON pm.pinned_by = pinner.id
         WHERE pm.conversation_id = $1
         ORDER BY pm.pinned_at DESC
         LIMIT $2`,
        [conversationId, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting pinned messages:', error);
      return [];
    }
  }

  // ========================================
  // MUTE / NOTIFICATION SETTINGS
  // ========================================

  async muteConversation(conversationId, userId, mutedUntil = null) {
    try {
      const result = await query(
        `UPDATE conversation_participants
         SET is_muted = true, muted_until = $3, updated_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2
         RETURNING *`,
        [conversationId, userId, mutedUntil]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error muting conversation:', error);
      return false;
    }
  }

  async unmuteConversation(conversationId, userId) {
    try {
      const result = await query(
        `UPDATE conversation_participants
         SET is_muted = false, muted_until = NULL, updated_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2
         RETURNING *`,
        [conversationId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error unmuting conversation:', error);
      return false;
    }
  }

  async updateNotificationPreference(conversationId, userId, preference) {
    try {
      const result = await query(
        `UPDATE conversation_participants
         SET notification_preference = $3, updated_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2
         RETURNING *`,
        [conversationId, userId, preference]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return false;
    }
  }

  async getMuteStatus(conversationId, userId) {
    try {
      const result = await query(
        `SELECT is_muted, muted_until, notification_preference
         FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      // Check if mute has expired
      if (row.is_muted && row.muted_until && new Date(row.muted_until) < new Date()) {
        await this.unmuteConversation(conversationId, userId);
        return { isMuted: false, mutedUntil: null, notificationPreference: row.notification_preference };
      }
      return {
        isMuted: row.is_muted,
        mutedUntil: row.muted_until,
        notificationPreference: row.notification_preference
      };
    } catch (error) {
      console.error('Error getting mute status:', error);
      return null;
    }
  }

  // ========================================
  // LINK PREVIEWS
  // ========================================

  async getLinkPreview(url) {
    try {
      const result = await query(
        `SELECT * FROM link_previews
         WHERE url = $1 AND expires_at > NOW()`,
        [url]
      );
      return result.rows.length > 0 ? this.transformLinkPreview(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting link preview:', error);
      return null;
    }
  }

  async saveLinkPreview(previewData) {
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
      return result.rows.length > 0 ? this.transformLinkPreview(result.rows[0]) : null;
    } catch (error) {
      console.error('Error saving link preview:', error);
      return null;
    }
  }

  async linkPreviewToMessage(messageId, linkPreviewId, position = 0) {
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
      console.error('Error linking preview to message:', error);
      return false;
    }
  }

  async getMessageLinkPreviews(messageId) {
    try {
      const result = await query(
        `SELECT lp.* FROM link_previews lp
         JOIN message_link_previews mlp ON lp.id = mlp.link_preview_id
         WHERE mlp.message_id = $1
         ORDER BY mlp.position`,
        [messageId]
      );
      return result.rows.map(this.transformLinkPreview);
    } catch (error) {
      console.error('Error getting message link previews:', error);
      return [];
    }
  }

  transformLinkPreview(dbPreview) {
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

  // ========================================
  // REACTIONS WITH COUNTS
  // ========================================

  async getReactionCounts(messageId) {
    try {
      const result = await query(
        `SELECT reaction, COUNT(*) as count,
                array_agg(user_id) as user_ids,
                array_agg(u.name) as user_names
         FROM message_reactions mr
         LEFT JOIN users u ON mr.user_id = u.id
         WHERE mr.message_id = $1
         GROUP BY reaction
         ORDER BY count DESC`,
        [messageId]
      );
      return result.rows.map(row => ({
        reaction: row.reaction,
        count: parseInt(row.count),
        userIds: row.user_ids,
        userNames: row.user_names
      }));
    } catch (error) {
      console.error('Error getting reaction counts:', error);
      return [];
    }
  }

  async toggleReaction(messageId, userId, reaction) {
    try {
      // Check if reaction exists
      const existing = await query(
        `SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3`,
        [messageId, userId, reaction]
      );

      if (existing.rows.length > 0) {
        // Remove reaction
        await this.removeReaction(messageId, userId, reaction);
        return { action: 'removed', reaction };
      } else {
        // Add reaction
        await this.addReaction(messageId, userId, reaction);
        return { action: 'added', reaction };
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      return null;
    }
  }

  // ========================================
  // DELIVERY RECEIPTS
  // ========================================

  async createDeliveryReceipt(messageId, userId, status = 'delivered') {
    try {
      const id = `rcpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await query(
        `INSERT INTO message_receipts (id, message_id, user_id, status, delivered_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (message_id, user_id)
         DO UPDATE SET status = $4, delivered_at = COALESCE(message_receipts.delivered_at, NOW()), updated_at = NOW()
         RETURNING *`,
        [id, messageId, userId, status]
      );
      return result.rows.length > 0 ? this.transformReceipt(result.rows[0]) : null;
    } catch (error) {
      console.error('Error creating delivery receipt:', error);
      return null;
    }
  }

  async markMessageRead(messageId, userId) {
    try {
      const id = `rcpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await query(
        `INSERT INTO message_receipts (id, message_id, user_id, status, delivered_at, read_at)
         VALUES ($1, $2, $3, 'read', NOW(), NOW())
         ON CONFLICT (message_id, user_id)
         DO UPDATE SET status = 'read', read_at = NOW(), updated_at = NOW()
         RETURNING *`,
        [id, messageId, userId]
      );
      return result.rows.length > 0 ? this.transformReceipt(result.rows[0]) : null;
    } catch (error) {
      console.error('Error marking message read:', error);
      return null;
    }
  }

  async getMessageReceipts(messageId) {
    try {
      const result = await query(
        `SELECT mr.*, u.name as user_name, u.avatar_url as user_avatar
         FROM message_receipts mr
         LEFT JOIN users u ON mr.user_id = u.id
         WHERE mr.message_id = $1
         ORDER BY mr.delivered_at`,
        [messageId]
      );
      return result.rows.map(this.transformReceipt);
    } catch (error) {
      console.error('Error getting message receipts:', error);
      return [];
    }
  }

  async getMessageDeliveryStatus(messageId, totalParticipants) {
    try {
      const result = await query(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('delivered', 'read')) as delivered_count,
           COUNT(*) FILTER (WHERE status = 'read') as read_count
         FROM message_receipts
         WHERE message_id = $1`,
        [messageId]
      );
      const row = result.rows[0];
      const deliveredCount = parseInt(row.delivered_count) || 0;
      const readCount = parseInt(row.read_count) || 0;

      // Determine overall status
      let status = 'sent';
      if (readCount >= totalParticipants - 1) {
        status = 'read';
      } else if (deliveredCount >= totalParticipants - 1) {
        status = 'delivered';
      } else if (deliveredCount > 0) {
        status = 'delivered';
      }

      return { status, deliveredCount, readCount, totalParticipants };
    } catch (error) {
      console.error('Error getting message delivery status:', error);
      return { status: 'sent', deliveredCount: 0, readCount: 0, totalParticipants };
    }
  }

  transformReceipt(dbReceipt) {
    return {
      id: dbReceipt.id,
      messageId: dbReceipt.message_id,
      userId: dbReceipt.user_id,
      userName: dbReceipt.user_name,
      userAvatar: dbReceipt.user_avatar,
      status: dbReceipt.status,
      deliveredAt: dbReceipt.delivered_at,
      readAt: dbReceipt.read_at,
      createdAt: dbReceipt.created_at
    };
  }

  // ========================================
  // MESSAGE EDITING
  // ========================================

  async editMessage(messageId, userId, newContent) {
    try {
      // First get the current message
      const current = await query(
        `SELECT content, edit_history FROM messages WHERE id = $1 AND author_id = $2`,
        [messageId, userId]
      );

      if (current.rows.length === 0) {
        return null; // Message not found or user doesn't own it
      }

      const oldContent = current.rows[0].content;
      const editHistory = current.rows[0].edit_history || [];

      // Add current content to edit history
      editHistory.push({
        content: oldContent,
        editedAt: new Date().toISOString()
      });

      const result = await query(
        `UPDATE messages
         SET content = $2, is_edited = true, edited_at = NOW(), edit_history = $3, updated_at = NOW()
         WHERE id = $1 AND author_id = $4
         RETURNING *`,
        [messageId, newContent, JSON.stringify(editHistory), userId]
      );

      return result.rows.length > 0 ? this.transformMessage(result.rows[0]) : null;
    } catch (error) {
      console.error('Error editing message:', error);
      return null;
    }
  }

  async getEditHistory(messageId) {
    try {
      const result = await query(
        `SELECT edit_history FROM messages WHERE id = $1`,
        [messageId]
      );
      return result.rows.length > 0 ? result.rows[0].edit_history || [] : [];
    } catch (error) {
      console.error('Error getting edit history:', error);
      return [];
    }
  }

  // ========================================
  // REPLY / THREADING
  // ========================================

  async createReply(messageData) {
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

      const message = this.transformMessage(result.rows[0]);

      // Update conversation activity
      await this.updateConversationActivity(messageData.conversationId);

      return message;
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
  }

  async getMessageWithReplies(messageId, limit = 50) {
    try {
      // Get the parent message
      const parentResult = await query(
        `SELECT m.*, u.name as author_name, u.avatar_url as author_avatar
         FROM messages m
         LEFT JOIN users u ON m.author_id = u.id
         WHERE m.id = $1`,
        [messageId]
      );

      if (parentResult.rows.length === 0) return null;

      const parentMessage = this.transformMessage(parentResult.rows[0]);

      // Get replies
      const repliesResult = await query(
        `SELECT m.*, u.name as author_name, u.avatar_url as author_avatar
         FROM messages m
         LEFT JOIN users u ON m.author_id = u.id
         WHERE m.reply_to_id = $1
         ORDER BY m.created_at ASC
         LIMIT $2`,
        [messageId, limit]
      );

      const replies = repliesResult.rows.map(this.transformMessage);

      return {
        message: parentMessage,
        replies,
        replyCount: replies.length
      };
    } catch (error) {
      console.error('Error getting message with replies:', error);
      return null;
    }
  }

  // ========================================
  // VOICE MESSAGES
  // ========================================

  async createVoiceMessage(messageId, voiceData) {
    try {
      const id = `vm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await query(
        `INSERT INTO voice_messages (id, message_id, duration_seconds, waveform, file_url, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, messageId, voiceData.durationSeconds, JSON.stringify(voiceData.waveform || []),
         voiceData.fileUrl, voiceData.fileSize]
      );
      return result.rows.length > 0 ? this.transformVoiceMessage(result.rows[0]) : null;
    } catch (error) {
      console.error('Error creating voice message:', error);
      return null;
    }
  }

  async getVoiceMessage(messageId) {
    try {
      const result = await query(
        `SELECT * FROM voice_messages WHERE message_id = $1`,
        [messageId]
      );
      return result.rows.length > 0 ? this.transformVoiceMessage(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting voice message:', error);
      return null;
    }
  }

  transformVoiceMessage(dbVoice) {
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

  // ========================================
  // FORWARD MESSAGES
  // ========================================

  async forwardMessage(originalMessageId, toConversationId, forwardedByUserId) {
    try {
      // Get original message
      const originalResult = await query(
        `SELECT * FROM messages WHERE id = $1`,
        [originalMessageId]
      );

      if (originalResult.rows.length === 0) return null;

      const original = originalResult.rows[0];

      // Create forwarded message
      const result = await query(
        `INSERT INTO messages (conversation_id, author_id, content, message_type, attachments, metadata, forwarded_from)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          toConversationId,
          forwardedByUserId,
          original.content,
          original.message_type,
          original.attachments,
          JSON.stringify({ ...original.metadata, forwarded: true }),
          originalMessageId
        ]
      );

      const forwardedMessage = this.transformMessage(result.rows[0]);

      // Update conversation activity
      await this.updateConversationActivity(toConversationId);

      return forwardedMessage;
    } catch (error) {
      console.error('Error forwarding message:', error);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await query(`
        SELECT
          NOW() as timestamp,
          COUNT(DISTINCT m.id) as message_count,
          COUNT(DISTINCT c.id) as conversation_count,
          COUNT(DISTINCT cp.user_id) as active_users,
          COUNT(DISTINCT mt.id) as thread_count,
          COUNT(DISTINCT ma.id) as attachment_count
        FROM messages m
        FULL OUTER JOIN conversations c ON true
        FULL OUTER JOIN conversation_participants cp ON true
        FULL OUTER JOIN message_threads mt ON true
        FULL OUTER JOIN message_attachments ma ON true
      `);

      return {
        status: 'ok',
        service: 'messaging',
        timestamp: result.rows[0].timestamp,
        messageCount: parseInt(result.rows[0].message_count) || 0,
        conversationCount: parseInt(result.rows[0].conversation_count) || 0,
        activeUsers: parseInt(result.rows[0].active_users) || 0,
        threadCount: parseInt(result.rows[0].thread_count) || 0,
        attachmentCount: parseInt(result.rows[0].attachment_count) || 0
      };
    } catch (error) {
      console.error('Messaging health check failed:', error);
      return {
        status: 'error',
        service: 'messaging',
        error: error.message
      };
    }
  }
}

module.exports = new MessagingAdapter();