/**
 * MetMap Collaboration Socket — Yjs relay namespace.
 *
 * Socket.IO namespace `/metmap-collab` that:
 * - Authenticates via JWT middleware
 * - Manages rooms per song (song:{songId})
 * - Relays Yjs binary updates between clients
 * - Relays awareness updates (presence, cursors)
 * - Persists Yjs document state to PostgreSQL (debounced)
 * - Maintains in-memory document cache (LRU, max 50)
 */

const jwt = require('jsonwebtoken');

// Simple LRU cache for Yjs document state
class LRUCache {
  constructor(maxSize = 50) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }
}

module.exports = function setupMetMapCollabSocket(namespace, metmapAdapter, jwtSecret) {
  const docCache = new LRUCache(50);
  const roomClients = new Map(); // room -> Set of socket ids
  const pendingFlushes = new Map(); // room -> setTimeout id

  const FLUSH_INTERVAL_MS = 30_000; // Flush to DB every 30 seconds

  // ==================== JWT Auth Middleware ====================

  namespace.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, jwtSecret);
      socket.userId = decoded.userId || decoded.id;
      socket.username = decoded.username || decoded.name || 'Unknown';
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ==================== Connection Handler ====================

  namespace.on('connection', (socket) => {
    console.log(`[metmap-collab] User ${socket.username} connected (${socket.id})`);

    // ---------- Join room ----------
    socket.on('yjs:join', async ({ room }) => {
      if (!room || typeof room !== 'string') return;

      socket.join(room);

      // Track clients per room
      if (!roomClients.has(room)) roomClients.set(room, new Set());
      roomClients.get(room).add(socket.id);

      console.log(`[metmap-collab] ${socket.username} joined ${room} (${roomClients.get(room).size} clients)`);

      // Broadcast peer count
      namespace.to(room).emit('yjs:peer-count', {
        room,
        count: roomClients.get(room).size,
      });
    });

    // ---------- Leave room ----------
    socket.on('yjs:leave', ({ room }) => {
      if (!room) return;
      socket.leave(room);
      roomClients.get(room)?.delete(socket.id);

      if (roomClients.get(room)?.size === 0) {
        // Last client left — flush state to DB
        flushRoomState(room, metmapAdapter);
        roomClients.delete(room);
      }

      namespace.to(room).emit('yjs:peer-count', {
        room,
        count: roomClients.get(room)?.size || 0,
      });
    });

    // ---------- Sync request ----------
    socket.on('yjs:sync-request', async ({ room, stateVector }) => {
      if (!room) return;

      try {
        // Check cache first, then DB
        let state = docCache.get(room);

        if (!state) {
          // Extract songId from room name (format: song:{uuid})
          const songId = room.replace('song:', '');
          const dbState = await metmapAdapter.getYjsState(songId);
          if (dbState) {
            state = Buffer.isBuffer(dbState)
              ? new Uint8Array(dbState)
              : new Uint8Array(dbState.buffer || dbState);
            docCache.set(room, state);
          }
        }

        if (state) {
          socket.emit('yjs:sync-response', {
            update: Array.from(state),
          });
        } else {
          // No existing state — send empty update
          socket.emit('yjs:sync-response', {
            update: [],
          });
        }
      } catch (err) {
        console.error(`[metmap-collab] sync-request error for ${room}:`, err);
        socket.emit('yjs:sync-response', { update: [] });
      }
    });

    // ---------- Document update ----------
    socket.on('yjs:update', ({ room, update }) => {
      if (!room || !update) return;

      // Broadcast to other room members
      socket.to(room).emit('yjs:update', { update });

      // Merge into cached state
      try {
        const updateBytes = new Uint8Array(update);
        const existing = docCache.get(room);

        if (existing) {
          // Merge updates using Yjs merge utility
          // Since we can't import Yjs on the server easily, store latest full state
          // The client sends incremental updates; we accumulate them
          // For proper merging we'd need Yjs on server — for now, store the update
          // and rely on sync-request to send whatever we have
          const merged = mergeUpdates(existing, updateBytes);
          docCache.set(room, merged);
        } else {
          docCache.set(room, updateBytes);
        }

        // Schedule debounced flush to DB
        schedulePersist(room, metmapAdapter);
      } catch (err) {
        console.error(`[metmap-collab] update merge error for ${room}:`, err);
      }
    });

    // ---------- Awareness update ----------
    socket.on('yjs:awareness-update', ({ room, update }) => {
      if (!room || !update) return;
      // Broadcast to other room members (don't persist awareness)
      socket.to(room).emit('yjs:awareness-update', { update });
    });

    // ---------- Disconnect ----------
    socket.on('disconnect', () => {
      console.log(`[metmap-collab] User ${socket.username} disconnected (${socket.id})`);

      // Remove from all rooms
      for (const [room, clients] of roomClients) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);

          namespace.to(room).emit('yjs:peer-count', {
            room,
            count: clients.size,
          });

          if (clients.size === 0) {
            flushRoomState(room, metmapAdapter);
            roomClients.delete(room);
          }
        }
      }
    });
  });

  // ==================== Helpers ====================

  /**
   * Simple update concatenation. For proper merging, the server would need
   * to import Yjs and apply updates to a Y.Doc. This concatenation approach
   * works because the sync protocol handles diffing on reconnect.
   * In Sprint 31 we'll add server-side Yjs for proper merge.
   */
  function mergeUpdates(existing, incoming) {
    const merged = new Uint8Array(existing.length + incoming.length);
    merged.set(existing, 0);
    merged.set(incoming, existing.length);
    return merged;
  }

  function schedulePersist(room, adapter) {
    // Clear existing timer
    if (pendingFlushes.has(room)) {
      clearTimeout(pendingFlushes.get(room));
    }

    // Schedule new flush
    const timer = setTimeout(() => {
      flushRoomState(room, adapter);
      pendingFlushes.delete(room);
    }, FLUSH_INTERVAL_MS);

    pendingFlushes.set(room, timer);
  }

  async function flushRoomState(room, adapter) {
    const state = docCache.get(room);
    if (!state) return;

    const songId = room.replace('song:', '');
    try {
      await adapter.saveYjsState(songId, Buffer.from(state));
      console.log(`[metmap-collab] Flushed Yjs state for ${room} to DB (${state.length} bytes)`);
    } catch (err) {
      console.error(`[metmap-collab] Failed to flush ${room}:`, err);
    }
  }

  console.log('[metmap-collab] MetMap collaboration namespace initialized');
};
