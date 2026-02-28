/**
 * BaseSocketService -- shared Socket.IO connection, reconnection, and event-bus logic.
 * Domain-specific services extend this and implement setupDomainHandlers().
 */
import { io, Socket } from 'socket.io-client';

export interface BaseSocketConfig {
  namespace?: string;
  path?: string;
  tokenKey?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
}

export abstract class BaseSocketService {
  protected socket: Socket | null = null;
  protected isConnected = false;
  protected reconnectAttempts = 0;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  protected eventListeners = new Map<string, Set<Function>>();

  protected readonly config: Required<BaseSocketConfig>;

  constructor(config: BaseSocketConfig = {}) {
    this.config = {
      namespace: config.namespace ?? '',
      path: config.path ?? '/api/socket.io',
      tokenKey: config.tokenKey ?? 'auth_token',
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
    };
  }

  /**
   * Subclasses implement this to register domain-specific socket.on() handlers.
   * Called once after connection setup.
   */
  protected abstract setupDomainHandlers(): void;

  /**
   * Get the auth token from localStorage.
   */
  protected getAuthToken(): string | null {
    return localStorage.getItem(this.config.tokenKey) || localStorage.getItem('authToken');
  }

  /**
   * Resolve the socket URL based on environment.
   */
  protected getSocketUrl(): string {
    const isDevelopment = import.meta.env.DEV;
    const baseUrl = isDevelopment ? 'http://localhost:3001' : window.location.origin;
    return this.config.namespace ? `${baseUrl}${this.config.namespace}` : baseUrl;
  }

  connect(): void {
    const token = this.getAuthToken();
    if (!token) return;
    if (this.socket?.connected) return;

    this.socket = io(this.getSocketUrl(), {
      path: this.config.path,
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.config.maxReconnectAttempts,
      reconnectionDelay: this.config.reconnectDelay,
      withCredentials: true,
      timeout: 20000,
    });

    this.setupBaseHandlers();
    this.setupDomainHandlers();
  }

  private setupBaseHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.emit('disconnect');
      if (reason === 'io server disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (_error) => {
      this.handleReconnection();
    });
  }

  protected handleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => { this.eventListeners.get(event)?.delete(callback); };
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  protected emit(event: string, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach(cb => {
      try { cb(...args); } catch (e) { console.error(`Error in ${event} listener`, e); }
    });
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}
