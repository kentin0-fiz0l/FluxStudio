#!/usr/bin/env node
/**
 * Test script for document persistence
 * Verifies that documents are saved to and loaded from PostgreSQL
 */

const WebSocket = require('ws');
const Y = require('yjs');

const COLLAB_URL = 'ws://localhost:4000';
const TEST_ROOM = 'persistence-test-' + Date.now();

console.log('🧪 Testing Document Persistence\n');
console.log(`Test Room: ${TEST_ROOM}`);
console.log(`WebSocket URL: ${COLLAB_URL}/${TEST_ROOM}\n`);

// Test persistence workflow
async function testPersistence() {
  console.log('📋 Test 1: Create and Save Document');
  console.log('━'.repeat(50));

  // Step 1: Connect and create document
  const ws1 = new WebSocket(`${COLLAB_URL}/${TEST_ROOM}`);
  const doc1 = new Y.Doc();
  const testText = 'Hello from persistence test! ' + new Date().toISOString();

  await new Promise((resolve, reject) => {
    ws1.on('open', () => {
      console.log('✅ Connected to collaboration server');

      // Wait for sync-init
      ws1.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'sync-init') {
            console.log('✅ Received sync-init');

            // Insert test text
            const text = doc1.getText('content');
            text.insert(0, testText);
            const update = Y.encodeStateAsUpdate(doc1);

            // Send update
            ws1.send(JSON.stringify({
              type: 'sync-update',
              update: Array.from(update)
            }));

            console.log(`📝 Sent text: "${testText}"`);
            console.log('⏳ Waiting 3 seconds for save...\n');

            // Wait for auto-save (or immediate save on disconnect)
            setTimeout(() => {
              ws1.close();
              resolve();
            }, 3000);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    ws1.on('error', reject);
  });

  // Step 2: Reconnect and verify document loaded
  console.log('📋 Test 2: Reconnect and Load Document');
  console.log('━'.repeat(50));

  await new Promise((resolve, reject) => {
    setTimeout(async () => {
      const ws2 = new WebSocket(`${COLLAB_URL}/${TEST_ROOM}`);
      const doc2 = new Y.Doc();
      let receivedUpdate = false;

      ws2.on('open', () => {
        console.log('✅ Reconnected to same room');
      });

      ws2.on('message', (data) => {
        try {
          const message = JSON.parse(data);

          if (message.type === 'sync-init' && !receivedUpdate) {
            console.log('✅ Received sync-init with state');

            // Apply the state vector
            if (message.stateVector && message.stateVector.length > 0) {
              const stateVector = new Uint8Array(message.stateVector);
              console.log(`📂 Loaded state (${stateVector.length} bytes)`);

              // Request full document state
              console.log('📤 Requesting full document state...');
              ws2.send(JSON.stringify({
                type: 'sync-request'
              }));
            }
          }

          if (message.type === 'sync-state' && !receivedUpdate) {
            receivedUpdate = true;
            console.log('✅ Received full document state');
            const state = new Uint8Array(message.state);
            Y.applyUpdate(doc2, state);

            const text = doc2.getText('content');
            const loadedText = text.toString();

            console.log(`📖 Loaded text: "${loadedText}"`);

            if (loadedText === testText) {
              console.log('✅ Text matches! Persistence working!\n');
              ws2.close();
              resolve(true);
            } else {
              console.log(`❌ Text mismatch!\n   Expected: "${testText}"\n   Got: "${loadedText}"\n`);
              ws2.close();
              resolve(false);
            }
          }

          if (message.type === 'sync-update' && !receivedUpdate) {
            receivedUpdate = true;
            const update = new Uint8Array(message.update);
            Y.applyUpdate(doc2, update);

            const text = doc2.getText('content');
            const loadedText = text.toString();

            console.log(`📖 Loaded text: "${loadedText}"`);

            if (loadedText === testText) {
              console.log('✅ Text matches! Persistence working!\n');
              ws2.close();
              resolve(true);
            } else {
              console.log(`❌ Text mismatch!\n   Expected: "${testText}"\n   Got: "${loadedText}"\n`);
              ws2.close();
              resolve(false);
            }
          }
        } catch (error) {
          reject(error);
        }
      });

      ws2.on('error', reject);

      // Timeout if no update received
      setTimeout(() => {
        if (!receivedUpdate) {
          console.log('⚠️  No update received - document might be empty\n');
          ws2.close();
          resolve(false);
        }
      }, 5000);
    }, 1000); // Wait 1 second before reconnecting
  });
}

// Run test
async function runTest() {
  let result = false;
  try {
    result = await testPersistence();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    result = false;
  }

  console.log('━'.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('━'.repeat(50));

  if (result) {
      console.log('✅ Document persistence working correctly!');
      console.log('');
      console.log('What was tested:');
      console.log('1. Created document with test text');
      console.log('2. Disconnected and waited for save');
      console.log('3. Reconnected to same room');
      console.log('4. Verified text loaded from database');
      console.log('');
      console.log('🎉 Persistence test passed!\n');
      process.exit(0);
  } else {
    console.log('⚠️  Persistence test failed or inconclusive');
    console.log('Check collaboration server logs for details\n');
    process.exit(1);
  }
}

runTest();
