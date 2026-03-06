-- Migration 134: Formation Drill Sets
-- Adds the sets/counts paradigm for drill writing workflow.
-- Sets map 1:1 to keyframes but use count-based naming and notation.

-- Formation sets table
CREATE TABLE IF NOT EXISTS formation_sets (
  id TEXT PRIMARY KEY,
  formation_id TEXT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  keyframe_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Set 1',
  label TEXT,
  counts INTEGER NOT NULL DEFAULT 8,
  notes TEXT,
  rehearsal_mark TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for formation_sets
CREATE INDEX IF NOT EXISTS idx_formation_sets_formation_id ON formation_sets(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_sets_keyframe_id ON formation_sets(keyframe_id);
CREATE INDEX IF NOT EXISTS idx_formation_sets_sort_order ON formation_sets(formation_id, sort_order);

-- Add drill-specific columns to performers (stored as JSONB in formations table)
-- These are tracked in the Yjs document and formation JSON, not separate columns.
-- The formation_performers concept is embedded in the formation document.

-- Add field configuration and drill settings to formations
ALTER TABLE formations ADD COLUMN IF NOT EXISTS field_config JSONB;
ALTER TABLE formations ADD COLUMN IF NOT EXISTS drill_settings JSONB;
