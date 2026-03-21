/**
 * MetMap Routes - Musical Timeline Tool
 *
 * Provides API endpoints for:
 * - Song management (CRUD)
 * - Section management
 * - Chord progressions
 * - Practice sessions
 *
 * Extracted from server-unified.js for Phase 4.5 Technical Debt Resolution
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createLogger } = require('../lib/logger');
const log = createLogger('MetMap');
const { authenticateToken } = require('../lib/auth/middleware');
const { v4: uuidv4 } = require('uuid');
const metmapAdapter = require('../database/metmap-adapter');
const { fileStorage } = require('../lib/storage');
const { canUserAccessProject } = require('../middleware/requireProjectAccess');
const { zodValidate } = require('../middleware/zodValidate');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createSongSchema,
  updateSongSchema,
  songBeatMapSchema,
  upsertSectionsSchema,
  upsertChordsSchema,
  startPracticeSchema,
  endPracticeSchema,
  updateTrackSchema,
  reorderTrackSchema,
  trackBeatMapSchema,
  createSnapshotSchema,
  createBranchSchema,
} = require('../lib/schemas');

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ========================================
// SONGS
// ========================================

/**
 * GET /api/metmap/songs
 * Get all songs for authenticated user
 */
router.get('/songs', authenticateToken, asyncHandler(async (req, res) => {
  const { projectId, search, limit, offset, orderBy, orderDir } = req.query;

  const result = await metmapAdapter.getSongsForUser(req.user.id, {
    projectId,
    search,
    limit: limit ? parseInt(limit) : 50,
    offset: offset ? parseInt(offset) : 0,
    orderBy,
    orderDir
  });

  res.json(result);
}));

/**
 * GET /api/metmap/stats
 * Get MetMap statistics for user
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
  const stats = await metmapAdapter.getStatsForUser(req.user.id);
  res.json(stats);
}));

/**
 * POST /api/metmap/songs
 * Create a new song
 */
router.post('/songs', authenticateToken, zodValidate(createSongSchema), asyncHandler(async (req, res) => {
  const { title, description, projectId, bpmDefault, timeSignatureDefault } = req.body;

  // Verify project access if associating song with a project
  if (projectId) {
    const hasAccess = await canUserAccessProject(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'You do not have permission to access this project', code: 'PROJECT_ACCESS_DENIED' });
    }
  }

  const song = await metmapAdapter.createSong(req.user.id, {
    title: title.trim(),
    description,
    projectId,
    bpmDefault,
    timeSignatureDefault
  });

  res.status(201).json({ song });
}));

/**
 * GET /api/metmap/songs/:songId
 * Get a single song with sections and chords
 */
router.get('/songs/:songId', authenticateToken, asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const song = await metmapAdapter.getSongById(songId, req.user.id);

  if (!song) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ song });
}));

/**
 * PUT /api/metmap/songs/:songId
 * Update a song
 */
router.put('/songs/:songId', authenticateToken, zodValidate(updateSongSchema), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { title, description, projectId, bpmDefault, timeSignatureDefault } = req.body;

  // Verify project access if reassigning song to a project
  if (projectId) {
    const hasAccess = await canUserAccessProject(req.user.id, projectId);
    if (!hasAccess) {
      return res.status(403).json({ success: false, error: 'You do not have permission to access this project', code: 'PROJECT_ACCESS_DENIED' });
    }
  }

  const song = await metmapAdapter.updateSong(songId, req.user.id, {
    title,
    description,
    projectId,
    bpmDefault,
    timeSignatureDefault
  });

  if (!song) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ song });
}));

/**
 * DELETE /api/metmap/songs/:songId
 * Delete a song
 */
router.delete('/songs/:songId', authenticateToken, asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const success = await metmapAdapter.deleteSong(songId, req.user.id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ success: true });
}));

// ========================================
// AUDIO
// ========================================

/**
 * POST /api/metmap/songs/:songId/audio
 * Upload an audio file for a song
 */
router.post('/songs/:songId/audio', authenticateToken, audioUpload.single('audio'), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'No audio file provided', code: 'METMAP_NO_AUDIO_FILE' });
  }

  // Verify song ownership
  const song = await metmapAdapter.getSongById(songId, req.user.id);
  if (!song) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  // Upload to storage
  const ext = file.originalname.split('.').pop() || 'mp3';
  const storageKey = `metmap/audio/${songId}.${ext}`;
  const url = await fileStorage.uploadToStorage(storageKey, file.buffer, file.mimetype);
  const audioUrl = url.startsWith('http') ? url : `/api/files/serve/${url}`;

  // Save audio metadata to song
  const updated = await metmapAdapter.setSongAudio(songId, req.user.id, {
    audioFileUrl: audioUrl,
    audioDurationSeconds: null, // Client will detect and update
  });

  res.json({ song: updated, audioFileUrl: audioUrl });
}));

/**
 * DELETE /api/metmap/songs/:songId/audio
 * Remove audio file from a song
 */
router.delete('/songs/:songId/audio', authenticateToken, asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const updated = await metmapAdapter.clearSongAudio(songId, req.user.id);

  if (!updated) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ song: updated });
}));

/**
 * PUT /api/metmap/songs/:songId/beat-map
 * Save detected beat map for a song
 */
router.put('/songs/:songId/beat-map', authenticateToken, zodValidate(songBeatMapSchema), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { beatMap, detectedBpm, audioDurationSeconds } = req.body;

  const updated = await metmapAdapter.setSongBeatMap(songId, req.user.id, {
    beatMap,
    detectedBpm,
    audioDurationSeconds,
  });

  if (!updated) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ song: updated });
}));

// ========================================
// SECTIONS
// ========================================

/**
 * GET /api/metmap/songs/:songId/sections
 * Get sections for a song
 */
router.get('/songs/:songId/sections', authenticateToken, asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const sections = await metmapAdapter.getSections(songId, req.user.id);

  if (sections === null) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ sections });
}));

/**
 * PUT /api/metmap/songs/:songId/sections
 * Bulk upsert sections
 */
router.put('/songs/:songId/sections', authenticateToken, zodValidate(upsertSectionsSchema), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { sections } = req.body;

  const updatedSections = await metmapAdapter.upsertSections(songId, req.user.id, sections);

  if (updatedSections === null) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ sections: updatedSections });
}));

/**
 * DELETE /api/metmap/sections/:sectionId
 * Delete a section
 */
router.delete('/sections/:sectionId', authenticateToken, asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const success = await metmapAdapter.deleteSection(sectionId, req.user.id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Section not found', code: 'METMAP_SECTION_NOT_FOUND' });
  }

  res.json({ success: true });
}));

// ========================================
// CHORDS
// ========================================

/**
 * GET /api/metmap/songs/:songId/chords
 * Get all chords for a song
 */
router.get('/songs/:songId/chords', authenticateToken, asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const chords = await metmapAdapter.getChordsForSong(songId, req.user.id);

  if (chords === null) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json({ chords });
}));

/**
 * PUT /api/metmap/sections/:sectionId/chords
 * Bulk upsert chords for a section
 */
router.put('/sections/:sectionId/chords', authenticateToken, zodValidate(upsertChordsSchema), asyncHandler(async (req, res) => {
  const { sectionId } = req.params;
  const { chords } = req.body;

  const updatedChords = await metmapAdapter.upsertChords(sectionId, req.user.id, chords);

  if (updatedChords === null) {
    return res.status(404).json({ success: false, error: 'Section not found', code: 'METMAP_SECTION_NOT_FOUND' });
  }

  res.json({ chords: updatedChords });
}));

/**
 * DELETE /api/metmap/chords/:chordId
 * Delete a chord
 */
router.delete('/chords/:chordId', authenticateToken, asyncHandler(async (req, res) => {
  const { chordId } = req.params;
  const success = await metmapAdapter.deleteChord(chordId, req.user.id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Chord not found', code: 'METMAP_CHORD_NOT_FOUND' });
  }

  res.json({ success: true });
}));

// ========================================
// PRACTICE SESSIONS
// ========================================

/**
 * POST /api/metmap/songs/:songId/practice
 * Start a practice session
 */
router.post('/songs/:songId/practice', authenticateToken, zodValidate(startPracticeSchema), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { settings } = req.body;

  const session = await metmapAdapter.createPracticeSession(songId, req.user.id, settings || {});

  if (!session) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.status(201).json({ session });
}));

/**
 * POST /api/metmap/practice/:sessionId/end
 * End a practice session
 */
router.post('/practice/:sessionId/end', authenticateToken, zodValidate(endPracticeSchema), asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { notes } = req.body;

  const session = await metmapAdapter.endPracticeSession(sessionId, req.user.id, notes);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Practice session not found', code: 'METMAP_PRACTICE_NOT_FOUND' });
  }

  res.json({ session });
}));

/**
 * GET /api/metmap/songs/:songId/practice-history
 * Get practice history for a song
 */
router.get('/songs/:songId/practice-history', authenticateToken, asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { limit, offset } = req.query;

  const result = await metmapAdapter.getPracticeHistory(songId, req.user.id, {
    limit: limit ? parseInt(limit) : 20,
    offset: offset ? parseInt(offset) : 0
  });

  if (result === null) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.json(result);
}));

// ========================================
// AUDIO TRACKS
// ========================================

/**
 * GET /api/metmap/songs/:songId/tracks
 * List all tracks for a song
 */
router.get('/songs/:songId/tracks', authenticateToken, asyncHandler(async (req, res) => {
  const tracks = await metmapAdapter.getTracksForSong(req.params.songId, req.user.id);
  if (tracks === null) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }
  res.json({ tracks });
}));

/**
 * POST /api/metmap/songs/:songId/tracks
 * Create a track (with optional audio upload)
 */
router.post('/songs/:songId/tracks', authenticateToken, audioUpload.single('audio'), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { name } = req.body;
  const trackData = { name };

  // Handle audio file upload
  if (req.file && fileStorage) {
    const key = `metmap/tracks/${songId}/${uuidv4()}-${req.file.originalname}`;
    const uploadResult = await fileStorage.uploadFile(key, req.file.buffer, {
      contentType: req.file.mimetype,
    });
    trackData.audioKey = key;
    trackData.audioUrl = uploadResult.url || uploadResult.Location;
    trackData.mimeType = req.file.mimetype;
    trackData.fileSizeBytes = req.file.size;
  }

  const track = await metmapAdapter.createTrack(songId, req.user.id, trackData);
  if (!track) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }
  res.status(201).json({ track });
}));

/**
 * PUT /api/metmap/tracks/:trackId
 * Update track metadata
 */
router.put('/tracks/:trackId', authenticateToken, zodValidate(updateTrackSchema), asyncHandler(async (req, res) => {
  const { name, volume, pan, muted, solo } = req.body;
  const track = await metmapAdapter.updateTrack(req.params.trackId, req.user.id, {
    name, volume, pan, muted, solo
  });
  if (!track) {
    return res.status(404).json({ success: false, error: 'Track not found', code: 'METMAP_TRACK_NOT_FOUND' });
  }
  res.json({ track });
}));

/**
 * DELETE /api/metmap/tracks/:trackId
 * Delete a track and its S3 audio
 */
router.delete('/tracks/:trackId', authenticateToken, asyncHandler(async (req, res) => {
  const deleted = await metmapAdapter.deleteTrack(req.params.trackId, req.user.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Track not found', code: 'METMAP_TRACK_NOT_FOUND' });
  }
  // Clean up S3 file if exists
  if (deleted.audio_key && fileStorage) {
    try {
      await fileStorage.deleteFile(deleted.audio_key);
    } catch (e) {
      log.warn('Failed to delete track audio from S3', { error: e.message });
    }
  }
  res.json({ success: true });
}));

/**
 * PUT /api/metmap/tracks/:trackId/reorder
 * Change sort_order
 */
router.put('/tracks/:trackId/reorder', authenticateToken, zodValidate(reorderTrackSchema), asyncHandler(async (req, res) => {
  const { sortOrder } = req.body;
  const track = await metmapAdapter.reorderTrack(req.params.trackId, req.user.id, sortOrder);
  if (!track) {
    return res.status(404).json({ success: false, error: 'Track not found', code: 'METMAP_TRACK_NOT_FOUND' });
  }
  res.json({ track });
}));

/**
 * PUT /api/metmap/tracks/:trackId/beat-map
 * Store beat detection results for a track
 */
router.put('/tracks/:trackId/beat-map', authenticateToken, zodValidate(trackBeatMapSchema), asyncHandler(async (req, res) => {
  const { beatMap } = req.body;
  const track = await metmapAdapter.updateTrackBeatMap(req.params.trackId, req.user.id, beatMap);
  if (!track) {
    return res.status(404).json({ success: false, error: 'Track not found', code: 'METMAP_TRACK_NOT_FOUND' });
  }
  res.json({ track });
}));

// ========================================
// SNAPSHOTS
// ========================================

/**
 * GET /api/metmap/songs/:songId/snapshots
 * List all snapshots for a song
 */
router.get('/songs/:songId/snapshots', authenticateToken, asyncHandler(async (req, res) => {
  const snapshots = await metmapAdapter.getSnapshotsForSong(req.params.songId, req.user.id);
  if (snapshots === null) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }
  res.json({ snapshots });
}));

/**
 * POST /api/metmap/songs/:songId/snapshots
 * Create a snapshot from the current Yjs state
 */
router.post('/songs/:songId/snapshots', authenticateToken, zodValidate(createSnapshotSchema), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { name, description, sectionCount, totalBars } = req.body;

  // Verify song ownership before accessing Yjs state
  const song = await metmapAdapter.getSongById(songId, req.user.id);
  if (!song) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  // Get current Yjs state from the song
  const yjsState = await metmapAdapter.getYjsState(songId);
  if (!yjsState) {
    return res.status(404).json({ success: false, error: 'No Yjs state available', code: 'METMAP_NO_YJS_STATE' });
  }

  const snapshot = await metmapAdapter.createSnapshot(songId, req.user.id, {
    name: name.trim(),
    description: description?.trim() || null,
    yjsState,
    sectionCount: sectionCount || 0,
    totalBars: totalBars || 0,
  });

  res.status(201).json({ snapshot });
}));

/**
 * DELETE /api/metmap/songs/:songId/snapshots/:id
 * Delete a snapshot (own only)
 */
router.delete('/songs/:songId/snapshots/:id', authenticateToken, asyncHandler(async (req, res) => {
  const deleted = await metmapAdapter.deleteSnapshot(req.params.id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Snapshot not found', code: 'METMAP_SNAPSHOT_NOT_FOUND' });
  }
  res.json({ success: true });
}));

/**
 * POST /api/metmap/songs/:songId/snapshots/:id/restore
 * Restore a snapshot — replaces song Yjs state
 */
router.post('/songs/:songId/snapshots/:id/restore', authenticateToken, asyncHandler(async (req, res) => {
  const { songId } = req.params;

  // Verify song ownership
  const song = await metmapAdapter.getSongById(songId, req.user.id);
  if (!song) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  const snapshot = await metmapAdapter.getSnapshot(req.params.id, req.user.id);
  if (!snapshot || !snapshot.yjsState) {
    return res.status(404).json({ success: false, error: 'Snapshot not found', code: 'METMAP_SNAPSHOT_NOT_FOUND' });
  }

  // Replace song's Yjs state with snapshot state
  await metmapAdapter.saveYjsState(songId, snapshot.yjsState);

  res.json({ success: true, snapshot: { id: snapshot.id, name: snapshot.name } });
}));

// ========================================
// BRANCHES
// ========================================

/**
 * GET /api/metmap/songs/:songId/branches
 * List all branches for a song
 */
router.get('/songs/:songId/branches', authenticateToken, asyncHandler(async (req, res) => {
  const branches = await metmapAdapter.getBranchesForSong(req.params.songId, req.user.id);
  if (branches === null) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }
  res.json({ branches });
}));

/**
 * POST /api/metmap/songs/:songId/branches
 * Create a branch (optionally from a snapshot)
 */
router.post('/songs/:songId/branches', authenticateToken, zodValidate(createBranchSchema), asyncHandler(async (req, res) => {
  const { songId } = req.params;
  const { name, description, sourceSnapshotId } = req.body;

  const branch = await metmapAdapter.createBranch(songId, req.user.id, {
    name: name.trim(),
    description: description?.trim() || null,
    sourceSnapshotId: sourceSnapshotId || null,
  });

  if (!branch) {
    return res.status(404).json({ success: false, error: 'Song not found', code: 'METMAP_SONG_NOT_FOUND' });
  }

  res.status(201).json({ branch });
}));

/**
 * DELETE /api/metmap/songs/:songId/branches/:id
 * Delete a branch (own only, cannot delete main)
 */
router.delete('/songs/:songId/branches/:id', authenticateToken, asyncHandler(async (req, res) => {
  const deleted = await metmapAdapter.deleteBranch(req.params.id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Branch not found or is main branch', code: 'METMAP_BRANCH_NOT_FOUND' });
  }
  res.json({ success: true });
}));

/**
 * POST /api/metmap/songs/:songId/branches/:id/merge
 * Merge branch to main — replaces main Yjs state with branch state
 */
router.post('/songs/:songId/branches/:id/merge', authenticateToken, asyncHandler(async (req, res) => {
  const merged = await metmapAdapter.mergeBranch(req.params.id, req.user.id);
  if (!merged) {
    return res.status(404).json({ success: false, error: 'Branch not found or is main branch', code: 'METMAP_BRANCH_NOT_FOUND' });
  }
  res.json({ success: true, branch: merged });
}));

module.exports = router;
