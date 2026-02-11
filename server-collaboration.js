/**
 * FluxStudio Collaboration Server
 * Real-time CRDT-based collaborative editing using Yjs
 * Sprint 11 - Phase 2: Document Persistence
 */

const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const db = require('./lib/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// y-websocket protocol message types
const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;

const PORT = process.env.COLLAB_PORT || 4000;
const HOST = process.env.COLLAB_HOST || '0.0.0.0';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const JWT_SECRET = process.env.JWT_SECRET;

// Debug: Log which relevant env vars are set at startup (keys only, not values)
console.log('🔧 Collaboration server startup - Environment check:');
console.log('  COLLAB_PORT:', process.env.COLLAB_PORT ? '✓ set' : '✗ not set');
console.log('  COLLAB_HOST:', process.env.COLLAB_HOST ? '✓ set' : '✗ not set');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '✓ set' : '✗ not set');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ set' : '✗ not set');

// ============================================================================
// Authentication & Authorization
// ============================================================================

/**
 * Authenticate WebSocket connection using JWT token
 * @param {string} token - JWT token from query params or headers
 * @returns {Object|null} - Decoded user object or null if invalid
 */
function authenticateWebSocket(token) {
  if (!token) {
    console.error('❌ Auth failed: No token provided');
    return null;
  }
  if (!JWT_SECRET) {
    console.error('❌ Auth failed: JWT_SECRET not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
    return null;
  }
}

/**
 * Check if user has access to a project
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @returns {Promise<string|null>} - User role in project or null if no access
 */
async function checkProjectAccess(userId, projectId) {
  try {
    const result = await db.query(`
      SELECT role FROM project_members
      WHERE project_id = $1 AND user_id = $2 AND is_active = true
      LIMIT 1
    `, [projectId, userId]);

    return result.rows.length > 0 ? result.rows[0].role : null;
  } catch (error) {
    console.error('Error checking project access:', error);
    return null;
  }
}

// Statistics tracking
const stats = {
  startTime: Date.now(),
  connections: 0,
  totalConnections: 0,
  rooms: new Map(), // roomName -> Set of connections
  messages: 0,
};

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'collaboration-server',
      port: PORT,
      uptime: Math.floor((Date.now() - stats.startTime) / 1000),
      connections: stats.connections,
      totalConnections: stats.totalConnections,
      activeRooms: stats.rooms.size,
      rooms: Array.from(stats.rooms.keys()),
      messagesProcessed: stats.messages,
      timestamp: new Date().toISOString(),
    }));
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const roomDetails = {};
    stats.rooms.forEach((connections, roomName) => {
      roomDetails[roomName] = {
        connections: connections.size,
        users: Array.from(connections).map(conn => conn.userId || 'anonymous'),
      };
    });
    res.end(JSON.stringify({
      ...stats,
      rooms: roomDetails,
      timestamp: new Date().toISOString(),
    }, null, 2));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Store Y.Doc and awareness instances per room
const docs = new Map(); // roomName -> Y.Doc
const awarenesses = new Map(); // roomName -> Awareness
const saveTimers = new Map(); // roomName -> timer for auto-save
const updateCounts = new Map(); // roomName -> update count for versioning

/**
 * Create version snapshot
 */
async function createVersionSnapshot(roomName, doc, userId) {
  try {
    // Check if this is a formation room
    const formationMatch = roomName.match(/^project-([^-]+)-formation-(.+)$/);
    if (formationMatch) {
      // For formations, just save the current snapshot (versioning can be added later)
      const formationId = formationMatch[2];
      const snapshot = Y.encodeStateAsUpdate(doc);
      const buffer = Buffer.from(snapshot);

      await db.query(
        `UPDATE formations
         SET yjs_snapshot = $1, last_yjs_sync_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [buffer, formationId]
      );

      console.log(`📸 Saved formation snapshot: ${formationId} (${buffer.length} bytes)`);
      return;
    }

    // Get document ID from room_id
    const result = await db.query(
      'SELECT id FROM documents WHERE room_id = $1',
      [roomName]
    );

    if (result.rows.length === 0) {
      console.warn(`Document not found for room: ${roomName}`);
      return;
    }

    const documentId = result.rows[0].id;

    // Get next version number
    const versionResult = await db.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM document_versions WHERE document_id = $1',
      [documentId]
    );
    const versionNumber = versionResult.rows[0].next_version;

    // Encode full snapshot
    const snapshot = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(snapshot);

    // Store full snapshot every 10 versions, otherwise store diff
    const isFullSnapshot = versionNumber % 10 === 0;

    await db.query(`
      INSERT INTO document_versions (document_id, version_number, snapshot, is_full_snapshot, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [documentId, versionNumber, buffer, isFullSnapshot, userId]);

    console.log(`📸 Created version ${versionNumber} for document ${documentId} (${buffer.length} bytes, full=${isFullSnapshot})`);
    return versionNumber;
  } catch (error) {
    console.error(`Error creating version snapshot for room ${roomName}:`, error.message);
  }
}

/**
 * Save document snapshot to database
 */
async function saveDocument(roomName, doc) {
  try {
    const snapshot = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(snapshot);

    // Check if this is a formation room
    const formationMatch = roomName.match(/^project-([^-]+)-formation-(.+)$/);
    if (formationMatch) {
      const formationId = formationMatch[2];
      await db.query(
        `UPDATE formations
         SET yjs_snapshot = $1, last_yjs_sync_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [buffer, formationId]
      );
      console.log(`💾 Saved formation for room: ${roomName} (${buffer.length} bytes)`);
      return true;
    }

    // Default: document room
    await db.query(
      `INSERT INTO documents (room_id, snapshot, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (room_id) DO UPDATE
       SET snapshot = $2, updated_at = NOW()`,
      [roomName, buffer]
    );

    console.log(`💾 Saved document for room: ${roomName} (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving document for room ${roomName}:`, error.message);
    return false;
  }
}

/**
 * Load document snapshot from database
 */
async function loadDocument(roomName, doc) {
  try {
    // Check if this is a formation room
    const formationMatch = roomName.match(/^project-([^-]+)-formation-(.+)$/);
    if (formationMatch) {
      const formationId = formationMatch[2];
      const result = await db.query(
        'SELECT yjs_snapshot FROM formations WHERE id = $1 AND yjs_snapshot IS NOT NULL',
        [formationId]
      );

      if (result.rows.length > 0 && result.rows[0].yjs_snapshot) {
        const snapshot = new Uint8Array(result.rows[0].yjs_snapshot);
        Y.applyUpdate(doc, snapshot);
        console.log(`📂 Loaded formation for room: ${roomName} (${snapshot.length} bytes)`);
        return true;
      }

      console.log(`📄 No Yjs snapshot for formation: ${roomName}`);
      return false;
    }

    // Default: document room
    const result = await db.query(
      'SELECT snapshot FROM documents WHERE room_id = $1',
      [roomName]
    );

    if (result.rows.length > 0) {
      const snapshot = new Uint8Array(result.rows[0].snapshot);
      Y.applyUpdate(doc, snapshot);
      console.log(`📂 Loaded document for room: ${roomName} (${snapshot.length} bytes)`);
      return true;
    }

    console.log(`📄 No existing document for room: ${roomName}`);
    return false;
  } catch (error) {
    console.error(`❌ Error loading document for room ${roomName}:`, error.message);
    return false;
  }
}

/**
 * Schedule auto-save for a document
 */
function scheduleAutoSave(roomName, doc) {
  // Clear existing timer if any
  if (saveTimers.has(roomName)) {
    clearTimeout(saveTimers.get(roomName));
  }

  // Schedule new save
  const timer = setTimeout(async () => {
    await saveDocument(roomName, doc);
    // Reschedule for next interval
    scheduleAutoSave(roomName, doc);
  }, AUTOSAVE_INTERVAL);

  saveTimers.set(roomName, timer);
}

/**
 * Get or create Y.Doc for a room (with persistence)
 */
async function getDoc(roomName) {
  if (!docs.has(roomName)) {
    const doc = new Y.Doc();

    // Try to load existing document from database
    await loadDocument(roomName, doc);

    docs.set(roomName, doc);

    // Create awareness instance for this room
    const awareness = new awarenessProtocol.Awareness(doc);
    awarenesses.set(roomName, awareness);

    // Start auto-save timer
    scheduleAutoSave(roomName, doc);

    console.log(`📄 Initialized document for room: ${roomName}`);
  }
  return docs.get(roomName);
}

/**
 * Get awareness for a room
 */
function getAwareness(roomName) {
  return awarenesses.get(roomName);
}

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log('🚀 FluxStudio Collaboration Server starting...');

wss.on('connection', async (ws, req) => {
  stats.connections++;
  stats.totalConnections++;

  try {
    // Parse URL: ws://localhost:4000/project-{id}-doc-{id}?token=xyz
    // In production, requests come via /collab prefix: /collab/project-{id}-...
    const urlObj = new URL(req.url, `ws://${req.headers.host || 'localhost:4000'}`);
    let roomName = urlObj.pathname.slice(1) || 'default'; // Remove leading '/'
    // Strip /collab prefix if present (DigitalOcean ingress routing)
    if (roomName.startsWith('collab/')) {
      roomName = roomName.slice(7); // Remove 'collab/'
    }
    const token = urlObj.searchParams.get('token');

    console.log(`🔐 New connection attempt to room: ${roomName}`);

    // Authenticate user
    const user = authenticateWebSocket(token);
    if (!user || !user.id) {
      console.error(`❌ Authentication failed for room: ${roomName}`);
      ws.close(4401, 'Unauthorized: Invalid or missing token');
      stats.connections--;
      return;
    }

    // Parse room ID to extract project ID
    // Expected formats:
    //   - project-{projectId}-doc-{docId}      (documents)
    //   - project-{projectId}-formation-{formationId}  (formations)
    const docMatch = roomName.match(/^project-([^-]+)-doc-/);
    const formationMatch = roomName.match(/^project-([^-]+)-formation-/);
    const match = docMatch || formationMatch;

    if (!match) {
      console.error(`❌ Invalid room format: ${roomName}`);
      ws.close(4400, 'Bad Request: Invalid room name format');
      stats.connections--;
      return;
    }

    const projectId = match[1];
    const roomType = docMatch ? 'document' : 'formation';

    // Check project access
    const role = await checkProjectAccess(user.id, projectId);
    if (!role) {
      console.error(`❌ Access denied for user ${user.id} to project ${projectId}`);
      ws.close(4403, 'Forbidden: No access to this project');
      stats.connections--;
      return;
    }

    // Store user information on WebSocket
    ws.userId = user.id;
    ws.userName = user.name || user.email;
    ws.userRole = role;
    ws.projectId = projectId;

    console.log(`✅ Authenticated: ${ws.userName} (${role}) -> ${roomType}: ${roomName}`);
    console.log(`   Total connections: ${stats.connections}`);
    console.log(`   Total rooms: ${stats.rooms.size + 1}`);

    // Track room connections
    if (!stats.rooms.has(roomName)) {
      stats.rooms.set(roomName, new Set());
    }
    stats.rooms.get(roomName).add(ws);

    // Get Y.Doc and awareness for this room (loads from database if exists)
    const doc = await getDoc(roomName);
    const awareness = getAwareness(roomName);

    // Send initial sync state using y-websocket binary protocol
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));

    // Send awareness states
    if (awareness.states.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.states.keys()))
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
    }

    // Listen for document updates and broadcast to other clients
    const updateHandler = (update, origin) => {
      if (origin !== ws) {
        // Send update using y-websocket binary protocol
        const updateEncoder = encoding.createEncoder();
        encoding.writeVarUint(updateEncoder, messageSync);
        syncProtocol.writeUpdate(updateEncoder, update);
        ws.send(encoding.toUint8Array(updateEncoder));
      }
    };

    doc.on('update', updateHandler);

  // Track connection metadata
  ws.roomName = roomName;
  ws.connectedAt = Date.now();

  // Handle messages - supports both binary y-websocket protocol and JSON
  ws.on('message', (message, isBinary) => {
    stats.messages++;

    try {
      // Binary messages use y-websocket protocol
      if (isBinary || Buffer.isBuffer(message)) {
        const data = new Uint8Array(message);
        const decoder = decoding.createDecoder(data);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case messageSync: {
            // Handle sync protocol messages
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, ws);

            // If there's a response, send it
            if (encoding.length(encoder) > 1) {
              ws.send(encoding.toUint8Array(encoder));
            }

            // Broadcast sync updates to other clients
            if (syncMessageType === syncProtocol.messageYjsUpdate) {
              const room = stats.rooms.get(roomName);
              if (room) {
                room.forEach((client) => {
                  if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(data);
                  }
                });
              }

              // Track updates and create version snapshot every 100 updates
              const count = (updateCounts.get(roomName) || 0) + 1;
              updateCounts.set(roomName, count);
              if (count % 100 === 0 && ws.userId) {
                createVersionSnapshot(roomName, doc, ws.userId).catch(error => {
                  console.error('Error creating version snapshot:', error);
                });
                updateCounts.set(roomName, 0);
              }
            }
            break;
          }

          case messageAwareness: {
            // Handle awareness updates
            awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), ws);
            // Broadcast awareness to other clients
            const room = stats.rooms.get(roomName);
            if (room) {
              room.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(data);
                }
              });
            }
            break;
          }

          default:
            console.warn(`Unknown y-websocket message type: ${messageType}`);
        }
      } else {
        // Text messages - JSON protocol (for backwards compatibility)
        const data = JSON.parse(message.toString());

        if (data.type === 'sync-update') {
          // Check write permissions - viewers can only read, not write
          if (ws.userRole === 'viewer') {
            console.warn(`⚠️  Viewer ${ws.userName} attempted to edit document`);
            return;
          }

          const update = new Uint8Array(data.update);
          Y.applyUpdate(doc, update, ws);

          // Broadcast to other clients in room
          const room = stats.rooms.get(roomName);
          if (room) {
            room.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'sync-update', update: data.update }));
              }
            });
          }
        } else if (data.type === 'sync-request') {
          const state = Y.encodeStateAsUpdate(doc);
          ws.send(JSON.stringify({ type: 'sync-state', state: Array.from(state) }));
        } else if (data.type === 'presence') {
          // Broadcast presence to all users in the room
          const room = stats.rooms.get(roomName);
          if (room) {
            room.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'presence',
                  userId: ws.userId,
                  userName: ws.userName,
                  data: data.data,
                }));
              }
            });
          }
        }
      }
    } catch (err) {
      console.error(`⚠️  Message handling error in room ${roomName}:`, err.message);
    }
  });

  // Handle disconnection
  ws.on('close', async () => {
    stats.connections--;

    // Remove update listener
    doc.off('update', updateHandler);

    const room = stats.rooms.get(roomName);
    if (room) {
      room.delete(ws);

      // Clean up empty rooms
      if (room.size === 0) {
        stats.rooms.delete(roomName);

        // Save document one final time before cleanup
        await saveDocument(roomName, doc);

        // Clear auto-save timer
        if (saveTimers.has(roomName)) {
          clearTimeout(saveTimers.get(roomName));
          saveTimers.delete(roomName);
        }

        // Clear update count
        updateCounts.delete(roomName);

        // Keep document in memory for 5 minutes for quick reconnects
        setTimeout(() => {
          if (!stats.rooms.has(roomName)) {
            docs.delete(roomName);
            console.log(`🗑️  Document removed from memory: ${roomName}`);
          }
        }, 300000); // 5 minutes

        console.log(`💾 Room empty, document saved: ${roomName}`);
      }
    }

    console.log(`❌ Connection closed: ${roomName}`);
    console.log(`   User: ${ws.userName || 'anonymous'}`);
    console.log(`   Duration: ${Math.floor((Date.now() - ws.connectedAt) / 1000)}s`);
    console.log(`   Remaining connections: ${stats.connections}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`⚠️  WebSocket error in room ${roomName}:`, error.message);
  });

  } catch (error) {
    // Handle connection setup errors
    console.error('❌ Connection setup error:', error.message);
    ws.close(4500, 'Internal Server Error');
    stats.connections--;
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('✅ Collaboration server listening');
  console.log(`   Port: ${PORT}`);
  console.log(`   Host: ${HOST}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Stats: http://localhost:${PORT}/stats`);
  console.log('');
  console.log('📝 Connect clients to: ws://localhost:' + PORT + '/<room-name>');
  console.log('');
  console.log('Ready for collaborative editing! 🎨');
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down collaboration server...');

  // Save all documents before shutdown
  console.log('💾 Saving all documents...');
  const savePromises = [];
  docs.forEach((doc, roomName) => {
    savePromises.push(saveDocument(roomName, doc));
  });

  try {
    await Promise.all(savePromises);
    console.log(`✅ Saved ${savePromises.length} document(s)`);
  } catch (error) {
    console.error('❌ Error saving documents:', error.message);
  }

  // Clear all auto-save timers
  saveTimers.forEach((timer) => clearTimeout(timer));
  saveTimers.clear();

  // Clear update counts
  updateCounts.clear();

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close(1000, 'Server shutting down');
  });

  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    console.log(`   Total sessions: ${stats.totalConnections}`);
    console.log(`   Total messages: ${stats.messages}`);
    console.log(`   Uptime: ${Math.floor((Date.now() - stats.startTime) / 1000)}s`);
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = server;
