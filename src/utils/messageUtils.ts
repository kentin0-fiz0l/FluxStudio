/**
 * Message Utilities
 * Helper functions for message processing and formatting
 */

import { Message, MessageUser, Conversation, MessageAttachment } from '../types/messaging';

/**
 * Format message timestamp for display
 */
export function formatMessageTime(date: Date | string): string {
  const now = new Date();
  const messageDate = new Date(date);
  const diff = now.getTime() - messageDate.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return messageDate.toLocaleDateString();
}

/**
 * Format detailed timestamp
 */
export function formatDetailedTime(date: Date | string): string {
  const messageDate = new Date(date);
  return messageDate.toLocaleString();
}

/**
 * Extract mentions from message content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Extract hashtags from message content
 */
export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;

  while ((match = hashtagRegex.exec(content)) !== null) {
    hashtags.push(match[1]);
  }

  return hashtags;
}

/**
 * Highlight mentions and hashtags in message content
 */
export function highlightMessageContent(content: string): string {
  return content
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
    .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

/**
 * Check if message is from current user
 */
export function isOwnMessage(message: Message, currentUser: MessageUser): boolean {
  return message.author.id === currentUser.id;
}

/**
 * Check if message contains attachments
 */
export function hasAttachments(message: Message): boolean {
  return Boolean(message.attachments && message.attachments.length > 0);
}

/**
 * Get message attachments by type
 */
export function getAttachmentsByType(message: Message, type: string): MessageAttachment[] {
  if (!message.attachments) return [];
  return message.attachments.filter(attachment => attachment.type === type);
}

/**
 * Check if attachment is an image
 */
export function isImageAttachment(attachment: MessageAttachment): boolean {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
  const extension = attachment.name?.split('.').pop()?.toLowerCase();
  return imageTypes.includes(extension || '');
}

/**
 * Check if attachment is a design file
 */
export function isDesignAttachment(attachment: MessageAttachment): boolean {
  const designTypes = ['fig', 'sketch', 'psd', 'ai', 'xd'];
  const extension = attachment.name?.split('.').pop()?.toLowerCase();
  return designTypes.includes(extension || '');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate message preview for notifications
 */
export function generateMessagePreview(message: Message, maxLength: number = 100): string {
  let preview = message.content;

  // Truncate if too long
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength) + '...';
  }

  // Add attachment indicator
  if (hasAttachments(message)) {
    const attachmentCount = message.attachments!.length;
    preview += ` [${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''}]`;
  }

  return preview;
}

/**
 * Check if message contains urgent keywords
 */
export function isUrgentMessage(message: Message): boolean {
  const urgentKeywords = [
    'urgent', 'asap', 'emergency', 'critical', 'deadline',
    'immediately', 'rush', 'priority', 'escalate'
  ];

  const content = message.content.toLowerCase();
  return urgentKeywords.some(keyword => content.includes(keyword));
}

/**
 * Extract action items from message content
 */
export function extractActionItems(content: string): string[] {
  const actionPatterns = [
    /(?:need to|should|must|will)\s+(.+?)(?:\.|$)/gi,
    /(?:action|todo|task):\s*(.+?)(?:\.|$)/gi,
    /(?:@\w+)\s+(.+?)(?:\.|$)/gi
  ];

  const actionItems: string[] = [];

  actionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      actionItems.push(match[1].trim());
    }
  });

  return actionItems;
}

/**
 * Check if message mentions specific user
 */
export function mentionsUser(message: Message, userId: string): boolean {
  const mentions = extractMentions(message.content);
  return mentions.includes(userId);
}

/**
 * Get conversation participants excluding current user
 */
export function getOtherParticipants(conversation: Conversation, currentUser: MessageUser): MessageUser[] {
  return conversation.participants.filter(p => p && p.id && p.id !== currentUser.id);
}

/**
 * Generate conversation title from participants
 */
export function generateConversationTitle(conversation: Conversation, currentUser: MessageUser): string {
  if (conversation.title) return conversation.title;

  const others = getOtherParticipants(conversation, currentUser);

  if (others.length === 0) return 'You';
  if (others.length === 1) return others[0].name;
  if (others.length === 2) return `${others[0].name} and ${others[1].name}`;

  return `${others[0].name} and ${others.length - 1} other${others.length > 2 ? 's' : ''}`;
}

/**
 * Calculate conversation activity score
 */
export function calculateActivityScore(messages: Message[]): number {
  if (messages.length === 0) return 0;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentMessages = messages.filter(m => new Date(m.createdAt) > oneDayAgo).length;
  const weeklyMessages = messages.filter(m => new Date(m.createdAt) > oneWeekAgo).length;

  // Score based on recent activity
  let score = 0;
  score += recentMessages * 10; // High weight for today's messages
  score += weeklyMessages * 2;  // Medium weight for this week's messages
  score += Math.min(messages.length, 100); // Base score from total messages

  return Math.min(score, 100); // Cap at 100
}

/**
 * Check if conversation is active
 */
export function isActiveConversation(conversation: Conversation): boolean {
  if (!conversation.lastMessage) return false;

  const lastMessageTime = new Date(conversation.lastMessage.timestamp);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return lastMessageTime > oneDayAgo;
}

/**
 * Sort conversations by activity
 */
export function sortConversationsByActivity(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    // Unread messages first
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1;

    // Then by last message time
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;

    return bTime - aTime;
  });
}

/**
 * Search messages by content
 */
export function searchMessages(messages: Message[], query: string): Message[] {
  if (!query.trim()) return messages;

  const searchTerm = query.toLowerCase();

  return messages.filter(message => {
    // Search in content
    if (message.content.toLowerCase().includes(searchTerm)) return true;

    // Search in author name
    if (message.author.name.toLowerCase().includes(searchTerm)) return true;

    // Search in attachment names
    if (message.attachments) {
      return message.attachments.some(attachment =>
        attachment.name?.toLowerCase().includes(searchTerm)
      );
    }

    return false;
  });
}

/**
 * Group messages by date
 */
export function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};

  messages.forEach(message => {
    const date = new Date(message.createdAt);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(message);
  });

  return groups;
}

/**
 * Check if messages should be grouped together
 */
export function shouldGroupMessages(current: Message, previous: Message): boolean {
  // Same author
  if (current.author.id !== previous.author.id) return false;

  // Within 5 minutes
  const timeDiff = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
  if (timeDiff > 5 * 60 * 1000) return false; // 5 minutes

  return true;
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): { valid: boolean; error?: string } {
  if (!content.trim()) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (content.length > 5000) {
    return { valid: false, error: 'Message too long (max 5000 characters)' };
  }

  return { valid: true };
}

/**
 * Sanitize message content
 */
export function sanitizeMessageContent(content: string): string {
  return content
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique conversation ID
 */
export function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  formatMessageTime,
  formatDetailedTime,
  extractMentions,
  extractHashtags,
  highlightMessageContent,
  isOwnMessage,
  hasAttachments,
  getAttachmentsByType,
  isImageAttachment,
  isDesignAttachment,
  formatFileSize,
  generateMessagePreview,
  isUrgentMessage,
  extractActionItems,
  mentionsUser,
  getOtherParticipants,
  generateConversationTitle,
  calculateActivityScore,
  isActiveConversation,
  sortConversationsByActivity,
  searchMessages,
  groupMessagesByDate,
  shouldGroupMessages,
  validateMessageContent,
  sanitizeMessageContent,
  generateMessageId,
  generateConversationId
};