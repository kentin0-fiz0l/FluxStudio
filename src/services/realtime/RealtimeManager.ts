/**
 * RealtimeManager - Unified real-time connection manager
 *
 * Consolidates all socket connections into a single manager with channels.
 * This replaces the fragmented socket services with a unified API.
 *
 * Usage:
 *   import { realtime } from '@/services/realtime';
 *   realtime.connect(authToken);
 *   realtime.channels.messaging.onMessage(handler);
 *   realtime.channels.projects.join(projectId);
 */

import { io, Socket } from 'socket.io-client';

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RealtimeConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface ChannelSubscription {
  unsubscribe: () => void;
}

export type EventHandler<T = unknown> = (data: T) => void;

// ============================================================================
// Channel Base Class
// ============================================================================

abstract class BaseChannel {
  protected socket: Socket | null = null;
  protected subscriptions = new Map<string, Set<EventHandler>>();

  setSocket(socket: Socket | null) {
    this.socket = socket;
  }

  protected on<T>(event: string, handler: EventHandler<T>): ChannelSubscription {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)!.add(handler as EventHandler);

    // Register with socket if connected
    if (this.socket) {
      this.socket.on(event, handler as EventHandler);
    }

    return {
      unsubscribe: () => {
        this.subscriptions.get(event)?.delete(handler as EventHandler);
        this.socket?.off(event, handler as EventHandler);
      },
    };
  }

  protected emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  // Re-register all subscriptions when socket reconnects
  resubscribe() {
    if (!this.socket) return;
    this.subscriptions.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket!.on(event, handler);
      });
    });
  }

  // Clear all subscriptions
  clear() {
    this.subscriptions.clear();
  }
}

// ============================================================================
// Messaging Channel
// ============================================================================

export interface Message {
  id: string;
  conversationId: string;
  authorId?: string;
  content?: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

class MessagingChannel extends BaseChannel {
  joinConversation(conversationId: string) {
    this.emit('conversation:join', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.emit('conversation:leave', { conversationId });
  }

  sendMessage(conversationId: string, content: string, options?: { replyToId?: string }) {
    this.emit('message:send', { conversationId, content, ...options });
  }

  startTyping(conversationId: string) {
    this.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId: string) {
    this.emit('typing:stop', { conversationId });
  }

  onMessage(handler: EventHandler<Message>): ChannelSubscription {
    return this.on('message:received', handler);
  }

  onMessageUpdated(handler: EventHandler<Message>): ChannelSubscription {
    return this.on('message:updated', handler);
  }

  onMessageDeleted(handler: EventHandler<{ messageId: string; conversationId: string }>): ChannelSubscription {
    return this.on('message:deleted', handler);
  }

  onTypingStarted(handler: EventHandler<TypingEvent>): ChannelSubscription {
    return this.on('typing:started', handler);
  }

  onTypingStopped(handler: EventHandler<TypingEvent>): ChannelSubscription {
    return this.on('typing:stopped', handler);
  }
}

// ============================================================================
// Projects Channel
// ============================================================================

export interface ProjectPresence {
  userId: string;
  userName: string;
  avatar?: string;
  joinedAt: string;
  isOnline: boolean;
}

export interface PulseEvent {
  projectId: string;
  type: 'activity' | 'attention';
  event: unknown;
  timestamp: string;
}

class ProjectsChannel extends BaseChannel {
  join(projectId: string) {
    this.emit('project:join', { projectId });
  }

  leave(projectId: string) {
    this.emit('project:leave', { projectId });
  }

  onPresenceUpdate(handler: EventHandler<{ projectId: string; presence: ProjectPresence[]; event: 'join' | 'leave' }>): ChannelSubscription {
    return this.on('project:presence', handler);
  }

  onPulseEvent(handler: EventHandler<PulseEvent>): ChannelSubscription {
    return this.on('pulse:event', handler);
  }

  onActivityUpdate(handler: EventHandler<{ projectId: string; activity: unknown }>): ChannelSubscription {
    return this.on('project:activity', handler);
  }
}

// ============================================================================
// Notifications Channel
// ============================================================================

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  read: boolean;
  createdAt: string;
}

class NotificationsChannel extends BaseChannel {
  markAsRead(notificationId: string) {
    this.emit('notification:read', { notificationId });
  }

  markAllAsRead() {
    this.emit('notification:read-all');
  }

  onNotification(handler: EventHandler<Notification>): ChannelSubscription {
    return this.on('notification:new', handler);
  }

  onMention(handler: EventHandler<{ messageId: string; conversationId: string; mentionedBy: unknown }>): ChannelSubscription {
    return this.on('notification:mention', handler);
  }
}

// ============================================================================
// Presence Channel
// ============================================================================

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
}

class PresenceChannel extends BaseChannel {
  setStatus(status: 'online' | 'away' | 'busy') {
    this.emit('presence:status', { status });
  }

  onUserOnline(handler: EventHandler<UserPresence>): ChannelSubscription {
    return this.on('user:online', handler);
  }

  onUserOffline(handler: EventHandler<UserPresence>): ChannelSubscription {
    return this.on('user:offline', handler);
  }

  onStatusChange(handler: EventHandler<UserPresence>): ChannelSubscription {
    return this.on('presence:changed', handler);
  }
}

// ============================================================================
// Collaboration Channel (Design Boards, MetMap, etc.)
// ============================================================================

export interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName?: string;
  color?: string;
}

export interface CollaborationEdit {
  entityId: string;
  entityType: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  userId: string;
  timestamp: string;
}

class CollaborationChannel extends BaseChannel {
  joinBoard(boardId: string) {
    this.emit('board:join', { boardId });
  }

  leaveBoard(boardId: string) {
    this.emit('board:leave', { boardId });
  }

  updateCursor(boardId: string, position: { x: number; y: number }) {
    this.emit('cursor:move', { boardId, ...position });
  }

  broadcastEdit(boardId: string, edit: Omit<CollaborationEdit, 'userId' | 'timestamp'>) {
    this.emit('board:edit', { boardId, ...edit });
  }

  onCursorMove(handler: EventHandler<CursorPosition>): ChannelSubscription {
    return this.on('cursor:moved', handler);
  }

  onEdit(handler: EventHandler<CollaborationEdit>): ChannelSubscription {
    return this.on('board:edited', handler);
  }

  onUserJoined(handler: EventHandler<{ boardId: string; userId: string; userName: string }>): ChannelSubscription {
    return this.on('board:user-joined', handler);
  }

  onUserLeft(handler: EventHandler<{ boardId: string; userId: string }>): ChannelSubscription {
    return this.on('board:user-left', handler);
  }
}

// ============================================================================
// RealtimeManager
// ============================================================================

class RealtimeManager {
  private socket: Socket | null = null;
  private config: RealtimeConfig;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners = new Set<EventHandler<ConnectionStatus>>();
  private reconnectAttempts = 0;
  private authToken: string | null = null;

  // Channels
  public readonly channels = {
    messaging: new MessagingChannel(),
    projects: new ProjectsChannel(),
    notifications: new NotificationsChannel(),
    presence: new PresenceChannel(),
    collaboration: new CollaborationChannel(),
  };

  constructor(config: RealtimeConfig = {}) {
    this.config = {
      autoConnect: false,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      ...config,
    };
  }

  // -------------------------------------------------------------------------
  // Connection Management
  // -------------------------------------------------------------------------

  connect(authToken?: string) {
    if (authToken) {
      this.authToken = authToken;
    }

    // Get token from storage if not provided
    const token = this.authToken || localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    if (!token) {
      console.warn('[RealtimeManager] No auth token available, skipping connection');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    this.setStatus('connecting');

    // Use environment-based detection instead of hostname check
    const isDev = import.meta.env.DEV;
    const url = this.config.url || (isDev ? 'http://localhost:3001' : window.location.origin);

    this.socket = io(`${url}/messaging`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.config.reconnectAttempts,
      reconnectionDelay: this.config.reconnectDelay,
      path: '/api/socket.io',
    });

    this.setupSocketListeners();
    this.updateChannelSockets();
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.setStatus('disconnected');
    this.updateChannelSockets();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.resubscribeAllChannels();
    });

    this.socket.on('disconnect', (_reason) => {
      this.setStatus('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[RealtimeManager] Connection error:', error.message);
      this.reconnectAttempts++;
      if (this.reconnectAttempts < (this.config.reconnectAttempts || 5)) {
        this.setStatus('reconnecting');
      } else {
        this.setStatus('error');
      }
    });

    this.socket.io.on('reconnect', () => {
      this.setStatus('connected');
      this.resubscribeAllChannels();
    });
  }

  private updateChannelSockets() {
    Object.values(this.channels).forEach((channel) => {
      channel.setSocket(this.socket);
    });
  }

  private resubscribeAllChannels() {
    Object.values(this.channels).forEach((channel) => {
      channel.resubscribe();
    });
  }

  // -------------------------------------------------------------------------
  // Status Management
  // -------------------------------------------------------------------------

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  onStatusChange(handler: EventHandler<ConnectionStatus>): ChannelSubscription {
    this.statusListeners.add(handler);
    return {
      unsubscribe: () => this.statusListeners.delete(handler),
    };
  }

  // -------------------------------------------------------------------------
  // Direct Socket Access (for advanced use cases)
  // -------------------------------------------------------------------------

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  on<T>(event: string, handler: EventHandler<T>): ChannelSubscription {
    if (this.socket) {
      this.socket.on(event, handler as EventHandler);
    }
    return {
      unsubscribe: () => this.socket?.off(event, handler as EventHandler),
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const realtime = new RealtimeManager();
export default realtime;
