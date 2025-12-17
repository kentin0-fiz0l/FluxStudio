/**
 * Notification Service v2
 *
 * Enhanced notification system with:
 * - Structured notification types: mention, decision, blocker, assignment, file_change, system
 * - User preference checking (respects per-type toggles)
 * - Project scoping (all notifications include projectId)
 * - Smart trigger detection from message content
 *
 * Triggers:
 * - Mentions: @username or @email-prefix patterns
 * - Decisions: Messages starting with "Decision:" or "[Decision]"
 * - Blockers: Messages starting with "Blocked:", "Blocker:", or "[Blocker]"
 * - File changes: When assets are added/updated in project conversations
 * - Assignments: When tasks are assigned (future - when task system exists)
 *
 * @module notification-service
 */

const messagingAdapter = require('../database/messaging-conversations-adapter');
const { query } = require('../database/config');

// =============================================================================
// Constants
// =============================================================================

/**
 * Notification categories for filtering
 * @type {Object.<string, string>}
 */
const NOTIFICATION_CATEGORIES = {
  MENTION: 'mention',
  DECISION: 'decision',
  BLOCKER: 'blocker',
  ASSIGNMENT: 'assignment',
  FILE_CHANGE: 'file_change',
  SYSTEM: 'system',
  OTHER: 'other',
};

/**
 * Patterns for detecting structured message intents
 */
const PATTERNS = {
  // Decision patterns: "Decision:", "[Decision]", "DECISION:"
  DECISION: /^(?:\[?decision\]?:|\*\*decision\*\*:?)/i,

  // Blocker patterns: "Blocked:", "Blocker:", "[Blocker]", "BLOCKED:"
  BLOCKER: /^(?:\[?block(?:ed|er)\]?:|\*\*block(?:ed|er)\*\*:?)/i,

  // Mention patterns: @username, @First Last, @email-prefix
  // Enhanced to handle email-style mentions like @john.doe
  MENTION: /@([a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+)?)/g,
};

// =============================================================================
// NotificationService Class
// =============================================================================

class NotificationService {
  constructor() {
    // Cache for user preferences (simple in-memory, cleared on restart)
    this._preferencesCache = new Map();
    this._cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Process a new message and create appropriate notifications
   *
   * This is the main entry point called from message creation flows.
   * It detects notification triggers and respects user preferences.
   *
   * @param {Object} params
   * @param {Object} params.message - The created message
   * @param {string} params.conversationId - Conversation ID
   * @param {string} params.senderId - User who sent the message
   * @param {string} params.senderName - Display name of sender
   * @param {string|null} [params.projectId] - Project ID for scoping
   * @param {Object} [params.replyToMessage] - The message being replied to
   * @param {Object} [params.threadRootMessage] - The thread root message
   * @param {Array} [params.conversationMembers] - Array of member objects
   * @returns {Promise<Array>} Array of created notifications
   */
  async processMessageNotifications({
    message,
    conversationId,
    senderId,
    senderName,
    projectId = null,
    replyToMessage = null,
    threadRootMessage = null,
    conversationMembers = []
  }) {
    const notifications = [];
    const notifiedUserIds = new Set();

    // Never notify the sender about their own actions
    notifiedUserIds.add(senderId);

    const content = message.content || message.text || '';

    // 1. Check for Decision notification (highest priority for decisions)
    if (this._isDecisionMessage(content)) {
      const decisionNotifications = await this._processDecision({
        message,
        content,
        conversationId,
        projectId,
        senderId,
        senderName,
        notifiedUserIds,
        conversationMembers
      });
      notifications.push(...decisionNotifications);
    }

    // 2. Check for Blocker notification
    if (this._isBlockerMessage(content)) {
      const blockerNotifications = await this._processBlocker({
        message,
        content,
        conversationId,
        projectId,
        senderId,
        senderName,
        notifiedUserIds,
        conversationMembers
      });
      notifications.push(...blockerNotifications);
    }

    // 3. Process mentions
    if (content) {
      const mentionNotifications = await this._processMentions({
        message,
        content,
        conversationId,
        projectId,
        senderId,
        senderName,
        notifiedUserIds,
        conversationMembers
      });
      notifications.push(...mentionNotifications);
    }

    // 4. Process direct reply notification
    if (replyToMessage && replyToMessage.authorId && !notifiedUserIds.has(replyToMessage.authorId)) {
      const replyNotification = await this._createReplyNotification({
        message,
        conversationId,
        projectId,
        senderId,
        senderName,
        replyToMessage
      });
      if (replyNotification) {
        notifications.push(replyNotification);
        notifiedUserIds.add(replyToMessage.authorId);
      }
    }

    // 5. Process thread reply notification
    if (threadRootMessage && threadRootMessage.authorId && !notifiedUserIds.has(threadRootMessage.authorId)) {
      const threadNotification = await this._createThreadReplyNotification({
        message,
        conversationId,
        projectId,
        senderId,
        senderName,
        threadRootMessage
      });
      if (threadNotification) {
        notifications.push(threadNotification);
        notifiedUserIds.add(threadRootMessage.authorId);
      }
    }

    // 6. Process file change notification
    if (message.assetId) {
      const fileNotifications = await this._processFileChange({
        message,
        conversationId,
        projectId,
        senderId,
        senderName,
        notifiedUserIds,
        conversationMembers
      });
      notifications.push(...fileNotifications);
    }

    return notifications;
  }

  /**
   * Create a system notification for a user
   *
   * @param {Object} params
   * @param {string} params.userId - Recipient user ID
   * @param {string} params.title - Notification title
   * @param {string} [params.body] - Notification body
   * @param {string|null} [params.projectId] - Project context
   * @param {Object} [params.metadata] - Additional metadata
   * @returns {Promise<Object>} Created notification
   */
  async createSystemNotification({ userId, title, body, projectId = null, metadata = {} }) {
    // Check if user wants system notifications
    const prefs = await this._getUserPreferences(userId);
    if (!prefs.notify_system) {
      return null;
    }

    return await this._createNotification({
      userId,
      type: 'system',
      category: NOTIFICATION_CATEGORIES.SYSTEM,
      title,
      body,
      projectId,
      metadata
    });
  }

  /**
   * Create file change notification when an asset is updated
   *
   * @param {Object} params
   * @param {string} params.projectId - Project ID
   * @param {string} params.assetId - Asset ID
   * @param {string} params.assetName - Asset name
   * @param {string} params.actorUserId - User who made the change
   * @param {string} params.actorName - Display name of actor
   * @param {string} params.changeType - 'created', 'updated', 'deleted'
   * @param {Array} [params.projectMembers] - Project members to notify
   * @returns {Promise<Array>} Array of created notifications
   */
  async createFileChangeNotifications({
    projectId,
    assetId,
    assetName,
    actorUserId,
    actorName,
    changeType,
    projectMembers = []
  }) {
    const notifications = [];
    const notifiedUserIds = new Set([actorUserId]);

    const titleMap = {
      created: `${actorName} added a new file`,
      updated: `${actorName} updated a file`,
      deleted: `${actorName} deleted a file`,
    };

    for (const member of projectMembers) {
      if (!member.userId || notifiedUserIds.has(member.userId)) continue;

      // Check preferences
      const prefs = await this._getUserPreferences(member.userId);
      if (!prefs.notify_file_changes) continue;

      const notification = await this._createNotification({
        userId: member.userId,
        type: 'file_change',
        category: NOTIFICATION_CATEGORIES.FILE_CHANGE,
        title: titleMap[changeType] || `${actorName} modified a file`,
        body: assetName,
        actorUserId,
        projectId,
        assetId,
        metadata: { changeType }
      });

      if (notification) {
        notifications.push(notification);
        notifiedUserIds.add(member.userId);
      }
    }

    return notifications;
  }

  /**
   * Get user notification preferences
   *
   * @param {string} userId
   * @returns {Promise<Object>} Preferences object
   */
  async getUserPreferences(userId) {
    return await this._getUserPreferences(userId);
  }

  /**
   * Update user notification preferences
   *
   * @param {string} userId
   * @param {Object} preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateUserPreferences(userId, preferences) {
    const validFields = [
      'notify_mentions',
      'notify_decisions',
      'notify_blockers',
      'notify_assignments',
      'notify_file_changes',
      'notify_system',
      'quiet_hours_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
      'email_digest_enabled',
      'email_digest_frequency'
    ];

    const updates = {};
    for (const field of validFields) {
      if (preferences[field] !== undefined) {
        updates[field] = preferences[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return await this._getUserPreferences(userId);
    }

    // Build dynamic update query
    const setClauses = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`);
    const values = [userId, ...Object.values(updates)];

    const result = await query(`
      INSERT INTO user_notification_preferences (user_id, ${Object.keys(updates).join(', ')})
      VALUES ($1, ${Object.keys(updates).map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id) DO UPDATE SET
        ${setClauses.join(', ')},
        updated_at = NOW()
      RETURNING *
    `, values);

    // Clear cache
    this._preferencesCache.delete(userId);

    return this._transformPreferences(result.rows[0]);
  }

  // ===========================================================================
  // Private Methods - Detection
  // ===========================================================================

  /**
   * Check if message content indicates a decision
   */
  _isDecisionMessage(content) {
    if (!content) return false;
    return PATTERNS.DECISION.test(content.trim());
  }

  /**
   * Check if message content indicates a blocker
   */
  _isBlockerMessage(content) {
    if (!content) return false;
    return PATTERNS.BLOCKER.test(content.trim());
  }

  /**
   * Extract mentions from message content
   * Supports: @name, @First Last, @email.prefix
   */
  _extractMentions(content) {
    if (!content) return [];
    const matches = [...content.matchAll(PATTERNS.MENTION)];
    return matches.map(m => m[1].toLowerCase());
  }

  // ===========================================================================
  // Private Methods - Notification Creation
  // ===========================================================================

  /**
   * Process decision message notifications
   */
  async _processDecision({
    message,
    content,
    conversationId,
    projectId,
    senderId,
    senderName,
    notifiedUserIds,
    conversationMembers
  }) {
    const notifications = [];

    // Extract the decision text (remove prefix)
    const decisionText = content.replace(PATTERNS.DECISION, '').trim();

    // Notify all project members about the decision
    for (const member of conversationMembers) {
      if (!member.userId || notifiedUserIds.has(member.userId)) continue;

      // Check preferences
      const prefs = await this._getUserPreferences(member.userId);
      if (!prefs.notify_decisions) continue;

      const notification = await this._createNotification({
        userId: member.userId,
        type: 'decision',
        category: NOTIFICATION_CATEGORIES.DECISION,
        title: `${senderName} made a decision`,
        body: this._truncateContent(decisionText, 100),
        actorUserId: senderId,
        conversationId,
        projectId,
        messageId: message.id,
        threadRootMessageId: message.threadRootMessageId || null
      });

      if (notification) {
        notifications.push(notification);
        notifiedUserIds.add(member.userId);
      }
    }

    return notifications;
  }

  /**
   * Process blocker message notifications
   */
  async _processBlocker({
    message,
    content,
    conversationId,
    projectId,
    senderId,
    senderName,
    notifiedUserIds,
    conversationMembers
  }) {
    const notifications = [];

    // Extract the blocker text (remove prefix)
    const blockerText = content.replace(PATTERNS.BLOCKER, '').trim();

    // Notify all project members about the blocker
    for (const member of conversationMembers) {
      if (!member.userId || notifiedUserIds.has(member.userId)) continue;

      // Check preferences
      const prefs = await this._getUserPreferences(member.userId);
      if (!prefs.notify_blockers) continue;

      const notification = await this._createNotification({
        userId: member.userId,
        type: 'blocker',
        category: NOTIFICATION_CATEGORIES.BLOCKER,
        title: `${senderName} reported a blocker`,
        body: this._truncateContent(blockerText, 100),
        actorUserId: senderId,
        conversationId,
        projectId,
        messageId: message.id,
        threadRootMessageId: message.threadRootMessageId || null,
        metadata: { priority: 'high' }
      });

      if (notification) {
        notifications.push(notification);
        notifiedUserIds.add(member.userId);
      }
    }

    return notifications;
  }

  /**
   * Process @mention notifications
   */
  async _processMentions({
    message,
    content,
    conversationId,
    projectId,
    senderId,
    senderName,
    notifiedUserIds,
    conversationMembers
  }) {
    const notifications = [];
    const mentionedNames = this._extractMentions(content);

    if (mentionedNames.length === 0) return notifications;

    for (const member of conversationMembers) {
      if (!member.userId || notifiedUserIds.has(member.userId)) continue;

      // Check if member matches any mention
      const memberName = (member.name || member.userName || '').toLowerCase();
      const memberEmail = (member.email || '').toLowerCase();
      const emailPrefix = memberEmail.split('@')[0];
      const memberNameParts = memberName.split(' ');

      let matched = false;
      for (const mentionName of mentionedNames) {
        // Match: full name, first name, email prefix, or email-style handle
        if (
          memberName === mentionName ||
          memberNameParts[0] === mentionName ||
          emailPrefix === mentionName ||
          memberEmail.startsWith(mentionName + '@')
        ) {
          matched = true;
          break;
        }
      }

      if (!matched) continue;

      // Check preferences
      const prefs = await this._getUserPreferences(member.userId);
      if (!prefs.notify_mentions) continue;

      const notification = await this._createNotification({
        userId: member.userId,
        type: 'mention',
        category: NOTIFICATION_CATEGORIES.MENTION,
        title: `${senderName} mentioned you`,
        body: this._truncateContent(content, 100),
        actorUserId: senderId,
        conversationId,
        projectId,
        messageId: message.id,
        threadRootMessageId: message.threadRootMessageId || null,
        assetId: message.assetId || null
      });

      if (notification) {
        notifications.push(notification);
        notifiedUserIds.add(member.userId);
      }
    }

    return notifications;
  }

  /**
   * Create reply notification
   */
  async _createReplyNotification({
    message,
    conversationId,
    projectId,
    senderId,
    senderName,
    replyToMessage
  }) {
    if (!replyToMessage.authorId || replyToMessage.authorId === senderId) {
      return null;
    }

    // Check preferences (mentions setting controls replies too)
    const prefs = await this._getUserPreferences(replyToMessage.authorId);
    if (!prefs.notify_mentions) return null;

    return await this._createNotification({
      userId: replyToMessage.authorId,
      type: 'reply',
      category: NOTIFICATION_CATEGORIES.MENTION, // Grouped with mentions
      title: `${senderName} replied to your message`,
      body: this._truncateContent(message.content || message.text, 100),
      actorUserId: senderId,
      conversationId,
      projectId,
      messageId: message.id,
      assetId: message.assetId || null
    });
  }

  /**
   * Create thread reply notification
   */
  async _createThreadReplyNotification({
    message,
    conversationId,
    projectId,
    senderId,
    senderName,
    threadRootMessage
  }) {
    if (!threadRootMessage.authorId || threadRootMessage.authorId === senderId) {
      return null;
    }

    // Check preferences
    const prefs = await this._getUserPreferences(threadRootMessage.authorId);
    if (!prefs.notify_mentions) return null;

    return await this._createNotification({
      userId: threadRootMessage.authorId,
      type: 'thread_reply',
      category: NOTIFICATION_CATEGORIES.MENTION,
      title: `${senderName} replied in a thread`,
      body: this._truncateContent(message.content || message.text, 100),
      actorUserId: senderId,
      conversationId,
      projectId,
      messageId: message.id,
      threadRootMessageId: threadRootMessage.id,
      assetId: message.assetId || null
    });
  }

  /**
   * Process file change (file shared in message)
   */
  async _processFileChange({
    message,
    conversationId,
    projectId,
    senderId,
    senderName,
    notifiedUserIds,
    conversationMembers
  }) {
    const notifications = [];
    const content = message.content || message.text || '';

    // Skip if the message had content with mentions (they already got notified)
    if (content && content.includes('@')) {
      return notifications;
    }

    // Limit notifications to avoid spam (small groups only)
    if (conversationMembers.length > 5) {
      return notifications;
    }

    for (const member of conversationMembers) {
      if (!member.userId || notifiedUserIds.has(member.userId)) continue;

      // Check preferences
      const prefs = await this._getUserPreferences(member.userId);
      if (!prefs.notify_file_changes) continue;

      const notification = await this._createNotification({
        userId: member.userId,
        type: 'file_shared',
        category: NOTIFICATION_CATEGORIES.FILE_CHANGE,
        title: `${senderName} shared a file`,
        body: message.assetName || 'New file attachment',
        actorUserId: senderId,
        conversationId,
        projectId,
        messageId: message.id,
        threadRootMessageId: message.threadRootMessageId || null,
        assetId: message.assetId
      });

      if (notification) {
        notifications.push(notification);
        notifiedUserIds.add(member.userId);
      }
    }

    return notifications;
  }

  /**
   * Core notification creation with project scoping
   */
  async _createNotification({
    userId,
    type,
    category,
    title,
    body = null,
    actorUserId = null,
    conversationId = null,
    projectId = null,
    messageId = null,
    threadRootMessageId = null,
    assetId = null,
    metadata = {}
  }) {
    try {
      return await messagingAdapter.createNotification({
        userId,
        type,
        title,
        body,
        actorUserId,
        conversationId,
        messageId,
        threadRootMessageId,
        assetId,
        metadata: {
          ...metadata,
          category,
          projectId // Store projectId in metadata if column doesn't exist yet
        },
        entityId: null
      });
    } catch (error) {
      console.error('[NotificationService] Failed to create notification:', error.message);
      return null;
    }
  }

  // ===========================================================================
  // Private Methods - Preferences
  // ===========================================================================

  /**
   * Get user preferences with caching
   */
  async _getUserPreferences(userId) {
    // Check cache
    const cached = this._preferencesCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this._cacheExpiryMs) {
      return cached.preferences;
    }

    try {
      const result = await query(`
        SELECT * FROM user_notification_preferences WHERE user_id = $1
      `, [userId]);

      let preferences;
      if (result.rows.length === 0) {
        // Return defaults
        preferences = {
          notify_mentions: true,
          notify_decisions: true,
          notify_blockers: true,
          notify_assignments: true,
          notify_file_changes: false,
          notify_system: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          email_digest_enabled: false,
          email_digest_frequency: 'daily'
        };
      } else {
        preferences = this._transformPreferences(result.rows[0]);
      }

      // Cache
      this._preferencesCache.set(userId, {
        preferences,
        timestamp: Date.now()
      });

      return preferences;
    } catch (error) {
      // Table might not exist yet, return defaults
      console.warn('[NotificationService] Failed to get preferences, using defaults:', error.message);
      return {
        notify_mentions: true,
        notify_decisions: true,
        notify_blockers: true,
        notify_assignments: true,
        notify_file_changes: false,
        notify_system: true,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00',
        email_digest_enabled: false,
        email_digest_frequency: 'daily'
      };
    }
  }

  /**
   * Transform database row to preferences object
   */
  _transformPreferences(row) {
    return {
      notify_mentions: row.notify_mentions ?? true,
      notify_decisions: row.notify_decisions ?? true,
      notify_blockers: row.notify_blockers ?? true,
      notify_assignments: row.notify_assignments ?? true,
      notify_file_changes: row.notify_file_changes ?? false,
      notify_system: row.notify_system ?? true,
      quiet_hours_enabled: row.quiet_hours_enabled ?? false,
      quiet_hours_start: row.quiet_hours_start || '22:00:00',
      quiet_hours_end: row.quiet_hours_end || '08:00:00',
      email_digest_enabled: row.email_digest_enabled ?? false,
      email_digest_frequency: row.email_digest_frequency || 'daily'
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Truncate content for notification body
   */
  _truncateContent(content, maxLength = 100) {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get user display name
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

  /**
   * Clear preferences cache (useful for testing)
   */
  clearPreferencesCache() {
    this._preferencesCache.clear();
  }
}

// Export singleton instance and categories
const notificationService = new NotificationService();

module.exports = notificationService;
module.exports.NotificationService = NotificationService;
module.exports.NOTIFICATION_CATEGORIES = NOTIFICATION_CATEGORIES;
module.exports.PATTERNS = PATTERNS;
