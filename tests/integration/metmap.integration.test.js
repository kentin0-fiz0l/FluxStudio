/**
 * MetMap Route Integration Tests
 *
 * Tests song management, sections, chords, practice sessions,
 * audio, tracks, snapshots, branches, and error handling.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests-32chars';

// --- Mocks ---

jest.mock('../../database/config', () => ({
  query: jest.fn(),
  runMigrations: jest.fn()
}));

jest.mock('../../lib/auth/tokenService', () => ({
  verifyAccessToken: jest.fn((token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }),
  generateAccessToken: jest.fn()
}));

jest.mock('../../lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }))
}));

jest.mock('../../database/metmap-adapter', () => ({
  getSongsForUser: jest.fn(),
  getSongById: jest.fn(),
  createSong: jest.fn(),
  updateSong: jest.fn(),
  deleteSong: jest.fn(),
  getStatsForUser: jest.fn(),
  getSections: jest.fn(),
  upsertSections: jest.fn(),
  deleteSection: jest.fn(),
  getChordsForSong: jest.fn(),
  upsertChords: jest.fn(),
  deleteChord: jest.fn(),
  createPracticeSession: jest.fn(),
  endPracticeSession: jest.fn(),
  getPracticeHistory: jest.fn(),
  setSongAudio: jest.fn(),
  clearSongAudio: jest.fn(),
  setSongBeatMap: jest.fn(),
  getTracksForSong: jest.fn(),
  createTrack: jest.fn(),
  updateTrack: jest.fn(),
  deleteTrack: jest.fn(),
  reorderTrack: jest.fn(),
  updateTrackBeatMap: jest.fn(),
  getSnapshotsForSong: jest.fn(),
  createSnapshot: jest.fn(),
  deleteSnapshot: jest.fn(),
  getSnapshot: jest.fn(),
  getYjsState: jest.fn(),
  saveYjsState: jest.fn(),
  getBranchesForSong: jest.fn(),
  createBranch: jest.fn(),
  deleteBranch: jest.fn(),
  mergeBranch: jest.fn(),
}));

jest.mock('../../lib/storage', () => ({
  fileStorage: {
    uploadToStorage: jest.fn(),
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid')
}));

const metmapAdapter = require('../../database/metmap-adapter');

// Helper: create a valid JWT for test user
function createTestToken(userId = 'test-user-123', extra = {}) {
  return jwt.sign(
    { id: userId, email: 'test@example.com', userType: 'client', ...extra },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper: build express app with metmap routes
function createApp() {
  const app = express();
  app.use(express.json());
  const routes = require('../../routes/metmap');
  app.use('/api/metmap', routes);
  return app;
}

describe('MetMap Integration Tests', () => {
  let app;
  let token;
  const userId = 'test-user-123';

  beforeAll(() => {
    app = createApp();
    token = createTestToken(userId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================
  describe('Authentication', () => {
    it('should return 401 for GET /api/metmap/songs without token', async () => {
      await request(app)
        .get('/api/metmap/songs')
        .expect(401);
    });

    it('should return 401 for POST /api/metmap/songs without token', async () => {
      await request(app)
        .post('/api/metmap/songs')
        .send({ title: 'Test Song' })
        .expect(401);
    });
  });

  // =========================================================================
  // GET /api/metmap/songs
  // =========================================================================
  describe('GET /api/metmap/songs', () => {
    it('should return 200 with songs list', async () => {
      metmapAdapter.getSongsForUser.mockResolvedValueOnce({
        songs: [{ id: 'song-1', title: 'My Song' }],
        total: 1
      });

      const res = await request(app)
        .get('/api/metmap/songs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.songs).toHaveLength(1);
      expect(res.body.songs[0].title).toBe('My Song');
      expect(metmapAdapter.getSongsForUser).toHaveBeenCalledWith(userId, expect.objectContaining({
        limit: 50,
        offset: 0,
      }));
    });

    it('should return 500 on adapter error', async () => {
      metmapAdapter.getSongsForUser.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/metmap/songs')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get songs');
    });
  });

  // =========================================================================
  // GET /api/metmap/stats
  // =========================================================================
  describe('GET /api/metmap/stats', () => {
    it('should return 200 with stats', async () => {
      metmapAdapter.getStatsForUser.mockResolvedValueOnce({
        totalSongs: 5,
        totalPracticeSessions: 12
      });

      const res = await request(app)
        .get('/api/metmap/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.totalSongs).toBe(5);
    });

    it('should return 500 on error', async () => {
      metmapAdapter.getStatsForUser.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get('/api/metmap/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to get stats');
    });
  });

  // =========================================================================
  // POST /api/metmap/songs
  // =========================================================================
  describe('POST /api/metmap/songs', () => {
    it('should return 201 for a valid song', async () => {
      const songData = { id: 'song-new', title: 'New Song' };
      metmapAdapter.createSong.mockResolvedValueOnce(songData);

      const res = await request(app)
        .post('/api/metmap/songs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Song', description: 'A test song' })
        .expect(201);

      expect(res.body.song.title).toBe('New Song');
      expect(metmapAdapter.createSong).toHaveBeenCalledWith(userId, expect.objectContaining({
        title: 'New Song',
        description: 'A test song',
      }));
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/metmap/songs')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No title' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for empty title', async () => {
      const res = await request(app)
        .post('/api/metmap/songs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' })
        .expect(400);

      expect(res.body.error).toBe('Title is required');
    });

    it('should return 500 on adapter error', async () => {
      metmapAdapter.createSong.mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/api/metmap/songs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test Song' })
        .expect(500);

      expect(res.body.error).toBe('Failed to create song');
    });
  });

  // =========================================================================
  // GET /api/metmap/songs/:songId
  // =========================================================================
  describe('GET /api/metmap/songs/:songId', () => {
    it('should return 200 when song found', async () => {
      metmapAdapter.getSongById.mockResolvedValueOnce({ id: 'song-1', title: 'My Song' });

      const res = await request(app)
        .get('/api/metmap/songs/song-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.song.id).toBe('song-1');
      expect(metmapAdapter.getSongById).toHaveBeenCalledWith('song-1', userId);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.getSongById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/metmap/songs/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // PUT /api/metmap/songs/:songId
  // =========================================================================
  describe('PUT /api/metmap/songs/:songId', () => {
    it('should return 200 when song updated', async () => {
      metmapAdapter.updateSong.mockResolvedValueOnce({ id: 'song-1', title: 'Updated' });

      const res = await request(app)
        .put('/api/metmap/songs/song-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' })
        .expect(200);

      expect(res.body.song.title).toBe('Updated');
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.updateSong.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/metmap/songs/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // DELETE /api/metmap/songs/:songId
  // =========================================================================
  describe('DELETE /api/metmap/songs/:songId', () => {
    it('should return 200 when song deleted', async () => {
      metmapAdapter.deleteSong.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/metmap/songs/song-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.deleteSong.mockResolvedValueOnce(false);

      const res = await request(app)
        .delete('/api/metmap/songs/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // GET /api/metmap/songs/:songId/sections
  // =========================================================================
  describe('GET /api/metmap/songs/:songId/sections', () => {
    it('should return 200 with sections', async () => {
      metmapAdapter.getSections.mockResolvedValueOnce([
        { id: 'sec-1', name: 'Verse' }
      ]);

      const res = await request(app)
        .get('/api/metmap/songs/song-1/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.sections).toHaveLength(1);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.getSections.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/metmap/songs/nonexistent/sections')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // PUT /api/metmap/songs/:songId/sections
  // =========================================================================
  describe('PUT /api/metmap/songs/:songId/sections', () => {
    it('should return 200 when sections upserted', async () => {
      metmapAdapter.upsertSections.mockResolvedValueOnce([
        { id: 'sec-1', name: 'Verse' }
      ]);

      const res = await request(app)
        .put('/api/metmap/songs/song-1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ sections: [{ name: 'Verse' }] })
        .expect(200);

      expect(res.body.sections).toHaveLength(1);
    });

    it('should return 400 when sections is not an array', async () => {
      const res = await request(app)
        .put('/api/metmap/songs/song-1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ sections: 'not-an-array' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.upsertSections.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/metmap/songs/nonexistent/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ sections: [{ name: 'Verse' }] })
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // DELETE /api/metmap/sections/:sectionId
  // =========================================================================
  describe('DELETE /api/metmap/sections/:sectionId', () => {
    it('should return 200 when section deleted', async () => {
      metmapAdapter.deleteSection.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/metmap/sections/sec-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when section not found', async () => {
      metmapAdapter.deleteSection.mockResolvedValueOnce(false);

      const res = await request(app)
        .delete('/api/metmap/sections/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Section not found');
    });
  });

  // =========================================================================
  // GET /api/metmap/songs/:songId/chords
  // =========================================================================
  describe('GET /api/metmap/songs/:songId/chords', () => {
    it('should return 200 with chords', async () => {
      metmapAdapter.getChordsForSong.mockResolvedValueOnce([
        { id: 'chord-1', symbol: 'Am' }
      ]);

      const res = await request(app)
        .get('/api/metmap/songs/song-1/chords')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.chords).toHaveLength(1);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.getChordsForSong.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/metmap/songs/nonexistent/chords')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // PUT /api/metmap/sections/:sectionId/chords
  // =========================================================================
  describe('PUT /api/metmap/sections/:sectionId/chords', () => {
    it('should return 200 when chords upserted', async () => {
      metmapAdapter.upsertChords.mockResolvedValueOnce([
        { id: 'chord-1', symbol: 'Am' }
      ]);

      const res = await request(app)
        .put('/api/metmap/sections/sec-1/chords')
        .set('Authorization', `Bearer ${token}`)
        .send({ chords: [{ symbol: 'Am', position: 0 }] })
        .expect(200);

      expect(res.body.chords).toHaveLength(1);
    });

    it('should return 400 when chords is not an array', async () => {
      const res = await request(app)
        .put('/api/metmap/sections/sec-1/chords')
        .set('Authorization', `Bearer ${token}`)
        .send({ chords: 'not-an-array' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 when chord missing symbol', async () => {
      const res = await request(app)
        .put('/api/metmap/sections/sec-1/chords')
        .set('Authorization', `Bearer ${token}`)
        .send({ chords: [{ position: 0 }] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 when section not found', async () => {
      metmapAdapter.upsertChords.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/metmap/sections/nonexistent/chords')
        .set('Authorization', `Bearer ${token}`)
        .send({ chords: [{ symbol: 'Am', position: 0 }] })
        .expect(404);

      expect(res.body.error).toBe('Section not found');
    });
  });

  // =========================================================================
  // POST /api/metmap/songs/:songId/practice
  // =========================================================================
  describe('POST /api/metmap/songs/:songId/practice', () => {
    it('should return 201 when practice started', async () => {
      metmapAdapter.createPracticeSession.mockResolvedValueOnce({
        id: 'session-1',
        songId: 'song-1'
      });

      const res = await request(app)
        .post('/api/metmap/songs/song-1/practice')
        .set('Authorization', `Bearer ${token}`)
        .send({ settings: { tempo: 120 } })
        .expect(201);

      expect(res.body.session.id).toBe('session-1');
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.createPracticeSession.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/metmap/songs/nonexistent/practice')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // GET /api/metmap/songs/:songId/practice-history
  // =========================================================================
  describe('GET /api/metmap/songs/:songId/practice-history', () => {
    it('should return 200 with practice history', async () => {
      metmapAdapter.getPracticeHistory.mockResolvedValueOnce({
        sessions: [{ id: 'session-1' }],
        total: 1
      });

      const res = await request(app)
        .get('/api/metmap/songs/song-1/practice-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.sessions).toHaveLength(1);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.getPracticeHistory.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/metmap/songs/nonexistent/practice-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // DELETE /api/metmap/songs/:songId/audio
  // =========================================================================
  describe('DELETE /api/metmap/songs/:songId/audio', () => {
    it('should return 200 when audio removed', async () => {
      metmapAdapter.clearSongAudio.mockResolvedValueOnce({ id: 'song-1', audioFileUrl: null });

      const res = await request(app)
        .delete('/api/metmap/songs/song-1/audio')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.song).toBeDefined();
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.clearSongAudio.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/metmap/songs/nonexistent/audio')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // PUT /api/metmap/songs/:songId/beat-map
  // =========================================================================
  describe('PUT /api/metmap/songs/:songId/beat-map', () => {
    it('should return 200 when beat map saved', async () => {
      metmapAdapter.setSongBeatMap.mockResolvedValueOnce({ id: 'song-1' });

      const res = await request(app)
        .put('/api/metmap/songs/song-1/beat-map')
        .set('Authorization', `Bearer ${token}`)
        .send({ beatMap: [{ time: 0.5, confidence: 0.9 }], detectedBpm: 120 })
        .expect(200);

      expect(res.body.song).toBeDefined();
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.setSongBeatMap.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/metmap/songs/nonexistent/beat-map')
        .set('Authorization', `Bearer ${token}`)
        .send({ beatMap: [], detectedBpm: 120 })
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // GET /api/metmap/songs/:songId/tracks
  // =========================================================================
  describe('GET /api/metmap/songs/:songId/tracks', () => {
    it('should return 200 with tracks', async () => {
      metmapAdapter.getTracksForSong.mockResolvedValueOnce([
        { id: 'track-1', name: 'Guitar' }
      ]);

      const res = await request(app)
        .get('/api/metmap/songs/song-1/tracks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.tracks).toHaveLength(1);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.getTracksForSong.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/metmap/songs/nonexistent/tracks')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // PUT /api/metmap/tracks/:trackId
  // =========================================================================
  describe('PUT /api/metmap/tracks/:trackId', () => {
    it('should return 200 when track updated', async () => {
      metmapAdapter.updateTrack.mockResolvedValueOnce({ id: 'track-1', name: 'Bass' });

      const res = await request(app)
        .put('/api/metmap/tracks/track-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bass', volume: 0.8 })
        .expect(200);

      expect(res.body.track.name).toBe('Bass');
    });

    it('should return 404 when track not found', async () => {
      metmapAdapter.updateTrack.mockResolvedValueOnce(null);

      const res = await request(app)
        .put('/api/metmap/tracks/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bass' })
        .expect(404);

      expect(res.body.error).toBe('Track not found');
    });
  });

  // =========================================================================
  // DELETE /api/metmap/tracks/:trackId
  // =========================================================================
  describe('DELETE /api/metmap/tracks/:trackId', () => {
    it('should return 200 when track deleted', async () => {
      metmapAdapter.deleteTrack.mockResolvedValueOnce({ id: 'track-1' });

      const res = await request(app)
        .delete('/api/metmap/tracks/track-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when track not found', async () => {
      metmapAdapter.deleteTrack.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/metmap/tracks/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Track not found');
    });
  });

  // =========================================================================
  // PUT /api/metmap/tracks/:trackId/reorder
  // =========================================================================
  describe('PUT /api/metmap/tracks/:trackId/reorder', () => {
    it('should return 200 when track reordered', async () => {
      metmapAdapter.reorderTrack.mockResolvedValueOnce({ id: 'track-1', sort_order: 2 });

      const res = await request(app)
        .put('/api/metmap/tracks/track-1/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({ sortOrder: 2 })
        .expect(200);

      expect(res.body.track).toBeDefined();
    });

    it('should return 400 when sortOrder is not a number', async () => {
      const res = await request(app)
        .put('/api/metmap/tracks/track-1/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({ sortOrder: 'first' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // PUT /api/metmap/tracks/:trackId/beat-map
  // =========================================================================
  describe('PUT /api/metmap/tracks/:trackId/beat-map', () => {
    it('should return 200 when beat map updated', async () => {
      metmapAdapter.updateTrackBeatMap.mockResolvedValueOnce({ id: 'track-1' });

      const res = await request(app)
        .put('/api/metmap/tracks/track-1/beat-map')
        .set('Authorization', `Bearer ${token}`)
        .send({ beatMap: [{ time: 1.0, confidence: 0.95 }] })
        .expect(200);

      expect(res.body.track).toBeDefined();
    });

    it('should return 400 when beatMap is missing', async () => {
      const res = await request(app)
        .put('/api/metmap/tracks/track-1/beat-map')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/metmap/songs/:songId/snapshots
  // =========================================================================
  describe('GET /api/metmap/songs/:songId/snapshots', () => {
    it('should return 200 with snapshots', async () => {
      metmapAdapter.getSnapshotsForSong.mockResolvedValueOnce([
        { id: 'snap-1', name: 'Version 1' }
      ]);

      const res = await request(app)
        .get('/api/metmap/songs/song-1/snapshots')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.snapshots).toHaveLength(1);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.getSnapshotsForSong.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/metmap/songs/nonexistent/snapshots')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // POST /api/metmap/songs/:songId/snapshots
  // =========================================================================
  describe('POST /api/metmap/songs/:songId/snapshots', () => {
    it('should return 201 when snapshot created', async () => {
      metmapAdapter.getYjsState.mockResolvedValueOnce(Buffer.from('yjs-data'));
      metmapAdapter.createSnapshot.mockResolvedValueOnce({ id: 'snap-1', name: 'V1' });

      const res = await request(app)
        .post('/api/metmap/songs/song-1/snapshots')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'V1', sectionCount: 4, totalBars: 16 })
        .expect(201);

      expect(res.body.snapshot.name).toBe('V1');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/metmap/songs/song-1/snapshots')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 when song has no Yjs state', async () => {
      metmapAdapter.getYjsState.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/metmap/songs/song-1/snapshots')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'V1' })
        .expect(404);

      expect(res.body.error).toBe('Song not found or no Yjs state');
    });
  });

  // =========================================================================
  // DELETE /api/metmap/songs/:songId/snapshots/:id
  // =========================================================================
  describe('DELETE /api/metmap/songs/:songId/snapshots/:id', () => {
    it('should return 200 when snapshot deleted', async () => {
      metmapAdapter.deleteSnapshot.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/metmap/songs/song-1/snapshots/snap-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when snapshot not found', async () => {
      metmapAdapter.deleteSnapshot.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/metmap/songs/song-1/snapshots/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Snapshot not found');
    });
  });

  // =========================================================================
  // POST /api/metmap/songs/:songId/snapshots/:id/restore
  // =========================================================================
  describe('POST /api/metmap/songs/:songId/snapshots/:id/restore', () => {
    it('should return 200 when snapshot restored', async () => {
      metmapAdapter.getSnapshot.mockResolvedValueOnce({
        id: 'snap-1',
        name: 'V1',
        yjsState: Buffer.from('yjs-data')
      });
      metmapAdapter.saveYjsState.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/metmap/songs/song-1/snapshots/snap-1/restore')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when snapshot not found', async () => {
      metmapAdapter.getSnapshot.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/metmap/songs/song-1/snapshots/nonexistent/restore')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Snapshot not found');
    });
  });

  // =========================================================================
  // GET /api/metmap/songs/:songId/branches
  // =========================================================================
  describe('GET /api/metmap/songs/:songId/branches', () => {
    it('should return 200 with branches', async () => {
      metmapAdapter.getBranchesForSong.mockResolvedValueOnce([
        { id: 'branch-1', name: 'main' }
      ]);

      const res = await request(app)
        .get('/api/metmap/songs/song-1/branches')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.branches).toHaveLength(1);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.getBranchesForSong.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/metmap/songs/nonexistent/branches')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // POST /api/metmap/songs/:songId/branches
  // =========================================================================
  describe('POST /api/metmap/songs/:songId/branches', () => {
    it('should return 201 when branch created', async () => {
      metmapAdapter.createBranch.mockResolvedValueOnce({ id: 'branch-2', name: 'experiment' });

      const res = await request(app)
        .post('/api/metmap/songs/song-1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'experiment' })
        .expect(201);

      expect(res.body.branch.name).toBe('experiment');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/metmap/songs/song-1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 when song not found', async () => {
      metmapAdapter.createBranch.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/metmap/songs/song-1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'experiment' })
        .expect(404);

      expect(res.body.error).toBe('Song not found');
    });
  });

  // =========================================================================
  // DELETE /api/metmap/songs/:songId/branches/:id
  // =========================================================================
  describe('DELETE /api/metmap/songs/:songId/branches/:id', () => {
    it('should return 200 when branch deleted', async () => {
      metmapAdapter.deleteBranch.mockResolvedValueOnce(true);

      const res = await request(app)
        .delete('/api/metmap/songs/song-1/branches/branch-2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when branch not found or is main', async () => {
      metmapAdapter.deleteBranch.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/metmap/songs/song-1/branches/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Branch not found or is main branch');
    });
  });

  // =========================================================================
  // POST /api/metmap/songs/:songId/branches/:id/merge
  // =========================================================================
  describe('POST /api/metmap/songs/:songId/branches/:id/merge', () => {
    it('should return 200 when branch merged', async () => {
      metmapAdapter.mergeBranch.mockResolvedValueOnce({ id: 'branch-2', name: 'experiment' });

      const res = await request(app)
        .post('/api/metmap/songs/song-1/branches/branch-2/merge')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 when branch not found or is main', async () => {
      metmapAdapter.mergeBranch.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/metmap/songs/song-1/branches/nonexistent/merge')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.error).toBe('Branch not found or is main branch');
    });
  });

  // =========================================================================
  // Zod Validation
  // =========================================================================
  describe('Zod Validation', () => {
    it('should return 400 for create song with empty title', async () => {
      const res = await request(app)
        .post('/api/metmap/songs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for upsert sections with non-array', async () => {
      const res = await request(app)
        .put('/api/metmap/songs/song-1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ sections: 'not-array' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for upsert chords with missing symbol', async () => {
      const res = await request(app)
        .put('/api/metmap/sections/sec-1/chords')
        .set('Authorization', `Bearer ${token}`)
        .send({ chords: [{ position: 0 }] });
      expect(res.status).toBe(400);
    });

    it('should return 400 for reorder track with non-number sortOrder', async () => {
      const res = await request(app)
        .put('/api/metmap/tracks/trk-1/reorder')
        .set('Authorization', `Bearer ${token}`)
        .send({ sortOrder: 'first' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for track beat-map missing beatMap', async () => {
      const res = await request(app)
        .put('/api/metmap/tracks/trk-1/beat-map')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 for create snapshot with missing name', async () => {
      const res = await request(app)
        .post('/api/metmap/songs/song-1/snapshots')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 400 for create branch with missing name', async () => {
      const res = await request(app)
        .post('/api/metmap/songs/song-1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
