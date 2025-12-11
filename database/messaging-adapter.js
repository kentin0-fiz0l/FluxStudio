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