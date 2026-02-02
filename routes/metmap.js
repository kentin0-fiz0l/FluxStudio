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
const { authenticateToken } = require('../lib/auth/middleware');
const metmapAdapter = require('../database/metmap-adapter');

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

module.exports = router;
