/**
 * MetMap Database Adapter - FluxStudio
 *
 * Provides database operations for the MetMap musical timeline tool.
 * Handles songs, sections, chords, and practice sessions.
 *
 * Features:
 * - CRUD operations for songs
 * - Section management with tempo ramps
 * - Chord progression management
 * - Practice session tracking
 * - Project linking
 * - Authorization enforcement via user_id
 */

const { query, transaction } = require('./config');
const { v4: uuidv4 } = require('uuid');

// ==================== SONGS ====================

/**
 * Get all songs for a user with optional filters
 *
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Object} { songs, total, hasMore }
 */
async function getSongsForUser(userId, options = {}) {
  const {
    projectId,
    search,
    limit = 50,
    offset = 0,
    orderBy = 'updated_at',
    orderDir = 'DESC'
  } = options;

  try {
    const params = [userId];
    let paramIndex = 2;

    let whereClause = 'WHERE s.user_id = $1';

    if (projectId) {
      whereClause += ` AND s.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (s.title ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Validate orderBy to prevent SQL injection
    const validOrderBy = ['updated_at', 'created_at', 'title', 'bpm_default'].includes(orderBy)
      ? orderBy
      : 'updated_at';
    const validOrderDir = orderDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM metmap_songs s ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get songs with section/chord counts
    params.push(limit, offset);
    const result = await query(`
      SELECT s.*,
             p.name as project_name,
             (SELECT COUNT(*) FROM metmap_sections sec WHERE sec.song_id = s.id) as section_count,
             (SELECT COALESCE(SUM(sec.bars), 0) FROM metmap_sections sec WHERE sec.song_id = s.id) as total_bars,
             (SELECT COUNT(*) FROM metmap_practice_sessions ps WHERE ps.song_id = s.id) as practice_count
      FROM metmap_songs s
      LEFT JOIN projects p ON s.project_id = p.id
      ${whereClause}
      ORDER BY s.${validOrderBy} ${validOrderDir}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);

    return {
      songs: result.rows.map(transformSong),
      total,
      hasMore: offset + result.rows.length < total
    };
  } catch (error) {
    console.error('Error getting songs for user:', error);
    throw error;
  }
}

/**
 * Get a single song by ID with full details
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID for authorization
 * @returns {Object|null} Song with sections and chords
 */
async function getSongById(songId, userId) {
  try {
    const result = await query(`
      SELECT s.*,
             p.name as project_name,
             (SELECT COUNT(*) FROM metmap_practice_sessions ps WHERE ps.song_id = s.id) as practice_count
      FROM metmap_songs s
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.id = $1 AND s.user_id = $2
    `, [songId, userId]);

    if (result.rows.length === 0) return null;

    const song = transformSong(result.rows[0]);

    // Get sections
    const sectionsResult = await query(`
      SELECT * FROM metmap_sections
      WHERE song_id = $1
      ORDER BY order_index ASC
    `, [songId]);

    song.sections = sectionsResult.rows.map(transformSection);

    // Get chords for each section
    const sectionIds = song.sections.map(s => s.id);
    if (sectionIds.length > 0) {
      const chordsResult = await query(`
        SELECT * FROM metmap_chords
        WHERE section_id = ANY($1)
        ORDER BY section_id, bar, beat
      `, [sectionIds]);

      const chordsBySectionId = {};
      for (const chord of chordsResult.rows) {
        if (!chordsBySectionId[chord.section_id]) {
          chordsBySectionId[chord.section_id] = [];
        }
        chordsBySectionId[chord.section_id].push(transformChord(chord));
      }

      for (const section of song.sections) {
        section.chords = chordsBySectionId[section.id] || [];
      }
    }

    return song;
  } catch (error) {
    console.error('Error getting song by ID:', error);
    throw error;
  }
}

/**
 * Create a new song
 *
 * @param {string} userId - User ID
 * @param {Object} data - Song data
 * @returns {Object} Created song
 */
async function createSong(userId, data) {
  const {
    title,
    description,
    projectId,
    bpmDefault = 120,
    timeSignatureDefault = '4/4'
  } = data;

  try {
    const id = uuidv4();
    const result = await query(`
      INSERT INTO metmap_songs (id, user_id, project_id, title, description, bpm_default, time_signature_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, userId, projectId || null, title, description || null, bpmDefault, timeSignatureDefault]);

    return transformSong(result.rows[0]);
  } catch (error) {
    console.error('Error creating song:', error);
    throw error;
  }
}

/**
 * Update a song
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID for authorization
 * @param {Object} changes - Fields to update
 * @returns {Object|null} Updated song
 */
async function updateSong(songId, userId, changes) {
  const allowedFields = ['title', 'description', 'project_id', 'bpm_default', 'time_signature_default'];
  const updates = [];
  const params = [songId, userId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(changes)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase to snake_case
    if (allowedFields.includes(dbKey)) {
      updates.push(`${dbKey} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) {
    return getSongById(songId, userId);
  }

  try {
    const result = await query(`
      UPDATE metmap_songs
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return transformSong(result.rows[0]);
  } catch (error) {
    console.error('Error updating song:', error);
    throw error;
  }
}

/**
 * Delete a song and all related data
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID for authorization
 * @returns {boolean} Success
 */
async function deleteSong(songId, userId) {
  try {
    const result = await query(`
      DELETE FROM metmap_songs
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [songId, userId]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting song:', error);
    throw error;
  }
}

// ==================== SECTIONS ====================

/**
 * Get sections for a song
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID for authorization
 * @returns {Array} Sections
 */
async function getSections(songId, userId) {
  try {
    // Verify ownership
    const songCheck = await query(
      'SELECT id FROM metmap_songs WHERE id = $1 AND user_id = $2',
      [songId, userId]
    );
    if (songCheck.rows.length === 0) return null;

    const result = await query(`
      SELECT * FROM metmap_sections
      WHERE song_id = $1
      ORDER BY order_index ASC
    `, [songId]);

    return result.rows.map(transformSection);
  } catch (error) {
    console.error('Error getting sections:', error);
    throw error;
  }
}

/**
 * Bulk upsert sections for a song
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID for authorization
 * @param {Array} sectionsArray - Sections to upsert
 * @returns {Array} Updated sections
 */
async function upsertSections(songId, userId, sectionsArray) {
  try {
    // Verify ownership
    const songCheck = await query(
      'SELECT id FROM metmap_songs WHERE id = $1 AND user_id = $2',
      [songId, userId]
    );
    if (songCheck.rows.length === 0) return null;

    return await transaction(async (client) => {
      // Delete sections not in the new array
      const newSectionIds = sectionsArray.filter(s => s.id).map(s => s.id);
      if (newSectionIds.length > 0) {
        await client.query(
          'DELETE FROM metmap_sections WHERE song_id = $1 AND id != ALL($2)',
          [songId, newSectionIds]
        );
      } else {
        await client.query(
          'DELETE FROM metmap_sections WHERE song_id = $1',
          [songId]
        );
      }

      // Upsert each section
      const upsertedSections = [];
      for (let i = 0; i < sectionsArray.length; i++) {
        const section = sectionsArray[i];
        const sectionId = section.id || uuidv4();

        const result = await client.query(`
          INSERT INTO metmap_sections (
            id, song_id, name, order_index, start_bar, bars,
            time_signature, tempo_start, tempo_end, tempo_curve, animations
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            order_index = EXCLUDED.order_index,
            start_bar = EXCLUDED.start_bar,
            bars = EXCLUDED.bars,
            time_signature = EXCLUDED.time_signature,
            tempo_start = EXCLUDED.tempo_start,
            tempo_end = EXCLUDED.tempo_end,
            tempo_curve = EXCLUDED.tempo_curve,
            animations = EXCLUDED.animations,
            updated_at = NOW()
          RETURNING *
        `, [
          sectionId,
          songId,
          section.name || 'Section',
          i,
          section.startBar || 1,
          section.bars || 4,
          section.timeSignature || '4/4',
          section.tempoStart || 120,
          section.tempoEnd || null,
          section.tempoCurve || null,
          JSON.stringify(section.animations || [])
        ]);

        upsertedSections.push(transformSection(result.rows[0]));
      }

      // Update song's updated_at
      await client.query(
        'UPDATE metmap_songs SET updated_at = NOW() WHERE id = $1',
        [songId]
      );

      return upsertedSections;
    });
  } catch (error) {
    console.error('Error upserting sections:', error);
    throw error;
  }
}

/**
 * Delete a single section
 *
 * @param {string} sectionId - Section ID
 * @param {string} userId - User ID for authorization
 * @returns {boolean} Success
 */
async function deleteSection(sectionId, userId) {
  try {
    const result = await query(`
      DELETE FROM metmap_sections s
      USING metmap_songs song
      WHERE s.id = $1
        AND s.song_id = song.id
        AND song.user_id = $2
      RETURNING s.song_id
    `, [sectionId, userId]);

    if (result.rows.length > 0) {
      // Reorder remaining sections
      await query('SELECT reorder_metmap_sections($1)', [result.rows[0].song_id]);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting section:', error);
    throw error;
  }
}

// ==================== CHORDS ====================

/**
 * Get all chords for a song
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID for authorization
 * @returns {Array} Chords grouped by section
 */
async function getChordsForSong(songId, userId) {
  try {
    // Verify ownership
    const songCheck = await query(
      'SELECT id FROM metmap_songs WHERE id = $1 AND user_id = $2',
      [songId, userId]
    );
    if (songCheck.rows.length === 0) return null;

    const result = await query(`
      SELECT c.*, s.name as section_name, s.order_index as section_order
      FROM metmap_chords c
      JOIN metmap_sections s ON c.section_id = s.id
      WHERE s.song_id = $1
      ORDER BY s.order_index, c.bar, c.beat
    `, [songId]);

    return result.rows.map(transformChord);
  } catch (error) {
    console.error('Error getting chords for song:', error);
    throw error;
  }
}

/**
 * Bulk upsert chords for a section
 *
 * @param {string} sectionId - Section ID
 * @param {string} userId - User ID for authorization
 * @param {Array} chordsArray - Chords to upsert
 * @returns {Array} Updated chords
 */
async function upsertChords(sectionId, userId, chordsArray) {
  try {
    // Verify ownership through section -> song -> user
    const ownerCheck = await query(`
      SELECT s.id FROM metmap_sections s
      JOIN metmap_songs song ON s.song_id = song.id
      WHERE s.id = $1 AND song.user_id = $2
    `, [sectionId, userId]);
    if (ownerCheck.rows.length === 0) return null;

    return await transaction(async (client) => {
      // Delete chords not in the new array
      const newChordIds = chordsArray.filter(c => c.id).map(c => c.id);
      if (newChordIds.length > 0) {
        await client.query(
          'DELETE FROM metmap_chords WHERE section_id = $1 AND id != ALL($2)',
          [sectionId, newChordIds]
        );
      } else {
        await client.query(
          'DELETE FROM metmap_chords WHERE section_id = $1',
          [sectionId]
        );
      }

      // Upsert each chord
      const upsertedChords = [];
      for (const chord of chordsArray) {
        const chordId = chord.id || uuidv4();

        const result = await client.query(`
          INSERT INTO metmap_chords (
            id, section_id, bar, beat, symbol, duration_beats, voicing
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            bar = EXCLUDED.bar,
            beat = EXCLUDED.beat,
            symbol = EXCLUDED.symbol,
            duration_beats = EXCLUDED.duration_beats,
            voicing = EXCLUDED.voicing,
            updated_at = NOW()
          RETURNING *
        `, [
          chordId,
          sectionId,
          chord.bar || 1,
          chord.beat || 1,
          chord.symbol,
          chord.durationBeats || 4,
          chord.voicing ? JSON.stringify(chord.voicing) : null
        ]);

        upsertedChords.push(transformChord(result.rows[0]));
      }

      return upsertedChords;
    });
  } catch (error) {
    console.error('Error upserting chords:', error);
    throw error;
  }
}

/**
 * Delete a single chord
 *
 * @param {string} chordId - Chord ID
 * @param {string} userId - User ID for authorization
 * @returns {boolean} Success
 */
async function deleteChord(chordId, userId) {
  try {
    const result = await query(`
      DELETE FROM metmap_chords c
      USING metmap_sections s, metmap_songs song
      WHERE c.id = $1
        AND c.section_id = s.id
        AND s.song_id = song.id
        AND song.user_id = $2
      RETURNING c.id
    `, [chordId, userId]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting chord:', error);
    throw error;
  }
}

// ==================== PRACTICE SESSIONS ====================

/**
 * Create a new practice session
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID
 * @param {Object} settings - Practice settings
 * @returns {Object} Created session
 */
async function createPracticeSession(songId, userId, settings = {}) {
  try {
    // Verify ownership
    const songCheck = await query(
      'SELECT id FROM metmap_songs WHERE id = $1 AND user_id = $2',
      [songId, userId]
    );
    if (songCheck.rows.length === 0) return null;

    const id = uuidv4();
    const result = await query(`
      INSERT INTO metmap_practice_sessions (id, song_id, user_id, settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, songId, userId, JSON.stringify(settings)]);

    return transformPracticeSession(result.rows[0]);
  } catch (error) {
    console.error('Error creating practice session:', error);
    throw error;
  }
}

/**
 * End a practice session
 *
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID for authorization
 * @param {string} notes - Optional practice notes
 * @returns {Object|null} Updated session
 */
async function endPracticeSession(sessionId, userId, notes = null) {
  try {
    const result = await query(`
      UPDATE metmap_practice_sessions
      SET ended_at = NOW(), notes = $3
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [sessionId, userId, notes]);

    if (result.rows.length === 0) return null;
    return transformPracticeSession(result.rows[0]);
  } catch (error) {
    console.error('Error ending practice session:', error);
    throw error;
  }
}

/**
 * Get practice history for a song
 *
 * @param {string} songId - Song ID
 * @param {string} userId - User ID for authorization
 * @param {Object} pagination - { limit, offset }
 * @returns {Object} { sessions, total, hasMore }
 */
async function getPracticeHistory(songId, userId, pagination = {}) {
  const { limit = 20, offset = 0 } = pagination;

  try {
    // Verify ownership
    const songCheck = await query(
      'SELECT id FROM metmap_songs WHERE id = $1 AND user_id = $2',
      [songId, userId]
    );
    if (songCheck.rows.length === 0) return null;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM metmap_practice_sessions WHERE song_id = $1',
      [songId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get sessions
    const result = await query(`
      SELECT * FROM metmap_practice_sessions
      WHERE song_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `, [songId, limit, offset]);

    return {
      sessions: result.rows.map(transformPracticeSession),
      total,
      hasMore: offset + result.rows.length < total
    };
  } catch (error) {
    console.error('Error getting practice history:', error);
    throw error;
  }
}

/**
 * Get stats for a user's MetMap usage
 *
 * @param {string} userId - User ID
 * @returns {Object} Stats
 */
async function getStatsForUser(userId) {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM metmap_songs WHERE user_id = $1) as song_count,
        (SELECT COUNT(*) FROM metmap_practice_sessions WHERE user_id = $1) as practice_count,
        (SELECT COALESCE(SUM(
          EXTRACT(EPOCH FROM (ended_at - started_at))
        ), 0) FROM metmap_practice_sessions
         WHERE user_id = $1 AND ended_at IS NOT NULL) as total_practice_seconds
    `, [userId]);

    const row = result.rows[0];
    return {
      songCount: parseInt(row.song_count, 10),
      practiceCount: parseInt(row.practice_count, 10),
      totalPracticeMinutes: Math.round(parseFloat(row.total_practice_seconds) / 60)
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    throw error;
  }
}

// ==================== TRANSFORMERS ====================

function transformSong(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    projectName: row.project_name || null,
    title: row.title,
    description: row.description,
    bpmDefault: row.bpm_default,
    timeSignatureDefault: row.time_signature_default,
    sectionCount: parseInt(row.section_count || 0, 10),
    totalBars: parseInt(row.total_bars || 0, 10),
    practiceCount: parseInt(row.practice_count || 0, 10),
    audioFileUrl: row.audio_file_url || null,
    audioDurationSeconds: row.audio_duration_seconds ? parseFloat(row.audio_duration_seconds) : null,
    detectedBpm: row.detected_bpm ? parseFloat(row.detected_bpm) : null,
    beatMap: row.beat_map || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function transformSection(row) {
  if (!row) return null;
  return {
    id: row.id,
    songId: row.song_id,
    name: row.name,
    orderIndex: row.order_index,
    startBar: row.start_bar,
    bars: row.bars,
    timeSignature: row.time_signature,
    tempoStart: row.tempo_start,
    tempoEnd: row.tempo_end,
    tempoCurve: row.tempo_curve,
    animations: row.animations || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function transformChord(row) {
  if (!row) return null;
  return {
    id: row.id,
    sectionId: row.section_id,
    sectionName: row.section_name || null,
    sectionOrder: row.section_order != null ? row.section_order : null,
    bar: row.bar,
    beat: row.beat,
    symbol: row.symbol,
    durationBeats: row.duration_beats,
    voicing: row.voicing,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function transformPracticeSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    songId: row.song_id,
    userId: row.user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    notes: row.notes,
    settings: row.settings,
    createdAt: row.created_at
  };
}

// ==================== AUDIO ====================

/**
 * Set audio file metadata on a song
 */
async function setSongAudio(songId, userId, { audioFileUrl, audioDurationSeconds }) {
  try {
    const result = await query(
      `UPDATE metmap_songs
       SET audio_file_url = $1, audio_duration_seconds = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [audioFileUrl, audioDurationSeconds, songId, userId]
    );
    return result.rows[0] ? transformSong(result.rows[0]) : null;
  } catch (error) {
    console.error('Error setting song audio:', error);
    throw error;
  }
}

/**
 * Clear audio file from a song
 */
async function clearSongAudio(songId, userId) {
  try {
    const result = await query(
      `UPDATE metmap_songs
       SET audio_file_url = NULL, audio_duration_seconds = NULL,
           detected_bpm = NULL, beat_map = NULL, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [songId, userId]
    );
    return result.rows[0] ? transformSong(result.rows[0]) : null;
  } catch (error) {
    console.error('Error clearing song audio:', error);
    throw error;
  }
}

/**
 * Save beat detection results for a song
 */
async function setSongBeatMap(songId, userId, { beatMap, detectedBpm, audioDurationSeconds }) {
  try {
    const result = await query(
      `UPDATE metmap_songs
       SET beat_map = $1, detected_bpm = $2, audio_duration_seconds = COALESCE($3, audio_duration_seconds), updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [JSON.stringify(beatMap), detectedBpm, audioDurationSeconds, songId, userId]
    );
    return result.rows[0] ? transformSong(result.rows[0]) : null;
  } catch (error) {
    console.error('Error setting song beat map:', error);
    throw error;
  }
}

// ==================== AUDIO TRACKS ====================

/**
 * Get all audio tracks for a song
 */
async function getTracksForSong(songId, userId) {
  try {
    const songCheck = await query(
      'SELECT id FROM metmap_songs WHERE id = $1 AND user_id = $2',
      [songId, userId]
    );
    if (songCheck.rows.length === 0) return null;

    const result = await query(
      `SELECT * FROM metmap_audio_tracks
       WHERE song_id = $1 AND user_id = $2
       ORDER BY sort_order ASC, created_at ASC`,
      [songId, userId]
    );
    return result.rows.map(transformTrack);
  } catch (error) {
    console.error('Error getting tracks:', error);
    throw error;
  }
}

/**
 * Create an audio track
 */
async function createTrack(songId, userId, trackData) {
  try {
    const songCheck = await query(
      'SELECT id FROM metmap_songs WHERE id = $1 AND user_id = $2',
      [songId, userId]
    );
    if (songCheck.rows.length === 0) return null;

    // Get next sort order
    const orderResult = await query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM metmap_audio_tracks WHERE song_id = $1',
      [songId]
    );
    const sortOrder = orderResult.rows[0].next_order;

    const id = uuidv4();
    const result = await query(
      `INSERT INTO metmap_audio_tracks
       (id, song_id, user_id, name, audio_key, audio_url, audio_duration_seconds, mime_type, file_size_bytes, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id, songId, userId,
        trackData.name || `Track ${sortOrder + 1}`,
        trackData.audioKey || null,
        trackData.audioUrl || null,
        trackData.audioDurationSeconds || null,
        trackData.mimeType || null,
        trackData.fileSizeBytes || null,
        sortOrder
      ]
    );
    return transformTrack(result.rows[0]);
  } catch (error) {
    console.error('Error creating track:', error);
    throw error;
  }
}

/**
 * Update an audio track (name, volume, pan, muted, solo)
 */
async function updateTrack(trackId, userId, changes) {
  const allowedFields = ['name', 'volume', 'pan', 'muted', 'solo', 'audio_key', 'audio_url', 'audio_duration_seconds', 'mime_type', 'file_size_bytes'];
  const updates = [];
  const params = [trackId, userId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(changes)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      updates.push(`${dbKey} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (updates.length === 0) return null;

  try {
    const result = await query(
      `UPDATE metmap_audio_tracks
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      params
    );
    return result.rows[0] ? transformTrack(result.rows[0]) : null;
  } catch (error) {
    console.error('Error updating track:', error);
    throw error;
  }
}

/**
 * Delete an audio track
 */
async function deleteTrack(trackId, userId) {
  try {
    const result = await query(
      `DELETE FROM metmap_audio_tracks
       WHERE id = $1 AND user_id = $2
       RETURNING id, audio_key`,
      [trackId, userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting track:', error);
    throw error;
  }
}

/**
 * Reorder a track
 */
async function reorderTrack(trackId, userId, newOrder) {
  try {
    const result = await query(
      `UPDATE metmap_audio_tracks
       SET sort_order = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [trackId, userId, newOrder]
    );
    return result.rows[0] ? transformTrack(result.rows[0]) : null;
  } catch (error) {
    console.error('Error reordering track:', error);
    throw error;
  }
}

/**
 * Save beat map for a track
 */
async function updateTrackBeatMap(trackId, userId, beatMap) {
  try {
    const result = await query(
      `UPDATE metmap_audio_tracks
       SET beat_map = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [trackId, userId, JSON.stringify(beatMap)]
    );
    return result.rows[0] ? transformTrack(result.rows[0]) : null;
  } catch (error) {
    console.error('Error updating track beat map:', error);
    throw error;
  }
}

function transformTrack(row) {
  if (!row) return null;
  return {
    id: row.id,
    songId: row.song_id,
    userId: row.user_id,
    name: row.name,
    audioKey: row.audio_key,
    audioUrl: row.audio_url,
    audioDurationSeconds: row.audio_duration_seconds ? parseFloat(row.audio_duration_seconds) : null,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes ? parseInt(row.file_size_bytes, 10) : null,
    volume: parseFloat(row.volume),
    pan: parseFloat(row.pan),
    muted: row.muted,
    solo: row.solo,
    sortOrder: row.sort_order,
    beatMap: row.beat_map || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ==================== EXPORTS ====================

module.exports = {
  // Songs
  getSongsForUser,
  getSongById,
  createSong,
  updateSong,
  deleteSong,

  // Sections
  getSections,
  upsertSections,
  deleteSection,

  // Chords
  getChordsForSong,
  upsertChords,
  deleteChord,

  // Practice
  createPracticeSession,
  endPracticeSession,
  getPracticeHistory,

  // Audio
  setSongAudio,
  clearSongAudio,
  setSongBeatMap,

  // Tracks
  getTracksForSong,
  createTrack,
  updateTrack,
  deleteTrack,
  reorderTrack,
  updateTrackBeatMap,

  // Stats
  getStatsForUser
};
