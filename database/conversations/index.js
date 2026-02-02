/**
 * Messaging Conversations Adapter - Index
 * Re-exports all conversation modules for backward compatibility
 */

const core = require('./core');
const members = require('./members');
const messages = require('./messages');
const reactions = require('./reactions');
const pins = require('./pins');
const notifications = require('./notifications');
const threads = require('./threads');
const assets = require('./assets');

// Create a class wrapper for backward compatibility with existing code
// that uses `new MessagingConversationsAdapter()` or expects a class instance
class MessagingConversationsAdapter {
  // Core conversation operations
  createConversation = core.createConversation;
  getConversationsForUser = core.getConversationsForUser;
  getConversationById = core.getConversationById;
  updateConversation = core.updateConversation;

  // Member management
  addMember = members.addMember;
  removeMember = members.removeMember;
  setLastRead = members.setLastRead;
  getConversationReadStates = members.getConversationReadStates;
  updateReadState = members.updateReadState;
  getUnreadCountForUser = members.getUnreadCountForUser;
  getUserById = members.getUserById;

  // Message operations
  createMessage = messages.createMessage;
  listMessages = messages.listMessages;
  getMessageById = messages.getMessageById;
  searchMessages = messages.searchMessages;
  deleteMessage = messages.deleteMessage;
  editMessage = messages.editMessage;
  forwardMessage = messages.forwardMessage;

  // Reaction operations
  addReaction = reactions.addReaction;
  removeReaction = reactions.removeReaction;
  listReactionsForMessage = reactions.listReactionsForMessage;
  listReactionsForMessages = reactions.listReactionsForMessages;

  // Pin operations
  pinMessage = pins.pinMessage;
  unpinMessage = pins.unpinMessage;
  listPinnedMessages = pins.listPinnedMessages;
  isMessagePinned = pins.isMessagePinned;

  // Notification operations
  createNotification = notifications.createNotification;
  listNotifications = notifications.listNotifications;
  markNotificationRead = notifications.markNotificationRead;
  markAllNotificationsRead = notifications.markAllNotificationsRead;
  getUnreadNotificationCount = notifications.getUnreadNotificationCount;

  // Thread operations
  listThreadMessages = threads.listThreadMessages;
  getThreadSummary = threads.getThreadSummary;

  // Asset operations
  getAssetById = assets.getAssetById;
  hydrateMessagesWithAssets = assets.hydrateMessagesWithAssets;

  // Transformers (expose for backward compatibility)
  _transformConversation = core.transformConversation;
  _transformMember = core.transformMember;
  _transformMessage = messages.transformMessage;
  _transformNotification = notifications.transformNotification;
}

// Export singleton instance for backward compatibility
module.exports = new MessagingConversationsAdapter();

// Also export individual modules for direct imports
module.exports.core = core;
module.exports.members = members;
module.exports.messages = messages;
module.exports.reactions = reactions;
module.exports.pins = pins;
module.exports.notifications = notifications;
module.exports.threads = threads;
module.exports.assets = assets;
module.exports.MessagingConversationsAdapter = MessagingConversationsAdapter;
