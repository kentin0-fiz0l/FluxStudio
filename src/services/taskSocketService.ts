/**
 * Task-Specific Socket.IO Service for Real-Time Task Updates
 *
 * Extends the base socket service with project-specific room management
 * and task-specific event handling for real-time collaboration.
 *
 * Features:
 * - Room-based updates (one room per project)
 * - Automatic reconnection with exponential backoff
 * - User presence tracking
 * - Event emission for task CRUD operations
 * - Graceful degradation when WebSocket unavailable
 */

import { io } from 'socket.io-client';
import { createLogger } from '@/services/logging';
import { BaseSocketService } from './BaseSocketService';

const logger = createLogger('TaskSocket');

// Task type definition (matching useTasks.ts)
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string | null;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// Event payload types
export interface TaskUpdatePayload {
  projectId: string;
  task: Task;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface TaskDeletePayload {
  projectId: string;
  taskId: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface PresenceUser {
  id: string;
  name: string;
  joinedAt: string;
}

export interface PresenceUpdatePayload {
  projectId: string;
  users: PresenceUser[];
}

// Event listener types
export type TaskEventListener = (payload: TaskUpdatePayload) => void;
export type TaskDeleteListener = (payload: TaskDeletePayload) => void;
export type PresenceListener = (payload: PresenceUpdatePayload) => void;

class TaskSocketService extends BaseSocketService {
  private currentProjectId: string | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  constructor() {
    // Task socket uses '/' namespace with a different URL resolution
    super({ namespace: '', maxReconnectDelay: 30000 });
  }

  /**
   * Override getSocketUrl for task-specific URL resolution.
   */
  protected getSocketUrl(): string {
    const isDevelopment = import.meta.env.DEV;
    return isDevelopment
      ? (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:3002'
      : `${window.location.origin}/api`;
  }

  protected setupDomainHandlers(): void {
    if (!this.socket) return;

    // Re-join project room on reconnect
    this.socket.on('connect', () => {
      logger.info('Task socket connected successfully');
      if (this.currentProjectId) {
        logger.debug(`Re-joining project room: ${this.currentProjectId}`);
        this.joinProject(this.currentProjectId);
      }
    });

    // Additional reconnection lifecycle events
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      logger.info(`Task socket reconnection attempt ${attemptNumber}/${this.config.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      logger.info(`Task socket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_failed', () => {
      logger.error('Task socket reconnection failed - max attempts reached');
    });

    // Task created by another user
    this.socket.on('task:created', (payload: TaskUpdatePayload) => {
      logger.debug('Received task:created event', payload);
      this.emit('task:created', payload);
    });

    // Task updated by another user
    this.socket.on('task:updated', (payload: TaskUpdatePayload) => {
      logger.debug('Received task:updated event', payload);
      this.emit('task:updated', payload);
    });

    // Task deleted by another user
    this.socket.on('task:deleted', (payload: TaskDeletePayload) => {
      logger.debug('Received task:deleted event', payload);
      this.emit('task:deleted', payload);
    });

    // Presence update (users joining/leaving project)
    this.socket.on('presence:update', (payload: PresenceUpdatePayload) => {
      logger.debug('Received presence:update event', payload);
      this.emit('presence:update', payload);
    });

    // Error handling
    this.socket.on('error', (error: { message: string }) => {
      logger.error('Task socket error', { message: error.message });
    });
  }

  /**
   * Initialize and connect to the Socket.IO server.
   * Custom signature: accepts authToken, userId, userName directly.
   */
  connect(authToken?: string | undefined, userId?: string, userName?: string): void {
    // If called with no args, delegate to base
    if (!authToken) {
      super.connect();
      return;
    }

    if (this.socket?.connected) {
      logger.debug('Task socket already connected');
      return;
    }

    this.currentUserId = userId ?? null;
    this.currentUserName = userName ?? null;

    logger.info(`Connecting to task socket server: ${this.getSocketUrl()}`);

    this.socket = io(this.getSocketUrl(), {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.config.maxReconnectAttempts,
      reconnectionDelay: this.config.reconnectDelay,
      timeout: 20000,
      withCredentials: true,
      path: this.config.path,
    });

    // Use base handlers + domain handlers
    // We call setupBaseHandlers indirectly via the private method
    // Since setupBaseHandlers is private in base, we replicate the base connect pattern
    this.setupBaseHandlersManually();
    this.setupDomainHandlers();
  }

  /**
   * Replicate the base handler setup since we override connect() fully.
   */
  private setupBaseHandlersManually(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      logger.info(`Task socket disconnected: ${reason}`);
      this.isConnected = false;
      this.emit('disconnect');
      if (reason === 'io server disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      logger.error('Task socket connection error', { message: error.message });
      this.handleReconnection();
    });
  }

  joinProject(projectId: string) {
    if (!this.socket || !this.isConnected) {
      logger.warn('Cannot join project: socket not connected');
      return;
    }

    if (this.currentProjectId && this.currentProjectId !== projectId) {
      this.leaveProject(this.currentProjectId);
    }

    this.socket.emit('join:project', {
      projectId,
      userId: this.currentUserId,
      userName: this.currentUserName,
    });

    this.currentProjectId = projectId;
    logger.debug(`Joined project room: ${projectId}`);
  }

  leaveProject(projectId: string) {
    if (!this.socket) return;

    this.socket.emit('leave:project', {
      projectId,
      userId: this.currentUserId,
    });

    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }

    logger.debug(`Left project room: ${projectId}`);
  }

  emitTaskCreated(projectId: string, task: Task) {
    if (!this.socket || !this.isConnected) {
      logger.warn('Cannot emit task:created - socket not connected');
      return;
    }
    this.socket.emit('task:created', { projectId, task });
  }

  emitTaskUpdated(projectId: string, task: Task) {
    if (!this.socket || !this.isConnected) {
      logger.warn('Cannot emit task:updated - socket not connected');
      return;
    }
    this.socket.emit('task:updated', { projectId, task });
  }

  emitTaskDeleted(projectId: string, taskId: string) {
    if (!this.socket || !this.isConnected) {
      logger.warn('Cannot emit task:deleted - socket not connected');
      return;
    }
    this.socket.emit('task:deleted', { projectId, taskId });
  }

  onTaskCreated(callback: TaskEventListener) {
    this.addEventListener('task:created', callback);
  }

  onTaskUpdated(callback: TaskEventListener) {
    this.addEventListener('task:updated', callback);
  }

  onTaskDeleted(callback: TaskDeleteListener) {
    this.addEventListener('task:deleted', callback);
  }

  onPresenceUpdate(callback: PresenceListener) {
    this.addEventListener('presence:update', callback);
  }

  offTaskCreated(callback: TaskEventListener) {
    this.removeEventListener('task:created', callback);
  }

  offTaskUpdated(callback: TaskEventListener) {
    this.removeEventListener('task:updated', callback);
  }

  offTaskDeleted(callback: TaskDeleteListener) {
    this.removeEventListener('task:deleted', callback);
  }

  offPresenceUpdate(callback: PresenceListener) {
    this.removeEventListener('presence:update', callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  disconnect() {
    if (this.currentProjectId) {
      this.leaveProject(this.currentProjectId);
    }

    super.disconnect();
    this.currentUserId = null;
    this.currentUserName = null;
    this.currentProjectId = null;
    this.eventListeners.clear();

    logger.info('Task socket disconnected and cleaned up');
  }
}

// Export singleton instance
export const taskSocketService = new TaskSocketService();
export default taskSocketService;
