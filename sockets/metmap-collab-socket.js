/**
 * MetMap Collaboration Socket — Yjs relay namespace.
 *
 * Sprint 31: Upgraded from byte concatenation to real Y.Doc instances.
 *
 * Socket.IO namespace `/metmap-collab` that:
 * - Authenticates via JWT middleware
 * - Manages rooms per song (song:{songId})
 * - Maintains in-memory Y.Doc instances (LRU, max 50)
 * - Relays Yjs binary updates between clients with proper merging
 * - Relays awareness updates (presence, cursors)
 * - Persists Yjs document state to PostgreSQL (debounced)
 */

const jwt = require('jsonwebtoken');
const Y = require('yjs');

// LRU cache for Y.Doc instances
class DocLRUCache {
  constructor(maxSize = 50, onEvict) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.onEvict = onEvict || (() => {});
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
    // Evict oldest if over capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      const evicted = this.cache.get(oldest);
      this.cache.delete(oldest);
      this.onEvict(oldest, evicted);
    }
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }
}

module.exports = function setupMetMapCollabSocket(namespace, metmapAdapter, jwtSecret) {
  const docCache = new DocLRUCache(50, (room, doc) => {
    // Flush evicted doc to DB before discarding
    flushDoc(room, doc, metmapAdapter);
    doc.destroy();
  });
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

  // ==================== Helpers ====================

  /**
   * Get or create a Y.Doc for a room, loading persisted state from DB.
   */
  async function getOrCreateDoc(room) {
    let doc = docCache.get(room);
    if (doc) return doc;

    doc = new Y.Doc();
    const songId = room.replace('song:', '');

    try {
      const dbState = await metmapAdapter.getYjsState(songId);
      if (dbState) {
        const bytes = Buffer.isBuffer(dbState)
          ? new Uint8Array(dbState)
          : new Uint8Array(dbState.buffer || dbState);
        Y.applyUpdate(doc, bytes);
      }
    } catch (err) {
      console.error(`[metmap-collab] Failed to load Yjs state for ${room}:`, err);
    }

    docCache.set(room, doc);
    return doc;
  }

  /**
   * Flush a Y.Doc's state to PostgreSQL.
   */
  async function flushDoc(room, doc, adapter) {
    try {
      const state = Y.encodeStateAsUpdate(doc);
      const songId = room.replace('song:', '');
      await adapter.saveYjsState(songId, Buffer.from(state));
      console.log(`[metmap-collab] Flushed Yjs state for ${room} to DB (${state.length} bytes)`);
    } catch (err) {
      console.error(`[metmap-collab] Failed to flush ${room}:`, err);
    }
  }

  function schedulePersist(room) {
    if (pendingFlushes.has(room)) {
      clearTimeout(pendingFlushes.get(room));
    }

    const timer = setTimeout(async () => {
      const doc = docCache.get(room);
      if (doc) {
        await flushDoc(room, doc, metmapAdapter);
      }
      pendingFlushes.delete(room);
    }, FLUSH_INTERVAL_MS);

    pendingFlushes.set(room, timer);
  }

  // ==================== Connection Handler ====================

  namespace.on('connection', (socket) => {
    console.log(`[metmap-collab] User ${socket.username} connected (${socket.id})`);

    // ---------- Join room ----------
    socket.on('yjs:join', async ({ room }) => {
      if (!room || typeof room !== 'string') return;

      // Clean up stale membership (reconnect case)
      if (roomClients.get(room)?.has(socket.id)) {
        // Already in room — this is a rejoin
        console.log(`[metmap-collab] ${socket.username} rejoined ${room}`);
      } else {
        socket.join(room);
        if (!roomClients.has(room)) roomClients.set(room, new Set());
        roomClients.get(room).add(socket.id);
      }

      console.log(`[metmap-collab] ${socket.username} joined ${room} (${roomClients.get(room).size} clients)`);

      // Ensure doc is loaded
      await getOrCreateDoc(room);

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
        // Last client left — flush and clean up
        const doc = docCache.get(room);
        if (doc) {
          flushDoc(room, doc, metmapAdapter);
          // Keep doc in cache for fast reconnect — LRU will evict if needed
        }
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
        const doc = await getOrCreateDoc(room);

        if (stateVector && stateVector.length > 0) {
          // Send diff based on client's state vector
          const sv = new Uint8Array(stateVector);
          const update = Y.encodeStateAsUpdate(doc, sv);
          socket.emit('yjs:sync-response', {
            update: Array.from(update),
          });
        } else {
          // No state vector — send full state
          const update = Y.encodeStateAsUpdate(doc);
          socket.emit('yjs:sync-response', {
            update: Array.from(update),
          });
        }
      } catch (err) {
        console.error(`[metmap-collab] sync-request error for ${room}:`, err);
        socket.emit('yjs:sync-response', { update: [] });
      }
    });

    // ---------- Document update ----------
    socket.on('yjs:update', async ({ room, update }) => {
      if (!room || !update) return;

      // Broadcast to other room members
      socket.to(room).emit('yjs:update', { update });

      // Apply to server-side Y.Doc
      try {
        const doc = await getOrCreateDoc(room);
        const updateBytes = new Uint8Array(update);
        Y.applyUpdate(doc, updateBytes);

        // Schedule debounced flush to DB
        schedulePersist(room);
      } catch (err) {
        console.error(`[metmap-collab] update apply error for ${room}:`, err);
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
            const doc = docCache.get(room);
            if (doc) {
              flushDoc(room, doc, metmapAdapter);
            }
            roomClients.delete(room);
          }
        }
      }
    });
  });

  console.log('[metmap-collab] MetMap collaboration namespace initialized (server-side Yjs)');
};
