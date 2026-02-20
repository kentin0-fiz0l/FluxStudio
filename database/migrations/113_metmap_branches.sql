-- Migration 113: MetMap Design Branches
-- Sprint 33: Fork branches from snapshots or current state for independent experimentation

CREATE TABLE IF NOT EXISTS metmap_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id TEXT NOT NULL REFERENCES metmap_songs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_snapshot_id UUID REFERENCES metmap_snapshots(id) ON DELETE SET NULL,
  yjs_state BYTEA,
  is_main BOOLEAN DEFAULT FALSE,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metmap_branches_song ON metmap_branches(song_id);
