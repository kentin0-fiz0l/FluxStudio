/**
 * Messaging Database Adapter - Index
 * Re-exports all messaging modules for backward compatibility
 */

const core = require('./core');
const reactions = require('./reactions');
const threads = require('./threads');
const notifications = require('./notifications');
const presence = require('./presence');
const receipts = require('./receipts');
const attachments = require('./attachments');
const search = require('./search');

// Create a class wrapper for backward compatibility with existing code
// that uses `new MessagingAdapter()` or expects a class instance
class MessagingAdapter {
  // Core CRUD
  getMessages = core.getMessages;
  createMessage = core.createMessage;
  updateMessage = core.updateMessage;
  deleteMessage = core.deleteMessage;
  saveMessages = core.saveMessages;

  // Conversations
  getConversations = core.getConversations;
  createConversation = core.createConversation;
  updateConversation = core.updateConversation;
  updateConversationActivity = core.updateConversationActivity;
  saveChannels = core.saveChannels;

  // Participants
  addParticipant = core.addParticipant;
  removeParticipant = core.removeParticipant;
  getParticipants = core.getParticipants;
  isParticipant = core.isParticipant;
  getConversationWithMessages = core.getConversationWithMessages;

  // Transformers
  transformMessage = core.transformMessage;
  transformConversation = core.transformConversation;
  transformThread = threads.transformThread;
  transformAttachment = attachments.transformAttachment;
  transformNotification = notifications.transformNotification;
  transformLinkPreview = attachments.transformLinkPreview;
  transformVoiceMessage = attachments.transformVoiceMessage;
  transformReceipt = receipts.transformReceipt;

  // Reactions
  addReaction = reactions.addReaction;
  removeReaction = reactions.removeReaction;
  getReactions = reactions.getReactions;
  getReactionCounts = reactions.getReactionCounts;
  toggleReaction = reactions.toggleReaction;

  // Pinned messages
  pinMessage = reactions.pinMessage;
  unpinMessage = reactions.unpinMessage;
  getPinnedMessages = reactions.getPinnedMessages;

  // Threads
  createThread = threads.createThread;
  getThreads = threads.getThreads;
  getMessageThread = threads.getMessageThread;
  createReply = threads.createReply;
  getMessageWithReplies = threads.getMessageWithReplies;

  // Notifications
  getNotifications = notifications.getNotifications;
  getUnreadNotificationCount = notifications.getUnreadNotificationCount;
  createNotification = notifications.createNotification;
  markNotificationAsRead = notifications.markNotificationAsRead;
  markAllNotificationsAsRead = notifications.markAllNotificationsAsRead;
  markNotificationsByIds = notifications.markNotificationsByIds;
  deleteNotification = notifications.deleteNotification;

  // Presence
  updateUserPresence = presence.updateUserPresence;
  getUserPresence = presence.getUserPresence;
  updateTypingStatus = presence.updateTypingStatus;
  markMessageAsRead = presence.markMessageAsRead;
  muteConversation = presence.muteConversation;
  unmuteConversation = presence.unmuteConversation;
  updateNotificationPreference = presence.updateNotificationPreference;
  getMuteStatus = presence.getMuteStatus;

  // Receipts
  createDeliveryReceipt = receipts.createDeliveryReceipt;
  markMessageRead = receipts.markMessageRead;
  getMessageReceipts = receipts.getMessageReceipts;
  getMessageDeliveryStatus = receipts.getMessageDeliveryStatus;

  // Attachments
  addAttachment = attachments.addAttachment;
  getAttachments = attachments.getAttachments;
  getLinkPreview = attachments.getLinkPreview;
  saveLinkPreview = attachments.saveLinkPreview;
  linkPreviewToMessage = attachments.linkPreviewToMessage;
  getMessageLinkPreviews = attachments.getMessageLinkPreviews;
  createVoiceMessage = attachments.createVoiceMessage;
  getVoiceMessage = attachments.getVoiceMessage;

  // Search & editing
  searchMessages = search.searchMessages;
  editMessage = search.editMessage;
  getEditHistory = search.getEditHistory;
  forwardMessage = search.forwardMessage;
  healthCheck = search.healthCheck;
}

// Export singleton instance for backward compatibility
module.exports = new MessagingAdapter();

// Also export individual modules for direct imports
module.exports.core = core;
module.exports.reactions = reactions;
module.exports.threads = threads;
module.exports.notifications = notifications;
module.exports.presence = presence;
module.exports.receipts = receipts;
module.exports.attachments = attachments;
module.exports.search = search;
module.exports.MessagingAdapter = MessagingAdapter;
