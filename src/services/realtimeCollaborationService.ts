/**
 * Real-time Collaboration Service
 * Manages WebSocket connections for live collaboration features
 */

import { io, Socket } from 'socket.io-client';
import { MessageUser } from '../types/messaging';

export interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  isTyping: boolean;
  lastSeen: Date;
  currentView?: string;
}

export interface CollaborationEvent {
  type: 'cursor_move' | 'user_join' | 'user_leave' | 'typing_start' | 'typing_stop' | 'annotation_add' | 'annotation_update' | 'annotation_delete' | 'message_send' | 'view_change';
  userId: string;
  conversationId: string;
  data: any;
  timestamp: Date;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
  isTyping: boolean;
}

class RealtimeCollaborationService {
  private socket: Socket | null = null;
  private currentUser: MessageUser | null = null;
  private presenceUsers = new Map<string, PresenceUser>();
  private listeners = new Map<string, Set<Function>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  // User colors for visual distinction
  private userColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    try {
      this.socket = io('ws://localhost:3001', {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.warn('WebSocket connection failed, running in offline mode:', error);
      // Fallback to local-only mode
      this.setupOfflineMode();
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
      this.reconnectAttempts = 0;

      if (this.currentUser) {
        this.joinAsUser(this.currentUser);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      this.emit('connection_status', { connected: false });
    });

    this.socket.on('user_joined', (user: PresenceUser) => {
      this.presenceUsers.set(user.id, user);
      this.emit('user_joined', user);
      this.emit('presence_update', this.getPresenceUsers());
    });

    this.socket.on('user_left', (userId: string) => {
      this.presenceUsers.delete(userId);
      this.emit('user_left', { userId });
      this.emit('presence_update', this.getPresenceUsers());
    });

    this.socket.on('cursor_moved', (data: { userId: string; position: { x: number; y: number }; conversationId: string }) => {
      const user = this.presenceUsers.get(data.userId);
      if (user) {
        user.cursor = data.position;
        this.presenceUsers.set(data.userId, user);
        this.emit('cursor_move', data);
      }
    });

    this.socket.on('typing_indicator', (data: TypingIndicator) => {
      this.emit('typing_indicator', data);
    });

    this.socket.on('annotation_event', (event: CollaborationEvent) => {
      this.emit('annotation_event', event);
    });

    this.socket.on('message_event', (event: CollaborationEvent) => {
      this.emit('message_event', event);
    });

    this.socket.on('view_changed', (data: { userId: string; view: string; conversationId: string }) => {
      const user = this.presenceUsers.get(data.userId);
      if (user) {
        user.currentView = data.view;
        this.presenceUsers.set(data.userId, user);
        this.emit('view_change', data);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnection attempts reached, switching to offline mode');
        this.setupOfflineMode();
      }
    });
  }

  private setupOfflineMode() {
    // Create a mock socket-like interface for offline operation
    console.log('Running in offline collaboration mode');
    this.emit('connection_status', { connected: false, offline: true });
  }

  public connect() {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  public disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.presenceUsers.clear();
  }

  public joinAsUser(user: MessageUser) {
    this.currentUser = user;

    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join as user');
      return;
    }

    const presenceUser: PresenceUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      color: this.getUserColor(user.id),
      isTyping: false,
      lastSeen: new Date(),
    };

    this.socket.emit('join_user', presenceUser);
  }

  public joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join conversation');
      return;
    }

    this.socket.emit('join_conversation', {
      conversationId,
      userId: this.currentUser?.id
    });
  }

  public leaveConversation(conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('leave_conversation', {
      conversationId,
      userId: this.currentUser?.id
    });
  }

  public sendCursorPosition(conversationId: string, position: { x: number; y: number }) {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('cursor_move', {
      userId: this.currentUser.id,
      conversationId,
      position
    });
  }

  public sendTypingIndicator(conversationId: string, isTyping: boolean) {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('typing_indicator', {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      conversationId,
      isTyping
    });
  }

  public sendAnnotationEvent(type: 'add' | 'update' | 'delete', conversationId: string, annotationData: any) {
    if (!this.socket?.connected || !this.currentUser) return;

    const event: CollaborationEvent = {
      type: `annotation_${type}` as CollaborationEvent['type'],
      userId: this.currentUser.id,
      conversationId,
      data: annotationData,
      timestamp: new Date()
    };

    this.socket.emit('annotation_event', event);
  }

  public sendMessageEvent(conversationId: string, messageData: any) {
    if (!this.socket?.connected || !this.currentUser) return;

    const event: CollaborationEvent = {
      type: 'message_send',
      userId: this.currentUser.id,
      conversationId,
      data: messageData,
      timestamp: new Date()
    };

    this.socket.emit('message_event', event);
  }

  public sendViewChange(conversationId: string, view: string) {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('view_change', {
      userId: this.currentUser.id,
      conversationId,
      view
    });
  }

  public getPresenceUsers(): PresenceUser[] {
    return Array.from(this.presenceUsers.values())
      .filter(user => user.id !== this.currentUser?.id); // Exclude current user
  }

  public getUserColor(userId: string): string {
    // Generate consistent color based on user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.userColors[Math.abs(hash) % this.userColors.length];
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public getCurrentUser(): MessageUser | null {
    return this.currentUser;
  }

  // Event system
  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in collaboration event callback:', error);
        }
      });
    }
  }

  // Cleanup
  public destroy() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.presenceUsers.clear();
    this.listeners.clear();
    this.currentUser = null;
  }
}

// Singleton instance
export const realtimeCollaborationService = new RealtimeCollaborationService();

export default realtimeCollaborationService;