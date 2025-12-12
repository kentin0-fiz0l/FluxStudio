-- Migration 035: Add Assets System Tables
-- Date: 2025-12-12
-- Description: Creates assets, asset_versions, asset_tags, and project_assets tables
--              Assets are reusable, tagged, versioned creative elements that reference files

-- Assets table - reusable creative elements
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  primary_file_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for assets table
CREATE INDEX IF NOT EXISTS idx_assets_org_kind_status ON assets(organization_id, kind, status);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_kind ON assets(kind);
CREATE INDEX IF NOT EXISTS idx_assets_primary_file ON assets(primary_file_id);

-- Asset versions table - tracks different versions of an asset
CREATE TABLE IF NOT EXISTS asset_versions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  label TEXT DEFAULT 'Version',
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  format TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, version_number)
);

-- Indexes for asset_versions table
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset ON asset_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_versions_file ON asset_versions(file_id);

-- Asset tags table - for efficient tag searching
CREATE TABLE IF NOT EXISTS asset_tags (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for asset_tags table
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag_lower ON asset_tags(LOWER(tag));
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset ON asset_tags(asset_id);

-- Unique constraint on asset + lowercase tag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'asset_tags_asset_tag_unique'
  ) THEN
    ALTER TABLE asset_tags ADD CONSTRAINT asset_tags_asset_tag_unique UNIQUE (asset_id, tag);
  END IF;
END $$;

-- Project assets join table - links assets to projects
CREATE TABLE IF NOT EXISTS project_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'reference',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for project_assets table
CREATE INDEX IF NOT EXISTS idx_project_assets_project ON project_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_asset ON project_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_project_assets_role ON project_assets(role);

-- Unique constraint on project + asset + role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_assets_unique'
  ) THEN
    ALTER TABLE project_assets ADD CONSTRAINT project_assets_unique UNIQUE (project_id, asset_id, role);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE assets IS 'Reusable, tagged, versioned creative elements that reference files';
COMMENT ON COLUMN assets.kind IS 'Asset type: image, audio, video, document, pdf, other';
COMMENT ON COLUMN assets.primary_file_id IS 'The file_id of the primary/current version';
COMMENT ON COLUMN assets.status IS 'Asset status: active, archived';
COMMENT ON COLUMN assets.tags IS 'Array of tags for categorization';

COMMENT ON TABLE asset_versions IS 'Version history for assets, each linked to a file';
COMMENT ON COLUMN asset_versions.version_number IS 'Sequential version number starting at 1';
COMMENT ON COLUMN asset_versions.label IS 'Human-readable label for this version';
COMMENT ON COLUMN asset_versions.format IS 'File format/extension for this version';

COMMENT ON TABLE asset_tags IS 'Denormalized tags table for efficient searching';
COMMENT ON TABLE project_assets IS 'Links assets to projects with optional role and sort order';
COMMENT ON COLUMN project_assets.role IS 'Role of asset in project: reference, deliverable, source, hero, etc.';
