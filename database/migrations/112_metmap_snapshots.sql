-- Migration 112: MetMap Named Snapshots / Checkpoints
-- Sprint 33: Save and restore Y.Doc state at named checkpoints

CREATE TABLE IF NOT EXISTS metmap_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id TEXT NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  yjs_state BYTEA NOT NULL,
  section_count INTEGER DEFAULT 0,
  total_bars INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metmap_snapshots_song ON metmap_snapshots(song_id);
