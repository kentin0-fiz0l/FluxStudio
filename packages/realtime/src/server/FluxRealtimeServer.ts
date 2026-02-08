/**
 * FluxRealtimeServer - Unified Yjs WebSocket Server
 *
 * Handles real-time collaboration using Yjs with WebSocket transport.
 * Supports horizontal scaling via Redis pub/sub.
 */

import { WebSocket, WebSocketServer, RawData } from "ws";
import { IncomingMessage } from "http";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import { DocumentStore, DocumentStoreOptions } from "./DocumentStore.js";
import { RedisPubSub, RedisPubSubOptions } from "./RedisPubSub.js";

// Message types
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const _MESSAGE_AUTH = 2; // Reserved for future auth implementation
const MESSAGE_QUERY_AWARENESS = 3;

export interface FluxRealtimeServerOptions {
  /** WebSocket server port */
  port?: number;
  /** Path for WebSocket connections */
  path?: string;
  /** Document store options */
  documentStore?: DocumentStoreOptions;
  /** Redis options for horizontal scaling */
  redis?: RedisPubSubOptions;
  /** Authentication handler */
  authenticate?: (
    token: string,
    docName: string
  ) => Promise<{ userId: string; permissions: string[] } | null>;
  /** Called when a client connects */
  onConnect?: (docName: string, clientId: number, userId?: string) => void;
  /** Called when a client disconnects */
  onDisconnect?: (docName: string, clientId: number, userId?: string) => void;
  /** Ping interval in ms (default: 30000) */
  pingInterval?: number;
}

interface ClientConnection {
  ws: WebSocket;
  docName: string;
  clientId: number;
  userId?: string;
  permissions: string[];
  awareness: awarenessProtocol.Awareness;
  isAlive: boolean;
  syncStep: number;
}

export class FluxRealtimeServer {
  private wss: WebSocketServer | null = null;
  private documentStore: DocumentStore;
  private redisPubSub: RedisPubSub | null = null;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private docClients: Map<string, Set<WebSocket>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private options: FluxRealtimeServerOptions;

  constructor(options: FluxRealtimeServerOptions = {}) {
    this.options = options;

    // Initialize document store
    this.documentStore = new DocumentStore({
      ...options.documentStore,
      onPersist: async (docName, state) => {
        // Persist to Redis if available
        if (this.redisPubSub) {
          await this.redisPubSub.storeDocumentState(docName, state);
        }
        // Call custom persistence handler
        await options.documentStore?.onPersist?.(docName, state);
      },
      onLoad: async (docName) => {
        // Try Redis first
        if (this.redisPubSub) {
          const state = await this.redisPubSub.loadDocumentState(docName);
          if (state) return state;
        }
        // Fall back to custom loader
        return options.documentStore?.onLoad?.(docName) ?? null;
      },
    });

    // Initialize Redis if configured
    if (options.redis) {
      this.redisPubSub = new RedisPubSub({
        ...options.redis,
        onUpdate: (docName, update, _origin) => {
          this.handleRemoteUpdate(docName, update);
        },
        onAwarenessUpdate: (docName, awarenessUpdate, _origin) => {
          this.broadcastToDocument(docName, awarenessUpdate, null);
        },
      });
    }
  }

  /**
   * Start the WebSocket server
   */
  start(): void {
    const port = this.options.port ?? 4444;
    const path = this.options.path ?? "/";

    this.wss = new WebSocketServer({ port, path });

    this.wss.on("connection", this.handleConnection.bind(this));

    // Start ping interval
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          ws.terminate();
          return;
        }
        client.isAlive = false;
        ws.ping();
      });
    }, this.options.pingInterval ?? 30000);

    console.warn(`[FluxRealtimeServer] Started on port ${port}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    // Extract document name from URL
    const url = new URL(request.url ?? "/", `ws://localhost`);
    const docName = url.pathname.slice(1) || url.searchParams.get("room") || "default";
    const token = url.searchParams.get("token");

    // Authenticate if handler provided
    let userId: string | undefined;
    let permissions: string[] = ["read", "write"];

    if (this.options.authenticate && token) {
      const auth = await this.options.authenticate(token, docName);
      if (!auth) {
        ws.close(4001, "Unauthorized");
        return;
      }
      userId = auth.userId;
      permissions = auth.permissions;
    }

    // Get or create document
    const doc = await this.documentStore.getDocument(docName);

    // Create awareness
    const awareness = new awarenessProtocol.Awareness(doc);
    const clientId = doc.clientID;

    // Store client connection
    const connection: ClientConnection = {
      ws,
      docName,
      clientId,
      userId,
      permissions,
      awareness,
      isAlive: true,
      syncStep: 0,
    };

    this.clients.set(ws, connection);
    this.documentStore.addConnection(docName, ws);

    // Track clients per document
    if (!this.docClients.has(docName)) {
      this.docClients.set(docName, new Set());

      // Subscribe to Redis channel for this document
      if (this.redisPubSub) {
        await this.redisPubSub.subscribe(docName);
      }
    }
    this.docClients.get(docName)!.add(ws);

    // Set up WebSocket handlers
    ws.on("message", (data) => this.handleMessage(ws, data));
    ws.on("close", () => this.handleClose(ws));
    ws.on("pong", () => {
      const client = this.clients.get(ws);
      if (client) client.isAlive = true;
    });
    ws.on("error", (error) => {
      console.error("[FluxRealtimeServer] WebSocket error:", error);
    });

    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));

    // Set up awareness update handler
    awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = added.concat(updated).concat(removed);
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const message = encoding.toUint8Array(awarenessEncoder);

      // Broadcast to local clients
      this.broadcastToDocument(docName, message, ws);

      // Publish to Redis for other servers
      if (this.redisPubSub) {
        this.redisPubSub.publishAwarenessUpdate(docName, message);
      }
    });

    // Set up document update handler
    doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === ws) return; // Don't echo back to sender

      const updateEncoder = encoding.createEncoder();
      encoding.writeVarUint(updateEncoder, MESSAGE_SYNC);
      encoding.writeVarUint(updateEncoder, 2); // sync step 2
      encoding.writeVarUint8Array(updateEncoder, update);
      const message = encoding.toUint8Array(updateEncoder);

      // Broadcast to local clients
      this.broadcastToDocument(docName, message, ws);

      // Publish to Redis for other servers
      if (this.redisPubSub) {
        this.redisPubSub.publishUpdate(docName, update);
      }
    });

    // Notify connection
    this.options.onConnect?.(docName, clientId, userId);

    console.warn(
      `[FluxRealtimeServer] Client ${clientId} connected to document: ${docName}`
    );
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ws: WebSocket, data: RawData): void {
    const connection = this.clients.get(ws);
    if (!connection) return;

    try {
      const message = new Uint8Array(data as ArrayBuffer);
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC:
          this.handleSyncMessage(ws, connection, decoder);
          break;
        case MESSAGE_AWARENESS:
          this.handleAwarenessMessage(ws, connection, decoder);
          break;
        case MESSAGE_QUERY_AWARENESS:
          this.handleQueryAwareness(ws, connection);
          break;
      }
    } catch (error) {
      console.error("[FluxRealtimeServer] Error handling message:", error);
    }
  }

  /**
   * Handle sync protocol messages
   */
  private async handleSyncMessage(
    ws: WebSocket,
    connection: ClientConnection,
    decoder: decoding.Decoder
  ): Promise<void> {
    const doc = await this.documentStore.getDocument(connection.docName);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);

    // Process sync message (return value not needed - side effects update encoder)
    syncProtocol.readSyncMessage(decoder, encoder, doc, ws);

    // Send response if there is one
    if (encoding.length(encoder) > 1) {
      ws.send(encoding.toUint8Array(encoder));
    }
  }

  /**
   * Handle awareness protocol messages
   */
  private handleAwarenessMessage(
    ws: WebSocket,
    connection: ClientConnection,
    decoder: decoding.Decoder
  ): void {
    const update = decoding.readVarUint8Array(decoder);
    awarenessProtocol.applyAwarenessUpdate(
      connection.awareness,
      update,
      ws
    );
  }

  /**
   * Handle awareness query
   */
  private handleQueryAwareness(
    ws: WebSocket,
    connection: ClientConnection
  ): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        connection.awareness,
        Array.from(connection.awareness.getStates().keys())
      )
    );
    ws.send(encoding.toUint8Array(encoder));
  }

  /**
   * Handle remote update from Redis
   */
  private async handleRemoteUpdate(
    docName: string,
    update: Uint8Array
  ): Promise<void> {
    const doc = await this.documentStore.getDocument(docName);
    Y.applyUpdate(doc, update, "redis");
  }

  /**
   * Broadcast message to all clients in a document
   */
  private broadcastToDocument(
    docName: string,
    message: Uint8Array,
    exclude: WebSocket | null
  ): void {
    const clients = this.docClients.get(docName);
    if (!clients) return;

    for (const ws of clients) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Handle client disconnection
   */
  private async handleClose(ws: WebSocket): Promise<void> {
    const connection = this.clients.get(ws);
    if (!connection) return;

    const { docName, clientId, userId, awareness } = connection;

    // Remove awareness state
    awarenessProtocol.removeAwarenessStates(awareness, [clientId], "disconnect");

    // Clean up client tracking
    this.clients.delete(ws);
    this.documentStore.removeConnection(docName, ws);

    const docClientSet = this.docClients.get(docName);
    if (docClientSet) {
      docClientSet.delete(ws);

      // Clean up document if no more clients
      if (docClientSet.size === 0) {
        this.docClients.delete(docName);

        // Unsubscribe from Redis
        if (this.redisPubSub) {
          await this.redisPubSub.unsubscribe(docName);
        }
      }
    }

    // Notify disconnection
    this.options.onDisconnect?.(docName, clientId, userId);

    console.warn(
      `[FluxRealtimeServer] Client ${clientId} disconnected from document: ${docName}`
    );
  }

  /**
   * Get server stats
   */
  getStats(): {
    totalClients: number;
    documentsLoaded: number;
    clientsPerDocument: Record<string, number>;
  } {
    const clientsPerDocument: Record<string, number> = {};
    for (const [docName, clients] of this.docClients) {
      clientsPerDocument[docName] = clients.size;
    }

    return {
      totalClients: this.clients.size,
      documentsLoaded: this.documentStore.size,
      clientsPerDocument,
    };
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    // Stop ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all connections
    for (const ws of this.clients.keys()) {
      ws.close(1000, "Server shutting down");
    }

    // Clean up resources
    await this.documentStore.destroy();

    if (this.redisPubSub) {
      await this.redisPubSub.destroy();
    }

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    console.warn("[FluxRealtimeServer] Stopped");
  }
}

export default FluxRealtimeServer;
