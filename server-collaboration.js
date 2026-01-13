/**
 * FluxStudio Collaboration Server
 * Real-time CRDT-based collaborative editing using Yjs
 * Sprint 11 - Phase 2: Document Persistence
 */

const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const { encodeAwarenessUpdate, applyAwarenessUpdate } = require('y-protocols/awareness');
const db = require('./lib/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.COLLAB_PORT || 4000;
const HOST = process.env.COLLAB_HOST || '0.0.0.0';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds
const JWT_SECRET = process.env.JWT_SECRET;

// ============================================================================
// Authentication & Authorization
// ============================================================================

/**
 * Authenticate WebSocket connection using JWT token
 * @param {string} token - JWT token from query params or headers
 * @returns {Object|null} - Decoded user object or null if invalid
 */
function authenticateWebSocket(token) {
  if (!token || !JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error.message);
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

// Store Y.Doc instances per room
const docs = new Map(); // roomName -> Y.Doc
const saveTimers = new Map(); // roomName -> timer for auto-save
const updateCounts = new Map(); // roomName -> update count for versioning

/**
 * Create version snapshot
 */
async function createVersionSnapshot(roomName, doc, userId) {
  try {
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

    // Start auto-save timer
    scheduleAutoSave(roomName, doc);

    console.log(`📄 Initialized document for room: ${roomName}`);
  }
  return docs.get(roomName);
}

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log('🚀 FluxStudio Collaboration Server starting...');

wss.on('connection', async (ws, req) => {
  stats.connections++;
  stats.totalConnections++;

  try {
    // Parse URL: ws://localhost:4000/project-{id}-doc-{id}?token=xyz
    const urlObj = new URL(req.url, `ws://${req.headers.host || 'localhost:4000'}`);
    const roomName = urlObj.pathname.slice(1) || 'default'; // Remove leading '/'
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
    // Expected format: project-{projectId}-doc-{docId}
    const match = roomName.match(/^project-([^-]+)-doc-/);
    if (!match) {
      console.error(`❌ Invalid room format: ${roomName}`);
      ws.close(4400, 'Bad Request: Invalid room name format');
      stats.connections--;
      return;
    }

    const projectId = match[1];

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

    console.log(`✅ Authenticated: ${ws.userName} (${role}) -> room: ${roomName}`);
    console.log(`   Total connections: ${stats.connections}`);
    console.log(`   Total rooms: ${stats.rooms.size + 1}`);

    // Track room connections
    if (!stats.rooms.has(roomName)) {
      stats.rooms.set(roomName, new Set());
    }
    stats.rooms.get(roomName).add(ws);

    // Get Y.Doc for this room (loads from database if exists)
    const doc = await getDoc(roomName);

  // Send initial document state to client
  const stateVector = Y.encodeStateVector(doc);
  ws.send(JSON.stringify({
    type: 'sync-init',
    stateVector: Array.from(stateVector),
  }));

  // Listen for document updates and broadcast to other clients
  const updateHandler = (update, origin) => {
    if (origin !== ws) {
      ws.send(JSON.stringify({
        type: 'sync-update',
        update: Array.from(update),
      }));
    }
  };

  doc.on('update', updateHandler);

  // Track connection metadata
  ws.roomName = roomName;
  ws.connectedAt = Date.now();

  // Handle messages
  ws.on('message', (message) => {
    stats.messages++;

    try {
      const data = JSON.parse(message);

      // Handle different message types
      if (data.type === 'sync-update') {
        // Check write permissions - viewers can only read, not write
        if (ws.userRole === 'viewer') {
          console.warn(`⚠️  Viewer ${ws.userName} attempted to edit document`);
          return; // Silently ignore edit attempts from viewers
        }

        // Apply update to document
        const update = new Uint8Array(data.update);
        Y.applyUpdate(doc, update, ws); // origin=ws to prevent echo

        // Update last_edited_by and last_edited_at in database (async, non-blocking)
        if (ws.userId) {
          db.query(`
            UPDATE documents
            SET last_edited_by = $1, last_edited_at = NOW()
            WHERE room_id = $2
          `, [ws.userId, roomName]).catch(error => {
            console.error('Error updating last_edited:', error);
          });
        }

        // Track updates and create version snapshot every 100 updates
        const count = (updateCounts.get(roomName) || 0) + 1;
        updateCounts.set(roomName, count);

        if (count % 100 === 0 && ws.userId) {
          // Create version snapshot asynchronously
          createVersionSnapshot(roomName, doc, ws.userId).catch(error => {
            console.error('Error creating version snapshot:', error);
          });
          updateCounts.set(roomName, 0); // Reset counter
        }

        // Broadcast to other clients in room
        const room = stats.rooms.get(roomName);
        if (room) {
          room.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'sync-update',
                update: data.update,
              }));
            }
          });
        }
      } else if (data.type === 'sync-request') {
        // Client requesting full state
        const state = Y.encodeStateAsUpdate(doc);
        ws.send(JSON.stringify({
          type: 'sync-state',
          state: Array.from(state),
        }));
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
