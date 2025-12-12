-- MetMap Core Schema
-- Musical timeline, tempo, sections, chords, and practice session management

-- ==================== SONGS ====================
CREATE TABLE IF NOT EXISTS metmap_songs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NULL REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  bpm_default INT NOT NULL DEFAULT 120,
  time_signature_default TEXT NOT NULL DEFAULT '4/4',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user's songs
CREATE INDEX IF NOT EXISTS idx_metmap_songs_user_id ON metmap_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_metmap_songs_project_id ON metmap_songs(project_id);
CREATE INDEX IF NOT EXISTS idx_metmap_songs_title ON metmap_songs(title);

-- ==================== SECTIONS ====================
CREATE TABLE IF NOT EXISTS metmap_sections (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Section',
  order_index INT NOT NULL DEFAULT 0,
  start_bar INT NOT NULL DEFAULT 1,
  bars INT NOT NULL DEFAULT 4,
  time_signature TEXT NOT NULL DEFAULT '4/4',
  tempo_start INT NOT NULL DEFAULT 120,
  tempo_end INT NULL,  -- if set and != tempo_start, treat as ramp
  tempo_curve TEXT NULL CHECK (tempo_curve IN ('linear', 'exponential', 'step')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sections
CREATE INDEX IF NOT EXISTS idx_metmap_sections_song_id ON metmap_sections(song_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metmap_sections_song_order ON metmap_sections(song_id, order_index);

-- ==================== CHORDS ====================
CREATE TABLE IF NOT EXISTS metmap_chords (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES metmap_sections(id) ON DELETE CASCADE,
  bar INT NOT NULL DEFAULT 1,
  beat INT NOT NULL DEFAULT 1,
  symbol TEXT NOT NULL,  -- e.g. 'Cmaj7', 'G7', 'Em', 'I', 'V/vi'
  duration_beats INT NOT NULL DEFAULT 4,
  voicing JSONB NULL,  -- optional voicing data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chords
CREATE INDEX IF NOT EXISTS idx_metmap_chords_section_id ON metmap_chords(section_id);
CREATE INDEX IF NOT EXISTS idx_metmap_chords_bar_beat ON metmap_chords(section_id, bar, beat);

-- ==================== PRACTICE SESSIONS ====================
CREATE TABLE IF NOT EXISTS metmap_practice_sessions (
  id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,  -- used_click, subdivision, countoff_bars, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for practice sessions
CREATE INDEX IF NOT EXISTS idx_metmap_practice_sessions_song_id ON metmap_practice_sessions(song_id);
CREATE INDEX IF NOT EXISTS idx_metmap_practice_sessions_user_id ON metmap_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_metmap_practice_sessions_started_at ON metmap_practice_sessions(started_at DESC);

-- ==================== TRIGGERS ====================
-- Auto-update updated_at on songs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_metmap_songs_updated_at'
  ) THEN
    CREATE TRIGGER update_metmap_songs_updated_at
      BEFORE UPDATE ON metmap_songs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Auto-update updated_at on sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_metmap_sections_updated_at'
  ) THEN
    CREATE TRIGGER update_metmap_sections_updated_at
      BEFORE UPDATE ON metmap_sections
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Auto-update updated_at on chords
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_metmap_chords_updated_at'
  ) THEN
    CREATE TRIGGER update_metmap_chords_updated_at
      BEFORE UPDATE ON metmap_chords
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ==================== HELPER FUNCTIONS ====================
-- Function to reorder sections after insert/delete
CREATE OR REPLACE FUNCTION reorder_metmap_sections(p_song_id TEXT)
RETURNS VOID AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY order_index, created_at) - 1 AS new_order
    FROM metmap_sections
    WHERE song_id = p_song_id
  )
  UPDATE metmap_sections s
  SET order_index = n.new_order
  FROM numbered n
  WHERE s.id = n.id AND s.order_index != n.new_order;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total bars in a song
CREATE OR REPLACE FUNCTION get_metmap_song_total_bars(p_song_id TEXT)
RETURNS INT AS $$
DECLARE
  total INT;
BEGIN
  SELECT COALESCE(SUM(bars), 0) INTO total
  FROM metmap_sections
  WHERE song_id = p_song_id;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to get section at a specific bar
CREATE OR REPLACE FUNCTION get_metmap_section_at_bar(p_song_id TEXT, p_bar INT)
RETURNS TEXT AS $$
DECLARE
  section_id TEXT;
  running_bar INT := 1;
BEGIN
  FOR section_id IN
    SELECT s.id
    FROM metmap_sections s
    WHERE s.song_id = p_song_id
    ORDER BY s.order_index
  LOOP
    SELECT running_bar + bars INTO running_bar
    FROM metmap_sections WHERE id = section_id;

    IF p_bar < running_bar THEN
      RETURN section_id;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
