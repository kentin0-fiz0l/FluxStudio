/**
 * Messaging Service for Flux Studio
 * Handles message creation, conversation management, and real-time communication
 */

import {
  Message,
  Conversation,
  ConversationType,
  MessageType,
  Priority,
  MessageUser,
  MessageSearchOptions,
  ConversationFilter,
  Notification,
  NotificationType,
  MessageAttachment,
  DesignReview,
  ConsultationSession
} from '../types/messaging';
import { socketService } from './socketService';

class MessagingService {
  private apiBaseUrl: string;
  private currentUser: MessageUser | null = null;

  constructor() {
    // Use proxy path for development, direct path for production
    // Vite proxy routes /api to localhost:3001 in development
    this.apiBaseUrl = '/api';
  }

  /**
   * Set current authenticated user
   */
  setCurrentUser(user: MessageUser) {
    this.currentUser = user;
    socketService.authenticateUser(user.id, {
      name: user.name,
      userType: user.userType
    });
  }

  /**
   * API helper for authenticated requests
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================

  /**
   * Get all conversations for the current user
   */
  async getConversations(filter?: ConversationFilter): Promise<Conversation[]> {
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await this.apiRequest(`/conversations?${params.toString()}`);
    // Backend returns { success, conversations, total } - extract conversations array
    const conversations = response.conversations || response || [];

    if (!Array.isArray(conversations)) {
      console.error('[MessagingService] Invalid conversations response:', response);
      return [];
    }

    // Transform participants from strings to MessageUser objects if needed
    return conversations.map((conv: any) => ({
      ...conv,
      participants: (conv.participants || []).filter((p: any) => p !== null && p !== undefined).map((p: string | MessageUser) => {
        if (typeof p === 'string') {
          // Convert string to MessageUser object
          return {
            id: p,
            name: p,
            userType: p.includes('client') ? 'client' : p === 'kentino' ? 'designer' : 'admin',
            isOnline: false,
            lastSeen: new Date()
          } as MessageUser;
        }
        // Ensure the object has required properties
        if (!p || typeof p !== 'object' || !p.id) {
          console.error('[MessagingService] Invalid participant object:', p);
          // Return a fallback object
          return {
            id: p?.id || 'unknown',
            name: p?.name || 'Unknown User',
            userType: p?.userType || 'client',
            isOnline: false,
            lastSeen: new Date()
          } as MessageUser;
        }
        return p;
      }),
      metadata: conv.metadata || {
        isArchived: false,
        isMuted: false,
        isPinned: conv.isPinned || false,
        priority: 'medium' as Priority,
        tags: conv.tags || []
      }
    }));
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const conv = await this.apiRequest(`/conversations/${conversationId}`);

    // Transform participants from strings to MessageUser objects if needed
    return {
      ...conv,
      participants: (conv.participants || []).filter((p: any) => p !== null && p !== undefined).map((p: string | MessageUser) => {
        if (typeof p === 'string') {
          // Convert string to MessageUser object
          return {
            id: p,
            name: p,
            userType: p.includes('client') ? 'client' : p === 'kentino' ? 'designer' : 'admin',
            isOnline: false,
            lastSeen: new Date()
          } as MessageUser;
        }
        // Ensure the object has required properties
        if (!p || typeof p !== 'object' || !p.id) {
          console.error('[MessagingService] Invalid participant object in getConversation:', p);
          // Return a fallback object
          return {
            id: p?.id || 'unknown',
            name: p?.name || 'Unknown User',
            userType: p?.userType || 'client',
            isOnline: false,
            lastSeen: new Date()
          } as MessageUser;
        }
        return p;
      }),
      metadata: conv.metadata || {
        isArchived: false,
        isMuted: false,
        isPinned: conv.isPinned || false,
        priority: 'medium' as Priority,
        tags: conv.tags || []
      }
    };
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: {
    type: ConversationType;
    name: string;
    description?: string;
    participants: string[];
    projectId?: string;
    metadata?: Partial<Conversation['metadata']>;
  }): Promise<Conversation> {
    const conversation = await this.apiRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Join the conversation room in real-time
    socketService.joinConversation(conversation.id);

    return conversation;
  }

  /**
   * Update conversation metadata
   */
  async updateConversation(
    conversationId: string,
    updates: Partial<Pick<Conversation, 'name' | 'description' | 'metadata'>>
  ): Promise<Conversation> {
    return this.apiRequest(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Add participants to a conversation
   */
  async addParticipants(conversationId: string, userIds: string[]): Promise<void> {
    await this.apiRequest(`/conversations/${conversationId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  }

  /**
   * Remove participants from a conversation
   */
  async removeParticipants(conversationId: string, userIds: string[]): Promise<void> {
    await this.apiRequest(`/conversations/${conversationId}/participants`, {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  }

  /**
   * Archive/unarchive a conversation
   */
  async archiveConversation(conversationId: string, archived: boolean): Promise<void> {
    await this.apiRequest(`/conversations/${conversationId}/archive`, {
      method: 'PATCH',
      body: JSON.stringify({ archived }),
    });
  }

  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    options: { limit?: number; offset?: number; before?: string } = {}
  ): Promise<Message[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.before) params.append('before', options.before);

    const response = await this.apiRequest(`/conversations/${conversationId}/messages?${params.toString()}`);
    // Backend returns { success, messages, conversationId, total } - extract messages array
    const messages = response.messages || response || [];

    if (!Array.isArray(messages)) {
      console.error('[MessagingService] Invalid messages response:', response);
      return [];
    }

    return messages;
  }

  /**
   * Send a new message
   */
  async sendMessage(messageData: {
    conversationId: string;
    type: MessageType;
    content: string;
    priority?: Priority;
    attachments?: File[];
    mentions?: string[];
    replyTo?: string;
    threadId?: string;
    metadata?: Message['metadata'];
  }): Promise<Message> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    // Handle file uploads if present
    let attachments: MessageAttachment[] = [];
    if (messageData.attachments && messageData.attachments.length > 0) {
      attachments = await this.uploadFiles(messageData.attachments);
    }

    const message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'> = {
      conversationId: messageData.conversationId,
      type: messageData.type,
      content: messageData.content,
      author: this.currentUser,
      replyTo: messageData.replyTo,
      threadId: messageData.threadId,
      mentions: messageData.mentions,
      attachments,
      metadata: messageData.metadata,
      status: 'sending',
      isEdited: false,
    };

    // Send via API
    const savedMessage = await this.apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });

    // Send via real-time socket
    socketService.sendMessage({
      conversationId: messageData.conversationId,
      content: messageData.content,
      type: messageData.type,
      priority: messageData.priority,
      author: this.currentUser,
      attachments,
      mentions: messageData.mentions,
      replyTo: messageData.replyTo,
      threadId: messageData.threadId,
    });

    return savedMessage;
  }

  /**
   * Edit an existing message
   */
  async editMessage(messageId: string, content: string): Promise<Message> {
    return this.apiRequest(`/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    await this.apiRequest(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search messages across conversations
   */
  async searchMessages(options: MessageSearchOptions): Promise<Message[]> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else {
          params.append(key, value.toString());
        }
      }
    });

    return this.apiRequest(`/messages/search?${params.toString()}`);
  }

  /**
   * Get replies for a message thread
   */
  async getThreadReplies(
    threadId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Message[]> {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());

    return this.apiRequest(`/threads/${threadId}/replies?${params.toString()}`);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, conversationId: string): Promise<void> {
    socketService.markMessageAsRead(messageId, conversationId);
    await this.apiRequest(`/messages/${messageId}/read`, {
      method: 'POST',
    });
  }

  /**
   * Add reaction to message
   */
  async addReaction(messageId: string, conversationId: string, reaction: string): Promise<void> {
    socketService.addReaction(messageId, conversationId, reaction);
    await this.apiRequest(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, conversationId: string, reaction: string): Promise<void> {
    socketService.removeReaction(messageId, conversationId, reaction);
    await this.apiRequest(`/messages/${messageId}/reactions/${encodeURIComponent(reaction)}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // FILE UPLOAD & SHARING
  // ========================================

  /**
   * Upload files and return attachment metadata
   */
  private async uploadFiles(files: File[]): Promise<MessageAttachment[]> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });

    const response = await fetch(`${this.apiBaseUrl}/files/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  /**
   * Get notifications for current user
   */
  async getNotifications(options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}): Promise<Notification[]> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await this.apiRequest(`/notifications?${params.toString()}`);
    // Backend returns { success, notifications, total } - extract notifications array
    const notifications = response.notifications || response || [];

    if (!Array.isArray(notifications)) {
      console.error('[MessagingService] Invalid notifications response:', response);
      return [];
    }

    return notifications;
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.apiRequest('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ ids: [notificationId] }),
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    await this.apiRequest('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ all: true }),
    });
  }

  /**
   * Snooze notification
   */
  async snoozeNotification(notificationId: string, snoozeUntil: Date): Promise<void> {
    await this.apiRequest(`/notifications/${notificationId}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ snoozeUntil: snoozeUntil.toISOString() }),
    });
  }

  // ========================================
  // DESIGN REVIEW WORKFLOW
  // ========================================

  /**
   * Create a design review request
   */
  async createDesignReview(data: {
    messageId: string;
    fileId: string;
    projectId: string;
    reviewType: DesignReview['reviewType'];
    assignedTo: string[];
    deadline?: Date;
  }): Promise<DesignReview> {
    return this.apiRequest('/design-reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Submit design review feedback
   */
  async submitDesignReview(
    reviewId: string,
    feedback: DesignReview['feedback']
  ): Promise<DesignReview> {
    return this.apiRequest(`/design-reviews/${reviewId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  }

  // ========================================
  // CONSULTATION SESSIONS
  // ========================================

  /**
   * Schedule a consultation session
   */
  async scheduleConsultation(data: {
    title: string;
    description: string;
    type: ConsultationSession['type'];
    participants: string[];
    scheduledAt: Date;
    duration: number;
    agenda: string[];
  }): Promise<ConsultationSession> {
    return this.apiRequest('/consultations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update consultation session
   */
  async updateConsultation(
    sessionId: string,
    updates: Partial<ConsultationSession>
  ): Promise<ConsultationSession> {
    return this.apiRequest(`/consultations/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ========================================
  // REAL-TIME FEATURES
  // ========================================

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string) {
    socketService.startTyping(conversationId);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string) {
    socketService.stopTyping(conversationId);
  }

  /**
   * Join conversation for real-time updates
   */
  joinConversation(conversationId: string) {
    socketService.joinConversation(conversationId);
  }

  /**
   * Leave conversation
   */
  leaveConversation(conversationId: string) {
    socketService.leaveConversation(conversationId);
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================

  /**
   * Subscribe to real-time events
   */
  onMessageReceived(callback: (message: Message) => void) {
    socketService.on('message:received', callback);
  }

  onTypingStarted(callback: (data: { conversationId: string; userId: string; timestamp: Date }) => void) {
    socketService.on('typing:started', callback);
  }

  onTypingStopped(callback: (data: { conversationId: string; userId: string; timestamp: Date }) => void) {
    socketService.on('typing:stopped', callback);
  }

  onUserOnline(callback: (user: any) => void) {
    socketService.on('user:online', callback);
  }

  onUserOffline(callback: (user: any) => void) {
    socketService.on('user:offline', callback);
  }

  onMentionReceived(callback: (notification: any) => void) {
    socketService.on('notification:mention', callback);
  }

  /**
   * Remove event listeners
   */
  off(event: string, callback: Function) {
    socketService.off(event as any, callback as any);
  }

  /**
   * Get current user
   */
  getCurrentUser(): MessageUser | null {
    return this.currentUser;
  }
}

// Export singleton instance
export const messagingService = new MessagingService();
export default messagingService;