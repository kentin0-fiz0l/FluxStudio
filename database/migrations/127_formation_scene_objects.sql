-- Migration: 127_formation_scene_objects
-- Add scene object persistence for 3D formation objects (props, primitives, custom, imported)

CREATE TABLE IF NOT EXISTS formation_scene_objects (
  id TEXT PRIMARY KEY,
  formation_id TEXT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'prop' | 'custom' | 'primitive' | 'imported'
  position_data JSONB NOT NULL,  -- Position3D
  source_data JSONB NOT NULL,    -- PropSource | CustomSource | PrimitiveSource | ImportedSource
  attached_to_performer_id TEXT,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  layer INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fso_formation ON formation_scene_objects(formation_id);
CREATE INDEX IF NOT EXISTS idx_fso_type ON formation_scene_objects(type);
