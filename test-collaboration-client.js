/**
 * Test Client for FluxStudio Collaboration Server
 * Tests Yjs CRDT synchronization
 */

const WebSocket = require('ws');
const Y = require('yjs');

// Configuration
const SERVER_URL = 'ws://localhost:4000';
const ROOM_NAME = 'test-project-123';
const USER_NAME = process.argv[2] || 'TestUser' + Math.floor(Math.random() * 1000);

// Create Y.Doc for local state
const ydoc = new Y.Doc();
const ymap = ydoc.getMap('shared');
const yarray = ydoc.getArray('items');

console.log(`🚀 Starting test client: ${USER_NAME}`);
console.log(`   Connecting to: ${SERVER_URL}/${ROOM_NAME}`);
console.log('');

// Connect to collaboration server
const ws = new WebSocket(`${SERVER_URL}/${ROOM_NAME}`);

ws.on('open', () => {
  console.log('✅ Connected to collaboration server');

  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    userId: `user-${Date.now()}`,
    userName: USER_NAME,
  }));

  // Wait a bit, then make some changes
  setTimeout(() => {
    console.log('\n📝 Making local changes...');

    // Update shared map
    ymap.set('lastEditor', USER_NAME);
    ymap.set('editCount', (ymap.get('editCount') || 0) + 1);
    ymap.set('timestamp', Date.now());

    // Add item to shared array
    yarray.push([`Item from ${USER_NAME} at ${new Date().toISOString()}`]);

    console.log('   Updated shared map:', ymap.toJSON());
    console.log('   Array now has', yarray.length, 'items');
  }, 1000);

  // Send presence update
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'presence',
      data: {
        cursor: { x: Math.random() * 100, y: Math.random() * 100 },
        activeElement: 'element-' + Math.floor(Math.random() * 10),
      },
    }));
  }, 5000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);

    if (message.type === 'sync-init') {
      console.log('📥 Received initial state vector');

      // Request full state
      ws.send(JSON.stringify({
        type: 'sync-request',
      }));
    } else if (message.type === 'sync-state') {
      console.log('📥 Received full document state');

      const state = new Uint8Array(message.state);
      Y.applyUpdate(ydoc, state);

      console.log('   Synced shared map:', ymap.toJSON());
      console.log('   Synced array length:', yarray.length);
    } else if (message.type === 'sync-update') {
      console.log('📥 Received update from another client');

      const update = new Uint8Array(message.update);
      Y.applyUpdate(ydoc, update);

      console.log('   Updated shared map:', ymap.toJSON());
      console.log('   Updated array length:', yarray.length);
    } else if (message.type === 'presence') {
      console.log(`👤 Presence update from ${message.userName}:`, message.data);
    }
  } catch (err) {
    console.error('Error processing message:', err.message);
  }
});

// Send updates to server
ydoc.on('update', (update, origin) => {
  if (origin !== 'server') {
    console.log('📤 Sending update to server');
    ws.send(JSON.stringify({
      type: 'sync-update',
      update: Array.from(update),
    }));
  }
});

ws.on('close', () => {
  console.log('\n❌ Disconnected from server');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('⚠️  Connection error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  ws.close();
});

console.log('');
console.log('📊 Current document state:');
console.log('   Map:', ymap.toJSON());
console.log('   Array:', yarray.toArray());
console.log('');
console.log('Press Ctrl+C to exit');
