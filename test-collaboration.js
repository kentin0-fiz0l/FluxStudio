#!/usr/bin/env node
/**
 * Test Script for Real-Time Collaboration Service
 * Tests WebSocket connections, presence, and document synchronization
 */

const WebSocket = require('ws');
const Y = require('yjs');

const COLLAB_URL = 'wss://fluxstudio.art/collab';
const TEST_ROOM = 'test-room-' + Date.now();

console.log('🧪 Testing FluxStudio Collaboration Service\n');
console.log(`Test Room: ${TEST_ROOM}`);
console.log(`WebSocket URL: ${COLLAB_URL}/${TEST_ROOM}\n`);

// Test 1: Health Check
async function testHealthEndpoint() {
  console.log('📋 Test 1: Health Endpoint');
  console.log('━'.repeat(50));

  try {
    const https = require('https');
    const response = await new Promise((resolve, reject) => {
      https.get('https://fluxstudio.art/collab/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    console.log('✅ Health check passed');
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('');
    return false;
  }
}

// Test 2: WebSocket Connection
function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('📋 Test 2: WebSocket Connection');
    console.log('━'.repeat(50));

    const ws = new WebSocket(`${COLLAB_URL}/${TEST_ROOM}`);
    let receivedSyncInit = false;

    const timeout = setTimeout(() => {
      ws.close();
      if (!receivedSyncInit) {
        console.error('❌ Connection test failed: No sync-init received');
        reject(new Error('Timeout waiting for sync-init'));
      }
    }, 10000);

    ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📨 Received message:', message.type);

        if (message.type === 'sync-init') {
          console.log('✅ Received sync-init message');
          receivedSyncInit = true;
          clearTimeout(timeout);
          ws.close();
          console.log('');
          resolve(true);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error.message);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
      if (!receivedSyncInit) {
        clearTimeout(timeout);
        reject(new Error('Connection closed without sync-init'));
      }
    });
  });
}

// Test 3: Multi-User Simulation
function testMultiUserCollaboration() {
  return new Promise((resolve, reject) => {
    console.log('📋 Test 3: Multi-User Collaboration');
    console.log('━'.repeat(50));

    let user1Connected = false;
    let user2Connected = false;
    let user1ReceivedFromUser2 = false;
    let user2ReceivedFromUser1 = false;

    // User 1
    const ws1 = new WebSocket(`${COLLAB_URL}/${TEST_ROOM}`);
    const doc1 = new Y.Doc();

    // User 2
    const ws2 = new WebSocket(`${COLLAB_URL}/${TEST_ROOM}`);
    const doc2 = new Y.Doc();

    const timeout = setTimeout(() => {
      console.error('❌ Multi-user test timeout');
      ws1.close();
      ws2.close();
      reject(new Error('Test timeout'));
    }, 15000);

    // User 1 connection
    ws1.on('open', () => {
      console.log('✅ User 1 connected');
      user1Connected = true;

      // Authenticate
      ws1.send(JSON.stringify({
        type: 'auth',
        userId: 'user1',
        userName: 'Alice'
      }));

      // Wait a bit then send an update
      setTimeout(() => {
        const text = doc1.getText('content');
        text.insert(0, 'Hello from User 1');
        const update = Y.encodeStateAsUpdate(doc1);

        console.log('📤 User 1 sending update');
        ws1.send(JSON.stringify({
          type: 'sync-update',
          update: Array.from(update)
        }));
      }, 1000);
    });

    ws1.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'sync-update' && !user1ReceivedFromUser2) {
          console.log('📨 User 1 received update from User 2');
          user1ReceivedFromUser2 = true;
          checkCompletion();
        }
      } catch (error) {
        console.error('User 1 message error:', error.message);
      }
    });

    // User 2 connection
    ws2.on('open', () => {
      console.log('✅ User 2 connected');
      user2Connected = true;

      // Authenticate
      ws2.send(JSON.stringify({
        type: 'auth',
        userId: 'user2',
        userName: 'Bob'
      }));

      // Wait a bit then send an update
      setTimeout(() => {
        const text = doc2.getText('content');
        text.insert(0, 'Hello from User 2');
        const update = Y.encodeStateAsUpdate(doc2);

        console.log('📤 User 2 sending update');
        ws2.send(JSON.stringify({
          type: 'sync-update',
          update: Array.from(update)
        }));
      }, 2000);
    });

    ws2.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'sync-update' && !user2ReceivedFromUser1) {
          console.log('📨 User 2 received update from User 1');
          user2ReceivedFromUser1 = true;
          checkCompletion();
        }
      } catch (error) {
        console.error('User 2 message error:', error.message);
      }
    });

    function checkCompletion() {
      if (user1Connected && user2Connected &&
          user1ReceivedFromUser2 && user2ReceivedFromUser1) {
        console.log('✅ Both users successfully exchanged updates');
        clearTimeout(timeout);
        ws1.close();
        ws2.close();
        console.log('');
        resolve(true);
      }
    }

    ws1.on('error', (error) => {
      console.error('❌ User 1 error:', error.message);
      clearTimeout(timeout);
      ws2.close();
      reject(error);
    });

    ws2.on('error', (error) => {
      console.error('❌ User 2 error:', error.message);
      clearTimeout(timeout);
      ws1.close();
      reject(error);
    });
  });
}

// Test 4: Presence Updates
function testPresenceUpdates() {
  return new Promise((resolve, reject) => {
    console.log('📋 Test 4: Presence Updates');
    console.log('━'.repeat(50));

    const ws1 = new WebSocket(`${COLLAB_URL}/${TEST_ROOM}`);
    const ws2 = new WebSocket(`${COLLAB_URL}/${TEST_ROOM}`);

    let user2ReceivedPresence = false;

    const timeout = setTimeout(() => {
      console.error('❌ Presence test timeout');
      ws1.close();
      ws2.close();
      reject(new Error('Presence test timeout'));
    }, 10000);

    ws1.on('open', () => {
      console.log('✅ User 1 connected');

      // Authenticate
      ws1.send(JSON.stringify({
        type: 'auth',
        userId: 'user1',
        userName: 'Alice'
      }));

      // Send presence update
      setTimeout(() => {
        console.log('📤 User 1 sending presence update');
        ws1.send(JSON.stringify({
          type: 'presence',
          data: {
            cursor: { x: 100, y: 200 },
            color: '#FF5733'
          }
        }));
      }, 1000);
    });

    ws2.on('open', () => {
      console.log('✅ User 2 connected');

      // Authenticate
      ws2.send(JSON.stringify({
        type: 'auth',
        userId: 'user2',
        userName: 'Bob'
      }));
    });

    ws2.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'presence') {
          console.log('📨 User 2 received presence from User 1');
          console.log('   Cursor:', message.data.cursor);
          console.log('   Color:', message.data.color);
          user2ReceivedPresence = true;

          console.log('✅ Presence updates working');
          clearTimeout(timeout);
          ws1.close();
          ws2.close();
          console.log('');
          resolve(true);
        }
      } catch (error) {
        console.error('User 2 message error:', error.message);
      }
    });

    ws1.on('error', (error) => {
      console.error('❌ User 1 error:', error.message);
      clearTimeout(timeout);
      ws2.close();
      reject(error);
    });

    ws2.on('error', (error) => {
      console.error('❌ User 2 error:', error.message);
      clearTimeout(timeout);
      ws1.close();
      reject(error);
    });
  });
}

// Test 5: Stats Endpoint
async function testStatsEndpoint() {
  console.log('📋 Test 5: Stats Endpoint');
  console.log('━'.repeat(50));

  try {
    const https = require('https');
    const response = await new Promise((resolve, reject) => {
      https.get('https://fluxstudio.art/collab/stats', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    console.log('✅ Stats endpoint working');
    console.log('Active Rooms:', Object.keys(response.rooms || {}).length);
    console.log('Total Connections:', response.totalConnections);
    console.log('Messages Processed:', response.messages);
    console.log('');
    return true;
  } catch (error) {
    console.error('❌ Stats endpoint failed:', error.message);
    console.log('');
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Collaboration Service Tests\n');

  const results = {
    health: false,
    connection: false,
    multiUser: false,
    presence: false,
    stats: false
  };

  try {
    results.health = await testHealthEndpoint();
    results.connection = await testWebSocketConnection();
    results.multiUser = await testMultiUserCollaboration();
    results.presence = await testPresenceUpdates();
    results.stats = await testStatsEndpoint();
  } catch (error) {
    console.error('Test suite error:', error.message);
  }

  // Summary
  console.log('━'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('━'.repeat(50));
  console.log(`Health Endpoint:       ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Connection:  ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Multi-User Sync:       ${results.multiUser ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Presence Updates:      ${results.presence ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Stats Endpoint:        ${results.stats ? '✅ PASS' : '❌ FAIL'}`);
  console.log('━'.repeat(50));

  const passedTests = Object.values(results).filter(r => r).length;
  const totalTests = Object.values(results).length;

  console.log(`\n${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Collaboration service is working perfectly!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check logs above for details.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
