/**
 * Collaboration Document Store
 * Y.Doc management, creation, and in-memory storage
 *
 * Extracted from server-collaboration.js as part of backend modernization.
 */

const Y = require('yjs');
const awarenessProtocol = require('y-protocols/awareness');
const { createLogger } = require('../logger');
const log = createLogger('CollabDocStore');

const persistence = require('./persistence');

// Store Y.Doc and awareness instances per room
const docs = new Map();
const awarenesses = new Map();

/**
 * Get or create Y.Doc for a room (with persistence)
 * @param {string} roomName - Room identifier
 * @returns {Promise<Y.Doc>}
 */
async function getDoc(roomName) {
  if (!docs.has(roomName)) {
    const doc = new Y.Doc();

    // Try to load existing document from database
    await persistence.loadDocument(roomName, doc);

    docs.set(roomName, doc);

    // Create awareness instance for this room
    const awareness = new awarenessProtocol.Awareness(doc);
    awarenesses.set(roomName, awareness);

    // Start auto-save timer
    persistence.scheduleAutoSave(roomName, doc);

    log.info('Initialized document for room', { roomName });
  }
  return docs.get(roomName);
}

/**
 * Get awareness instance for a room
 * @param {string} roomName - Room identifier
 * @returns {awarenessProtocol.Awareness|undefined}
 */
function getAwareness(roomName) {
  return awarenesses.get(roomName);
}

/**
 * Check if a document exists for a room
 * @param {string} roomName - Room identifier
 * @returns {boolean}
 */
function hasDoc(roomName) {
  return docs.has(roomName);
}

/**
 * Remove a document from the in-memory store
 * @param {string} roomName - Room identifier
 */
function removeDoc(roomName) {
  docs.delete(roomName);
  awarenesses.delete(roomName);
  log.info('Document removed from memory', { roomName });
}

/**
 * Schedule document removal after a delay (for quick reconnects)
 * @param {string} roomName - Room identifier
 * @param {number} delayMs - Delay before removal (default: 5 minutes)
 * @param {function} isRoomActive - Callback to check if room is active
 */
function scheduleRemoval(roomName, delayMs = 300000, isRoomActive) {
  setTimeout(() => {
    if (!isRoomActive(roomName)) {
      removeDoc(roomName);
    }
  }, delayMs);
}

/**
 * Get all doc room names (for shutdown saves)
 * @returns {Map<string, Y.Doc>}
 */
function getAllDocs() {
  return docs;
}

/**
 * Initialize Yjs document from formation data (when no yjs_snapshot exists)
 * @param {Y.Doc} doc - Yjs document to initialize
 * @param {Object} formationData - Formation data from database
 */
function initializeYjsFromFormation(doc, formationData) {
  const META = 'formation:meta';
  const PERFORMERS = 'formation:performers';
  const KEYFRAMES = 'formation:keyframes';
  const POSITIONS = 'formation:positions';

  doc.transact(() => {
    const meta = doc.getMap(META);
    const performers = doc.getMap(PERFORMERS);
    const keyframes = doc.getArray(KEYFRAMES);

    // Set metadata
    meta.set('id', formationData.id);
    meta.set('name', formationData.name || 'Untitled Formation');
    meta.set('projectId', formationData.project_id);
    meta.set('description', formationData.description || '');
    meta.set('stageWidth', formationData.stage_width || 100);
    meta.set('stageHeight', formationData.stage_height || 60);
    meta.set('gridSize', formationData.grid_size || 10);
    meta.set('createdBy', formationData.created_by || '');
    meta.set('createdAt', formationData.created_at?.toISOString?.() || new Date().toISOString());
    meta.set('updatedAt', formationData.updated_at?.toISOString?.() || new Date().toISOString());

    // Add performers
    if (formationData.performers) {
      formationData.performers.forEach((performer) => {
        const yPerformer = new Y.Map();
        yPerformer.set('id', performer.id);
        yPerformer.set('name', performer.name || '');
        yPerformer.set('label', performer.label || '');
        yPerformer.set('color', performer.color || '#3b82f6');
        yPerformer.set('group', performer.group_name || '');
        performers.set(performer.id, yPerformer);
      });
    }

    // Add keyframes with positions
    if (formationData.keyframes) {
      formationData.keyframes.forEach((keyframe) => {
        const yKeyframe = new Y.Map();
        yKeyframe.set('id', keyframe.id);
        yKeyframe.set('timestamp', keyframe.timestamp_ms || 0);
        yKeyframe.set('transition', keyframe.transition || 'linear');
        yKeyframe.set('duration', keyframe.duration || 500);

        const yPositions = new Y.Map();
        if (keyframe.positions) {
          keyframe.positions.forEach((pos) => {
            yPositions.set(pos.performer_id, {
              x: pos.x,
              y: pos.y,
              rotation: pos.rotation || 0,
            });
          });
        }
        yKeyframe.set(POSITIONS, yPositions);
        keyframes.push([yKeyframe]);
      });
    }

    // If no keyframes, create a default one
    if (keyframes.length === 0) {
      const yKeyframe = new Y.Map();
      yKeyframe.set('id', `keyframe-${Date.now()}`);
      yKeyframe.set('timestamp', 0);
      yKeyframe.set('transition', 'linear');
      yKeyframe.set('duration', 500);
      yKeyframe.set(POSITIONS, new Y.Map());
      keyframes.push([yKeyframe]);
    }
  });

  log.info('Initialized Yjs document from formation data');
}

module.exports = {
  getDoc,
  getAwareness,
  hasDoc,
  removeDoc,
  scheduleRemoval,
  getAllDocs,
  initializeYjsFromFormation,
};
