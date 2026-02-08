/**
 * DocumentStore - In-memory Yjs document management with persistence
 *
 * Manages Yjs documents in memory with optional persistence callbacks.
 * Supports TTL-based cleanup for inactive documents.
 */

import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as syncProtocol from "y-protocols/sync";

export interface DocumentStoreOptions {
  /** Time in ms before an inactive document is unloaded (default: 30 minutes) */
  gcTimeout?: number;
  /** Callback to persist document state */
  onPersist?: (docName: string, state: Uint8Array) => Promise<void>;
  /** Callback to load document state */
  onLoad?: (docName: string) => Promise<Uint8Array | null>;
  /** Callback when document is destroyed */
  onDestroy?: (docName: string) => Promise<void>;
}

interface StoredDocument {
  doc: Y.Doc;
  lastAccessed: number;
  connections: Set<unknown>;
  awareness: Map<number, unknown>;
}

export class DocumentStore {
  private documents: Map<string, StoredDocument> = new Map();
  private gcInterval: NodeJS.Timeout | null = null;
  private options: Required<DocumentStoreOptions>;

  constructor(options: DocumentStoreOptions = {}) {
    this.options = {
      gcTimeout: options.gcTimeout ?? 30 * 60 * 1000, // 30 minutes
      onPersist: options.onPersist ?? (async () => {}),
      onLoad: options.onLoad ?? (async () => null),
      onDestroy: options.onDestroy ?? (async () => {}),
    };

    // Start garbage collection interval
    this.startGC();
  }

  /**
   * Get or create a Yjs document
   */
  async getDocument(docName: string): Promise<Y.Doc> {
    let stored = this.documents.get(docName);

    if (!stored) {
      const doc = new Y.Doc();

      // Try to load persisted state
      const persistedState = await this.options.onLoad(docName);
      if (persistedState) {
        Y.applyUpdate(doc, persistedState);
      }

      stored = {
        doc,
        lastAccessed: Date.now(),
        connections: new Set(),
        awareness: new Map(),
      };

      // Set up persistence on updates
      doc.on("update", async (_update: Uint8Array) => {
        const state = Y.encodeStateAsUpdate(doc);
        await this.options.onPersist(docName, state);
      });

      this.documents.set(docName, stored);
    }

    stored.lastAccessed = Date.now();
    return stored.doc;
  }

  /**
   * Check if a document exists
   */
  hasDocument(docName: string): boolean {
    return this.documents.has(docName);
  }

  /**
   * Get document metadata
   */
  getDocumentInfo(docName: string): {
    connectionCount: number;
    lastAccessed: number;
  } | null {
    const stored = this.documents.get(docName);
    if (!stored) return null;

    return {
      connectionCount: stored.connections.size,
      lastAccessed: stored.lastAccessed,
    };
  }

  /**
   * Register a connection for a document
   */
  addConnection(docName: string, connection: unknown): void {
    const stored = this.documents.get(docName);
    if (stored) {
      stored.connections.add(connection);
      stored.lastAccessed = Date.now();
    }
  }

  /**
   * Remove a connection from a document
   */
  removeConnection(docName: string, connection: unknown): void {
    const stored = this.documents.get(docName);
    if (stored) {
      stored.connections.delete(connection);
    }
  }

  /**
   * Get all connections for a document
   */
  getConnections(docName: string): Set<unknown> {
    return this.documents.get(docName)?.connections ?? new Set();
  }

  /**
   * Get sync state vector for a document
   */
  getSyncStateVector(docName: string): Uint8Array | null {
    const stored = this.documents.get(docName);
    if (!stored) return null;
    return Y.encodeStateVector(stored.doc);
  }

  /**
   * Apply sync step 1 (state vector) and get response
   */
  applySyncStep1(
    docName: string,
    stateVector: Uint8Array
  ): Uint8Array | null {
    const stored = this.documents.get(docName);
    if (!stored) return null;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // message type: sync
    syncProtocol.writeSyncStep2(encoder, stored.doc, stateVector);
    return encoding.toUint8Array(encoder);
  }

  /**
   * Apply sync step 2 (document diff)
   */
  applySyncStep2(docName: string, update: Uint8Array): void {
    const stored = this.documents.get(docName);
    if (stored) {
      Y.applyUpdate(stored.doc, update);
    }
  }

  /**
   * Apply an update to a document
   */
  applyUpdate(docName: string, update: Uint8Array): void {
    const stored = this.documents.get(docName);
    if (stored) {
      Y.applyUpdate(stored.doc, update);
    }
  }

  /**
   * Get full document state
   */
  getDocumentState(docName: string): Uint8Array | null {
    const stored = this.documents.get(docName);
    if (!stored) return null;
    return Y.encodeStateAsUpdate(stored.doc);
  }

  /**
   * Persist a document immediately
   */
  async persistDocument(docName: string): Promise<void> {
    const stored = this.documents.get(docName);
    if (stored) {
      const state = Y.encodeStateAsUpdate(stored.doc);
      await this.options.onPersist(docName, state);
    }
  }

  /**
   * Destroy a document (remove from memory)
   */
  async destroyDocument(docName: string): Promise<void> {
    const stored = this.documents.get(docName);
    if (stored) {
      // Persist before destroying
      await this.persistDocument(docName);

      // Clean up
      stored.doc.destroy();
      this.documents.delete(docName);

      await this.options.onDestroy(docName);
    }
  }

  /**
   * Get all document names
   */
  getDocumentNames(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Get document count
   */
  get size(): number {
    return this.documents.size;
  }

  /**
   * Start garbage collection for inactive documents
   */
  private startGC(): void {
    this.gcInterval = setInterval(() => {
      const now = Date.now();

      for (const [docName, stored] of this.documents) {
        // Don't GC documents with active connections
        if (stored.connections.size > 0) continue;

        // Check if document has been inactive
        if (now - stored.lastAccessed > this.options.gcTimeout) {
          console.warn(`[DocumentStore] GC: Unloading inactive document: ${docName}`);
          this.destroyDocument(docName);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  /**
   * Stop garbage collection
   */
  stopGC(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  /**
   * Destroy all documents and clean up
   */
  async destroy(): Promise<void> {
    this.stopGC();

    for (const docName of this.documents.keys()) {
      await this.destroyDocument(docName);
    }
  }
}

export default DocumentStore;
