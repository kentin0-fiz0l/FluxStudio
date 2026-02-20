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
  /**
   * Parse room name to extract songId and optional branchId.
   * Room format: "song:{songId}" or "song:{songId}:branch:{branchId}"
   */
  function parseRoom(room) {
    const branchMatch = room.match(/^song:(.+):branch:(.+)$/);
    if (branchMatch) {
      return { songId: branchMatch[1], branchId: branchMatch[2] };
    }
    return { songId: room.replace('song:', ''), branchId: null };
  }

  async function getOrCreateDoc(room) {
    let doc = docCache.get(room);
    if (doc) return doc;

    doc = new Y.Doc();
    const { songId, branchId } = parseRoom(room);

    try {
      let dbState;
      if (branchId) {
        dbState = await metmapAdapter.getBranchYjsState(branchId);
      } else {
        dbState = await metmapAdapter.getYjsState(songId);
      }
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
      const { songId, branchId } = parseRoom(room);
      if (branchId) {
        await adapter.saveBranchYjsState(branchId, Buffer.from(state));
      } else {
        await adapter.saveYjsState(songId, Buffer.from(state));
      }
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

    // ---------- Create snapshot from current doc state ----------
    socket.on('yjs:create-snapshot', async ({ room, name, description }) => {
      if (!room || !name) return;

      try {
        const doc = docCache.get(room);
        if (!doc) {
          socket.emit('yjs:snapshot-error', { error: 'No active document for this room' });
          return;
        }

        const songId = room.replace('song:', '');
        const state = Y.encodeStateAsUpdate(doc);

        // Count sections and bars from the doc
        let sectionCount = 0;
        let totalBars = 0;
        try {
          const ySections = doc.getArray('sections');
          sectionCount = ySections.length;
          for (let i = 0; i < ySections.length; i++) {
            const s = ySections.get(i);
            if (s && typeof s.get === 'function') {
              totalBars += (s.get('bars') || 0);
            }
          }
        } catch { /* ignore count errors */ }

        const snapshot = await metmapAdapter.createSnapshot(songId, socket.userId, {
          name,
          description: description || null,
          yjsState: Buffer.from(state),
          sectionCount,
          totalBars,
        });

        // Notify all clients in room
        namespace.to(room).emit('yjs:snapshot-created', { snapshot });
      } catch (err) {
        console.error(`[metmap-collab] create-snapshot error for ${room}:`, err);
        socket.emit('yjs:snapshot-error', { error: 'Failed to create snapshot' });
      }
    });

    // ---------- Restore snapshot ----------
    socket.on('yjs:restore-snapshot', async ({ room, snapshotId }) => {
      if (!room || !snapshotId) return;

      try {
        const snapshot = await metmapAdapter.getSnapshot(snapshotId, socket.userId);
        if (!snapshot || !snapshot.yjsState) {
          socket.emit('yjs:snapshot-error', { error: 'Snapshot not found' });
          return;
        }

        // Create a fresh doc from the snapshot state
        const newDoc = new Y.Doc();
        const bytes = Buffer.isBuffer(snapshot.yjsState)
          ? new Uint8Array(snapshot.yjsState)
          : new Uint8Array(snapshot.yjsState.buffer || snapshot.yjsState);
        Y.applyUpdate(newDoc, bytes);

        // Replace in-memory doc
        const oldDoc = docCache.get(room);
        if (oldDoc) oldDoc.destroy();
        docCache.set(room, newDoc);

        // Encode full state and broadcast to all clients
        const fullUpdate = Y.encodeStateAsUpdate(newDoc);
        namespace.to(room).emit('yjs:sync-response', {
          update: Array.from(fullUpdate),
        });

        // Persist to DB
        const songId = room.replace('song:', '');
        await metmapAdapter.saveYjsState(songId, Buffer.from(fullUpdate));

        namespace.to(room).emit('yjs:snapshot-restored', {
          snapshotId,
          name: snapshot.name,
          restoredBy: socket.username,
        });

        console.log(`[metmap-collab] Snapshot "${snapshot.name}" restored for ${room} by ${socket.username}`);
      } catch (err) {
        console.error(`[metmap-collab] restore-snapshot error for ${room}:`, err);
        socket.emit('yjs:snapshot-error', { error: 'Failed to restore snapshot' });
      }
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
