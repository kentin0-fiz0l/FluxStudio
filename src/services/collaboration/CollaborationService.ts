/**
 * Unified Collaboration Service
 *
 * Consolidates real-time collaboration for:
 * - Document/Design editing (session-based with OT)
 * - Messaging/Conversations (presence and typing)
 *
 * @see DEBT-005: Consolidate duplicate real-time collaboration services
 */

import { io, Socket } from 'socket.io-client';
import { MessageUser } from '../../types/messaging';
import {
  CollaborationSession,
  CollaboratorPresence,
  CursorPosition,
  SelectionRange,
  EditorState,
  Operation,
  PresenceUser,
  TypingIndicator,
  CollaborationEvent,
  ConnectionStatus,
  EventHandler,
  SessionType,
} from './types';

// User colors for visual distinction
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#48DBFB', '#00D2D3', '#6C5CE7',
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
];

export class CollaborationService {
  private socket: Socket | null = null;
  private currentUser: MessageUser | null = null;

  // Session-based state (document/design)
  private sessions: Map<string, CollaborationSession> = new Map();
  private currentSession: CollaborationSession | null = null;
  private operationBuffer: Operation[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  // Presence-based state (messaging)
  private presenceUsers: Map<string, PresenceUser> = new Map();
  private currentConversationId: string | null = null;

  // Connection state
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isOfflineMode = false;

  // Event handling
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  constructor() {
    this.initializeSocket();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeSocket(): void {
    const wsUrl = import.meta.env.VITE_WS_URL ||
                  process.env.REACT_APP_WS_URL ||
                  'ws://localhost:3001';

    try {
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.setupSocketListeners();
    } catch (error) {
      console.warn('WebSocket initialization failed:', error);
      this.setupOfflineMode();
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
      this.reconnectAttempts = 0;
      this.isOfflineMode = false;
      this.emitLocal('connection_status', { connected: true } as ConnectionStatus);

      // Rejoin active sessions and conversations
      this.rejoinSessions();
      if (this.currentUser) {
        this.joinAsUser(this.currentUser);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      this.handleDisconnection();
      this.emitLocal('connection_status', { connected: false } as ConnectionStatus);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnection attempts reached, switching to offline mode');
        this.setupOfflineMode();
      }
    });

    // Session events (document/design collaboration)
    this.socket.on('session:joined', (data: CollaborationSession) => {
      this.handleSessionJoined(data);
    });

    this.socket.on('presence:update', (data: CollaboratorPresence) => {
      this.handlePresenceUpdate(data);
    });

    this.socket.on('cursor:move', (data: { userId: string; cursor: CursorPosition }) => {
      this.emitLocal('cursor:move', data);
    });

    this.socket.on('selection:change', (data: { userId: string; selection: SelectionRange }) => {
      this.emitLocal('selection:change', data);
    });

    this.socket.on('operation:broadcast', (operation: Operation) => {
      this.handleRemoteOperation(operation);
    });

    this.socket.on('sync:state', (state: EditorState) => {
      this.handleStateSync(state);
    });

    // Conversation events (messaging collaboration)
    this.socket.on('user_joined', (user: PresenceUser) => {
      this.presenceUsers.set(user.id, user);
      this.emitLocal('user_joined', user);
      this.emitLocal('presence_update', this.getPresenceUsers());
    });

    this.socket.on('user_left', (userId: string) => {
      this.presenceUsers.delete(userId);
      this.emitLocal('user_left', { userId });
      this.emitLocal('presence_update', this.getPresenceUsers());
    });

    this.socket.on('cursor_moved', (data: { userId: string; position: { x: number; y: number }; conversationId: string }) => {
      const user = this.presenceUsers.get(data.userId);
      if (user) {
        user.cursor = { ...data.position, timestamp: Date.now() };
        this.presenceUsers.set(data.userId, user);
        this.emitLocal('cursor_move', data);
      }
    });

    this.socket.on('typing_indicator', (data: TypingIndicator) => {
      this.emitLocal('typing_indicator', data);
    });

    this.socket.on('annotation_event', (event: CollaborationEvent) => {
      this.emitLocal('annotation_event', event);
    });

    this.socket.on('message_event', (event: CollaborationEvent) => {
      this.emitLocal('message_event', event);
    });

    this.socket.on('view_changed', (data: { userId: string; view: string; conversationId: string }) => {
      const user = this.presenceUsers.get(data.userId);
      if (user) {
        user.currentView = data.view;
        this.presenceUsers.set(data.userId, user);
        this.emitLocal('view_change', data);
      }
    });
  }

  private setupOfflineMode(): void {
    console.log('Running in offline collaboration mode');
    this.isOfflineMode = true;
    this.emitLocal('connection_status', { connected: false, offline: true } as ConnectionStatus);
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  connect(): void {
    if (this.socket && !this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.presenceUsers.clear();
    this.sessions.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  isOffline(): boolean {
    return this.isOfflineMode;
  }

  // ============================================================================
  // User Management
  // ============================================================================

  joinAsUser(user: MessageUser): void {
    this.currentUser = user;

    if (!this.socket?.connected) {
      console.warn('Socket not connected, user will be joined on connect');
      return;
    }

    const presenceUser: PresenceUser = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      color: this.getUserColor(user.id),
      isTyping: false,
      lastSeen: new Date(),
      status: 'online',
      device: this.detectDevice(),
    };

    this.socket.emit('join_user', presenceUser);
  }

  getCurrentUser(): MessageUser | null {
    return this.currentUser;
  }

  getUserColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  }

  // ============================================================================
  // Session-based Collaboration (Documents/Designs)
  // ============================================================================

  async joinSession(
    type: SessionType,
    resourceId: string,
    user: MessageUser
  ): Promise<CollaborationSession> {
    const sessionId = `${type}_${resourceId}`;

    // Check if already in session
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!;
    }

    const session: CollaborationSession = {
      id: sessionId,
      type,
      resourceId,
      participants: [],
      activeEditors: new Map(),
      sharedCursor: true,
      sharedSelection: true,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    const presence: CollaboratorPresence = {
      id: user.id,
      userId: user.id,
      user,
      name: user.name,
      avatar: user.avatar,
      status: 'online',
      lastSeen: new Date(),
      device: this.detectDevice(),
      color: this.getUserColor(user.id),
      isTyping: false,
    };

    this.socket?.emit('session:join', {
      sessionId,
      type,
      resourceId,
      presence,
    });

    this.sessions.set(sessionId, session);
    this.currentSession = session;
    this.startSyncInterval();

    return session;
  }

  leaveSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) return;

    this.socket?.emit('session:leave', { sessionId });
    this.sessions.delete(sessionId);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
      this.stopSyncInterval();
    }
  }

  getCurrentSession(): CollaborationSession | null {
    return this.currentSession;
  }

  // ============================================================================
  // Conversation-based Collaboration (Messaging)
  // ============================================================================

  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join conversation');
      return;
    }

    this.currentConversationId = conversationId;
    this.socket.emit('join_conversation', {
      conversationId,
      userId: this.currentUser?.id,
    });
  }

  leaveConversation(conversationId: string): void {
    if (!this.socket?.connected) return;

    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }

    this.socket.emit('leave_conversation', {
      conversationId,
      userId: this.currentUser?.id,
    });
  }

  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  // ============================================================================
  // Cursor & Selection
  // ============================================================================

  updateCursor(position: CursorPosition): void {
    if (!this.currentSession) return;

    this.socket?.emit('cursor:update', {
      sessionId: this.currentSession.id,
      cursor: position,
    });
  }

  sendCursorPosition(conversationId: string, position: { x: number; y: number }): void {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('cursor_move', {
      userId: this.currentUser.id,
      conversationId,
      position,
    });
  }

  updateSelection(selection: SelectionRange): void {
    if (!this.currentSession) return;

    this.socket?.emit('selection:update', {
      sessionId: this.currentSession.id,
      selection,
    });
  }

  // ============================================================================
  // Operations (OT for collaborative editing)
  // ============================================================================

  applyOperation(operation: Operation): void {
    if (!this.currentSession) return;

    this.operationBuffer.push(operation);
    this.emitLocal('operation:local', operation);
  }

  private handleRemoteOperation(operation: Operation): void {
    const transformed = this.transformOperation(operation);
    this.emitLocal('operation:remote', transformed);
  }

  private transformOperation(operation: Operation): Operation {
    // Simplified OT - in production, use a proper OT library like ot.js
    return operation;
  }

  private startSyncInterval(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.operationBuffer.length > 0 && this.currentSession) {
        const operations = [...this.operationBuffer];
        this.operationBuffer = [];

        this.socket?.emit('operations:batch', {
          sessionId: this.currentSession.id,
          operations,
        });
      }
    }, 100);
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ============================================================================
  // Typing Indicators
  // ============================================================================

  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('typing_indicator', {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      conversationId,
      isTyping,
    });
  }

  // ============================================================================
  // Annotations
  // ============================================================================

  sendAnnotationEvent(
    type: 'add' | 'update' | 'delete',
    conversationId: string,
    annotationData: unknown
  ): void {
    if (!this.socket?.connected || !this.currentUser) return;

    const event: CollaborationEvent = {
      type: `annotation_${type}` as CollaborationEvent['type'],
      userId: this.currentUser.id,
      conversationId,
      data: annotationData,
      timestamp: new Date(),
    };

    this.socket.emit('annotation_event', event);
  }

  // ============================================================================
  // Messages
  // ============================================================================

  sendMessageEvent(conversationId: string, messageData: unknown): void {
    if (!this.socket?.connected || !this.currentUser) return;

    const event: CollaborationEvent = {
      type: 'message_send',
      userId: this.currentUser.id,
      conversationId,
      data: messageData,
      timestamp: new Date(),
    };

    this.socket.emit('message_event', event);
  }

  // ============================================================================
  // View Changes
  // ============================================================================

  sendViewChange(conversationId: string, view: string): void {
    if (!this.socket?.connected || !this.currentUser) return;

    this.socket.emit('view_change', {
      userId: this.currentUser.id,
      conversationId,
      view,
    });
  }

  // ============================================================================
  // Comments & Reactions
  // ============================================================================

  addComment(text: string, position?: CursorPosition): void {
    if (!this.currentSession || !this.currentUser) return;

    const comment = {
      id: this.generateId(),
      text,
      position,
      userId: this.currentUser.id,
      timestamp: new Date(),
    };

    this.socket?.emit('comment:add', {
      sessionId: this.currentSession.id,
      comment,
    });
  }

  addReaction(emoji: string, targetId: string): void {
    if (!this.currentSession || !this.currentUser) return;

    this.socket?.emit('reaction:add', {
      sessionId: this.currentSession.id,
      reaction: {
        emoji,
        targetId,
        userId: this.currentUser.id,
        timestamp: new Date(),
      },
    });
  }

  // ============================================================================
  // Screen Share
  // ============================================================================

  async startScreenShare(sessionId: string): Promise<MediaStream | null> {
    if (!this.sessions.has(sessionId)) return null;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      this.socket?.emit('screenshare:start', {
        sessionId,
        streamId: stream.id,
      });

      return stream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      return null;
    }
  }

  // ============================================================================
  // Presence Queries
  // ============================================================================

  getPresenceUsers(): PresenceUser[] {
    return Array.from(this.presenceUsers.values()).filter(
      (user) => user.id !== this.currentUser?.id
    );
  }

  getActiveCollaborators(resourceId: string): CollaboratorPresence[] {
    const session = Array.from(this.sessions.values()).find(
      (s) => s.resourceId === resourceId
    );
    return session?.participants.filter((p) => p.status === 'online') || [];
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T = unknown>(event: string, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.eventHandlers.get(event)?.delete(handler as EventHandler);
  }

  private emitLocal(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in collaboration event handler for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // Internal Handlers
  // ============================================================================

  private handleSessionJoined(session: CollaborationSession): void {
    this.sessions.set(session.id, session);
    this.emitLocal('session:joined', session);
  }

  private handlePresenceUpdate(presence: CollaboratorPresence): void {
    const session = Array.from(this.sessions.values()).find((s) =>
      s.participants.some((p) => p.userId === presence.userId)
    );

    if (session) {
      const index = session.participants.findIndex((p) => p.userId === presence.userId);
      if (index >= 0) {
        session.participants[index] = presence;
      } else {
        session.participants.push(presence);
      }
      this.emitLocal('presence:update', presence);
    }
  }

  private handleStateSync(state: EditorState): void {
    if (this.currentSession) {
      this.currentSession.activeEditors.set(state.userId, state);
      this.emitLocal('state:sync', state);
    }
  }

  private handleDisconnection(): void {
    // Mark all participants as offline
    this.sessions.forEach((session) => {
      session.participants.forEach((p) => {
        p.status = 'offline';
      });
    });

    this.presenceUsers.forEach((user) => {
      user.status = 'offline';
    });

    this.emitLocal('connection:lost', undefined);
  }

  private rejoinSessions(): void {
    this.sessions.forEach((session) => {
      const presence = session.participants.find(
        (p) => p.userId === this.currentUser?.id
      );
      if (presence) {
        this.socket?.emit('session:rejoin', {
          sessionId: session.id,
          presence,
        });
      }
    });
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private detectDevice(): 'desktop' | 'mobile' | 'tablet' {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private generateId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.stopSyncInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessions.clear();
    this.presenceUsers.clear();
    this.eventHandlers.clear();
    this.currentUser = null;
    this.currentSession = null;
    this.currentConversationId = null;
  }
}
