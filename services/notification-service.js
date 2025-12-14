/**
 * Notification Service
 *
 * Centralized business logic for creating notifications based on messaging events:
 * - Mentions (@username)
 * - Replies (direct reply to a message)
 * - Thread replies (reply in a thread)
 * - File shared (message with asset_id)
 *
 * This service is called from message creation flows to generate appropriate notifications.
 */

const messagingAdapter = require('../database/messaging-conversations-adapter');

class NotificationService {
  /**
   * Process a new message and create appropriate notifications
   *
   * @param {Object} params
   * @param {Object} params.message - The created message
   * @param {string} params.conversationId - Conversation ID
   * @param {string} params.senderId - User who sent the message
   * @param {string} params.senderName - Display name of sender
   * @param {Object} [params.replyToMessage] - The message being replied to (if any)
   * @param {Object} [params.threadRootMessage] - The thread root message (if any)
   * @param {Array} [params.conversationMembers] - Array of { userId } for all members
   * @param {string} [params.projectId] - Project ID for project-scoped conversations
   * @param {string} [params.projectName] - Project name for display
   * @returns {Array} Array of created notifications
   */
  async processMessageNotifications({
    message,
    conversationId,
    senderId,
    senderName,
    replyToMessage = null,
    threadRootMessage = null,
    conversationMembers = [],
    projectId = null,
    projectName = null
  }) {
    const notifications = [];
    const notifiedUserIds = new Set(); // Track to avoid duplicates

    // Don't notify the sender about their own actions
    notifiedUserIds.add(senderId);

    // 1. Process mentions first (highest priority)
    if (message.content) {
      const mentionedNotifications = await this._processMentions({
        message,
        conversationId,
        senderId,
        senderName,
        notifiedUserIds,
        conversationMembers,
        projectId,
        projectName
      });
      notifications.push(...mentionedNotifications);
    }

    // 2. Process direct reply notification
    if (replyToMessage && replyToMessage.authorId && !notifiedUserIds.has(replyToMessage.authorId)) {
      const replyNotification = await this._createReplyNotification({
        message,
        conversationId,
        senderId,
        senderName,
        replyToMessage,
        projectId,
        projectName
      });
      if (replyNotification) {
        notifications.push(replyNotification);
        notifiedUserIds.add(replyToMessage.authorId);
      }
    }

    // 3. Process thread reply notification
    if (threadRootMessage && threadRootMessage.authorId && !notifiedUserIds.has(threadRootMessage.authorId)) {
      const threadNotification = await this._createThreadReplyNotification({
        message,
        conversationId,
        senderId,
        senderName,
        threadRootMessage,
        projectId,
        projectName
      });
      if (threadNotification) {
        notifications.push(threadNotification);
        notifiedUserIds.add(threadRootMessage.authorId);
      }
    }

    // 4. Process file shared notification
    if (message.assetId) {
      const fileNotifications = await this._processFileShared({
        message,
        conversationId,
        senderId,
        senderName,
        notifiedUserIds,
        conversationMembers,
        projectId,
        projectName
      });
      notifications.push(...fileNotifications);
    }

    return notifications;
  }

  /**
   * Extract and process @mentions from message content
   *
   * Mention format: @Name or @First Last (matches until end of word)
   * Looks up users by name in the conversation members
   */
  async _processMentions({
    message,
    conversationId,
    senderId,
    senderName,
    notifiedUserIds,
    conversationMembers,
    projectId = null,
    projectName = null
  }) {
    const notifications = [];

    // Pattern: @ followed by one or more words (handles "First Last" style names)
    // This is a simple pattern - can be enhanced based on actual user handle format
    const mentionPattern = /@([a-zA-Z0-9_]+(?:\s[a-zA-Z0-9_]+)?)/g;
    const matches = message.content.matchAll(mentionPattern);

    const mentionedNames = new Set();
    for (const match of matches) {
      mentionedNames.add(match[1].toLowerCase());
    }

    if (mentionedNames.size === 0) return notifications;

    // Get all users who might be mentioned (conversation members)
    // Look them up by name (case-insensitive)
    for (const member of conversationMembers) {
      if (!member.userId || notifiedUserIds.has(member.userId)) continue;

      // Check if member's name matches any mention
      const memberName = (member.name || member.userName || '').toLowerCase();
      const memberNameParts = memberName.split(' ');

      for (const mentionName of mentionedNames) {
        // Match full name or first name
        if (memberName === mentionName || memberNameParts[0] === mentionName) {
          const notification = await messagingAdapter.createNotification({
            userId: member.userId,
            type: 'mention',
            title: `${senderName} mentioned you`,
            body: this._truncateContent(message.content, 100),
            actorUserId: senderId,
            conversationId,
            messageId: message.id,
            threadRootMessageId: message.threadRootMessageId || null,
            assetId: message.assetId || null,
            projectId,
            projectName
          });

          notifications.push(notification);
          notifiedUserIds.add(member.userId);
          break; // Only one notification per user
        }
      }
    }

    return notifications;
  }

  /**
   * Create notification for direct reply
   */
  async _createReplyNotification({
    message,
    conversationId,
    senderId,
    senderName,
    replyToMessage,
    projectId = null,
    projectName = null
  }) {
    if (!replyToMessage.authorId || replyToMessage.authorId === senderId) {
      return null;
    }

    return await messagingAdapter.createNotification({
      userId: replyToMessage.authorId,
      type: 'reply',
      title: `${senderName} replied to your message`,
      body: this._truncateContent(message.content, 100),
      actorUserId: senderId,
      conversationId,
      messageId: message.id,
      threadRootMessageId: null, // Direct reply, not thread
      assetId: message.assetId || null,
      projectId,
      projectName
    });
  }

  /**
   * Create notification for thread reply
   */
  async _createThreadReplyNotification({
    message,
    conversationId,
    senderId,
    senderName,
    threadRootMessage,
    projectId = null,
    projectName = null
  }) {
    if (!threadRootMessage.authorId || threadRootMessage.authorId === senderId) {
      return null;
    }

    return await messagingAdapter.createNotification({
      userId: threadRootMessage.authorId,
      type: 'thread_reply',
      title: `${senderName} replied in a thread`,
      body: this._truncateContent(message.content, 100),
      actorUserId: senderId,
      conversationId,
      messageId: message.id,
      threadRootMessageId: threadRootMessage.id,
      assetId: message.assetId || null,
      projectId,
      projectName
    });
  }

  /**
   * Process file shared notifications
   * For v1: Notify mentioned users only (if any), otherwise skip
   * This keeps notifications focused rather than spamming all members
   */
  async _processFileShared({
    message,
    conversationId,
    senderId,
    senderName,
    notifiedUserIds,
    conversationMembers,
    projectId = null,
    projectName = null
  }) {
    const notifications = [];

    // For v1, only create file_shared notification if there are no mentions
    // (mentioned users already got a notification about the message)
    // Optionally notify all members for truly important file shares

    // Skip if the message had content with mentions (they already got notified)
    if (message.content && message.content.includes('@')) {
      return notifications;
    }

    // For file-only messages (no text), notify conversation members
    // This is a lighter notification - just informs about file upload
    for (const member of conversationMembers) {
      if (!member.userId || notifiedUserIds.has(member.userId)) continue;

      // Limit file_shared notifications to avoid spam
      // For v1: only notify if it's a small group (< 5 members)
      if (conversationMembers.length > 5) continue;

      const notification = await messagingAdapter.createNotification({
        userId: member.userId,
        type: 'file_shared',
        title: `${senderName} shared a file`,
        body: message.assetName || 'New file attachment',
        actorUserId: senderId,
        conversationId,
        messageId: message.id,
        threadRootMessageId: message.threadRootMessageId || null,
        assetId: message.assetId,
        projectId,
        projectName
      });

      notifications.push(notification);
      notifiedUserIds.add(member.userId);
    }

    return notifications;
  }

  /**
   * Truncate content for notification body
   */
  _truncateContent(content, maxLength = 100) {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get user display name (helper)
   */
  async getUserDisplayName(userId) {
    try {
      const user = await messagingAdapter.getUserById(userId);
      return user?.name || user?.email?.split('@')[0] || 'Someone';
    } catch (error) {
      console.error('Failed to get user name:', error);
      return 'Someone';
    }
  }
}

module.exports = new NotificationService();
