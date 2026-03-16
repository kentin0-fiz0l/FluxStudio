/**
 * Messaging Routes - Aggregator
 *
 * Mounts conversation, message, and attachment sub-routers.
 * All endpoints require authentication.
 */

const express = require('express');
const conversations = require('./messaging/conversations');
const messages = require('./messaging/messages');
const attachments = require('./messaging/attachments');

const router = express.Router();

// Reference to messaging Socket.IO namespace (set by server)
let messagingNamespace = null;

/**
 * Set the Socket.IO messaging namespace for real-time events
 */
function setMessagingNamespace(namespace) {
  messagingNamespace = namespace;
}

/**
 * Get the current messaging namespace (used by sub-routers)
 */
function getMessagingNamespace() {
  return messagingNamespace;
}

router.use('/', conversations);
router.use('/', messages);
router.use('/', attachments);

module.exports = router;
module.exports.messagesRouter = messages.messagesRouter;
module.exports.setMessagingNamespace = setMessagingNamespace;
module.exports.getMessagingNamespace = getMessagingNamespace;
