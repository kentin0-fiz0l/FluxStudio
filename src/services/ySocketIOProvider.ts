/**
 * YSocketIOProvider — Yjs document sync over Socket.IO.
 *
 * Sprint 30: Initial implementation.
 * Sprint 31: Offline queue, reconnection resilience, connection-error events.
 *
 * Protocol:
 *   Client → Server:  yjs:sync-request (stateVector)
 *   Server → Client:  yjs:sync-response (update)
 *   Client ↔ Server:  yjs:update (binary update)
 *   Client ↔ Server:  yjs:awareness-update (awareness data)
 */

import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import type { Socket } from 'socket.io-client';

// ==================== Types ====================

export interface ProviderOptions {
  /** Auto-connect on construction (default: true) */
  autoConnect?: boolean;
  /** Resync after Socket.IO reconnection (default: true) */
  resyncOnReconnect?: boolean;
}

export type ProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'synced';

type EventCallback = (...args: unknown[]) => void;

// ==================== Provider ====================

export class YSocketIOProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  private socket: Socket;
  private roomName: string;
  private _synced = false;
  private _status: ProviderStatus = 'disconnected';
  private _listeners = new Map<string, Set<EventCallback>>();
  private _destroyed = false;
  private resyncOnReconnect: boolean;
  private _offlineQueue: Uint8Array[] = [];
  private _isConnected = false;
  private _reconnectAttempts = 0;

  constructor(socket: Socket, roomName: string, ydoc: Y.Doc, options: ProviderOptions = {}) {
    this.socket = socket;
    this.roomName = roomName;
    this.doc = ydoc;
    this.awareness = new Awareness(ydoc);
    this.resyncOnReconnect = options.resyncOnReconnect ?? true;

    // Bind handlers
    this._onDocUpdate = this._onDocUpdate.bind(this);
    this._onRemoteUpdate = this._onRemoteUpdate.bind(this);
    this._onSyncResponse = this._onSyncResponse.bind(this);
    this._onRemoteAwareness = this._onRemoteAwareness.bind(this);
    this._onAwarenessChange = this._onAwarenessChange.bind(this);
    this._onSocketConnect = this._onSocketConnect.bind(this);
    this._onSocketDisconnect = this._onSocketDisconnect.bind(this);
    this._onSocketReconnect = this._onSocketReconnect.bind(this);
    this._onSocketReconnectAttempt = this._onSocketReconnectAttempt.bind(this);

    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  // ==================== Public API ====================

  get synced(): boolean {
    return this._synced;
  }

  get status(): ProviderStatus {
    return this._status;
  }

  get reconnectAttempts(): number {
    return this._reconnectAttempts;
  }

  connect(): void {
    if (this._destroyed) return;
    this._setStatus('connecting');

    // Listen for Socket.IO events
    this.socket.on('yjs:sync-response', this._onSyncResponse);
    this.socket.on('yjs:update', this._onRemoteUpdate);
    this.socket.on('yjs:awareness-update', this._onRemoteAwareness);
    this.socket.on('connect', this._onSocketConnect);
    this.socket.on('disconnect', this._onSocketDisconnect);
    this.socket.on('reconnect', this._onSocketReconnect);
    this.socket.on('reconnect_attempt', this._onSocketReconnectAttempt);

    // Listen for local doc changes
    this.doc.on('update', this._onDocUpdate);

    // Listen for local awareness changes
    this.awareness.on('change', this._onAwarenessChange);

    // Join room and request sync
    this.socket.emit('yjs:join', { room: this.roomName });
    this._requestSync();
  }

  disconnect(): void {
    this.socket.off('yjs:sync-response', this._onSyncResponse);
    this.socket.off('yjs:update', this._onRemoteUpdate);
    this.socket.off('yjs:awareness-update', this._onRemoteAwareness);
    this.socket.off('connect', this._onSocketConnect);
    this.socket.off('disconnect', this._onSocketDisconnect);
    this.socket.off('reconnect', this._onSocketReconnect);
    this.socket.off('reconnect_attempt', this._onSocketReconnectAttempt);

    this.doc.off('update', this._onDocUpdate);
    this.awareness.off('change', this._onAwarenessChange);

    this.socket.emit('yjs:leave', { room: this.roomName });

    this._synced = false;
    this._isConnected = false;
    this._setStatus('disconnected');
  }

  destroy(): void {
    this._destroyed = true;
    this.disconnect();
    this.awareness.destroy();
    this._listeners.clear();
    this._offlineQueue = [];
  }

  /** Force a reconnection attempt (for manual retry button) */
  forceReconnect(): void {
    if (this._destroyed) return;
    this._reconnectAttempts = 0;
    if (this.socket.disconnected) {
      this.socket.connect();
    } else {
      // Already connected but maybe not synced — re-request
      this._setStatus('connecting');
      this.socket.emit('yjs:join', { room: this.roomName });
      this._requestSync();
      this._flushOfflineQueue();
    }
  }

  on(event: 'sync' | 'status' | 'connection-error', callback: EventCallback): void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(callback);
  }

  off(event: 'sync' | 'status' | 'connection-error', callback: EventCallback): void {
    this._listeners.get(event)?.delete(callback);
  }

  // ==================== Internal ====================

  private _emit(event: string, ...args: unknown[]): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const cb of listeners) cb(...args);
    }
  }

  private _setStatus(status: ProviderStatus): void {
    if (this._status !== status) {
      this._status = status;
      this._emit('status', status);
    }
  }

  private _requestSync(): void {
    const stateVector = Y.encodeStateVector(this.doc);
    this.socket.emit('yjs:sync-request', {
      room: this.roomName,
      stateVector: Array.from(stateVector),
    });
  }

  /** Flush queued offline updates to the server. */
  private _flushOfflineQueue(): void {
    if (this._offlineQueue.length === 0) return;
    const queue = this._offlineQueue;
    this._offlineQueue = [];
    for (const update of queue) {
      this.socket.emit('yjs:update', {
        room: this.roomName,
        update: Array.from(update),
      });
    }
  }

  /** Handle sync response from server. */
  private _onSyncResponse(data: { update: number[] }): void {
    if (this._destroyed) return;
    try {
      const update = new Uint8Array(data.update);
      if (update.length > 0) {
        Y.applyUpdate(this.doc, update, 'server');
      }
      this._synced = true;
      this._isConnected = true;
      this._reconnectAttempts = 0;
      this._setStatus('synced');
      this._emit('sync', true);

      // Flush any queued offline updates
      this._flushOfflineQueue();
    } catch (err) {
      console.error('[YSocketIOProvider] sync-response error:', err);
    }
  }

  /** Handle remote update from another client. */
  private _onRemoteUpdate(data: { update: number[] }): void {
    if (this._destroyed) return;
    try {
      const update = new Uint8Array(data.update);
      Y.applyUpdate(this.doc, update, 'remote');
    } catch (err) {
      console.error('[YSocketIOProvider] remote update error:', err);
    }
  }

  /** Handle local doc changes — broadcast to server or queue offline. */
  private _onDocUpdate(update: Uint8Array, origin: unknown): void {
    if (this._destroyed) return;
    // Don't echo back updates from server or remote
    if (origin === 'server' || origin === 'remote') return;

    if (this._isConnected && this.socket.connected) {
      this.socket.emit('yjs:update', {
        room: this.roomName,
        update: Array.from(update),
      });
    } else {
      // Queue for when we reconnect
      this._offlineQueue.push(new Uint8Array(update));
    }
  }

  /** Handle remote awareness update. */
  private _onRemoteAwareness(data: { update: number[] }): void {
    if (this._destroyed) return;
    try {
      const update = new Uint8Array(data.update);
      applyAwarenessUpdate(this.awareness, update, 'remote');
    } catch (err) {
      console.error('[YSocketIOProvider] awareness update error:', err);
    }
  }

  /** Handle local awareness change — broadcast. */
  private _onAwarenessChange(
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ): void {
    if (this._destroyed || origin === 'remote') return;
    if (!this._isConnected || !this.socket.connected) return;
    const changedClients = [...changes.added, ...changes.updated, ...changes.removed];
    const update = encodeAwarenessUpdate(this.awareness, changedClients);
    this.socket.emit('yjs:awareness-update', {
      room: this.roomName,
      update: Array.from(update),
    });
  }

  /** Socket.IO connected event. */
  private _onSocketConnect(): void {
    if (this._destroyed) return;
    this._isConnected = true;
    this._reconnectAttempts = 0;
  }

  /** Socket.IO disconnect event. */
  private _onSocketDisconnect(): void {
    if (this._destroyed) return;
    this._isConnected = false;
    this._synced = false;
    this._setStatus('disconnected');
    this._emit('sync', false);
  }

  /** Re-sync after Socket.IO reconnection. */
  private _onSocketReconnect(): void {
    if (this._destroyed || !this.resyncOnReconnect) return;
    this._isConnected = true;
    this._reconnectAttempts = 0;
    this._setStatus('connecting');
    this.socket.emit('yjs:join', { room: this.roomName });
    this._requestSync();
  }

  /** Track reconnection attempts for UI feedback. */
  private _onSocketReconnectAttempt(): void {
    if (this._destroyed) return;
    this._reconnectAttempts++;
    this._emit('connection-error', this._reconnectAttempts);
  }
}
