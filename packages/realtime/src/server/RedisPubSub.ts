/**
 * RedisPubSub - Cross-server communication for horizontal scaling
 *
 * Enables multiple FluxRealtimeServer instances to communicate
 * and keep documents synchronized across servers.
 */

import Redis, { RedisOptions } from "ioredis";

export interface RedisPubSubOptions {
  /** Redis connection URL or options */
  redis?: string | RedisOptions;
  /** Channel prefix for namespacing */
  channelPrefix?: string;
  /** Callback when update is received from another server */
  onUpdate?: (docName: string, update: Uint8Array, origin: string) => void;
  /** Callback when awareness update is received */
  onAwarenessUpdate?: (
    docName: string,
    awarenessUpdate: Uint8Array,
    origin: string
  ) => void;
}

interface PubSubMessage {
  type: "update" | "awareness" | "presence";
  docName: string;
  data: string; // Base64 encoded
  origin: string;
  timestamp: number;
}

export class RedisPubSub {
  private pub: Redis;
  private sub: Redis;
  private options: Required<Omit<RedisPubSubOptions, "redis">>;
  private serverId: string;
  private subscribed: Set<string> = new Set();

  constructor(options: RedisPubSubOptions = {}) {
    const redisOptions = options.redis ?? process.env.REDIS_URL ?? "redis://localhost:6379";

    // Create separate connections for pub and sub
    this.pub = new Redis(redisOptions as string);
    this.sub = new Redis(redisOptions as string);

    this.serverId = `server-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.options = {
      channelPrefix: options.channelPrefix ?? "fluxstudio:realtime:",
      onUpdate: options.onUpdate ?? (() => {}),
      onAwarenessUpdate: options.onAwarenessUpdate ?? (() => {}),
    };

    // Set up message handler
    this.sub.on("message", this.handleMessage.bind(this));

    console.log(`[RedisPubSub] Initialized with server ID: ${this.serverId}`);
  }

  /**
   * Get the channel name for a document
   */
  private getChannel(docName: string): string {
    return `${this.options.channelPrefix}${docName}`;
  }

  /**
   * Subscribe to updates for a document
   */
  async subscribe(docName: string): Promise<void> {
    const channel = this.getChannel(docName);

    if (this.subscribed.has(channel)) {
      return;
    }

    await this.sub.subscribe(channel);
    this.subscribed.add(channel);

    console.log(`[RedisPubSub] Subscribed to: ${docName}`);
  }

  /**
   * Unsubscribe from a document
   */
  async unsubscribe(docName: string): Promise<void> {
    const channel = this.getChannel(docName);

    if (!this.subscribed.has(channel)) {
      return;
    }

    await this.sub.unsubscribe(channel);
    this.subscribed.delete(channel);

    console.log(`[RedisPubSub] Unsubscribed from: ${docName}`);
  }

  /**
   * Publish a document update
   */
  async publishUpdate(docName: string, update: Uint8Array): Promise<void> {
    const message: PubSubMessage = {
      type: "update",
      docName,
      data: Buffer.from(update).toString("base64"),
      origin: this.serverId,
      timestamp: Date.now(),
    };

    const channel = this.getChannel(docName);
    await this.pub.publish(channel, JSON.stringify(message));
  }

  /**
   * Publish an awareness update
   */
  async publishAwarenessUpdate(
    docName: string,
    awarenessUpdate: Uint8Array
  ): Promise<void> {
    const message: PubSubMessage = {
      type: "awareness",
      docName,
      data: Buffer.from(awarenessUpdate).toString("base64"),
      origin: this.serverId,
      timestamp: Date.now(),
    };

    const channel = this.getChannel(docName);
    await this.pub.publish(channel, JSON.stringify(message));
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(channel: string, messageStr: string): void {
    try {
      const message: PubSubMessage = JSON.parse(messageStr);

      // Ignore messages from self
      if (message.origin === this.serverId) {
        return;
      }

      const data = Buffer.from(message.data, "base64");

      switch (message.type) {
        case "update":
          this.options.onUpdate(message.docName, new Uint8Array(data), message.origin);
          break;
        case "awareness":
          this.options.onAwarenessUpdate(
            message.docName,
            new Uint8Array(data),
            message.origin
          );
          break;
      }
    } catch (error) {
      console.error("[RedisPubSub] Error handling message:", error);
    }
  }

  /**
   * Store document state in Redis (for persistence)
   */
  async storeDocumentState(docName: string, state: Uint8Array): Promise<void> {
    const key = `${this.options.channelPrefix}state:${docName}`;
    await this.pub.set(key, Buffer.from(state).toString("base64"));
  }

  /**
   * Load document state from Redis
   */
  async loadDocumentState(docName: string): Promise<Uint8Array | null> {
    const key = `${this.options.channelPrefix}state:${docName}`;
    const data = await this.pub.get(key);

    if (!data) return null;

    return new Uint8Array(Buffer.from(data, "base64"));
  }

  /**
   * Delete document state from Redis
   */
  async deleteDocumentState(docName: string): Promise<void> {
    const key = `${this.options.channelPrefix}state:${docName}`;
    await this.pub.del(key);
  }

  /**
   * Store presence/awareness state
   */
  async storePresence(
    docName: string,
    clientId: number,
    state: unknown
  ): Promise<void> {
    const key = `${this.options.channelPrefix}presence:${docName}`;
    await this.pub.hset(key, clientId.toString(), JSON.stringify(state));
    // Set TTL for presence data (5 minutes)
    await this.pub.expire(key, 300);
  }

  /**
   * Get all presence states for a document
   */
  async getPresence(docName: string): Promise<Map<number, unknown>> {
    const key = `${this.options.channelPrefix}presence:${docName}`;
    const data = await this.pub.hgetall(key);

    const presence = new Map<number, unknown>();
    for (const [clientId, state] of Object.entries(data)) {
      try {
        presence.set(parseInt(clientId, 10), JSON.parse(state));
      } catch {
        // Ignore invalid entries
      }
    }

    return presence;
  }

  /**
   * Remove presence for a client
   */
  async removePresence(docName: string, clientId: number): Promise<void> {
    const key = `${this.options.channelPrefix}presence:${docName}`;
    await this.pub.hdel(key, clientId.toString());
  }

  /**
   * Get server stats
   */
  async getStats(): Promise<{
    subscribedChannels: number;
    serverId: string;
  }> {
    return {
      subscribedChannels: this.subscribed.size,
      serverId: this.serverId,
    };
  }

  /**
   * Check if Redis is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.pub.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up and disconnect
   */
  async destroy(): Promise<void> {
    // Unsubscribe from all channels
    for (const channel of this.subscribed) {
      await this.sub.unsubscribe(channel);
    }
    this.subscribed.clear();

    // Disconnect
    await this.pub.quit();
    await this.sub.quit();

    console.log("[RedisPubSub] Destroyed");
  }
}

export default RedisPubSub;
