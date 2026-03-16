/**
 * requireConversationAccess Middleware
 *
 * Verifies that the authenticated user is a participant in the conversation.
 *
 * Usage:
 *   router.get('/:conversationId/messages', authenticateToken, requireConversationAccess(), handler);
 *   router.get('/:id/messages', authenticateToken, requireConversationAccess('id'), handler);
 *
 * The param name defaults to 'conversationId'. Pass a different name if the route
 * uses a different parameter (e.g. 'id').
 */

const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('Auth:ConversationAccess');

/**
 * Check if a user is a participant in a conversation.
 */
async function canUserAccessConversation(userId, conversationId) {
  try {
    const result = await query(`
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2
    `, [conversationId, userId]);
    return result.rows.length > 0;
  } catch (error) {
    log.error('Error checking conversation access', error);
    return false;
  }
}

/**
 * Express middleware factory.
 * @param {string} [paramName='conversationId'] - Route param holding the conversation ID.
 *   Also checks 'id' as a fallback if the specified param is not found.
 */
function requireConversationAccess(paramName = 'conversationId') {
  return async (req, res, next) => {
    const conversationId = req.params[paramName] || req.params.id;
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID is required',
        code: 'CONVERSATION_ID_REQUIRED'
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasAccess = await canUserAccessConversation(userId, conversationId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this conversation',
        code: 'CONVERSATION_ACCESS_DENIED'
      });
    }

    next();
  };
}

module.exports = { requireConversationAccess, canUserAccessConversation };
