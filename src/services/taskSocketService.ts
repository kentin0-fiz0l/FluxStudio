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

import { io, Socket } from 'socket.io-client';

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

class TaskSocketService {
  private socket: Socket | null = null;
  private currentProjectId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start at 1 second
  private isConnected = false;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  // Store event listeners for cleanup
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private eventListeners = new Map<string, Set<Function>>();

  /**
   * Initialize and connect to the Socket.IO server
   *
   * @param authToken - JWT token for authentication
   * @param userId - Current user's ID
   * @param userName - Current user's name
   */
  connect(authToken: string, userId: string, userName: string) {
    // Prevent duplicate connections
    if (this.socket?.connected) {
      console.log('Task socket already connected');
      return;
    }

    this.currentUserId = userId;
    this.currentUserName = userName;

    // Determine server URL based on environment
    const isDevelopment = window.location.hostname === 'localhost';
    const serverUrl = isDevelopment
      ? import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002'
      : `${window.location.origin}/api`;

    console.log(`Connecting to task socket server: ${serverUrl}`);

    // Initialize socket connection
    this.socket = io(serverUrl, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000,
      withCredentials: true,
      path: '/api/socket.io', // Socket.IO path on DigitalOcean App Platform
    });

    this.setupConnectionHandlers();
    this.setupTaskEventHandlers();
  }

  /**
   * Set up connection lifecycle event handlers
   */
  private setupConnectionHandlers() {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      console.log('Task socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Re-join project room if we were in one
      if (this.currentProjectId) {
        console.log(`Re-joining project room: ${this.currentProjectId}`);
        this.joinProject(this.currentProjectId);
      }
    });

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      console.log(`Task socket disconnected: ${reason}`);
      this.isConnected = false;

      // Auto-reconnect unless it was a manual disconnect
      if (reason === 'io server disconnect') {
        this.handleReconnection();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('Task socket connection error:', error.message);
      this.handleReconnection();
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Task socket reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
    });

    // Reconnection successful
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Task socket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      console.error('Task socket reconnection failed - max attempts reached');
      // Continue with degraded functionality (no real-time updates)
    });
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    }
  }

  /**
   * Set up task-specific event handlers
   */
  private setupTaskEventHandlers() {
    if (!this.socket) return;

    // Task created by another user
    this.socket.on('task:created', (payload: TaskUpdatePayload) => {
      console.log('Received task:created event', payload);
      this.emit('task:created', payload);
    });

    // Task updated by another user
    this.socket.on('task:updated', (payload: TaskUpdatePayload) => {
      console.log('Received task:updated event', payload);
      this.emit('task:updated', payload);
    });

    // Task deleted by another user
    this.socket.on('task:deleted', (payload: TaskDeletePayload) => {
      console.log('Received task:deleted event', payload);
      this.emit('task:deleted', payload);
    });

    // Presence update (users joining/leaving project)
    this.socket.on('presence:update', (payload: PresenceUpdatePayload) => {
      console.log('Received presence:update event', payload);
      this.emit('presence:update', payload);
    });

    // Error handling
    this.socket.on('error', (error: { message: string }) => {
      console.error('Task socket error:', error.message);
    });
  }

  /**
   * Join a project room to receive real-time updates
   *
   * @param projectId - The project ID to join
   */
  joinProject(projectId: string) {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot join project: socket not connected');
      return;
    }

    // Leave previous project room if exists
    if (this.currentProjectId && this.currentProjectId !== projectId) {
      this.leaveProject(this.currentProjectId);
    }

    // Join new project room
    this.socket.emit('join:project', {
      projectId,
      userId: this.currentUserId,
      userName: this.currentUserName,
    });

    this.currentProjectId = projectId;
    console.log(`Joined project room: ${projectId}`);
  }

  /**
   * Leave a project room
   *
   * @param projectId - The project ID to leave
   */
  leaveProject(projectId: string) {
    if (!this.socket) return;

    this.socket.emit('leave:project', {
      projectId,
      userId: this.currentUserId,
    });

    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }

    console.log(`Left project room: ${projectId}`);
  }

  /**
   * Emit task created event (broadcast to other users in room)
   *
   * @param projectId - The project ID
   * @param task - The created task
   */
  emitTaskCreated(projectId: string, task: Task) {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot emit task:created - socket not connected');
      return;
    }

    this.socket.emit('task:created', {
      projectId,
      task,
    });
  }

  /**
   * Emit task updated event (broadcast to other users in room)
   *
   * @param projectId - The project ID
   * @param task - The updated task
   */
  emitTaskUpdated(projectId: string, task: Task) {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot emit task:updated - socket not connected');
      return;
    }

    this.socket.emit('task:updated', {
      projectId,
      task,
    });
  }

  /**
   * Emit task deleted event (broadcast to other users in room)
   *
   * @param projectId - The project ID
   * @param taskId - The deleted task ID
   */
  emitTaskDeleted(projectId: string, taskId: string) {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot emit task:deleted - socket not connected');
      return;
    }

    this.socket.emit('task:deleted', {
      projectId,
      taskId,
    });
  }

  /**
   * Subscribe to task created events
   *
   * @param callback - Function to call when task is created
   */
  onTaskCreated(callback: TaskEventListener) {
    this.addEventListener('task:created', callback);
  }

  /**
   * Subscribe to task updated events
   *
   * @param callback - Function to call when task is updated
   */
  onTaskUpdated(callback: TaskEventListener) {
    this.addEventListener('task:updated', callback);
  }

  /**
   * Subscribe to task deleted events
   *
   * @param callback - Function to call when task is deleted
   */
  onTaskDeleted(callback: TaskDeleteListener) {
    this.addEventListener('task:deleted', callback);
  }

  /**
   * Subscribe to presence updates
   *
   * @param callback - Function to call when presence changes
   */
  onPresenceUpdate(callback: PresenceListener) {
    this.addEventListener('presence:update', callback);
  }

  /**
   * Unsubscribe from task created events
   *
   * @param callback - The callback to remove
   */
  offTaskCreated(callback: TaskEventListener) {
    this.removeEventListener('task:created', callback);
  }

  /**
   * Unsubscribe from task updated events
   *
   * @param callback - The callback to remove
   */
  offTaskUpdated(callback: TaskEventListener) {
    this.removeEventListener('task:updated', callback);
  }

  /**
   * Unsubscribe from task deleted events
   *
   * @param callback - The callback to remove
   */
  offTaskDeleted(callback: TaskDeleteListener) {
    this.removeEventListener('task:deleted', callback);
  }

  /**
   * Unsubscribe from presence updates
   *
   * @param callback - The callback to remove
   */
  offPresenceUpdate(callback: PresenceListener) {
    this.removeEventListener('presence:update', callback);
  }

  /**
   * Add an event listener
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private addEventListener(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove an event listener
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to all registered listeners
   */
  private emit(event: string, ...args: any[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Disconnect from socket server
   * Cleans up all listeners and leaves all rooms
   */
  disconnect() {
    if (this.currentProjectId) {
      this.leaveProject(this.currentProjectId);
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.currentUserId = null;
    this.currentUserName = null;
    this.currentProjectId = null;
    this.eventListeners.clear();

    console.log('Task socket disconnected and cleaned up');
  }
}

// Export singleton instance
export const taskSocketService = new TaskSocketService();
export default taskSocketService;
