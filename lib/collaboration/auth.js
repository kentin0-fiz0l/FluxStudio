/**
 * Collaboration Auth Module
 * JWT verification and project/conversation access checks for WebSocket connections
 *
 * Extracted from server-collaboration.js as part of backend modernization.
 */

const jwt = require('jsonwebtoken');
const db = require('../db');
const { createLogger } = require('../logger');
const log = createLogger('CollabAuth');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Authenticate WebSocket connection using JWT token
 * @param {string} token - JWT token from query params or headers
 * @returns {Object|null} - Decoded user object or null if invalid
 */
function authenticateWebSocket(token) {
  if (!token) {
    log.error('Auth failed: No token provided');
    return null;
  }
  if (!JWT_SECRET) {
    log.error('Auth failed: JWT_SECRET not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    // SECURITY: Never log secrets or full tokens - only log error type
    log.error('JWT verification failed', { errorName: error.name || 'Unknown error' });
    return null;
  }
}

/**
 * Check if user has access to a project
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @returns {Promise<string|null>} - User role in project or null if no access
 */
async function checkProjectAccess(userId, projectId) {
  try {
    const result = await db.query(`
      SELECT role FROM project_members
      WHERE project_id = $1 AND user_id = $2 AND is_active = true
      LIMIT 1
    `, [projectId, userId]);

    return result.rows.length > 0 ? result.rows[0].role : null;
  } catch (error) {
    log.error('Error checking project access', error);
    return null;
  }
}

/**
 * Check if user has access to a conversation
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<boolean>} - Whether user is a member
 */
async function checkConversationAccess(userId, conversationId) {
  try {
    const result = await db.query(`
      SELECT id FROM conversation_members
      WHERE conversation_id = $1 AND user_id = $2
      LIMIT 1
    `, [conversationId, userId]);

    return result.rows.length > 0;
  } catch (error) {
    log.error('Error checking conversation access', error);
    return false;
  }
}

/**
 * Parse room name and determine access type
 * @param {string} roomName - Room name from WebSocket URL
 * @returns {{type: string, projectId?: string, match: RegExpMatchArray|null}}
 */
function parseRoomName(roomName) {
  const docMatch = roomName.match(/^project-([^-]+)-doc-/);
  const formationMatch = roomName.match(/^project-([^-]+)-formation-/);
  const messagingMatch = roomName.match(/^messaging-(.+)$/);

  if (messagingMatch) {
    return { type: 'messaging', match: messagingMatch };
  }
  if (docMatch) {
    return { type: 'document', projectId: docMatch[1], match: docMatch };
  }
  if (formationMatch) {
    return { type: 'formation', projectId: formationMatch[1], match: formationMatch };
  }

  return { type: 'invalid', match: null };
}

module.exports = {
  authenticateWebSocket,
  checkProjectAccess,
  checkConversationAccess,
  parseRoomName,
};
