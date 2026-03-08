/**
 * Collaboration Sync Handler
 * Yjs sync protocol message handling
 *
 * Extracted from server-collaboration.js as part of backend modernization.
 */

const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const WebSocket = require('ws');
const { createLogger } = require('../logger');
const log = createLogger('CollabSync');

const { validateAwarenessState } = require('./awareness');
const persistence = require('./persistence');

// y-websocket protocol message types
const messageSync = 0;
const messageAwareness = 1;

/**
 * Send initial sync state to a newly connected client
 * @param {WebSocket} ws - WebSocket connection
 * @param {Y.Doc} doc - Yjs document
 * @param {awarenessProtocol.Awareness} awareness - Awareness instance
 */
function sendInitialSync(ws, doc, awareness) {
  // Send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));

  // Send current awareness states
  if (awareness.states.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.states.keys()))
    );
    ws.send(encoding.toUint8Array(awarenessEncoder));
  }
}

/**
 * Handle a binary y-websocket protocol message
 * @param {Uint8Array} data - Raw message data
 * @param {WebSocket} ws - WebSocket connection that sent the message
 * @param {Y.Doc} doc - Yjs document for this room
 * @param {awarenessProtocol.Awareness} awareness - Awareness instance
 * @param {string} roomName - Room identifier
 * @param {Set} roomConnections - Set of WebSocket connections in the room
 * @param {Object} rateLimiters - { awarenessLimiter }
 * @param {Object} stats - Shared stats object
 */
function handleBinaryMessage(data, ws, doc, awareness, roomName, roomConnections, rateLimiters, stats) {
  const decoder = decoding.createDecoder(data);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync:
      handleSyncMessage(decoder, data, ws, doc, roomName, roomConnections, stats);
      break;

    case messageAwareness:
      handleAwarenessMessage(decoder, data, ws, awareness, roomName, roomConnections, rateLimiters, stats);
      break;

    default:
      log.warn('Unknown y-websocket message type', { messageType });
  }
}

/**
 * Handle sync protocol messages
 */
function handleSyncMessage(decoder, rawData, ws, doc, roomName, roomConnections, stats) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, ws);

  // Send response if there's one
  if (encoding.length(encoder) > 1) {
    ws.send(encoding.toUint8Array(encoder));
  }

  // SECURITY: Check write permissions - viewers can only read
  if (syncMessageType === syncProtocol.messageYjsUpdate && ws.userRole === 'viewer') {
    log.warn('Viewer attempted to edit document via binary protocol', { userName: ws.userName });
    return;
  }

  // Broadcast sync updates to other clients
  if (syncMessageType === syncProtocol.messageYjsUpdate) {
    if (roomConnections) {
      roomConnections.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(rawData);
        }
      });
    }

    // Track updates for version snapshots
    persistence.trackUpdate(roomName, doc, ws.userId);
  }
}

/**
 * Handle awareness protocol messages
 */
function handleAwarenessMessage(decoder, rawData, ws, awareness, roomName, roomConnections, rateLimiters, stats) {
  // Apply rate limiting for awareness updates
  if (rateLimiters && rateLimiters.awarenessLimiter) {
    const awarenessRateKey = `awareness:${ws.clientIp || ws.userId || 'unknown'}`;
    if (!rateLimiters.awarenessLimiter.tryConsume(awarenessRateKey)) {
      stats.rateLimited++;
      return;
    }
  }

  // Handle awareness updates
  const awarenessUpdate = decoding.readVarUint8Array(decoder);
  awarenessProtocol.applyAwarenessUpdate(awareness, awarenessUpdate, ws);

  // Validate the awareness state for this client
  const clientId = Array.from(awareness.states.entries())
    .find(([, state]) => state?.user?.id === ws.userId)?.[0];

  if (clientId !== undefined) {
    const clientState = awareness.states.get(clientId);
    const validation = validateAwarenessState(clientState);

    if (!validation.valid) {
      log.warn('Invalid awareness data', { userName: ws.userName, reason: validation.reason });
      awareness.states.delete(clientId);
      return;
    }
  }

  // Broadcast validated awareness to other clients
  if (roomConnections) {
    roomConnections.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(rawData);
      }
    });
  }
}

/**
 * Handle JSON text messages (backwards compatibility)
 * @param {Object} data - Parsed JSON message
 * @param {WebSocket} ws - WebSocket connection
 * @param {Y.Doc} doc - Yjs document
 * @param {Set} roomConnections - Room connections
 */
function handleTextMessage(data, ws, doc, roomConnections) {
  if (data.type === 'sync-update') {
    if (ws.userRole === 'viewer') {
      log.warn('Viewer attempted to edit document', { userName: ws.userName });
      return;
    }

    const update = new Uint8Array(data.update);
    const Y = require('yjs');
    Y.applyUpdate(doc, update, ws);

    if (roomConnections) {
      roomConnections.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'sync-update', update: data.update }));
        }
      });
    }
  } else if (data.type === 'sync-request') {
    const Y = require('yjs');
    const state = Y.encodeStateAsUpdate(doc);
    ws.send(JSON.stringify({ type: 'sync-state', state: Array.from(state) }));
  } else if (data.type === 'presence') {
    if (roomConnections) {
      roomConnections.forEach((client) => {
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

module.exports = {
  messageSync,
  messageAwareness,
  sendInitialSync,
  handleBinaryMessage,
  handleTextMessage,
};
