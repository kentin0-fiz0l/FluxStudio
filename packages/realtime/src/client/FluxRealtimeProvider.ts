/**
 * FluxRealtimeProvider - WebSocket client for Yjs collaboration
 *
 * Connects to FluxRealtimeServer and manages document synchronization.
 */

import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";

// Message types (must match server)
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const _MESSAGE_AUTH = 2; // Reserved for future auth implementation
const _MESSAGE_QUERY_AWARENESS = 3; // Reserved for future awareness queries

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "synced";

export interface FluxRealtimeProviderOptions {
  /** WebSocket URL */
  url: string;
  /** Document name/room */
  docName: string;
  /** Yjs document */
  doc: Y.Doc;
  /** Authentication token */
  token?: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Connection timeout in ms (default: 10000) */
  connectionTimeout?: number;
  /** Initial awareness state */
  awarenessState?: Record<string, unknown>;
  /** Called when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Called when synced with server */
  onSynced?: (isSynced: boolean) => void;
  /** Called on connection error */
  onError?: (error: Error) => void;
}

export class FluxRealtimeProvider {
  private ws: WebSocket | null = null;
  private doc: Y.Doc;
  private awareness: awarenessProtocol.Awareness;
  private options: Required<Omit<FluxRealtimeProviderOptions, "token" | "awarenessState" | "onStatusChange" | "onSynced" | "onError">> & {
    token?: string;
    awarenessState?: Record<string, unknown>;
    onStatusChange?: (status: ConnectionStatus) => void;
    onSynced?: (isSynced: boolean) => void;
    onError?: (error: Error) => void;
  };

  private status: ConnectionStatus = "disconnected";
  private synced = false;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(options: FluxRealtimeProviderOptions) {
    this.options = {
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      connectionTimeout: 10000,
      ...options,
    };

    this.doc = options.doc;
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // Set initial awareness state
    if (options.awarenessState) {
      this.awareness.setLocalState(options.awarenessState);
    }

    // Set up document update handler
    this.doc.on("update", this.handleDocUpdate);

    // Set up awareness update handler
    this.awareness.on("update", this.handleAwarenessUpdate);

    // Connect
    this.connect();
  }

  /**
   * Get current connection status
   */
  get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if synced with server
   */
  get isSynced(): boolean {
    return this.synced;
  }

  /**
   * Get awareness instance
   */
  getAwareness(): awarenessProtocol.Awareness {
    return this.awareness;
  }

  /**
   * Set local awareness state
   */
  setAwarenessState(state: Record<string, unknown>): void {
    this.awareness.setLocalState(state);
  }

  /**
   * Get awareness states for all clients
   */
  getAwarenessStates(): Map<number, Record<string, unknown>> {
    return this.awareness.getStates() as Map<number, Record<string, unknown>>;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.destroyed) return;

    this.setStatus("connecting");

    // Build WebSocket URL
    let wsUrl = this.options.url;
    if (!wsUrl.endsWith("/")) wsUrl += "/";
    wsUrl += this.options.docName;

    if (this.options.token) {
      wsUrl += `?token=${encodeURIComponent(this.options.token)}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = "arraybuffer";

      // Connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.status === "connecting") {
          this.ws?.close();
          this.handleError(new Error("Connection timeout"));
        }
      }, this.options.connectionTimeout);

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onclose = this.handleClose;
      this.ws.onerror = (_event) => {
        this.handleError(new Error("WebSocket error"));
      };
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus("disconnected");
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen = (): void => {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.setStatus("connected");
    this.reconnectAttempts = 0;

    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, this.doc);
    this.send(encoding.toUint8Array(encoder));

    // Send current awareness state
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [
        this.doc.clientID,
      ])
    );
    this.send(encoding.toUint8Array(awarenessEncoder));
  };

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage = (event: MessageEvent): void => {
    try {
      const message = new Uint8Array(event.data);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC:
          this.handleSyncMessage(decoder);
          break;
        case MESSAGE_AWARENESS:
          this.handleAwarenessMessage(decoder);
          break;
      }
    } catch (error) {
      console.error("[FluxRealtimeProvider] Error handling message:", error);
    }
  };

  /**
   * Handle sync protocol message
   */
  private handleSyncMessage(decoder: decoding.Decoder): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    const syncMessageType = syncProtocol.readSyncMessage(
      decoder,
      encoder,
      this.doc,
      this
    );

    // If we received sync step 2, we're synced
    if (syncMessageType === 2) {
      if (!this.synced) {
        this.synced = true;
        this.setStatus("synced");
        this.options.onSynced?.(true);
      }
    }

    // Send response if there is one
    if (encoding.length(encoder) > 1) {
      this.send(encoding.toUint8Array(encoder));
    }
  }

  /**
   * Handle awareness protocol message
   */
  private handleAwarenessMessage(decoder: decoding.Decoder): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this);
  }

  /**
   * Handle document update
   */
  private handleDocUpdate = (
    update: Uint8Array,
    origin: unknown
  ): void => {
    if (origin === this) return; // Don't echo our own updates

    if (this.ws?.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      encoding.writeVarUint(encoder, 2); // sync step 2
      encoding.writeVarUint8Array(encoder, update);
      this.send(encoding.toUint8Array(encoder));
    }
  };

  /**
   * Handle awareness update
   */
  private handleAwarenessUpdate = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }): void => {
    const changedClients = added.concat(updated).concat(removed);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      this.send(encoding.toUint8Array(encoder));
    }
  };

  /**
   * Handle WebSocket close
   */
  private handleClose = (event: CloseEvent): void => {
    this.ws = null;

    if (this.synced) {
      this.synced = false;
      this.options.onSynced?.(false);
    }

    this.setStatus("disconnected");

    // Auto-reconnect if enabled
    if (
      this.options.autoReconnect &&
      !this.destroyed &&
      event.code !== 4001 // Not unauthorized
    ) {
      this.scheduleReconnect();
    }
  };

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    console.error("[FluxRealtimeProvider] Error:", error.message);
    this.options.onError?.(error);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );

    this.reconnectAttempts++;

    console.log(
      `[FluxRealtimeProvider] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  /**
   * Send message to server
   */
  private send(message: Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
  }

  /**
   * Update status
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange?.(status);
    }
  }

  /**
   * Destroy the provider
   */
  destroy(): void {
    this.destroyed = true;

    // Remove event handlers
    this.doc.off("update", this.handleDocUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);

    // Remove awareness state
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      "destroy"
    );

    // Disconnect
    this.disconnect();

    // Clear timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }

    console.log("[FluxRealtimeProvider] Destroyed");
  }
}

export default FluxRealtimeProvider;
