/**
 * Messaging Socket Service
 * Handles real-time messaging for conversations using the new conversation-based events
 */

import { io, Socket } from 'socket.io-client';

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  authorId: string;
  content: string;
  replyToMessageId?: string;
  assetId?: string;
  projectId?: string;
  isSystemMessage: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  reactions?: MessageReactionSummary[];
  author?: {
    id: string;
    email: string;
    displayName?: string;
  };
}

export interface Conversation {
  id: string;
  organizationId?: string;
  name?: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  members?: ConversationMember[];
  lastMessage?: ConversationMessage;
  unreadCount?: number;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: string;
  lastReadMessageId?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    displayName?: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  entityId?: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PinnedMessage {
  pinId: string;
  pinnedBy: string;
  pinnedAt: string;
  message: ConversationMessage;
}

export interface ConversationPinsUpdatedPayload {
  conversationId: string;
  pins: PinnedMessage[];
  updatedBy: string;
}

type EventCallback = (...args: unknown[]) => void;

class MessagingSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private isConnected = false;
  private currentConversationId: string | null = null;

  connect(): void {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('[MessagingSocket] No auth token, skipping connection');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    const isDevelopment = window.location.hostname === 'localhost';
    const socketUrl = isDevelopment ? 'http://localhost:3001' : window.location.origin;

    this.socket = io(`${socketUrl}/messaging`, {
      path: '/api/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[MessagingSocket] Connected');
      this.isConnected = true;
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[MessagingSocket] Disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnect');
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('[MessagingSocket] Error:', error);
      this.emit('error', error);
    });

    // User status events
    this.socket.on('user:status', (data: { userId: string; status: string }) => {
      this.emit('user:status', data);
    });

    // Conversation events
    this.socket.on('conversation:messages', (data: { conversationId: string; messages: ConversationMessage[]; hasMore: boolean }) => {
      this.emit('conversation:messages', data);
    });

    this.socket.on('conversation:user-joined', (data: { conversationId: string; userId: string; userEmail: string }) => {
      this.emit('conversation:user-joined', data);
    });

    this.socket.on('conversation:user-left', (data: { conversationId: string; userId: string }) => {
      this.emit('conversation:user-left', data);
    });

    // Message events
    this.socket.on('conversation:message:new', (data: { conversationId: string; message: ConversationMessage }) => {
      this.emit('conversation:message:new', data);
    });

    this.socket.on('conversation:message:notify', (data: { conversationId: string; message: ConversationMessage; senderEmail: string }) => {
      this.emit('conversation:message:notify', data);
    });

    this.socket.on('conversation:message:deleted', (data: { conversationId: string; messageId: string; deletedBy: string }) => {
      this.emit('conversation:message:deleted', data);
    });

    // Typing events
    this.socket.on('conversation:user-typing', (data: { conversationId: string; userId: string; userEmail: string }) => {
      this.emit('conversation:user-typing', data);
    });

    this.socket.on('conversation:user-stopped-typing', (data: { conversationId: string; userId: string }) => {
      this.emit('conversation:user-stopped-typing', data);
    });

    // Read receipt events
    this.socket.on('conversation:read-receipt', (data: { conversationId: string; userId: string; messageId: string }) => {
      this.emit('conversation:read-receipt', data);
    });

    this.socket.on('conversation:read:confirmed', (data: { conversationId: string; messageId: string }) => {
      this.emit('conversation:read:confirmed', data);
    });

    // Reaction events
    this.socket.on('conversation:reaction:updated', (data: { messageId: string; reactions: MessageReactionSummary[]; updatedBy: string }) => {
      this.emit('conversation:reaction:updated', data);
    });

    // Pin events
    this.socket.on('conversation:pins:updated', (data: ConversationPinsUpdatedPayload) => {
      this.emit('conversation:pins:updated', data);
    });

    // Message edit events
    this.socket.on('conversation:message:edited', (data: { message: ConversationMessage }) => {
      this.emit('conversation:message:edited', data);
    });

    // Notification events
    this.socket.on('notification:new', (notification: Notification) => {
      this.emit('notification:new', notification);
    });

    this.socket.on('notification:updated', (notification: Notification) => {
      this.emit('notification:updated', notification);
    });

    this.socket.on('notifications:unread-count', (data: { count: number }) => {
      this.emit('notifications:unread-count', data);
    });

    this.socket.on('notifications:all-marked-read', () => {
      this.emit('notifications:all-marked-read');
    });
  }

  disconnect(): void {
    if (this.currentConversationId) {
      this.leaveConversation(this.currentConversationId);
    }
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  // ========================================
  // CONVERSATION ACTIONS
  // ========================================

  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('[MessagingSocket] Not connected');
      return;
    }
    this.currentConversationId = conversationId;
    this.socket.emit('conversation:join', conversationId);
  }

  leaveConversation(conversationId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:leave', conversationId);
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
  }

  // ========================================
  // MESSAGE ACTIONS
  // ========================================

  sendMessage(data: {
    conversationId: string;
    text: string;
    replyToMessageId?: string;
    assetId?: string;
    projectId?: string;
  }): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:message:send', data);
  }

  deleteMessage(conversationId: string, messageId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:message:delete', { conversationId, messageId });
  }

  // ========================================
  // REACTIONS
  // ========================================

  addReaction(
    messageId: string,
    emoji: string,
    callback?: (response: { ok: boolean; reactions?: MessageReactionSummary[]; error?: string }) => void
  ): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:reaction:add', { messageId, emoji }, callback);
  }

  removeReaction(
    messageId: string,
    emoji: string,
    callback?: (response: { ok: boolean; reactions?: MessageReactionSummary[]; error?: string }) => void
  ): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:reaction:remove', { messageId, emoji }, callback);
  }

  // ========================================
  // PINS
  // ========================================

  pinMessage(
    messageId: string,
    callback?: (response: { ok: boolean; pins?: PinnedMessage[]; error?: string }) => void
  ): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:pin', { messageId }, callback);
  }

  unpinMessage(
    messageId: string,
    callback?: (response: { ok: boolean; pins?: PinnedMessage[]; error?: string }) => void
  ): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:unpin', { messageId }, callback);
  }

  // ========================================
  // MESSAGE EDITING
  // ========================================

  editMessage(
    conversationId: string,
    messageId: string,
    content: string,
    callback?: (response: { ok: boolean; message?: ConversationMessage; error?: string }) => void
  ): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:message:edit', { conversationId, messageId, content }, callback);
  }

  // ========================================
  // TYPING INDICATORS
  // ========================================

  startTyping(conversationId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:typing:start', conversationId);
  }

  stopTyping(conversationId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:typing:stop', conversationId);
  }

  // ========================================
  // READ RECEIPTS
  // ========================================

  markAsRead(conversationId: string, messageId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('conversation:read', { conversationId, messageId });
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  subscribeToNotifications(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('notifications:subscribe');
  }

  markNotificationRead(notificationId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('notification:mark-read', notificationId);
  }

  markAllNotificationsRead(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('notifications:mark-all-read');
  }

  // ========================================
  // EVENT HANDLING
  // ========================================

  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach(callback => callback(...args));
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }
}

export const messagingSocketService = new MessagingSocketService();
