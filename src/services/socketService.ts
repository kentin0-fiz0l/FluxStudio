/**
 * Real-time Socket.IO Service for Flux Studio
 * Handles WebSocket connections, real-time messaging, and presence tracking
 */

import { MessageUser, Message, UserPresence } from '../types/messaging';
import { socketLogger } from '@/services/logging';
import { BaseSocketService } from './BaseSocketService';

// Project presence member
export interface ProjectPresenceMember {
  userId: string;
  userName: string;
  avatar?: string;
  joinedAt: string;
  isOnline: boolean;
}

// Pulse event from server
export interface PulseEvent {
  projectId: string;
  event: unknown;
  type: 'activity' | 'attention';
  timestamp: string;
}

export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: () => void;

  // Message events
  'message:received': (message: Message) => void;
  'message:reaction-added': (reaction: { messageId: string; reaction: string; userId: string; timestamp: Date }) => void;
  'message:status-updated': (update: { messageId: string; status: string; readBy: string; timestamp: Date }) => void;

  // Typing events
  'typing:started': (data: { conversationId: string; userId: string; timestamp: Date }) => void;
  'typing:stopped': (data: { conversationId: string; userId: string; timestamp: Date }) => void;

  // Presence events
  'user:online': (user: UserPresence) => void;
  'user:offline': (user: UserPresence) => void;
  'user:joined-conversation': (data: { conversationId: string; userId: string; timestamp: Date }) => void;
  'user:left-conversation': (data: { conversationId: string; userId: string; timestamp: Date }) => void;

  // Notification events
  'notification:mention': (notification: {
    messageId: string;
    conversationId: string;
    mentionedBy: MessageUser;
    content: string;
    priority: string;
    timestamp: Date;
  }) => void;

  // Project presence events
  'project:presence': (data: {
    projectId: string;
    presence: ProjectPresenceMember[];
    event: 'join' | 'leave';
    userId?: string;
    userName?: string;
  }) => void;

  // Pulse real-time events
  'pulse:event': (event: PulseEvent) => void;

  // Dashboard metrics events
  'metrics:update': (data: { metrics: Record<string, unknown> }) => void;
  'activity:update': (data: { activityData: number[] }) => void;
  'projects:status': (data: { statusCounts: number[] }) => void;

  // Notification events
  'notification:new': (notification: { id: string; type: string; title: string; message: string; timestamp: Date }) => void;
}

class SocketService extends BaseSocketService {
  private authFailed = false;
  private currentUserId: string | null = null;
  private onlineListener: (() => void) | null = null;

  constructor() {
    super({ namespace: '/messaging' });
  }

  protected setupDomainHandlers(): void {
    if (!this.socket) return;

    // Override base connect handler to add re-authentication
    this.socket.on('connect', () => {
      socketLogger.info('Connected to WebSocket server');
      if (this.currentUserId && this.socket) {
        this.socket.emit('user:join', { userId: this.currentUserId });
        socketLogger.debug(`Re-authenticated user: ${this.currentUserId}`);
      }
    });

    // Override base connect_error to handle auth failures
    this.socket.on('connect_error', (error) => {
      const errorMessage = error.message || '';
      if (errorMessage.includes('unauthorized') ||
          errorMessage.includes('Authentication') ||
          errorMessage.includes('Invalid token') ||
          errorMessage.includes('jwt')) {
        socketLogger.error('Authentication error - stopping reconnection', { message: errorMessage });
        this.authFailed = true;
        this.disconnect();
        return;
      }
      if (this.reconnectAttempts < 3) {
        socketLogger.error('Connection error', error);
      } else if (this.reconnectAttempts % 3 === 0) {
        socketLogger.debug(`Connection error (attempt ${this.reconnectAttempts})`, error);
      }
    });

    // Message events
    this.socket.on('message:received', (message: Message) => {
      this.emit('message:received', message);
    });

    this.socket.on('message:reaction-added', (reaction) => {
      this.emit('message:reaction-added', reaction);
    });

    this.socket.on('message:status-updated', (update) => {
      this.emit('message:status-updated', update);
    });

    // Typing events
    this.socket.on('typing:started', (data) => {
      this.emit('typing:started', data);
    });

    this.socket.on('typing:stopped', (data) => {
      this.emit('typing:stopped', data);
    });

    // Presence events
    this.socket.on('user:online', (user) => {
      this.emit('user:online', user);
    });

    this.socket.on('user:offline', (user) => {
      this.emit('user:offline', user);
    });

    this.socket.on('user:joined-conversation', (data) => {
      this.emit('user:joined-conversation', data);
    });

    this.socket.on('user:left-conversation', (data) => {
      this.emit('user:left-conversation', data);
    });

    // Notification events
    this.socket.on('notification:mention', (notification) => {
      this.emit('notification:mention', notification);
    });

    // Project presence events
    this.socket.on('project:presence', (data) => {
      this.emit('project:presence', data);
    });

    // Pulse real-time events
    this.socket.on('pulse:event', (event) => {
      this.emit('pulse:event', event);
    });
  }

  protected handleReconnection(): void {
    if (this.authFailed) {
      socketLogger.warn('Not reconnecting due to authentication failure');
      return;
    }

    // Check if browser is offline; wait for connectivity to return
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      socketLogger.info('Browser is offline - waiting for connectivity to resume');
      if (!this.onlineListener) {
        this.onlineListener = () => {
          socketLogger.info('Browser back online - triggering reconnection');
          window.removeEventListener('online', this.onlineListener!);
          this.onlineListener = null;
          this.handleReconnection();
        };
        window.addEventListener('online', this.onlineListener);
      }
      return;
    }

    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.config.maxReconnectDelay
      );

      socketLogger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        if (this.socket && !this.authFailed) {
          this.socket.connect();
        }
      }, delay);
    } else {
      socketLogger.error('Max reconnection attempts reached - falling back to REST API');
      if (this.socket) {
        this.socket.io.opts.reconnection = false;
        this.socket.disconnect();
      }
    }
  }

  /**
   * Authenticate user with the socket server
   */
  authenticateUser(userId: string, userData?: { name: string; userType: string }) {
    this.currentUserId = userId;
    this.authFailed = false;
    this.reconnectAttempts = 0;

    if (!this.socket) {
      this.connect();
    }

    if (this.socket && this.isConnected) {
      this.socket.emit('user:join', {
        userId,
        ...userData
      });
      socketLogger.info(`Authenticated user: ${userId}`);
    }
  }

  joinConversation(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('conversation:join', conversationId, this.currentUserId);
    socketLogger.debug(`Joined conversation: ${conversationId}`);
  }

  leaveConversation(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('conversation:leave', conversationId, this.currentUserId);
    socketLogger.debug(`Left conversation: ${conversationId}`);
  }

  joinProject(projectId: string, userData?: { userName?: string }) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('project:join', projectId, {
      userId: this.currentUserId,
      userName: userData?.userName || 'Unknown',
    });
    socketLogger.debug(`Joined project: ${projectId}`);
  }

  leaveProject(projectId: string, userData?: { userName?: string }) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('project:leave', projectId, {
      userId: this.currentUserId,
      userName: userData?.userName || 'Unknown',
    });
    socketLogger.debug(`Left project: ${projectId}`);
  }

  sendMessage(messageData: {
    conversationId: string;
    content: string;
    type?: string;
    priority?: string;
    author: MessageUser;
    attachments?: unknown[];
    mentions?: string[];
    replyTo?: string;
  }) {
    if (!this.socket) return;
    this.socket.emit('message:send', messageData);
  }

  startTyping(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('typing:start', conversationId, this.currentUserId);
  }

  stopTyping(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('typing:stop', conversationId, this.currentUserId);
  }

  addReaction(messageId: string, conversationId: string, reaction: string) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('message:react', messageId, conversationId, reaction, this.currentUserId);
  }

  removeReaction(messageId: string, conversationId: string, reaction: string) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('message:unreact', messageId, conversationId, reaction, this.currentUserId);
  }

  markMessageAsRead(messageId: string, conversationId: string) {
    if (!this.socket || !this.currentUserId) return;
    this.socket.emit('message:read', messageId, conversationId, this.currentUserId);
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => { this.eventListeners.get(event)?.delete(callback); };
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  disconnect() {
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
      this.onlineListener = null;
    }
    this.currentUserId = null;
    super.disconnect();
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
