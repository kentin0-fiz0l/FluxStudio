/**
 * Conversations Core Adapter
 * CRUD operations for conversations
 */

const { query, transaction } = require('../config');
const { v4: uuidv4 } = require('uuid');

function transformConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    name: row.name,
    isGroup: row.is_group,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function transformMember(row) {
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

/**
 * Create a new conversation with initial members
 */
async function createConversation({
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

    const conversation = transformConversation(convResult.rows[0]);

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
 */
async function getConversationsForUser({ userId, limit = 50, offset = 0, projectId = null }) {
  // Build project filter clause
  const projectFilter = projectId
    ? 'AND c.project_id = $4'
    : '';
  const params = projectId
    ? [userId, limit, offset, projectId]
    : [userId, limit, offset];

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
        c.project_id,
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
      ${projectFilter}
      GROUP BY c.id, c.organization_id, c.project_id, c.name, c.is_group, c.created_at, c.updated_at,
               uc.last_read_message_id, uc.member_since
    )
    SELECT *
    FROM conv_stats
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
    LIMIT $2 OFFSET $3
  `, params);

  return result.rows.map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
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
 */
async function getConversationById({ conversationId, userId }) {
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

  const conversation = transformConversation(convResult.rows[0]);

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
 * Update conversation metadata
 */
async function updateConversation({ conversationId, name, isGroup }) {
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
  return transformConversation(result.rows[0]);
}

module.exports = {
  transformConversation,
  transformMember,
  createConversation,
  getConversationsForUser,
  getConversationById,
  updateConversation
};
