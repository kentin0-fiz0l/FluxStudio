/**
 * Messaging Conversations & Notifications Adapter - FluxStudio
 *
 * REFACTORED: This file now re-exports from the modular conversations/ directory.
 * The adapter has been decomposed into smaller, focused modules:
 *
 * - conversations/core.js - Conversation CRUD operations
 * - conversations/members.js - Member management and read states
 * - conversations/messages.js - Message CRUD, search, edit, forward
 * - conversations/reactions.js - Message reactions
 * - conversations/pins.js - Pinned messages
 * - conversations/notifications.js - User notifications
 * - conversations/threads.js - Thread listing and summaries
 * - conversations/assets.js - Asset retrieval and hydration
 *
 * For new code, prefer importing from specific modules:
 *   const { addReaction, removeReaction } = require('./database/conversations/reactions');
 *
 * This file maintains backward compatibility for existing code.
 */

module.exports = require('./conversations');
