/**
 * Collaboration Persistence Module
 * Auto-save, database persistence, and document loading
 *
 * Extracted from server-collaboration.js as part of backend modernization.
 */

const Y = require('yjs');
const db = require('../db');
const { createLogger } = require('../logger');
const log = createLogger('CollabPersistence');

const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// Timers and counters
const saveTimers = new Map();
const updateCounts = new Map();

/**
 * Save document snapshot to database
 * @param {string} roomName - Room identifier
 * @param {Y.Doc} doc - Yjs document to save
 * @returns {Promise<boolean>}
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
      log.info('Saved formation', { roomName, bytes: buffer.length });
      return true;
    }

    // Check if this is a messaging room
    const messagingMatch = roomName.match(/^messaging-(.+)$/);
    if (messagingMatch) {
      await db.query(
        `INSERT INTO documents (room_id, snapshot, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (room_id) DO UPDATE
         SET snapshot = $2, updated_at = NOW()`,
        [roomName, buffer]
      );
      log.info('Saved messaging document', { roomName, bytes: buffer.length });
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

    log.info('Saved document', { roomName, bytes: buffer.length });
    return true;
  } catch (error) {
    log.error('Error saving document', error, { roomName });
    return false;
  }
}

/**
 * Load document snapshot from database
 * @param {string} roomName - Room identifier
 * @param {Y.Doc} doc - Yjs document to populate
 * @returns {Promise<boolean>}
 */
async function loadDocument(roomName, doc) {
  try {
    // Check if this is a formation room
    const formationMatch = roomName.match(/^project-([^-]+)-formation-(.+)$/);
    if (formationMatch) {
      return await loadFormationDocument(roomName, doc, formationMatch[2]);
    }

    // Check if this is a messaging room
    const messagingMatch = roomName.match(/^messaging-(.+)$/);
    if (messagingMatch) {
      const result = await db.query(
        'SELECT snapshot FROM documents WHERE room_id = $1',
        [roomName]
      );

      if (result.rows.length > 0) {
        const snapshot = new Uint8Array(result.rows[0].snapshot);
        Y.applyUpdate(doc, snapshot);
        log.info('Loaded messaging document', { roomName, bytes: snapshot.length });
        return true;
      }

      log.info('No existing messaging document for room', { roomName });
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
      log.info('Loaded document', { roomName, bytes: snapshot.length });
      return true;
    }

    log.info('No existing document for room', { roomName });
    return false;
  } catch (error) {
    log.error('Error loading document', error, { roomName });
    return false;
  }
}

/**
 * Load formation document from database (handles Yjs snapshot and legacy data)
 * @param {string} roomName - Room identifier
 * @param {Y.Doc} doc - Yjs document to populate
 * @param {string} formationId - Formation ID
 * @returns {Promise<boolean>}
 */
async function loadFormationDocument(roomName, doc, formationId) {
  // First try to load existing Yjs snapshot
  const snapshotResult = await db.query(
    'SELECT yjs_snapshot FROM formations WHERE id = $1 AND yjs_snapshot IS NOT NULL',
    [formationId]
  );

  if (snapshotResult.rows.length > 0 && snapshotResult.rows[0].yjs_snapshot) {
    const snapshot = new Uint8Array(snapshotResult.rows[0].yjs_snapshot);
    Y.applyUpdate(doc, snapshot);
    log.info('Loaded formation Yjs snapshot', { roomName, bytes: snapshot.length });
    return true;
  }

  // No Yjs snapshot - load from regular formation data and initialize Yjs
  log.info('No Yjs snapshot for formation, loading from database', { roomName });

  const formationResult = await db.query(`
    SELECT f.*,
           COALESCE(json_agg(DISTINCT p.*) FILTER (WHERE p.id IS NOT NULL), '[]') as performers,
           COALESCE(json_agg(DISTINCT k.*) FILTER (WHERE k.id IS NOT NULL), '[]') as keyframes_raw
    FROM formations f
    LEFT JOIN formation_performers p ON p.formation_id = f.id
    LEFT JOIN formation_keyframes k ON k.formation_id = f.id
    WHERE f.id = $1
    GROUP BY f.id
  `, [formationId]);

  if (formationResult.rows.length === 0) {
    log.error('Formation not found', { formationId });
    return false;
  }

  const formation = formationResult.rows[0];

  // Get positions for each keyframe
  if (formation.keyframes_raw && formation.keyframes_raw.length > 0) {
    const keyframeIds = formation.keyframes_raw
      .filter(k => k && k.id)
      .map(k => k.id);

    if (keyframeIds.length > 0) {
      const positionsResult = await db.query(`
        SELECT keyframe_id, performer_id, x, y, rotation
        FROM formation_positions
        WHERE keyframe_id = ANY($1)
      `, [keyframeIds]);

      const positionsByKeyframe = {};
      positionsResult.rows.forEach(pos => {
        if (!positionsByKeyframe[pos.keyframe_id]) {
          positionsByKeyframe[pos.keyframe_id] = [];
        }
        positionsByKeyframe[pos.keyframe_id].push(pos);
      });

      formation.keyframes = formation.keyframes_raw
        .filter(k => k && k.id)
        .map(k => ({
          ...k,
          positions: positionsByKeyframe[k.id] || [],
        }));
    } else {
      formation.keyframes = [];
    }
  } else {
    formation.keyframes = [];
  }

  // Initialize Yjs document from formation data
  // Import initializeYjsFromFormation lazily to avoid circular dependency
  const { initializeYjsFromFormation } = require('./document-store');
  initializeYjsFromFormation(doc, formation);

  // Save the initialized Yjs state as a snapshot for future loads
  const initialSnapshot = Y.encodeStateAsUpdate(doc);
  await db.query(
    `UPDATE formations SET yjs_snapshot = $1, last_yjs_sync_at = NOW() WHERE id = $2`,
    [Buffer.from(initialSnapshot), formationId]
  );
  log.info('Saved initial Yjs snapshot for formation', { formationId, bytes: initialSnapshot.length });

  return true;
}

/**
 * Create version snapshot for a document
 * @param {string} roomName - Room identifier
 * @param {Y.Doc} doc - Yjs document
 * @param {string} userId - User who triggered the snapshot
 * @returns {Promise<number|undefined>} Version number
 */
async function createVersionSnapshot(roomName, doc, userId) {
  try {
    const formationMatch = roomName.match(/^project-([^-]+)-formation-(.+)$/);
    if (formationMatch) {
      const formationId = formationMatch[2];
      const snapshot = Y.encodeStateAsUpdate(doc);
      const buffer = Buffer.from(snapshot);

      await db.query(
        `UPDATE formations
         SET yjs_snapshot = $1, last_yjs_sync_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [buffer, formationId]
      );

      log.info('Saved formation snapshot', { formationId, bytes: buffer.length });
      return;
    }

    const messagingMatch = roomName.match(/^messaging-(.+)$/);
    if (messagingMatch) {
      await saveDocument(roomName, doc);
      return;
    }

    // Get document ID from room_id
    const result = await db.query(
      'SELECT id FROM documents WHERE room_id = $1',
      [roomName]
    );

    if (result.rows.length === 0) {
      log.warn('Document not found for room', { roomName });
      return;
    }

    const documentId = result.rows[0].id;

    const versionResult = await db.query(
      'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM document_versions WHERE document_id = $1',
      [documentId]
    );
    const versionNumber = versionResult.rows[0].next_version;

    const snapshot = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(snapshot);
    const isFullSnapshot = versionNumber % 10 === 0;

    await db.query(`
      INSERT INTO document_versions (document_id, version_number, snapshot, is_full_snapshot, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [documentId, versionNumber, buffer, isFullSnapshot, userId]);

    log.info('Created version snapshot', { versionNumber, documentId, bytes: buffer.length, isFullSnapshot });
    return versionNumber;
  } catch (error) {
    log.error('Error creating version snapshot', error, { roomName });
  }
}

/**
 * Schedule auto-save for a document
 * @param {string} roomName - Room identifier
 * @param {Y.Doc} doc - Yjs document
 */
function scheduleAutoSave(roomName, doc) {
  if (saveTimers.has(roomName)) {
    clearTimeout(saveTimers.get(roomName));
  }

  const timer = setTimeout(async () => {
    await saveDocument(roomName, doc);
    scheduleAutoSave(roomName, doc);
  }, AUTOSAVE_INTERVAL);

  saveTimers.set(roomName, timer);
}

/**
 * Cancel auto-save timer for a room
 * @param {string} roomName - Room identifier
 */
function cancelAutoSave(roomName) {
  if (saveTimers.has(roomName)) {
    clearTimeout(saveTimers.get(roomName));
    saveTimers.delete(roomName);
  }
}

/**
 * Clear all auto-save timers (for shutdown)
 */
function clearAllTimers() {
  saveTimers.forEach((timer) => clearTimeout(timer));
  saveTimers.clear();
  updateCounts.clear();
}

/**
 * Track document updates and create version snapshots at intervals
 * @param {string} roomName - Room identifier
 * @param {Y.Doc} doc - Yjs document
 * @param {string} userId - User who made the update
 */
function trackUpdate(roomName, doc, userId) {
  const count = (updateCounts.get(roomName) || 0) + 1;
  updateCounts.set(roomName, count);

  if (count % 100 === 0 && userId) {
    createVersionSnapshot(roomName, doc, userId).catch(error => {
      log.error('Error creating version snapshot', error);
    });
    updateCounts.set(roomName, 0);
  }
}

/**
 * Clear update count for a room
 * @param {string} roomName - Room identifier
 */
function clearUpdateCount(roomName) {
  updateCounts.delete(roomName);
}

module.exports = {
  saveDocument,
  loadDocument,
  createVersionSnapshot,
  scheduleAutoSave,
  cancelAutoSave,
  clearAllTimers,
  trackUpdate,
  clearUpdateCount,
};
