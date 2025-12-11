/**
 * Real-time Socket.IO Service for Flux Studio
 * Handles WebSocket connections, real-time messaging, and presence tracking
 */

import { io, Socket } from 'socket.io-client';
import { MessageUser, Message, TypingIndicator, UserPresence } from '../types/messaging';

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
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private authFailed = false;
  private currentUserId: string | null = null;
  private eventListeners = new Map<string, Set<Function>>();

  constructor() {
    // Don't auto-connect - wait for authentication
  }

  /**
   * Initialize socket connection
   * Updated for unified backend with /messaging namespace
   */
  private connect() {
    // Don't connect without auth token (auth_token is the primary key used by AuthContext)
    const authToken = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    if (!authToken) {
      console.log('⚠️ No auth token found, skipping Socket.IO connection');
      return;
    }

    // Use the current origin for production, localhost:3001 for development
    const isDevelopment = window.location.hostname === 'localhost';
    // Socket.IO server is at /api/socket.io path, namespace is /messaging
    const socketUrl = isDevelopment ? 'http://localhost:3001' : window.location.origin;

    console.log(`🔌 Connecting to Socket.IO at ${socketUrl}/messaging`);

    // Connect to /messaging namespace on unified backend
    this.socket = io(`${socketUrl}/messaging`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000,
      path: '/api/socket.io', // Socket.IO path on DigitalOcean App Platform
      auth: {
        token: authToken
      }
    });

    this.setupConnectionHandlers();
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Re-authenticate if we have a user
      if (this.currentUserId) {
        this.socket.emit('user:join', {
          userId: this.currentUserId
        });
        console.log(`🔐 Re-authenticated user: ${this.currentUserId}`);
      }

      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      this.emit('disconnect');

      // Attempt reconnection if not a manual disconnect
      if (reason === 'io server disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      const errorMessage = error.message || '';
      // Check if this is an auth error - stop reconnecting
      if (errorMessage.includes('unauthorized') ||
          errorMessage.includes('Authentication') ||
          errorMessage.includes('Invalid token') ||
          errorMessage.includes('jwt')) {
        console.error('🔴 Authentication error - stopping reconnection:', errorMessage);
        this.authFailed = true;
        this.disconnect();
        return;
      }
      console.error('🔴 Connection error:', error);
      this.handleReconnection();
    });

    // Set up message event listeners
    this.setupMessageHandlers();
  }

  /**
   * Set up message and real-time event handlers
   */
  private setupMessageHandlers() {
    if (!this.socket) return;

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
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnection() {
    // Don't reconnect if auth failed
    if (this.authFailed) {
      console.log('⚠️ Not reconnecting due to authentication failure');
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        if (this.socket && !this.authFailed) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('🔴 Max reconnection attempts reached - falling back to REST API');
    }
  }

  /**
   * Authenticate user with the socket server
   */
  authenticateUser(userId: string, userData?: { name: string; userType: string }) {
    this.currentUserId = userId;
    // Reset auth failed flag on new auth attempt
    this.authFailed = false;
    this.reconnectAttempts = 0;

    // Initialize connection if not already connected
    if (!this.socket) {
      this.connect();
    }

    // If socket is connected, authenticate immediately
    if (this.socket && this.isConnected) {
      this.socket.emit('user:join', {
        userId,
        ...userData
      });
      console.log(`🔐 Authenticated user: ${userId}`);
    }
    // Otherwise, authentication will happen in the connect handler
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('conversation:join', conversationId, this.currentUserId);
    console.log(`🏠 Joined conversation: ${conversationId}`);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('conversation:leave', conversationId, this.currentUserId);
    console.log(`🚪 Left conversation: ${conversationId}`);
  }

  /**
   * Send a message in real-time
   */
  sendMessage(messageData: {
    conversationId: string;
    content: string;
    type?: string;
    priority?: string;
    author: MessageUser;
    attachments?: any[];
    mentions?: string[];
    replyTo?: string;
  }) {
    if (!this.socket) return;

    this.socket.emit('message:send', messageData);
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('typing:start', conversationId, this.currentUserId);
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string) {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('typing:stop', conversationId, this.currentUserId);
  }

  /**
   * Add reaction to a message
   */
  addReaction(messageId: string, conversationId: string, reaction: string) {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('message:react', messageId, conversationId, reaction, this.currentUserId);
  }

  /**
   * Remove reaction from a message
   */
  removeReaction(messageId: string, conversationId: string, reaction: string) {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('message:unreact', messageId, conversationId, reaction, this.currentUserId);
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: string, conversationId: string) {
    if (!this.socket || !this.currentUserId) return;

    this.socket.emit('message:read', messageId, conversationId, this.currentUserId);
  }

  /**
   * Add event listener
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, ...args: any[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentUserId = null;
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;