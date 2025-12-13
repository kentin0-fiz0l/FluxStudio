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
    threadRootMessageId = null,
    projectId = null,
    isSystemMessage = false
  }) {
    const messageId = uuidv4();

    // If replying to a message, determine the thread root
    let effectiveThreadRoot = threadRootMessageId;
    if (replyToMessageId && !threadRootMessageId) {
      // Check if the parent message is in a thread
      const parentResult = await query(`
        SELECT id, thread_root_message_id FROM messages WHERE id = $1
      `, [replyToMessageId]);
      if (parentResult.rows.length > 0) {
        const parent = parentResult.rows[0];
        // If parent is in a thread, use its root; otherwise parent becomes the root
        effectiveThreadRoot = parent.thread_root_message_id || parent.id;
      }
    }

    return await transaction(async (client) => {
      // Insert message
      const msgResult = await client.query(`
        INSERT INTO messages (
          id, user_id, conversation_id, text, asset_id,
          reply_to_message_id, thread_root_message_id, project_id, is_system_message, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `, [
        messageId,
        userId,
        conversationId,
        text,
        assetId,
        replyToMessageId,
        effectiveThreadRoot,
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
   * @param {boolean} [params.includeReactions=true] - Include reactions with messages
   * @returns {Array} Array of messages, ordered by created_at DESC
   */
  async listMessages({ conversationId, limit = 50, before = null, includeReactions = true }) {
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
    const messages = result.rows.map(row => this._transformMessage(row));

    // Fetch reactions for all messages if requested
    if (includeReactions && messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      const reactionsMap = await this.listReactionsForMessages({ messageIds });

      // Attach reactions to each message
      for (const message of messages) {
        message.reactions = reactionsMap[message.id] || [];
      }
    }

    return messages;
  }

  /**
   * Search messages across conversations the user has access to
   *
   * @param {Object} params
   * @param {string} params.userId - User performing the search (for membership check)
   * @param {string} params.query - Search term (uses ILIKE for case-insensitive match)
   * @param {string} [params.conversationId] - Optional: scope search to a single conversation
   * @param {number} [params.limit=50] - Max results to return
   * @param {number} [params.offset=0] - Offset for pagination
   * @returns {Array} Array of messages with conversation info
   */
  async searchMessages({ userId, query: searchQuery, conversationId = null, limit = 50, offset = 0 }) {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return [];
    }

    const searchPattern = `%${searchQuery.trim()}%`;
    let queryText;
    let params;

    if (conversationId) {
      // Scoped search: search within a specific conversation (with membership check)
      queryText = `
        SELECT
          m.*,
          u.name as user_name,
          u.avatar_url as user_avatar,
          c.name as conversation_name,
          c.is_group as conversation_is_group
        FROM messages m
        INNER JOIN conversation_members cm
          ON cm.conversation_id = m.conversation_id AND cm.user_id = $1
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN conversations c ON m.conversation_id = c.id
        WHERE m.conversation_id = $2
          AND LOWER(m.text) LIKE LOWER($3)
        ORDER BY m.created_at DESC
        LIMIT $4 OFFSET $5
      `;
      params = [userId, conversationId, searchPattern, limit, offset];
    } else {
      // Global search: search across all conversations the user is a member of
      queryText = `
        SELECT
          m.*,
          u.name as user_name,
          u.avatar_url as user_avatar,
          c.name as conversation_name,
          c.is_group as conversation_is_group
        FROM messages m
        INNER JOIN conversation_members cm
          ON cm.conversation_id = m.conversation_id AND cm.user_id = $1
        LEFT JOIN users u ON m.user_id = u.id
        LEFT JOIN conversations c ON m.conversation_id = c.id
        WHERE LOWER(m.text) LIKE LOWER($2)
        ORDER BY m.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      params = [userId, searchPattern, limit, offset];
    }

    const result = await query(queryText, params);

    return result.rows.map(row => ({
      ...this._transformMessage(row),
      conversationName: row.conversation_name,
      conversationIsGroup: row.conversation_is_group
    }));
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

  // ==================== Reaction Methods ====================

  /**
   * Get a message by ID (helper for reactions and other operations)
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @returns {Object|null} Message with basic fields
   */
  async getMessageById({ messageId }) {
    const result = await query(`
      SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [messageId]);

    if (result.rows.length === 0) return null;
    return this._transformMessage(result.rows[0]);
  }

  /**
   * Add a reaction to a message
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @param {string} params.userId
   * @param {string} params.emoji
   * @returns {Object} Aggregated reactions for the message
   */
  async addReaction({ messageId, userId, emoji }) {
    const id = uuidv4();

    // First get the message to get conversationId and projectId
    const message = await this.getMessageById({ messageId });
    if (!message) {
      throw new Error('Message not found');
    }

    try {
      // Upsert reaction (ignore if already exists)
      await query(`
        INSERT INTO message_reactions (id, message_id, user_id, emoji, conversation_id, project_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (message_id, user_id, emoji) DO NOTHING
      `, [id, messageId, userId, emoji, message.conversationId, message.projectId]);

      // Return aggregated reactions
      return await this.listReactionsForMessage({ messageId });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Remove a reaction from a message
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @param {string} params.userId
   * @param {string} params.emoji
   * @returns {Object} Aggregated reactions for the message
   */
  async removeReaction({ messageId, userId, emoji }) {
    try {
      await query(`
        DELETE FROM message_reactions
        WHERE message_id = $1 AND user_id = $2 AND emoji = $3
      `, [messageId, userId, emoji]);

      // Return aggregated reactions
      return await this.listReactionsForMessage({ messageId });
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  /**
   * List aggregated reactions for a message
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @returns {Object} { messageId, reactions: [{ emoji, count, userIds }] }
   */
  async listReactionsForMessage({ messageId }) {
    const result = await query(`
      SELECT
        emoji,
        COUNT(*) as count,
        array_agg(user_id ORDER BY created_at ASC) as user_ids
      FROM message_reactions
      WHERE message_id = $1
      GROUP BY emoji
      ORDER BY count DESC, emoji ASC
    `, [messageId]);

    return {
      messageId,
      reactions: result.rows.map(row => ({
        emoji: row.emoji,
        count: parseInt(row.count, 10),
        userIds: row.user_ids || []
      }))
    };
  }

  /**
   * List reactions for multiple messages (batch query for efficiency)
   *
   * @param {Object} params
   * @param {string[]} params.messageIds
   * @returns {Object} Map of messageId -> reactions array
   */
  async listReactionsForMessages({ messageIds }) {
    if (!messageIds || messageIds.length === 0) {
      return {};
    }

    const result = await query(`
      SELECT
        message_id,
        emoji,
        COUNT(*) as count,
        array_agg(user_id ORDER BY created_at ASC) as user_ids
      FROM message_reactions
      WHERE message_id = ANY($1)
      GROUP BY message_id, emoji
      ORDER BY message_id, count DESC, emoji ASC
    `, [messageIds]);

    // Group by messageId
    const reactionsMap = {};
    for (const row of result.rows) {
      if (!reactionsMap[row.message_id]) {
        reactionsMap[row.message_id] = [];
      }
      reactionsMap[row.message_id].push({
        emoji: row.emoji,
        count: parseInt(row.count, 10),
        userIds: row.user_ids || []
      });
    }

    return reactionsMap;
  }

  // ==================== Pin Methods ====================

  /**
   * Pin a message in its conversation.
   * If it is already pinned, update pinned_by and pinned_at.
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @param {string} params.userId - User who is pinning the message
   * @returns {Array} Updated list of pinned messages for the conversation
   */
  async pinMessage({ messageId, userId }) {
    const message = await this.getMessageById({ messageId });
    if (!message) return null;

    const id = uuidv4();
    const conversationId = message.conversationId;
    const projectId = message.projectId || null;

    await query(`
      INSERT INTO message_pins (id, message_id, conversation_id, project_id, pinned_by, pinned_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (message_id, conversation_id)
      DO UPDATE SET pinned_by = EXCLUDED.pinned_by, pinned_at = NOW()
    `, [id, messageId, conversationId, projectId, userId]);

    return this.listPinnedMessages({ conversationId, limit: 20 });
  }

  /**
   * Unpin a message in its conversation.
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @returns {Array} Updated list of pinned messages for the conversation
   */
  async unpinMessage({ messageId }) {
    const message = await this.getMessageById({ messageId });
    if (!message) return null;

    const conversationId = message.conversationId;

    await query(
      `DELETE FROM message_pins WHERE message_id = $1 AND conversation_id = $2`,
      [messageId, conversationId]
    );

    return this.listPinnedMessages({ conversationId, limit: 20 });
  }

  /**
   * List pinned messages for a conversation.
   * Returns basic message info plus pin metadata.
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {number} [params.limit=20]
   * @returns {Array} Array of pinned messages with pin metadata
   */
  async listPinnedMessages({ conversationId, limit = 20 }) {
    const result = await query(`
      SELECT
        mp.id as pin_id,
        mp.pinned_by,
        mp.pinned_at,
        m.*,
        u.name as user_name,
        u.avatar_url as user_avatar
      FROM message_pins mp
      JOIN messages m ON m.id = mp.message_id
      LEFT JOIN users u ON m.user_id = u.id
      WHERE mp.conversation_id = $1
      ORDER BY mp.pinned_at DESC
      LIMIT $2
    `, [conversationId, limit]);

    return result.rows.map(row => ({
      pinId: row.pin_id,
      pinnedBy: row.pinned_by,
      pinnedAt: row.pinned_at,
      message: this._transformMessage(row),
    }));
  }

  /**
   * Check if a message is pinned
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @returns {boolean} True if the message is pinned
   */
  async isMessagePinned({ messageId }) {
    const result = await query(
      `SELECT id FROM message_pins WHERE message_id = $1 LIMIT 1`,
      [messageId]
    );
    return result.rows.length > 0;
  }

  // ==================== Message Edit Methods ====================

  /**
   * Edit a message (only the author can edit their own messages)
   *
   * @param {Object} params
   * @param {string} params.messageId
   * @param {string} params.userId - Must be the message author
   * @param {string} params.content - New message content
   * @returns {Object|null} Updated message or null if not found/unauthorized
   */
  async editMessage({ messageId, userId, content }) {
    // First verify the message exists and belongs to this user
    const message = await this.getMessageById({ messageId });
    if (!message) {
      return null;
    }

    if (message.userId !== userId) {
      throw new Error('Unauthorized: You can only edit your own messages');
    }

    // Update the message content and set edited_at timestamp
    const result = await query(`
      UPDATE messages
      SET text = $1, edited_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [content, messageId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    // Fetch the full message with user info
    return this.getMessageById({ messageId });
  }

  // ==================== Message Forward Methods ====================

  /**
   * Forward a message to another conversation.
   *
   * - Only allowed if user is a member of BOTH source and target conversations
   * - Copies content; sets original_message_id on the new row
   *
   * @param {Object} params
   * @param {string} params.messageId - ID of the message to forward
   * @param {string} params.sourceConversationId - Source conversation ID
   * @param {string} params.targetConversationId - Target conversation ID
   * @param {string} params.userId - User doing the forwarding
   * @returns {Object|null} The newly created forwarded message, or null if failed
   */
  async forwardMessage({ messageId, sourceConversationId, targetConversationId, userId }) {
    // 1. Fetch the original message (ensure it belongs to sourceConversationId)
    const original = await this.getMessageById({ messageId });
    if (!original || original.conversationId !== sourceConversationId) {
      return null;
    }

    // 2. Verify user membership in BOTH conversations
    const [sourceConv, targetConv] = await Promise.all([
      this.getConversationById({ conversationId: sourceConversationId, userId }),
      this.getConversationById({ conversationId: targetConversationId, userId }),
    ]);
    if (!sourceConv || !targetConv) {
      return null;
    }

    // 3. Insert a new message in target conversation
    const newMessageId = uuidv4();

    return await transaction(async (client) => {
      const result = await client.query(`
        INSERT INTO messages (
          id, conversation_id, project_id, user_id,
          text, asset_id, is_system_message, original_message_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, NOW())
        RETURNING *
      `, [
        newMessageId,
        targetConversationId,
        original.projectId || null,
        userId,
        original.text,
        original.assetId || null,
        original.id
      ]);

      if (!result.rows[0]) return null;

      // Update target conversation's updated_at
      await client.query(`
        UPDATE conversations SET updated_at = NOW() WHERE id = $1
      `, [targetConversationId]);

      // Update sender's last_read_message_id in target conversation
      await client.query(`
        UPDATE conversation_members
        SET last_read_message_id = $1
        WHERE conversation_id = $2 AND user_id = $3
      `, [newMessageId, targetConversationId, userId]);

      // Transform and return with user info
      const row = result.rows[0];
      return this._transformMessage(row);
    });
  }

  // ==================== Notification Methods ====================

  /**
   * Create a notification for a user (v2 with enhanced fields)
   *
   * @param {Object} params
   * @param {string} params.userId - Recipient user ID
   * @param {string} params.type - Notification type: 'mention' | 'reply' | 'thread_reply' | 'file_shared'
   * @param {string} params.title - Short notification title
   * @param {string} [params.body] - Optional longer description
   * @param {string} [params.actorUserId] - User who triggered the notification
   * @param {string} [params.conversationId] - For deep linking to conversation
   * @param {string} [params.messageId] - For deep linking to message
   * @param {string} [params.threadRootMessageId] - For opening thread panel
   * @param {string} [params.assetId] - For file_shared notifications
   * @param {Object} [params.metadata] - Additional metadata
   * @param {string} [params.entityId] - Legacy: related entity ID
   * @returns {Object} Created notification
   */
  async createNotification({
    userId,
    type,
    title,
    body = null,
    actorUserId = null,
    conversationId = null,
    messageId = null,
    threadRootMessageId = null,
    assetId = null,
    metadata = {},
    entityId = null
  }) {
    const id = uuidv4();

    const result = await query(`
      INSERT INTO notifications (
        id, user_id, type, entity_id, title, body, is_read, created_at,
        actor_user_id, conversation_id, message_id, thread_root_message_id, asset_id, metadata_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW(), $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id, userId, type, entityId, title, body,
      actorUserId, conversationId, messageId, threadRootMessageId, assetId,
      JSON.stringify(metadata)
    ]);

    return this._transformNotification(result.rows[0]);
  }

  /**
   * List notifications for a user with actor info
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {number} [params.limit=20]
   * @param {number} [params.offset=0]
   * @param {boolean} [params.onlyUnread=false]
   * @returns {Array} Array of notifications with actor details
   */
  async listNotifications({ userId, limit = 20, offset = 0, onlyUnread = false }) {
    const whereClause = onlyUnread
      ? 'WHERE n.user_id = $1 AND n.is_read = FALSE'
      : 'WHERE n.user_id = $1';

    const queryText = `
      SELECT
        n.*,
        u.id as actor_id,
        u.name as actor_name,
        u.email as actor_email,
        u.avatar_url as actor_avatar
      FROM notifications n
      LEFT JOIN users u ON n.actor_user_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(queryText, [userId, limit, offset]);
    return result.rows.map(row => this._transformNotification(row));
  }

  /**
   * Mark a notification as read
   *
   * @param {Object} params
   * @param {string} params.notificationId
   * @param {string} params.userId - Must own the notification
   * @returns {Object|null} Updated notification or null if not found
   */
  async markNotificationRead({ notificationId, userId }) {
    const result = await query(`
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [notificationId, userId]);

    return result.rows[0] ? this._transformNotification(result.rows[0]) : null;
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
      SET is_read = TRUE, read_at = NOW()
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

  // ==================== User Helpers ====================

  /**
   * Get user by ID (for typing indicators, etc.)
   *
   * @param {string} userId
   * @returns {Object|null} User object with id, name, email, avatar_url
   */
  async getUserById(userId) {
    if (!userId) return null;
    const result = await query(`
      SELECT id, name, email, avatar_url
      FROM users
      WHERE id = $1
    `, [userId]);
    return result.rows[0] || null;
  }

  // ==================== Read State Helpers ====================

  /**
   * Get read states for all members of a conversation
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @returns {Array} Array of { userId, userName, avatarUrl, lastReadMessageId }
   */
  async getConversationReadStates({ conversationId }) {
    const result = await query(`
      SELECT
        cm.user_id,
        cm.last_read_message_id,
        u.name as user_name,
        u.avatar_url
      FROM conversation_members cm
      LEFT JOIN users u ON cm.user_id = u.id
      WHERE cm.conversation_id = $1
    `, [conversationId]);

    return result.rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      avatarUrl: row.avatar_url,
      lastReadMessageId: row.last_read_message_id
    }));
  }

  /**
   * Update the last read message for a user in a conversation
   * (enhanced version of setLastRead with timestamp)
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.userId
   * @param {string} params.messageId
   * @returns {Object} Updated read state
   */
  async updateReadState({ conversationId, userId, messageId }) {
    const result = await query(`
      UPDATE conversation_members
      SET last_read_message_id = $1
      WHERE conversation_id = $2 AND user_id = $3
      RETURNING *
    `, [messageId, conversationId, userId]);

    if (result.rows.length === 0) return null;

    // Get user info
    const userResult = await query(`
      SELECT name, avatar_url FROM users WHERE id = $1
    `, [userId]);
    const userInfo = userResult.rows[0] || {};

    return {
      userId,
      userName: userInfo.name,
      avatarUrl: userInfo.avatar_url,
      lastReadMessageId: messageId,
      conversationId
    };
  }

  // ==================== Thread Helpers ====================

  /**
   * List messages in a thread
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.threadRootMessageId
   * @param {string} params.userId - For membership verification
   * @param {number} [params.limit=50]
   * @returns {Object} { rootMessage, messages, replyCount }
   */
  async listThreadMessages({ conversationId, threadRootMessageId, userId, limit = 50 }) {
    // Verify membership
    const memberCheck = await query(`
      SELECT 1 FROM conversation_members
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);
    if (memberCheck.rows.length === 0) return null;

    // Get root message
    const rootResult = await query(`
      SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = $1 AND m.conversation_id = $2
    `, [threadRootMessageId, conversationId]);

    if (rootResult.rows.length === 0) return null;
    const rootMessage = this._transformMessage(rootResult.rows[0]);

    // Get thread replies
    const repliesResult = await query(`
      SELECT m.*, u.name as user_name, u.avatar_url as user_avatar
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.conversation_id = $1
        AND (m.thread_root_message_id = $2 OR m.reply_to_message_id = $2)
        AND m.id != $2
      ORDER BY m.created_at ASC
      LIMIT $3
    `, [conversationId, threadRootMessageId, limit]);

    const messages = repliesResult.rows.map(row => this._transformMessage(row));

    // Get reply count
    const countResult = await query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE conversation_id = $1
        AND (thread_root_message_id = $2 OR reply_to_message_id = $2)
        AND id != $2
    `, [conversationId, threadRootMessageId]);

    return {
      rootMessage,
      messages,
      replyCount: parseInt(countResult.rows[0].count, 10) || 0
    };
  }

  /**
   * Get thread summary for a message
   *
   * @param {Object} params
   * @param {string} params.conversationId
   * @param {string} params.threadRootMessageId
   * @returns {Object} { replyCount, lastReplyAt, participants }
   */
  async getThreadSummary({ conversationId, threadRootMessageId }) {
    const result = await query(`
      SELECT
        COUNT(*) as reply_count,
        MAX(m.created_at) as last_reply_at,
        ARRAY_AGG(DISTINCT m.user_id) as participant_ids
      FROM messages m
      WHERE m.conversation_id = $1
        AND (m.thread_root_message_id = $2 OR m.reply_to_message_id = $2)
        AND m.id != $2
    `, [conversationId, threadRootMessageId]);

    const row = result.rows[0];
    const participantIds = row.participant_ids?.filter(id => id) || [];

    // Get participant info
    let participants = [];
    if (participantIds.length > 0) {
      const usersResult = await query(`
        SELECT id, name, avatar_url
        FROM users
        WHERE id = ANY($1)
      `, [participantIds]);
      participants = usersResult.rows.map(u => ({
        userId: u.id,
        userName: u.name,
        avatarUrl: u.avatar_url
      }));
    }

    return {
      replyCount: parseInt(row.reply_count, 10) || 0,
      lastReplyAt: row.last_reply_at,
      participants
    };
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

  // ==================== Asset Helpers ====================

  /**
   * Get asset info for a message by asset ID
   * Returns file details needed for message rendering
   *
   * @param {string} assetId
   * @returns {Object|null} Asset info with file details
   */
  async getAssetById(assetId) {
    if (!assetId) return null;

    const result = await query(`
      SELECT
        a.id,
        a.name,
        a.kind,
        a.owner_id,
        a.organization_id,
        a.description,
        a.created_at,
        f.id as file_id,
        f.name as file_name,
        f.original_name as file_original_name,
        f.mime_type,
        f.size as size_bytes,
        f.file_url,
        f.thumbnail_url,
        f.storage_key
      FROM assets a
      LEFT JOIN files f ON a.primary_file_id = f.id
      WHERE a.id = $1 AND a.status = 'active'
    `, [assetId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      ownerId: row.owner_id,
      organizationId: row.organization_id,
      description: row.description,
      createdAt: row.created_at,
      file: {
        id: row.file_id,
        name: row.file_name,
        originalName: row.file_original_name,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        url: row.file_url,
        thumbnailUrl: row.thumbnail_url,
        storageKey: row.storage_key
      }
    };
  }

  /**
   * Hydrate messages with asset info
   * @param {Array} messages - Array of message objects
   * @returns {Array} Messages with asset info populated
   */
  async hydrateMessagesWithAssets(messages) {
    if (!messages || messages.length === 0) return messages;

    // Collect all asset IDs
    const assetIds = [...new Set(
      messages
        .filter(m => m.assetId)
        .map(m => m.assetId)
    )];

    if (assetIds.length === 0) return messages;

    // Batch fetch asset info
    const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(',');
    const assetsResult = await query(`
      SELECT
        a.id,
        a.name,
        a.kind,
        a.owner_id,
        a.organization_id,
        a.description,
        a.created_at,
        f.id as file_id,
        f.name as file_name,
        f.original_name as file_original_name,
        f.mime_type,
        f.size as size_bytes,
        f.file_url,
        f.thumbnail_url,
        f.storage_key
      FROM assets a
      LEFT JOIN files f ON a.primary_file_id = f.id
      WHERE a.id IN (${placeholders}) AND a.status = 'active'
    `, assetIds);

    // Build asset map
    const assetMap = {};
    for (const row of assetsResult.rows) {
      assetMap[row.id] = {
        id: row.id,
        name: row.name,
        kind: row.kind,
        ownerId: row.owner_id,
        organizationId: row.organization_id,
        description: row.description,
        createdAt: row.created_at,
        file: {
          id: row.file_id,
          name: row.file_name,
          originalName: row.file_original_name,
          mimeType: row.mime_type,
          sizeBytes: row.size_bytes,
          url: row.file_url,
          thumbnailUrl: row.thumbnail_url,
          storageKey: row.storage_key
        }
      };
    }

    // Attach asset info to messages
    return messages.map(message => ({
      ...message,
      asset: message.assetId ? assetMap[message.assetId] || null : null
    }));
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
      threadRootMessageId: row.thread_root_message_id || null,
      projectId: row.project_id,
      isSystemMessage: row.is_system_message,
      createdAt: row.created_at,
      editedAt: row.edited_at || null,
      originalMessageId: row.original_message_id || null,
      // Optional user info from JOIN
      userName: row.user_name || null,
      userAvatar: row.user_avatar || null
    };
  }

  _transformNotification(row) {
    if (!row) return null;
    const notification = {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      entityId: row.entity_id,
      title: row.title,
      body: row.body,
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
      // New v2 fields
      actorUserId: row.actor_user_id,
      conversationId: row.conversation_id,
      messageId: row.message_id,
      threadRootMessageId: row.thread_root_message_id,
      assetId: row.asset_id,
      metadata: row.metadata_json || {}
    };

    // Include actor details if joined from users table
    if (row.actor_id) {
      notification.actor = {
        id: row.actor_id,
        name: row.actor_name,
        email: row.actor_email,
        avatarUrl: row.actor_avatar
      };
    }

    return notification;
  }
}

module.exports = new MessagingConversationsAdapter();
