/**
 * Collaboration Awareness Module
 * Awareness protocol handling and state validation
 *
 * Extracted from server-collaboration.js as part of backend modernization.
 */

const { createLogger } = require('../logger');
const log = createLogger('CollabAwareness');

/**
 * Validate awareness state data from clients
 * Prevents malicious data injection and ensures data integrity
 * @param {Object} state - Awareness state to validate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
function validateAwarenessState(state) {
  if (!state || typeof state !== 'object') {
    return { valid: true }; // Empty state is valid (disconnect)
  }

  // Validate user object
  if (state.user !== undefined) {
    if (typeof state.user !== 'object' || state.user === null) {
      return { valid: false, reason: 'user must be an object' };
    }
    if (state.user.id !== undefined && (typeof state.user.id !== 'string' || state.user.id.length > 100)) {
      return { valid: false, reason: 'user.id must be string <= 100 chars' };
    }
    if (state.user.name !== undefined && (typeof state.user.name !== 'string' || state.user.name.length > 100)) {
      return { valid: false, reason: 'user.name must be string <= 100 chars' };
    }
    if (state.user.color !== undefined) {
      if (typeof state.user.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(state.user.color)) {
        return { valid: false, reason: 'user.color must be valid hex color' };
      }
    }
  }

  // Validate cursor
  if (state.cursor !== undefined && state.cursor !== null) {
    if (typeof state.cursor !== 'object') {
      return { valid: false, reason: 'cursor must be object or null' };
    }
    if (typeof state.cursor.x !== 'number' || state.cursor.x < -10 || state.cursor.x > 110) {
      return { valid: false, reason: 'cursor.x must be number in range -10 to 110' };
    }
    if (typeof state.cursor.y !== 'number' || state.cursor.y < -10 || state.cursor.y > 110) {
      return { valid: false, reason: 'cursor.y must be number in range -10 to 110' };
    }
    if (state.cursor.timestamp !== undefined) {
      const now = Date.now();
      const dayAgo = now - 86400000;
      const minuteFuture = now + 60000;
      if (typeof state.cursor.timestamp !== 'number' || state.cursor.timestamp < dayAgo || state.cursor.timestamp > minuteFuture) {
        return { valid: false, reason: 'cursor.timestamp must be within valid range' };
      }
    }
  }

  // Validate selectedPerformerIds
  if (state.selectedPerformerIds !== undefined) {
    if (!Array.isArray(state.selectedPerformerIds)) {
      return { valid: false, reason: 'selectedPerformerIds must be array' };
    }
    if (state.selectedPerformerIds.length > 100) {
      return { valid: false, reason: 'selectedPerformerIds max 100 items' };
    }
    for (const id of state.selectedPerformerIds) {
      if (typeof id !== 'string' || id.length > 100) {
        return { valid: false, reason: 'selectedPerformerIds items must be strings <= 100 chars' };
      }
    }
  }

  // Validate draggingPerformerId
  if (state.draggingPerformerId !== undefined && state.draggingPerformerId !== null) {
    if (typeof state.draggingPerformerId !== 'string' || state.draggingPerformerId.length > 100) {
      return { valid: false, reason: 'draggingPerformerId must be string <= 100 chars or null' };
    }
  }

  // Validate activeKeyframeId
  if (state.activeKeyframeId !== undefined && state.activeKeyframeId !== null) {
    if (typeof state.activeKeyframeId !== 'string' || state.activeKeyframeId.length > 100) {
      return { valid: false, reason: 'activeKeyframeId must be string <= 100 chars or null' };
    }
  }

  // Validate isActive
  if (state.isActive !== undefined && typeof state.isActive !== 'boolean') {
    return { valid: false, reason: 'isActive must be boolean' };
  }

  // Validate lastActivity
  if (state.lastActivity !== undefined) {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const minuteFuture = now + 60000;
    if (typeof state.lastActivity !== 'number' || state.lastActivity < dayAgo || state.lastActivity > minuteFuture) {
      return { valid: false, reason: 'lastActivity must be valid timestamp' };
    }
  }

  // Check for suspicious oversized state (prevent DoS)
  const stateSize = JSON.stringify(state).length;
  if (stateSize > 10000) { // 10KB max
    return { valid: false, reason: 'awareness state too large (max 10KB)' };
  }

  return { valid: true };
}

module.exports = {
  validateAwarenessState,
};
