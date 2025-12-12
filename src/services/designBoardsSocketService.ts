/**
 * Design Boards Socket Service
 * Handles real-time collaboration for design boards
 */

import { io, Socket } from 'socket.io-client';

export interface BoardNode {
  id: string;
  boardId: string;
  type: 'text' | 'asset' | 'shape';
  assetId?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex: number;
  rotation: number;
  locked: boolean;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  projectId: string;
  organizationId?: string;
  ownerId: string;
  name: string;
  description?: string;
  thumbnailAssetId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardUser {
  userId: string;
  userEmail: string;
  cursor?: { x: number; y: number };
}

type EventCallback = (...args: unknown[]) => void;

class DesignBoardsSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private isConnected = false;
  private currentBoardId: string | null = null;

  connect(): void {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('[DesignBoardsSocket] No auth token, skipping connection');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    this.socket = io(`${socketUrl}/design-boards`, {
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
      console.log('[DesignBoardsSocket] Connected');
      this.isConnected = true;
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[DesignBoardsSocket] Disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnect');
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('[DesignBoardsSocket] Error:', error);
      this.emit('error', error);
    });

    // Board events
    this.socket.on('board:joined', (data: { board: Board; nodes: BoardNode[]; users: BoardUser[] }) => {
      this.emit('board:joined', data);
    });

    this.socket.on('board:user-joined', (data: { userId: string; userEmail: string }) => {
      this.emit('board:user-joined', data);
    });

    this.socket.on('board:user-left', (data: { userId: string }) => {
      this.emit('board:user-left', data);
    });

    this.socket.on('board:updated', (data: { board: Board; userId: string }) => {
      this.emit('board:updated', data);
    });

    // Node events
    this.socket.on('node:created', (data: { node: BoardNode; userId: string }) => {
      this.emit('node:created', data);
    });

    this.socket.on('node:updated', (data: { node: BoardNode; userId: string }) => {
      this.emit('node:updated', data);
    });

    this.socket.on('node:deleted', (data: { nodeId: string; userId: string }) => {
      this.emit('node:deleted', data);
    });

    this.socket.on('nodes:bulk-updated', (data: { nodes: BoardNode[]; userId: string }) => {
      this.emit('nodes:bulk-updated', data);
    });

    // Cursor events
    this.socket.on('cursor:moved', (data: { userId: string; userEmail: string; x: number; y: number }) => {
      this.emit('cursor:moved', data);
    });

    // Selection events
    this.socket.on('node:selected', (data: { nodeId: string; userId: string; userEmail: string }) => {
      this.emit('node:selected', data);
    });

    this.socket.on('node:deselected', (data: { nodeId: string; userId: string }) => {
      this.emit('node:deselected', data);
    });
  }

  disconnect(): void {
    if (this.currentBoardId) {
      this.leaveBoard(this.currentBoardId);
    }
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  // Board actions
  joinBoard(boardId: string): void {
    if (!this.socket?.connected) {
      console.warn('[DesignBoardsSocket] Not connected');
      return;
    }
    this.currentBoardId = boardId;
    this.socket.emit('board:join', boardId);
  }

  leaveBoard(boardId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('board:leave', boardId);
    if (this.currentBoardId === boardId) {
      this.currentBoardId = null;
    }
  }

  updateBoard(boardId: string, patch: Partial<Board>): void {
    if (!this.socket?.connected) return;
    this.socket.emit('board:update', { boardId, patch });
  }

  // Node actions
  createNode(boardId: string, node: Partial<BoardNode>): void {
    if (!this.socket?.connected) return;
    this.socket.emit('node:create', { boardId, node });
  }

  updateNode(boardId: string, nodeId: string, patch: Partial<BoardNode>): void {
    if (!this.socket?.connected) return;
    this.socket.emit('node:update', { boardId, nodeId, patch });
  }

  deleteNode(boardId: string, nodeId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('node:delete', { boardId, nodeId });
  }

  bulkUpdateNodePositions(boardId: string, updates: Array<{ nodeId: string; x?: number; y?: number; zIndex?: number }>): void {
    if (!this.socket?.connected) return;
    this.socket.emit('nodes:bulk-position', { boardId, updates });
  }

  // Cursor position
  moveCursor(boardId: string, x: number, y: number): void {
    if (!this.socket?.connected) return;
    this.socket.emit('cursor:move', { boardId, x, y });
  }

  // Selection
  selectNode(boardId: string, nodeId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('node:select', { boardId, nodeId });
  }

  deselectNode(boardId: string, nodeId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('node:deselect', { boardId, nodeId });
  }

  // Event handling
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
}

export const designBoardsSocketService = new DesignBoardsSocketService();
