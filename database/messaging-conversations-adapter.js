/**
 * Messaging Conversations & Notifications Adapter - FluxStudio
 *
 * Provides database operations for:
 * - Conversations (top-level threads, group/DM)
 * - Conversation members (participants, read state)
 * - Messages (with conversation threading, attachments, system messages)
 * - Notifications (stored alerts for users)
 *
 * Uses tables from Migration 037:
 * - conversations
 * - conversation_members
 * - messages (extended columns)
 * - notifications
 */

const { query, transaction } = require('./config');
const { v4: uuidv4 } = require('uuid');

class MessagingConversationsAdapter {
  // ==================== Conversation Methods ====================

  /**
   * Create a new conversation with initial members
   *
   * @param {Object} params
   * @param {string} [params.organizationId] - Organization scope
   * @param {string} [params.name] - Conversation name (for groups)
   * @param {boolean} [params.isGroup=false] - Group vs DM
   * @param {string} params.creatorUserId - User creating the conversation
   * @param {string[]} [params.memberUserIds=[]] - Additional members to add
   * @returns {Object} Created conversation with members array
   */
  async createConversation({
    organizationId = null,
    name = null,
    isGroup = false,
    creatorUserId,
    memberUserIds = []
  }) {
    const conversationId = uuidv4();

    return await transaction(async (client) => {
      // Insert conversation
      const convResult = await client.query(`
        INSERT INTO conversations (id, organization_id, name, is_group, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `, [conversationId, organizationId, name, isGroup]);

      const conversation = this._transformConversation(convResult.rows[0]);

      // Insert creator as owner
      const creatorMemberId = uuidv4();
      await client.query(`
        INSERT INTO conversation_members (id, conversation_id, user_id, role, created_at)
        VALUES ($1, $2, $3, 'owner', NOW())
      `, [creatorMemberId, conversationId, creatorUserId]);

      const members = [{
        id: creatorMemberId,
        conversationId,
        userId: creatorUserId,
        role: 'owner',
        lastReadMessageId: null
      }];

      // Insert additional members (skip duplicates and creator)
      const uniqueMembers = [...new Set(memberUserIds)].filter(id => id !== creatorUserId);
      for (const userId of uniqueMembers) {
        const memberId = uuidv4();
        await client.query(`
          INSERT INTO conversation_members (id, conversation_id, user_id, role, created_at)
          VALUES ($1, $2, $3, 'member', NOW())
        `, [memberId, conversationId, userId]);

        members.push({
          id: memberId,
          conversationId,
          userId,
          role: 'member',
          lastReadMessageId: null
        });
      }

      return { ...conversation, members };
    });
  }

  /**
   * Get conversations for a user with last message info and unread counts
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {number} [params.limit=50]
   * @param {number} [params.offset=0]
   * @returns {Array} Array of conversations with metadata
   */
  async getConversationsForUser({ userId, limit = 50, offset = 0 }) {
    const result = await query(`
      WITH user_convs AS (
        SELECT
          cm.conversation_id,
          cm.last_read_message_id,
          cm.created_at as member_since
        FROM conversation_members cm
        WHERE cm.user_id = $1
      ),
      conv_stats AS (
        SELECT
          c.id,
          c.organization_id,
          c.name,
          c.is_group,
          c.created_at,
          c.updated_at,
          uc.last_read_message_id,
          uc.member_since,
          MAX(m.created_at) as last_message_at,
          (
            SELECT SUBSTRING(m2.text, 1, 100)
            FROM messages m2
            WHERE m2.conversation_id = c.id
            ORDER BY m2.created_at DESC
            LIMIT 1
          ) as last_message_preview,
          COUNT(
            CASE
              WHEN m.id IS NOT NULL AND (
                uc.last_read_message_id IS NULL
                OR m.created_at > (
                  SELECT created_at FROM messages WHERE id = uc.last_read_message_id
                )
              ) THEN 1
            END
          ) as unread_count
        FROM conversations c
        INNER JOIN user_convs uc ON c.id = uc.conversation_id
        LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id, c.organization_id, c.name, c.is_group, c.created_at, c.updated_at,
                 uc.last_read_message_id, uc.member_since
      )
      SELECT *
      FROM conv_stats
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows.map(row => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      isGroup: row.is_group,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview,
      unreadCount: parseInt(row.unread_count, 10) || 0,
      memberSince: row.member_since
    }));
  }

  /**
   * Get a single conversation by ID (with membership check)
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.userId - Must be a member
   * @returns {Object|null} Conversation with members, or null if not found/not a member
   */
  async getConversationById({ conversationId, userId }) {
    // First check membership
    const memberCheck = await query(`
      SELECT cm.id FROM conversation_members cm
      WHERE cm.conversation_id = $1 AND cm.user_id = $2
    `, [conversationId, userId]);

    if (memberCheck.rows.length === 0) {
      return null; // User is not a member
    }

    // Get conversation
    const convResult = await query(`
      SELECT * FROM conversations WHERE id = $1
    `, [conversationId]);

    if (convResult.rows.length === 0) {
      return null;
    }

    const conversation = this._transformConversation(convResult.rows[0]);

    // Get all members
    const membersResult = await query(`
      SELECT
        cm.id,
        cm.conversation_id,
        cm.user_id,
        cm.role,
        cm.last_read_message_id,
        cm.created_at,
        u.name as user_name,
        u.email as user_email
      FROM conversation_members cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id = $1
      ORDER BY cm.created_at ASC
    `, [conversationId]);

    conversation.members = membersResult.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      role: row.role,
      lastReadMessageId: row.last_read_message_id,
      createdAt: row.created_at,
      userName: row.user_name,
      userEmail: row.user_email
    }));

    return conversation;
  }

  /**
   * Add a member to a conversation
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.userId
   * @param {string} [params.role='member']
   * @returns {Object} The new member row
   */
  async addMember({ conversationId, userId, role = 'member' }) {
    const id = uuidv4();

    try {
      const result = await query(`
        INSERT INTO conversation_members (id, conversation_id, user_id, role, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (conversation_id, user_id) DO NOTHING
        RETURNING *
      `, [id, conversationId, userId, role]);

      if (result.rows.length === 0) {
        // Already a member, fetch existing
        const existing = await query(`
          SELECT * FROM conversation_members
          WHERE conversation_id = $1 AND user_id = $2
        `, [conversationId, userId]);
        return this._transformMember(existing.rows[0]);
      }

      return this._transformMember(result.rows[0]);
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  /**
   * Remove a member from a conversation
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.userId
   * @returns {boolean} True if removed
   */
  async removeMember({ conversationId, userId }) {
    const result = await query(`
      DELETE FROM conversation_members
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);

    return result.rowCount > 0;
  }

  /**
   * Update conversation metadata
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} [params.name]
   * @param {boolean} [params.isGroup]
   * @returns {Object} Updated conversation
   */
  async updateConversation({ conversationId, name, isGroup }) {
    const setClauses = ['updated_at = NOW()'];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (isGroup !== undefined) {
      setClauses.push(`is_group = $${paramIndex}`);
      params.push(isGroup);
      paramIndex++;
    }

    params.push(conversationId);

    const result = await query(`
      UPDATE conversations
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformConversation(result.rows[0]);
  }

  /**
   * Set last read message for a user in a conversation
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.userId
   * @param {string} params.messageId
   * @returns {boolean} True if updated
   */
  async setLastRead({ conversationId, userId, messageId }) {
    const result = await query(`
      UPDATE conversation_members
      SET last_read_message_id = $1
      WHERE conversation_id = $2 AND user_id = $3
    `, [messageId, conversationId, userId]);

    return result.rowCount > 0;
  }

  // ==================== Message Methods ====================

  /**
   * Create a new message in a conversation
   *
   * Assumes messages table has: id, user_id, text, created_at,
   * plus new columns: conversation_id, reply_to_message_id, asset_id,
   * project_id, is_system_message
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.userId
   * @param {string} params.text
   * @param {string} [params.assetId]
   * @param {string} [params.replyToMessageId]
   * @param {string} [params.projectId]
   * @param {boolean} [params.isSystemMessage=false]
   * @returns {Object} Created message
   */
  async createMessage({
    conversationId,
    userId,
    text,
    assetId = null,
    replyToMessageId = null,
    projectId = null,
    isSystemMessage = false
  }) {
    const messageId = uuidv4();

    return await transaction(async (client) => {
      // Insert message
      const msgResult = await client.query(`
        INSERT INTO messages (
          id, user_id, conversation_id, text, asset_id,
          reply_to_message_id, project_id, is_system_message, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `, [
        messageId,
        userId,
        conversationId,
        text,
        assetId,
        replyToMessageId,
        projectId,
        isSystemMessage
      ]);

      // Update conversation updated_at
      await client.query(`
        UPDATE conversations SET updated_at = NOW() WHERE id = $1
      `, [conversationId]);

      // Update sender's last_read_message_id to this message
      await client.query(`
        UPDATE conversation_members
        SET last_read_message_id = $1
        WHERE conversation_id = $2 AND user_id = $3
      `, [messageId, conversationId, userId]);

      return this._transformMessage(msgResult.rows[0]);
    });
  }

  /**
   * List messages in a conversation with cursor-based pagination
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {number} [params.limit=50]
   * @param {string} [params.before] - Message ID to fetch messages before
   * @returns {Array} Array of messages, ordered by created_at DESC
   */
  async listMessages({ conversationId, limit = 50, before = null }) {
    let queryText;
    let params;

    if (before) {
      queryText = `
        SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.conversation_id = $1
          AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
        ORDER BY m.created_at DESC
        LIMIT $3
      `;
      params = [conversationId, before, limit];
    } else {
      queryText = `
        SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2
      `;
      params = [conversationId, limit];
    }

    const result = await query(queryText, params);
    return result.rows.map(row => this._transformMessage(row));
  }

  /**
   * Delete a message (hard delete, restricted to author)
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @param {string} params.userId - Must be the author
   * @returns {boolean} True if deleted
   */
  async deleteMessage({ messageId, userId }) {
    const result = await query(`
      DELETE FROM messages
      WHERE id = $1 AND user_id = $2
    `, [messageId, userId]);

    return result.rowCount > 0;
  }

  /**
   * Get unread counts for all conversations a user is in
   *
   * @param {Object} params
   * @param {string} params.userId
   * @returns {Array} Array of { conversationId, unreadCount }
   */
  async getUnreadCountForUser({ userId }) {
    const result = await query(`
      SELECT
        cm.conversation_id,
        COUNT(
          CASE
            WHEN m.id IS NOT NULL AND (
              cm.last_read_message_id IS NULL
              OR m.created_at > (
                SELECT created_at FROM messages WHERE id = cm.last_read_message_id
              )
            ) THEN 1
          END
        ) as unread_count
      FROM conversation_members cm
      LEFT JOIN messages m ON m.conversation_id = cm.conversation_id
      WHERE cm.user_id = $1
      GROUP BY cm.conversation_id
    `, [userId]);

    return result.rows.map(row => ({
      conversationId: row.conversation_id,
      unreadCount: parseInt(row.unread_count, 10) || 0
    }));
  }

  // ==================== Notification Methods ====================

  /**
   * Create a notification for a user
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.type - Notification type (e.g., 'message', 'mention', 'task_assigned')
   * @param {string} [params.entityId] - Related entity ID
   * @param {string} params.title
   * @param {string} [params.body]
   * @returns {Object} Created notification
   */
  async createNotification({ userId, type, entityId = null, title, body = null }) {
    const id = uuidv4();

    const result = await query(`
      INSERT INTO notifications (id, user_id, type, entity_id, title, body, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
      RETURNING *
    `, [id, userId, type, entityId, title, body]);

    return this._transformNotification(result.rows[0]);
  }

  /**
   * List notifications for a user
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {number} [params.limit=50]
   * @param {number} [params.offset=0]
   * @param {boolean} [params.onlyUnread=false]
   * @returns {Array} Array of notifications
   */
  async listNotifications({ userId, limit = 50, offset = 0, onlyUnread = false }) {
    let queryText;
    let params;

    if (onlyUnread) {
      queryText = `
        SELECT * FROM notifications
        WHERE user_id = $1 AND is_read = FALSE
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
    } else {
      queryText = `
        SELECT * FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
    }

    params = [userId, limit, offset];
    const result = await query(queryText, params);
    return result.rows.map(row => this._transformNotification(row));
  }

  /**
   * Mark a notification as read
   *
   * @param {Object} params
   * @param {string} params.notificationId
   * @param {string} params.userId - Must own the notification
   * @returns {boolean} True if updated
   */
  async markNotificationRead({ notificationId, userId }) {
    const result = await query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);

    return result.rowCount > 0;
  }

  /**
   * Mark all notifications as read for a user
   *
   * @param {Object} params
   * @param {string} params.userId
   * @returns {number} Number of notifications marked read
   */
  async markAllNotificationsRead({ userId }) {
    const result = await query(`
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
    `, [userId]);

    return result.rowCount;
  }

  /**
   * Get unread notification count for a user
   *
   * @param {Object} params
   * @param {string} params.userId
   * @returns {number} Unread count
   */
  async getUnreadNotificationCount({ userId }) {
    const result = await query(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `, [userId]);

    return parseInt(result.rows[0].count, 10) || 0;
  }

  // ==================== Transform Helpers ====================

  _transformConversation(row) {
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      isGroup: row.is_group,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _transformMember(row) {
    if (!row) return null;
    return {
      id: row.id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      role: row.role,
      lastReadMessageId: row.last_read_message_id,
      createdAt: row.created_at
    };
  }

  _transformMessage(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      text: row.text,
      assetId: row.asset_id,
      replyToMessageId: row.reply_to_message_id,
      projectId: row.project_id,
      isSystemMessage: row.is_system_message,
      createdAt: row.created_at,
      // Optional user info from JOIN
      userName: row.user_name || null,
      userAvatar: row.user_avatar || null
    };
  }

  _transformNotification(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      entityId: row.entity_id,
      title: row.title,
      body: row.body,
      isRead: row.is_read,
      createdAt: row.created_at
    };
  }
}

module.exports = new MessagingConversationsAdapter();
