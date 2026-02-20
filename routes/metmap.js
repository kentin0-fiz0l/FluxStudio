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
const { authenticateToken } = require('../lib/auth/middleware');
const { v4: uuidv4 } = require('uuid');
const metmapAdapter = require('../database/metmap-adapter');
const { fileStorage } = require('../lib/storage');

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
router.get('/songs', authenticateToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error getting songs:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

/**
 * GET /api/metmap/stats
 * Get MetMap statistics for user
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await metmapAdapter.getStatsForUser(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error getting MetMap stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * POST /api/metmap/songs
 * Create a new song
 */
router.post('/songs', authenticateToken, async (req, res) => {
  try {
    const { title, description, projectId, bpmDefault, timeSignatureDefault } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const song = await metmapAdapter.createSong(req.user.id, {
      title: title.trim(),
      description,
      projectId,
      bpmDefault,
      timeSignatureDefault
    });

    res.status(201).json({ song });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ error: 'Failed to create song' });
  }
});

/**
 * GET /api/metmap/songs/:songId
 * Get a single song with sections and chords
 */
router.get('/songs/:songId', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const song = await metmapAdapter.getSongById(songId, req.user.id);

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ song });
  } catch (error) {
    console.error('Error getting song:', error);
    res.status(500).json({ error: 'Failed to get song' });
  }
});

/**
 * PUT /api/metmap/songs/:songId
 * Update a song
 */
router.put('/songs/:songId', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { title, description, projectId, bpmDefault, timeSignatureDefault } = req.body;

    const song = await metmapAdapter.updateSong(songId, req.user.id, {
      title,
      description,
      projectId,
      bpmDefault,
      timeSignatureDefault
    });

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ song });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Failed to update song' });
  }
});

/**
 * DELETE /api/metmap/songs/:songId
 * Delete a song
 */
router.delete('/songs/:songId', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const success = await metmapAdapter.deleteSong(songId, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// ========================================
// AUDIO
// ========================================

/**
 * POST /api/metmap/songs/:songId/audio
 * Upload an audio file for a song
 */
router.post('/songs/:songId/audio', authenticateToken, audioUpload.single('audio'), async (req, res) => {
  try {
    const { songId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Verify song ownership
    const song = await metmapAdapter.getSongById(songId, req.user.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
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
  } catch (error) {
    console.error('Error uploading song audio:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

/**
 * DELETE /api/metmap/songs/:songId/audio
 * Remove audio file from a song
 */
router.delete('/songs/:songId/audio', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const updated = await metmapAdapter.clearSongAudio(songId, req.user.id);

    if (!updated) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ song: updated });
  } catch (error) {
    console.error('Error removing song audio:', error);
    res.status(500).json({ error: 'Failed to remove audio' });
  }
});

/**
 * PUT /api/metmap/songs/:songId/beat-map
 * Save detected beat map for a song
 */
router.put('/songs/:songId/beat-map', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { beatMap, detectedBpm, audioDurationSeconds } = req.body;

    const updated = await metmapAdapter.setSongBeatMap(songId, req.user.id, {
      beatMap,
      detectedBpm,
      audioDurationSeconds,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ song: updated });
  } catch (error) {
    console.error('Error saving beat map:', error);
    res.status(500).json({ error: 'Failed to save beat map' });
  }
});

// ========================================
// SECTIONS
// ========================================

/**
 * GET /api/metmap/songs/:songId/sections
 * Get sections for a song
 */
router.get('/songs/:songId/sections', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const sections = await metmapAdapter.getSections(songId, req.user.id);

    if (sections === null) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ sections });
  } catch (error) {
    console.error('Error getting sections:', error);
    res.status(500).json({ error: 'Failed to get sections' });
  }
});

/**
 * PUT /api/metmap/songs/:songId/sections
 * Bulk upsert sections
 */
router.put('/songs/:songId/sections', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { sections } = req.body;

    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: 'Sections must be an array' });
    }

    const updatedSections = await metmapAdapter.upsertSections(songId, req.user.id, sections);

    if (updatedSections === null) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ sections: updatedSections });
  } catch (error) {
    console.error('Error upserting sections:', error);
    res.status(500).json({ error: 'Failed to update sections' });
  }
});

/**
 * DELETE /api/metmap/sections/:sectionId
 * Delete a section
 */
router.delete('/sections/:sectionId', authenticateToken, async (req, res) => {
  try {
    const { sectionId } = req.params;
    const success = await metmapAdapter.deleteSection(sectionId, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// ========================================
// CHORDS
// ========================================

/**
 * GET /api/metmap/songs/:songId/chords
 * Get all chords for a song
 */
router.get('/songs/:songId/chords', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const chords = await metmapAdapter.getChordsForSong(songId, req.user.id);

    if (chords === null) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ chords });
  } catch (error) {
    console.error('Error getting chords:', error);
    res.status(500).json({ error: 'Failed to get chords' });
  }
});

/**
 * PUT /api/metmap/sections/:sectionId/chords
 * Bulk upsert chords for a section
 */
router.put('/sections/:sectionId/chords', authenticateToken, async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { chords } = req.body;

    if (!Array.isArray(chords)) {
      return res.status(400).json({ error: 'Chords must be an array' });
    }

    // Validate chords have symbols
    for (const chord of chords) {
      if (!chord.symbol || chord.symbol.trim().length === 0) {
        return res.status(400).json({ error: 'Each chord must have a symbol' });
      }
    }

    const updatedChords = await metmapAdapter.upsertChords(sectionId, req.user.id, chords);

    if (updatedChords === null) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ chords: updatedChords });
  } catch (error) {
    console.error('Error upserting chords:', error);
    res.status(500).json({ error: 'Failed to update chords' });
  }
});

/**
 * DELETE /api/metmap/chords/:chordId
 * Delete a chord
 */
router.delete('/chords/:chordId', authenticateToken, async (req, res) => {
  try {
    const { chordId } = req.params;
    const success = await metmapAdapter.deleteChord(chordId, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Chord not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chord:', error);
    res.status(500).json({ error: 'Failed to delete chord' });
  }
});

// ========================================
// PRACTICE SESSIONS
// ========================================

/**
 * POST /api/metmap/songs/:songId/practice
 * Start a practice session
 */
router.post('/songs/:songId/practice', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { settings } = req.body;

    const session = await metmapAdapter.createPracticeSession(songId, req.user.id, settings || {});

    if (!session) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.status(201).json({ session });
  } catch (error) {
    console.error('Error starting practice session:', error);
    res.status(500).json({ error: 'Failed to start practice session' });
  }
});

/**
 * POST /api/metmap/practice/:sessionId/end
 * End a practice session
 */
router.post('/practice/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;

    const session = await metmapAdapter.endPracticeSession(sessionId, req.user.id, notes);

    if (!session) {
      return res.status(404).json({ error: 'Practice session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Error ending practice session:', error);
    res.status(500).json({ error: 'Failed to end practice session' });
  }
});

/**
 * GET /api/metmap/songs/:songId/practice-history
 * Get practice history for a song
 */
router.get('/songs/:songId/practice-history', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { limit, offset } = req.query;

    const result = await metmapAdapter.getPracticeHistory(songId, req.user.id, {
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0
    });

    if (result === null) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting practice history:', error);
    res.status(500).json({ error: 'Failed to get practice history' });
  }
});

// ========================================
// AUDIO TRACKS
// ========================================

/**
 * GET /api/metmap/songs/:songId/tracks
 * List all tracks for a song
 */
router.get('/songs/:songId/tracks', authenticateToken, async (req, res) => {
  try {
    const tracks = await metmapAdapter.getTracksForSong(req.params.songId, req.user.id);
    if (tracks === null) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ tracks });
  } catch (error) {
    console.error('Error getting tracks:', error);
    res.status(500).json({ error: 'Failed to get tracks' });
  }
});

/**
 * POST /api/metmap/songs/:songId/tracks
 * Create a track (with optional audio upload)
 */
router.post('/songs/:songId/tracks', authenticateToken, audioUpload.single('audio'), async (req, res) => {
  try {
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
      return res.status(404).json({ error: 'Song not found' });
    }
    res.status(201).json({ track });
  } catch (error) {
    console.error('Error creating track:', error);
    res.status(500).json({ error: 'Failed to create track' });
  }
});

/**
 * PUT /api/metmap/tracks/:trackId
 * Update track metadata
 */
router.put('/tracks/:trackId', authenticateToken, async (req, res) => {
  try {
    const { name, volume, pan, muted, solo } = req.body;
    const track = await metmapAdapter.updateTrack(req.params.trackId, req.user.id, {
      name, volume, pan, muted, solo
    });
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json({ track });
  } catch (error) {
    console.error('Error updating track:', error);
    res.status(500).json({ error: 'Failed to update track' });
  }
});

/**
 * DELETE /api/metmap/tracks/:trackId
 * Delete a track and its S3 audio
 */
router.delete('/tracks/:trackId', authenticateToken, async (req, res) => {
  try {
    const deleted = await metmapAdapter.deleteTrack(req.params.trackId, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Track not found' });
    }
    // Clean up S3 file if exists
    if (deleted.audio_key && fileStorage) {
      try {
        await fileStorage.deleteFile(deleted.audio_key);
      } catch (e) {
        console.warn('Failed to delete track audio from S3:', e.message);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting track:', error);
    res.status(500).json({ error: 'Failed to delete track' });
  }
});

/**
 * PUT /api/metmap/tracks/:trackId/reorder
 * Change sort_order
 */
router.put('/tracks/:trackId/reorder', authenticateToken, async (req, res) => {
  try {
    const { sortOrder } = req.body;
    if (typeof sortOrder !== 'number') {
      return res.status(400).json({ error: 'sortOrder must be a number' });
    }
    const track = await metmapAdapter.reorderTrack(req.params.trackId, req.user.id, sortOrder);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json({ track });
  } catch (error) {
    console.error('Error reordering track:', error);
    res.status(500).json({ error: 'Failed to reorder track' });
  }
});

/**
 * PUT /api/metmap/tracks/:trackId/beat-map
 * Store beat detection results for a track
 */
router.put('/tracks/:trackId/beat-map', authenticateToken, async (req, res) => {
  try {
    const { beatMap } = req.body;
    if (!beatMap) {
      return res.status(400).json({ error: 'beatMap is required' });
    }
    const track = await metmapAdapter.updateTrackBeatMap(req.params.trackId, req.user.id, beatMap);
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }
    res.json({ track });
  } catch (error) {
    console.error('Error updating track beat map:', error);
    res.status(500).json({ error: 'Failed to update beat map' });
  }
});

// ========================================
// SNAPSHOTS
// ========================================

/**
 * GET /api/metmap/songs/:songId/snapshots
 * List all snapshots for a song
 */
router.get('/songs/:songId/snapshots', authenticateToken, async (req, res) => {
  try {
    const snapshots = await metmapAdapter.getSnapshotsForSong(req.params.songId, req.user.id);
    if (snapshots === null) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ snapshots });
  } catch (error) {
    console.error('Error getting snapshots:', error);
    res.status(500).json({ error: 'Failed to get snapshots' });
  }
});

/**
 * POST /api/metmap/songs/:songId/snapshots
 * Create a snapshot from the current Yjs state
 */
router.post('/songs/:songId/snapshots', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { name, description, sectionCount, totalBars } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }

    // Get current Yjs state from the song
    const yjsState = await metmapAdapter.getYjsState(songId);
    if (!yjsState) {
      return res.status(404).json({ error: 'Song not found or no Yjs state' });
    }

    const snapshot = await metmapAdapter.createSnapshot(songId, req.user.id, {
      name: name.trim(),
      description: description?.trim() || null,
      yjsState,
      sectionCount: sectionCount || 0,
      totalBars: totalBars || 0,
    });

    res.status(201).json({ snapshot });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

/**
 * DELETE /api/metmap/songs/:songId/snapshots/:id
 * Delete a snapshot (own only)
 */
router.delete('/songs/:songId/snapshots/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await metmapAdapter.deleteSnapshot(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

/**
 * POST /api/metmap/songs/:songId/snapshots/:id/restore
 * Restore a snapshot — replaces song Yjs state
 */
router.post('/songs/:songId/snapshots/:id/restore', authenticateToken, async (req, res) => {
  try {
    const snapshot = await metmapAdapter.getSnapshot(req.params.id, req.user.id);
    if (!snapshot || !snapshot.yjsState) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    // Replace song's Yjs state with snapshot state
    await metmapAdapter.saveYjsState(req.params.songId, snapshot.yjsState);

    res.json({ success: true, snapshot: { id: snapshot.id, name: snapshot.name } });
  } catch (error) {
    console.error('Error restoring snapshot:', error);
    res.status(500).json({ error: 'Failed to restore snapshot' });
  }
});

// ========================================
// BRANCHES
// ========================================

/**
 * GET /api/metmap/songs/:songId/branches
 * List all branches for a song
 */
router.get('/songs/:songId/branches', authenticateToken, async (req, res) => {
  try {
    const branches = await metmapAdapter.getBranchesForSong(req.params.songId, req.user.id);
    if (branches === null) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ branches });
  } catch (error) {
    console.error('Error getting branches:', error);
    res.status(500).json({ error: 'Failed to get branches' });
  }
});

/**
 * POST /api/metmap/songs/:songId/branches
 * Create a branch (optionally from a snapshot)
 */
router.post('/songs/:songId/branches', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.params;
    const { name, description, sourceSnapshotId } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }

    const branch = await metmapAdapter.createBranch(songId, req.user.id, {
      name: name.trim(),
      description: description?.trim() || null,
      sourceSnapshotId: sourceSnapshotId || null,
    });

    if (!branch) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.status(201).json({ branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

/**
 * DELETE /api/metmap/songs/:songId/branches/:id
 * Delete a branch (own only, cannot delete main)
 */
router.delete('/songs/:songId/branches/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await metmapAdapter.deleteBranch(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Branch not found or is main branch' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

/**
 * POST /api/metmap/songs/:songId/branches/:id/merge
 * Merge branch to main — replaces main Yjs state with branch state
 */
router.post('/songs/:songId/branches/:id/merge', authenticateToken, async (req, res) => {
  try {
    const merged = await metmapAdapter.mergeBranch(req.params.id, req.user.id);
    if (!merged) {
      return res.status(404).json({ error: 'Branch not found or is main branch' });
    }
    res.json({ success: true, branch: merged });
  } catch (error) {
    console.error('Error merging branch:', error);
    res.status(500).json({ error: 'Failed to merge branch' });
  }
});

module.exports = router;
