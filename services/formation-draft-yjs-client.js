/**
 * Formation Draft Yjs Client - Real-time Collaboration Bridge
 *
 * Connects to the Yjs collaboration server as the Formation Draft Agent,
 * writes keyframes progressively to the shared document, and manages
 * awareness state visible to all collaborators.
 *
 * Date: 2026-02-21
 */

const WebSocket = require('ws');
const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');
const jwt = require('jsonwebtoken');

// y-websocket protocol message types
const messageSync = 0;
const messageAwareness = 1;

// Yjs type constants (matching formationYjsTypes.ts)
const FORMATION_YJS_TYPES = {
  META: 'formation:meta',
  PERFORMERS: 'formation:performers',
  KEYFRAMES: 'formation:keyframes',
  POSITIONS: 'formation:positions',
  SCENE_OBJECTS: 'scene:objects',
};

const AGENT_USER = {
  id: 'system-formation-agent',
  name: 'Draft Agent',
  color: '#F59E0B',
};

class FormationDraftYjsClient {
  constructor() {
    this.doc = null;
    this.ws = null;
    this.awareness = null;
    this.connected = false;
    this.roomName = null;
  }

  /**
   * Generate a JWT token for the agent to authenticate with the collab server
   */
  _generateAgentToken() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured - cannot authenticate with collaboration server');
    }
    return jwt.sign(
      { id: AGENT_USER.id, name: AGENT_USER.name, email: 'formation-agent@system.fluxstudio' },
      secret,
      { expiresIn: '1h' }
    );
  }

  /**
   * Connect to the Yjs collaboration server for a specific formation
   */
  async connect(formationId, projectId) {
    return new Promise((resolve, reject) => {
      this.roomName = `project-${projectId}-formation-${formationId}`;
      this.doc = new Y.Doc();
      this.awareness = new awarenessProtocol.Awareness(this.doc);

      const collabHost = process.env.COLLAB_HOST || 'localhost';
      const collabPort = process.env.COLLAB_PORT || 4000;
      const token = this._generateAgentToken();
      const wsUrl = `ws://${collabHost}:${collabPort}/${this.roomName}?token=${token}`;

      const timeout = setTimeout(() => {
        reject(new Error('Yjs connection timeout after 10s'));
      }, 10000);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.connected = true;
        console.log(`[DraftYjs] Connected to room: ${this.roomName}`);

        // Set initial awareness
        this.setAgentAwareness('connecting', 'Preparing to generate...');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = new Uint8Array(data);
          const decoder = decoding.createDecoder(message);
          const messageType = decoding.readVarUint(decoder);

          switch (messageType) {
            case messageSync: {
              const encoder = encoding.createEncoder();
              encoding.writeVarUint(encoder, messageSync);
              syncProtocol.readSyncMessage(decoder, encoder, this.doc, this.ws);
              if (encoding.length(encoder) > 1) {
                this.ws.send(encoding.toUint8Array(encoder));
              }
              break;
            }
            case messageAwareness: {
              const update = decoding.readVarUint8Array(decoder);
              awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this.ws);
              break;
            }
          }
        } catch (err) {
          console.error('[DraftYjs] Message handling error:', err.message);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        console.log(`[DraftYjs] Disconnected from room: ${this.roomName} (${code})`);
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[DraftYjs] WebSocket error:', error.message);
        if (!this.connected) {
          reject(error);
        }
      });
    });
  }

  /**
   * Update the agent's awareness state visible to all collaborators
   */
  setAgentAwareness(status, message, cursor = null) {
    if (!this.awareness) return;

    const state = {
      user: AGENT_USER,
      isActive: true,
      lastActivity: Date.now(),
      activeKeyframeId: null,
      selectedPerformerIds: [],
    };

    if (cursor) {
      state.cursor = {
        x: cursor.x,
        y: cursor.y,
        timestamp: Date.now(),
      };
    }

    // Store status in a custom field for the UI to read
    state.agentStatus = status;
    state.agentMessage = message;

    this.awareness.setLocalState(state);
    this._broadcastAwareness();
  }

  /**
   * Broadcast awareness state to all peers
   */
  _broadcastAwareness() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.awareness) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
    );
    this.ws.send(encoding.toUint8Array(encoder));
  }

  /**
   * Write a complete keyframe to the Yjs document in a single transaction
   */
  writeKeyframe(keyframeData) {
    if (!this.doc) throw new Error('Not connected to Yjs');

    const { keyframeId, timestampMs, transitionType, durationMs, positions } = keyframeData;

    this.doc.transact(() => {
      const keyframes = this.doc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
      const yKeyframe = new Y.Map();

      yKeyframe.set('id', keyframeId);
      yKeyframe.set('timestamp', timestampMs);
      yKeyframe.set('transition', transitionType || 'ease-in-out');
      yKeyframe.set('duration', durationMs || 1000);

      const yPositions = new Y.Map();
      for (const pos of positions) {
        yPositions.set(pos.performerId, {
          x: pos.x,
          y: pos.y,
          rotation: pos.rotation || 0,
        });
      }
      yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);

      keyframes.push([yKeyframe]);
    });
  }

  /**
   * Write positions progressively with cursor updates for visual "drawing" effect
   */
  async writePositionsProgressively(keyframeData, delayMs = 50) {
    if (!this.doc) throw new Error('Not connected to Yjs');

    const { keyframeId, timestampMs, transitionType, durationMs, positions } = keyframeData;

    // Create the keyframe shell first
    const keyframes = this.doc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);
    let yKeyframe;
    let yPositions;

    this.doc.transact(() => {
      yKeyframe = new Y.Map();
      yKeyframe.set('id', keyframeId);
      yKeyframe.set('timestamp', timestampMs);
      yKeyframe.set('transition', transitionType || 'ease-in-out');
      yKeyframe.set('duration', durationMs || 1000);
      yPositions = new Y.Map();
      yKeyframe.set(FORMATION_YJS_TYPES.POSITIONS, yPositions);
      keyframes.push([yKeyframe]);
    });

    // Update awareness to show active keyframe
    this.setAgentAwareness('placing', `Placing performers...`, null);

    // Add positions one at a time with delay
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];

      this.doc.transact(() => {
        yPositions.set(pos.performerId, {
          x: pos.x,
          y: pos.y,
          rotation: pos.rotation || 0,
        });
      });

      // Update cursor to current performer position
      this.setAgentAwareness('placing', `Placing ${i + 1}/${positions.length}`, {
        x: pos.x,
        y: pos.y,
      });

      // Small delay for visual effect
      if (delayMs > 0 && i < positions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Update positions in an existing keyframe (for smoothing/refinement)
   */
  updateKeyframePositions(keyframeId, updatedPositions) {
    if (!this.doc) throw new Error('Not connected to Yjs');

    const keyframes = this.doc.getArray(FORMATION_YJS_TYPES.KEYFRAMES);

    // Find the keyframe by ID
    for (let i = 0; i < keyframes.length; i++) {
      const yKeyframe = keyframes.get(i);
      if (yKeyframe.get('id') === keyframeId) {
        const yPositions = yKeyframe.get(FORMATION_YJS_TYPES.POSITIONS);
        if (yPositions) {
          this.doc.transact(() => {
            for (const pos of updatedPositions) {
              yPositions.set(pos.performerId, {
                x: pos.x,
                y: pos.y,
                rotation: pos.rotation || 0,
              });
            }
          });
        }
        break;
      }
    }
  }

  /**
   * Disconnect from the collaboration server
   */
  disconnect() {
    if (this.awareness) {
      this.awareness.setLocalState(null);
      this._broadcastAwareness();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Agent generation complete');
    }

    this.connected = false;
    this.doc = null;
    this.awareness = null;
    this.ws = null;
    console.log(`[DraftYjs] Cleaned up connection for room: ${this.roomName}`);
  }
}

module.exports = { FormationDraftYjsClient, AGENT_USER };
