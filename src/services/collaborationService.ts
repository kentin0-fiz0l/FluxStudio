/**
 * Enhanced Real-time Collaboration Service
 * Handles presence, typing indicators, live cursors, and collaborative editing
 */

import { io, Socket } from 'socket.io-client';
import { socketLogger } from '@/services/logging';

interface CollaboratorPresence {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'idle' | 'offline';
  lastSeen: Date;
  currentPage?: string;
  cursor?: {
    x: number;
    y: number;
  };
  isTyping?: boolean;
  selectedElement?: string;
}

interface CollaborationRoom {
  id: string;
  type: 'project' | 'document' | 'canvas';
  participants: Map<string, CollaboratorPresence>;
  activeEditors: number;
  lastActivity: Date;
}

class CollaborationService {
  private socket: Socket | null = null;
  private currentRoom: CollaborationRoom | null = null;
  private presenceUpdateInterval: NodeJS.Timeout | null = null;
  private onPresenceUpdate: ((presence: Map<string, CollaboratorPresence>) => void) | null = null;
  private onTypingUpdate: ((userId: string, isTyping: boolean) => void) | null = null;
  private onCursorUpdate: ((userId: string, cursor: { x: number; y: number }) => void) | null = null;
  private typingTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      socketLogger.info('Collaboration service connected');
      this.sendPresenceUpdate();
    });

    this.socket.on('disconnect', () => {
      socketLogger.info('Collaboration service disconnected');
      this.clearPresenceInterval();
    });

    // Collaboration events
    this.socket.on('user_joined_room', this.handleUserJoined.bind(this));
    this.socket.on('user_left_room', this.handleUserLeft.bind(this));
    this.socket.on('presence_update', this.handlePresenceUpdate.bind(this));
    this.socket.on('typing_indicator', this.handleTypingIndicator.bind(this));
    this.socket.on('cursor_position', this.handleCursorPosition.bind(this));
    this.socket.on('content_change', this.handleContentChange.bind(this));
    this.socket.on('selection_change', this.handleSelectionChange.bind(this));
  }

  // Room Management
  public joinRoom(roomId: string, roomType: 'project' | 'document' | 'canvas') {
    if (!this.socket) return;

    // Leave current room if exists
    if (this.currentRoom) {
      this.leaveRoom();
    }

    // Join new room
    this.currentRoom = {
      id: roomId,
      type: roomType,
      participants: new Map(),
      activeEditors: 0,
      lastActivity: new Date()
    };

    this.socket.emit('join_room', {
      roomId,
      roomType,
      userId: this.getCurrentUserId(),
      userData: this.getCurrentUserData()
    });

    // Start presence updates
    this.startPresenceUpdates();
  }

  public leaveRoom() {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('leave_room', {
      roomId: this.currentRoom.id,
      userId: this.getCurrentUserId()
    });

    this.clearPresenceInterval();
    this.currentRoom = null;
  }

  // Presence Management
  private startPresenceUpdates() {
    this.clearPresenceInterval();

    // Send presence immediately
    this.sendPresenceUpdate();

    // Then send every 30 seconds
    this.presenceUpdateInterval = setInterval(() => {
      this.sendPresenceUpdate();
    }, 30000);
  }

  private clearPresenceInterval() {
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval);
      this.presenceUpdateInterval = null;
    }
  }

  private sendPresenceUpdate() {
    if (!this.socket || !this.currentRoom) return;

    const presence: CollaboratorPresence = {
      userId: this.getCurrentUserId(),
      name: this.getCurrentUserName(),
      email: this.getCurrentUserEmail(),
      status: 'online',
      lastSeen: new Date(),
      currentPage: window.location.pathname
    };

    this.socket.emit('presence_update', {
      roomId: this.currentRoom.id,
      presence
    });
  }

  // Typing Indicators
  public startTyping() {
    if (!this.socket || !this.currentRoom) return;

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Send typing indicator
    this.socket.emit('typing_indicator', {
      roomId: this.currentRoom.id,
      userId: this.getCurrentUserId(),
      isTyping: true
    });

    // Auto-stop typing after 3 seconds
    this.typingTimeout = setTimeout(() => {
      this.stopTyping();
    }, 3000);
  }

  public stopTyping() {
    if (!this.socket || !this.currentRoom) return;

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    this.socket.emit('typing_indicator', {
      roomId: this.currentRoom.id,
      userId: this.getCurrentUserId(),
      isTyping: false
    });
  }

  // Cursor Tracking
  public updateCursorPosition(x: number, y: number) {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('cursor_position', {
      roomId: this.currentRoom.id,
      userId: this.getCurrentUserId(),
      cursor: { x, y }
    });
  }

  // Content Synchronization
  public sendContentChange(elementId: string, content: any, operation: 'insert' | 'update' | 'delete') {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('content_change', {
      roomId: this.currentRoom.id,
      userId: this.getCurrentUserId(),
      elementId,
      content,
      operation,
      timestamp: new Date()
    });
  }

  public sendSelectionChange(elementId: string, selection: { start: number; end: number }) {
    if (!this.socket || !this.currentRoom) return;

    this.socket.emit('selection_change', {
      roomId: this.currentRoom.id,
      userId: this.getCurrentUserId(),
      elementId,
      selection
    });
  }

  // Event Handlers
  private handleUserJoined(data: any) {
    if (!this.currentRoom || data.roomId !== this.currentRoom.id) return;

    const presence: CollaboratorPresence = {
      userId: data.userId,
      name: data.userData.name,
      email: data.userData.email,
      avatar: data.userData.avatar,
      status: 'online',
      lastSeen: new Date()
    };

    this.currentRoom.participants.set(data.userId, presence);

    if (this.onPresenceUpdate) {
      this.onPresenceUpdate(this.currentRoom.participants);
    }
  }

  private handleUserLeft(data: any) {
    if (!this.currentRoom || data.roomId !== this.currentRoom.id) return;

    this.currentRoom.participants.delete(data.userId);

    if (this.onPresenceUpdate) {
      this.onPresenceUpdate(this.currentRoom.participants);
    }
  }

  private handlePresenceUpdate(data: any) {
    if (!this.currentRoom || data.roomId !== this.currentRoom.id) return;

    this.currentRoom.participants.set(data.presence.userId, data.presence);

    if (this.onPresenceUpdate) {
      this.onPresenceUpdate(this.currentRoom.participants);
    }
  }

  private handleTypingIndicator(data: any) {
    if (!this.currentRoom || data.roomId !== this.currentRoom.id) return;

    if (this.onTypingUpdate) {
      this.onTypingUpdate(data.userId, data.isTyping);
    }
  }

  private handleCursorPosition(data: any) {
    if (!this.currentRoom || data.roomId !== this.currentRoom.id) return;

    if (this.onCursorUpdate) {
      this.onCursorUpdate(data.userId, data.cursor);
    }
  }

  private handleContentChange(data: any) {
    if (!this.currentRoom || data.roomId !== this.currentRoom.id) return;

    // Emit custom event for content changes
    window.dispatchEvent(new CustomEvent('collaboration:content_change', {
      detail: {
        elementId: data.elementId,
        content: data.content,
        operation: data.operation,
        userId: data.userId,
        timestamp: data.timestamp
      }
    }));
  }

  private handleSelectionChange(data: any) {
    if (!this.currentRoom || data.roomId !== this.currentRoom.id) return;

    // Emit custom event for selection changes
    window.dispatchEvent(new CustomEvent('collaboration:selection_change', {
      detail: {
        elementId: data.elementId,
        selection: data.selection,
        userId: data.userId
      }
    }));
  }

  // Event Listeners
  public onPresenceChanged(callback: (presence: Map<string, CollaboratorPresence>) => void) {
    this.onPresenceUpdate = callback;
  }

  public onTypingChanged(callback: (userId: string, isTyping: boolean) => void) {
    this.onTypingUpdate = callback;
  }

  public onCursorChanged(callback: (userId: string, cursor: { x: number; y: number }) => void) {
    this.onCursorUpdate = callback;
  }

  // Utility Methods
  private getCurrentUserId(): string {
    // Get from auth context or localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 'anonymous';
  }

  private getCurrentUserName(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.name || 'Anonymous User';
  }

  private getCurrentUserEmail(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.email || '';
  }

  private getCurrentUserData() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      id: user.id || 'anonymous',
      name: user.name || 'Anonymous User',
      email: user.email || '',
      avatar: user.avatar || null
    };
  }

  // Get active collaborators
  public getActiveCollaborators(): CollaboratorPresence[] {
    if (!this.currentRoom) return [];

    return Array.from(this.currentRoom.participants.values())
      .filter(p => p.status === 'online' && p.userId !== this.getCurrentUserId());
  }

  // Check if room has active collaborators
  public hasActiveCollaborators(): boolean {
    return this.getActiveCollaborators().length > 0;
  }

  // Cleanup
  public disconnect() {
    this.leaveRoom();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();
export type { CollaboratorPresence, CollaborationRoom };