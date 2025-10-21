/**
 * Real-time Collaboration Service
 * Enables live collaboration features across all platform components
 */

import { io, Socket } from 'socket.io-client';
import { Project } from '../types/project';
import { MessageUser } from '../types/messaging';

export interface CollaborationSession {
  id: string;
  type: 'project' | 'document' | 'design' | 'review';
  resourceId: string;
  participants: CollaboratorPresence[];
  activeEditors: Map<string, EditorState>;
  sharedCursor: boolean;
  sharedSelection: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface CollaboratorPresence {
  userId: string;
  user: MessageUser;
  status: 'online' | 'away' | 'busy' | 'offline';
  cursor?: CursorPosition;
  selection?: SelectionRange;
  viewport?: ViewportInfo;
  lastSeen: Date;
  device: 'desktop' | 'mobile' | 'tablet';
  location?: string; // Current view/page
  color: string; // Unique color for this user
}

export interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
  timestamp: number;
}

export interface SelectionRange {
  start: { line: number; column: number };
  end: { line: number; column: number };
  text?: string;
}

export interface ViewportInfo {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  zoom: number;
}

export interface EditorState {
  userId: string;
  documentId: string;
  content: string;
  operations: Operation[];
  version: number;
  lastModified: Date;
}

export interface Operation {
  type: 'insert' | 'delete' | 'format' | 'move';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  userId: string;
  timestamp: number;
}

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor' | 'selection' | 'edit' | 'comment' | 'reaction';
  userId: string;
  sessionId: string;
  data: any;
  timestamp: Date;
}

export class RealtimeCollaborationService {
  private socket: Socket | null = null;
  private sessions: Map<string, CollaborationSession> = new Map();
  private currentSession: CollaborationSession | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#48DBFB', '#00D2D3', '#6C5CE7'
  ];
  private operationBuffer: Operation[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSocket();
  }

  /**
   * Initialize WebSocket connection
   */
  private initializeSocket() {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

    this.socket = io(wsUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();
    this.startSyncInterval();
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to collaboration server');
      this.reconnectAttempts = 0;
      this.rejoinSessions();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from collaboration server');
      this.handleDisconnection();
    });

    this.socket.on('session:joined', (data: CollaborationSession) => {
      this.handleSessionJoined(data);
    });

    this.socket.on('presence:update', (data: CollaboratorPresence) => {
      this.handlePresenceUpdate(data);
    });

    this.socket.on('cursor:move', (data: { userId: string; cursor: CursorPosition }) => {
      this.handleCursorMove(data);
    });

    this.socket.on('selection:change', (data: { userId: string; selection: SelectionRange }) => {
      this.handleSelectionChange(data);
    });

    this.socket.on('operation:broadcast', (operation: Operation) => {
      this.handleRemoteOperation(operation);
    });

    this.socket.on('sync:state', (state: EditorState) => {
      this.handleStateSync(state);
    });
  }

  /**
   * Join a collaboration session
   */
  async joinSession(
    type: CollaborationSession['type'],
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
      lastActivity: new Date()
    };

    // Create user presence
    const presence: CollaboratorPresence = {
      userId: user.id,
      user,
      status: 'online',
      lastSeen: new Date(),
      device: this.detectDevice(),
      color: this.getUserColor(user.id)
    };

    // Join via socket
    this.socket?.emit('session:join', {
      sessionId,
      type,
      resourceId,
      presence
    });

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    return session;
  }

  /**
   * Leave a collaboration session
   */
  leaveSession(sessionId: string) {
    if (!this.sessions.has(sessionId)) return;

    this.socket?.emit('session:leave', { sessionId });
    this.sessions.delete(sessionId);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
  }

  /**
   * Update cursor position
   */
  updateCursor(position: CursorPosition) {
    if (!this.currentSession) return;

    this.socket?.emit('cursor:update', {
      sessionId: this.currentSession.id,
      cursor: position
    });
  }

  /**
   * Update selection
   */
  updateSelection(selection: SelectionRange) {
    if (!this.currentSession) return;

    this.socket?.emit('selection:update', {
      sessionId: this.currentSession.id,
      selection
    });
  }

  /**
   * Apply local operation
   */
  applyOperation(operation: Operation) {
    if (!this.currentSession) return;

    // Add to buffer for batching
    this.operationBuffer.push(operation);

    // Apply locally immediately
    this.applyOperationLocally(operation);

    // Broadcast will happen in sync interval
  }

  /**
   * Apply operation locally
   */
  private applyOperationLocally(operation: Operation) {
    // Emit to local handlers
    this.emit('operation:local', operation);
  }

  /**
   * Handle remote operation
   */
  private handleRemoteOperation(operation: Operation) {
    // Apply operational transform if needed
    const transformed = this.transformOperation(operation);

    // Apply to local state
    this.applyOperationLocally(transformed);

    // Emit to handlers
    this.emit('operation:remote', transformed);
  }

  /**
   * Transform operation for conflict resolution
   */
  private transformOperation(operation: Operation): Operation {
    // Simplified OT - in production, use a proper OT library
    return operation;
  }

  /**
   * Sync operations periodically
   */
  private startSyncInterval() {
    this.syncInterval = setInterval(() => {
      if (this.operationBuffer.length > 0 && this.currentSession) {
        // Batch operations
        const operations = [...this.operationBuffer];
        this.operationBuffer = [];

        this.socket?.emit('operations:batch', {
          sessionId: this.currentSession.id,
          operations
        });
      }
    }, 100); // Sync every 100ms
  }

  /**
   * Handle session joined
   */
  private handleSessionJoined(session: CollaborationSession) {
    this.sessions.set(session.id, session);
    this.emit('session:joined', session);
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(presence: CollaboratorPresence) {
    const session = Array.from(this.sessions.values()).find(s =>
      s.participants.some(p => p.userId === presence.userId)
    );

    if (session) {
      const index = session.participants.findIndex(p => p.userId === presence.userId);
      if (index >= 0) {
        session.participants[index] = presence;
      } else {
        session.participants.push(presence);
      }

      this.emit('presence:update', presence);
    }
  }

  /**
   * Handle cursor move
   */
  private handleCursorMove(data: { userId: string; cursor: CursorPosition }) {
    this.emit('cursor:move', data);
  }

  /**
   * Handle selection change
   */
  private handleSelectionChange(data: { userId: string; selection: SelectionRange }) {
    this.emit('selection:change', data);
  }

  /**
   * Handle state sync
   */
  private handleStateSync(state: EditorState) {
    if (this.currentSession) {
      this.currentSession.activeEditors.set(state.userId, state);
      this.emit('state:sync', state);
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection() {
    // Mark all participants as offline
    this.sessions.forEach(session => {
      session.participants.forEach(p => {
        p.status = 'offline';
      });
    });

    this.emit('connection:lost');
  }

  /**
   * Rejoin sessions after reconnection
   */
  private rejoinSessions() {
    this.sessions.forEach(session => {
      const presence = session.participants.find(p => p.userId === this.getCurrentUserId());
      if (presence) {
        this.socket?.emit('session:rejoin', {
          sessionId: session.id,
          presence
        });
      }
    });
  }

  /**
   * Get active collaborators for a resource
   */
  getActiveCollaborators(resourceId: string): CollaboratorPresence[] {
    const session = Array.from(this.sessions.values()).find(s =>
      s.resourceId === resourceId
    );

    return session?.participants.filter(p => p.status === 'online') || [];
  }

  /**
   * Start screen share
   */
  async startScreenShare(sessionId: string): Promise<MediaStream | null> {
    if (!this.sessions.has(sessionId)) return null;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      this.socket?.emit('screenshare:start', {
        sessionId,
        streamId: stream.id
      });

      return stream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      return null;
    }
  }

  /**
   * Add comment to current position
   */
  addComment(text: string, position?: CursorPosition) {
    if (!this.currentSession) return;

    const comment = {
      id: this.generateId(),
      text,
      position,
      userId: this.getCurrentUserId(),
      timestamp: new Date()
    };

    this.socket?.emit('comment:add', {
      sessionId: this.currentSession.id,
      comment
    });
  }

  /**
   * Add reaction
   */
  addReaction(emoji: string, targetId: string) {
    if (!this.currentSession) return;

    this.socket?.emit('reaction:add', {
      sessionId: this.currentSession.id,
      reaction: {
        emoji,
        targetId,
        userId: this.getCurrentUserId(),
        timestamp: new Date()
      }
    });
  }

  /**
   * Event handling
   */
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data?: any) {
    this.eventHandlers.get(event)?.forEach(handler => handler(data));
  }

  /**
   * Utility functions
   */
  private detectDevice(): 'desktop' | 'mobile' | 'tablet' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getUserColor(userId: string): string {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return this.userColors[hash % this.userColors.length];
  }

  private getCurrentUserId(): string {
    // Get from auth context
    return localStorage.getItem('userId') || '';
  }

  private generateId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.socket?.disconnect();
    this.sessions.clear();
    this.eventHandlers.clear();
  }
}

// Export singleton instance
export const collaborationService = new RealtimeCollaborationService();