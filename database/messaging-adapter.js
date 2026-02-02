/**
 * Messaging Database Adapter
 *
 * REFACTORED: This file now re-exports from the modular messaging/ directory.
 * The adapter has been decomposed into smaller, focused modules:
 *
 * - messaging/core.js - Base CRUD operations for messages and conversations
 * - messaging/reactions.js - Reactions and pinned messages
 * - messaging/threads.js - Thread management and replies
 * - messaging/notifications.js - User notifications
 * - messaging/presence.js - Typing status and user presence
 * - messaging/receipts.js - Delivery receipts and read status
 * - messaging/attachments.js - File attachments, voice messages, link previews
 * - messaging/search.js - Search, editing, forwarding, health check
 *
 * For new code, prefer importing from specific modules:
 *   const { addReaction, removeReaction } = require('./database/messaging/reactions');
 *
 * This file maintains backward compatibility for existing code.
 */

module.exports = require('./messaging');
