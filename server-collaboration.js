/**
 * FluxStudio Collaboration Server
 * Real-time CRDT-based collaborative editing using Yjs
 * Sprint 11 - Phase 1: Infrastructure Setup
 */

const http = require('http');
const WebSocket = require('ws');
const Y = require('yjs');
const { encodeAwarenessUpdate, applyAwarenessUpdate } = require('y-protocols/awareness');
require('dotenv').config();

const PORT = process.env.COLLAB_PORT || 4000;
const HOST = process.env.COLLAB_HOST || '0.0.0.0';

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

// Get or create Y.Doc for a room
function getDoc(roomName) {
  if (!docs.has(roomName)) {
    const doc = new Y.Doc();
    docs.set(roomName, doc);
    console.log(`📄 Created new document for room: ${roomName}`);
  }
  return docs.get(roomName);
}

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log('🚀 FluxStudio Collaboration Server starting...');

wss.on('connection', (ws, req) => {
  stats.connections++;
  stats.totalConnections++;

  // Extract room name from URL path
  // URL format: ws://localhost:4000/project-123
  const url = req.url || '/default';
  const roomName = url.slice(1) || 'default'; // Remove leading '/'

  console.log(`✅ New connection to room: ${roomName}`);
  console.log(`   Total connections: ${stats.connections}`);
  console.log(`   Total rooms: ${stats.rooms.size + 1}`);

  // Track room connections
  if (!stats.rooms.has(roomName)) {
    stats.rooms.set(roomName, new Set());
  }
  stats.rooms.get(roomName).add(ws);

  // Get Y.Doc for this room
  const doc = getDoc(roomName);

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
        // Apply update to document
        const update = new Uint8Array(data.update);
        Y.applyUpdate(doc, update, ws); // origin=ws to prevent echo

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
      } else if (data.type === 'auth') {
        // Authentication
        ws.userId = data.userId;
        ws.userName = data.userName;
        console.log(`   User authenticated: ${data.userName} (${data.userId})`);
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
  ws.on('close', () => {
    stats.connections--;

    // Remove update listener
    doc.off('update', updateHandler);

    const room = stats.rooms.get(roomName);
    if (room) {
      room.delete(ws);

      // Clean up empty rooms
      if (room.size === 0) {
        stats.rooms.delete(roomName);
        // Optionally: persist document and remove from memory
        // For now, keep in memory for quick reconnects
        console.log(`🗑️  Room empty (keeping document in memory): ${roomName}`);
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
const shutdown = () => {
  console.log('\n🛑 Shutting down collaboration server...');

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
