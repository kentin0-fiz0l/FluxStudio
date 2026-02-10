-- Migration 051: Add Drill Writer Formations System Tables
-- Date: 2026-02-10
-- Description: Creates formations, formation_performers, formation_keyframes, and formation_positions tables
--              Formations are animated sequences of performer positions for marching band drill design

-- Formations table - represents a complete drill sequence attached to a project
CREATE TABLE IF NOT EXISTS formations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stage_width NUMERIC NOT NULL DEFAULT 100,
  stage_height NUMERIC NOT NULL DEFAULT 53.3,
  grid_size NUMERIC NOT NULL DEFAULT 2,
  music_track_url TEXT,
  music_duration INTEGER,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for formations table
CREATE INDEX IF NOT EXISTS idx_formations_project ON formations(project_id);
CREATE INDEX IF NOT EXISTS idx_formations_project_archived ON formations(project_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_formations_created_by ON formations(created_by);

-- Formation performers table - individual performers in a formation
CREATE TABLE IF NOT EXISTS formation_performers (
  id TEXT PRIMARY KEY,
  formation_id TEXT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  group_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for formation_performers table
CREATE INDEX IF NOT EXISTS idx_formation_performers_formation ON formation_performers(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_performers_formation_order ON formation_performers(formation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_formation_performers_group ON formation_performers(formation_id, group_name);

-- Formation keyframes table - snapshots in time during the formation
CREATE TABLE IF NOT EXISTS formation_keyframes (
  id TEXT PRIMARY KEY,
  formation_id TEXT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  timestamp_ms INTEGER NOT NULL DEFAULT 0,
  transition TEXT NOT NULL DEFAULT 'linear',
  duration INTEGER NOT NULL DEFAULT 1000,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for formation_keyframes table
CREATE INDEX IF NOT EXISTS idx_formation_keyframes_formation ON formation_keyframes(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_keyframes_formation_order ON formation_keyframes(formation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_formation_keyframes_formation_timestamp ON formation_keyframes(formation_id, timestamp_ms);

-- Formation positions table - performer positions at each keyframe
CREATE TABLE IF NOT EXISTS formation_positions (
  id TEXT PRIMARY KEY,
  keyframe_id TEXT NOT NULL REFERENCES formation_keyframes(id) ON DELETE CASCADE,
  performer_id TEXT NOT NULL REFERENCES formation_performers(id) ON DELETE CASCADE,
  x NUMERIC NOT NULL DEFAULT 50,
  y NUMERIC NOT NULL DEFAULT 50,
  rotation NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for formation_positions table
CREATE INDEX IF NOT EXISTS idx_formation_positions_keyframe ON formation_positions(keyframe_id);
CREATE INDEX IF NOT EXISTS idx_formation_positions_performer ON formation_positions(performer_id);
CREATE INDEX IF NOT EXISTS idx_formation_positions_keyframe_performer ON formation_positions(keyframe_id, performer_id);

-- Unique constraint to ensure one position per performer per keyframe
CREATE UNIQUE INDEX IF NOT EXISTS idx_formation_positions_unique ON formation_positions(keyframe_id, performer_id);

-- Add comments
COMMENT ON TABLE formations IS 'Drill formations - animated sequences of performer positions for marching band design';
COMMENT ON COLUMN formations.project_id IS 'The project this formation belongs to';
COMMENT ON COLUMN formations.stage_width IS 'Stage width in units (typically feet or meters)';
COMMENT ON COLUMN formations.stage_height IS 'Stage height in units (typically feet or meters, default is football field ratio)';
COMMENT ON COLUMN formations.grid_size IS 'Grid cell size for snap-to-grid (in stage units)';
COMMENT ON COLUMN formations.music_track_url IS 'Optional URL to audio track for synchronization';
COMMENT ON COLUMN formations.music_duration IS 'Duration of music track in milliseconds';

COMMENT ON TABLE formation_performers IS 'Individual performers/marchers in a formation';
COMMENT ON COLUMN formation_performers.label IS 'Short label displayed on the marker (e.g., "A1", "S2")';
COMMENT ON COLUMN formation_performers.color IS 'Marker color in hex format';
COMMENT ON COLUMN formation_performers.group_name IS 'Group name for filtering (e.g., "Brass", "Percussion")';
COMMENT ON COLUMN formation_performers.sort_order IS 'Display order in lists';

COMMENT ON TABLE formation_keyframes IS 'Snapshots in time during the formation animation';
COMMENT ON COLUMN formation_keyframes.timestamp_ms IS 'Time position in milliseconds';
COMMENT ON COLUMN formation_keyframes.transition IS 'Easing function: linear, ease, ease-in, ease-out, ease-in-out';
COMMENT ON COLUMN formation_keyframes.duration IS 'Duration to reach this keyframe from previous (in ms)';
COMMENT ON COLUMN formation_keyframes.sort_order IS 'Display order in timeline';

COMMENT ON TABLE formation_positions IS 'Performer positions at each keyframe';
COMMENT ON COLUMN formation_positions.x IS 'X position as percentage (0-100)';
COMMENT ON COLUMN formation_positions.y IS 'Y position as percentage (0-100)';
COMMENT ON COLUMN formation_positions.rotation IS 'Rotation in degrees (0-360)';
