#!/usr/bin/env node
/**
 * Test document persistence on production server
 */

const WebSocket = require('ws');
const Y = require('yjs');

const PROD_URL = 'wss://fluxstudio.art/collab';
const TEST_ROOM = 'prod-test-' + Date.now();

console.log('🧪 Testing Production Document Persistence\n');
console.log(`Test Room: ${TEST_ROOM}`);
console.log(`Production URL: ${PROD_URL}/${TEST_ROOM}\n`);

async function testProductionPersistence() {
  console.log('📋 Test 1: Create and Save Document');
  console.log('━'.repeat(50));

  // Step 1: Connect and create document
  const ws1 = new WebSocket(`${PROD_URL}/${TEST_ROOM}`);
  const doc1 = new Y.Doc();
  const testText = 'Production persistence test! ' + new Date().toISOString();

  await new Promise((resolve, reject) => {
    ws1.on('open', () => {
      console.log('✅ Connected to production server');

      ws1.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'sync-init') {
            console.log('✅ Received sync-init');

            // Insert test text
            const text = doc1.getText('content');
            text.insert(0, testText);
            const update = Y.encodeStateAsUpdate(doc1);

            ws1.send(JSON.stringify({
              type: 'sync-update',
              update: Array.from(update)
            }));

            console.log(`📝 Sent text: "${testText}"`);
            console.log('⏳ Waiting 3 seconds for save...\n');

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

  // Step 2: Reconnect and verify
  console.log('📋 Test 2: Reconnect and Load Document');
  console.log('━'.repeat(50));

  await new Promise((resolve, reject) => {
    setTimeout(async () => {
      const ws2 = new WebSocket(`${PROD_URL}/${TEST_ROOM}`);
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

            if (message.stateVector && message.stateVector.length > 0) {
              console.log('📂 State vector received');
              ws2.send(JSON.stringify({ type: 'sync-request' }));
            }
          }

          if (message.type === 'sync-state' && !receivedUpdate) {
            receivedUpdate = true;
            const state = new Uint8Array(message.state);
            Y.applyUpdate(doc2, state);

            const loadedText = doc2.getText('content').toString();
            console.log(`📖 Loaded text: "${loadedText}"`);

            if (loadedText === testText) {
              console.log('✅ Text matches! Production persistence working!\n');
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

            const loadedText = doc2.getText('content').toString();
            console.log(`📖 Loaded text: "${loadedText}"`);

            if (loadedText === testText) {
              console.log('✅ Text matches! Production persistence working!\n');
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

      setTimeout(() => {
        if (!receivedUpdate) {
          console.log('⚠️  No update received\n');
          ws2.close();
          resolve(false);
        }
      }, 5000);
    }, 1000);
  });
}

async function runTest() {
  let result = false;
  try {
    result = await testProductionPersistence();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    result = false;
  }

  console.log('━'.repeat(50));
  console.log('📊 PRODUCTION TEST SUMMARY');
  console.log('━'.repeat(50));

  if (result) {
    console.log('✅ Production persistence working correctly!');
    console.log('');
    console.log('Verified:');
    console.log('1. Documents save to PostgreSQL');
    console.log('2. Documents load on reconnect');
    console.log('3. Text content persists correctly');
    console.log('');
    console.log('🎉 Production persistence test passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Test failed or inconclusive\n');
    process.exit(1);
  }
}

runTest();
